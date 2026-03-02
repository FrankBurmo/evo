/**
 * server/services/scan-service.ts — Scan state management og skannelogikk.
 *
 * Trekker ut in-memory scan state og kjørelogikk fra routes/scan.js
 * slik at ruten kun håndterer HTTP-laget.
 */
import { analyzeRepository } from '../analyzer';
import { analyzeRepoFull } from './analysis-service';
import { buildScanIssueBody } from '../templates';
import { meetsMinPriority, PRIORITY_RANK } from '../../packages/core';
import { assignCopilotToIssue } from '../github';
import type { Octokit } from '@octokit/rest';
import type { ScanState, ScanOptions, FullAnalysisResult } from '../types';

// ── In-memory scan state (single tenant — one scan at a time) ────────────────

export const scanState: ScanState = {
  status: 'idle',
  startedAt: null,
  completedAt: null,
  progress: { current: 0, total: 0, currentRepo: null },
  results: [],
  error: null,
  options: {},
};

export function resetScanState(): void {
  scanState.status = 'idle';
  scanState.startedAt = null;
  scanState.completedAt = null;
  scanState.progress = { current: 0, total: 0, currentRepo: null };
  scanState.results = [];
  scanState.error = null;
  scanState.options = {};
}

/** Get a read-only snapshot of current scan state. */
export function getScanStatus(): Record<string, unknown> {
  return {
    status: scanState.status,
    startedAt: scanState.startedAt,
    completedAt: scanState.completedAt,
    progress: scanState.progress,
    error: scanState.error,
    options: scanState.options,
    resultCount: scanState.results.length,
  };
}

/** Get scan results, optionally filtered by minPriority. */
export function getScanResults(minPriority?: string): Record<string, unknown> {
  let results = scanState.results;

  if (minPriority) {
    const min = (PRIORITY_RANK as Record<string, number>)[minPriority] || 0;
    results = results.map((r) => ({
      ...r,
      recommendations: r.recommendations.filter(
        (rec) => ((PRIORITY_RANK as Record<string, number>)[rec.priority] || 0) >= min,
      ),
    }));
  }

  const totalRecs = results.reduce((sum, r) => sum + r.recommendations.length, 0);
  const totalIssues = results.reduce((sum, r) => sum + r.issuesCreated.length, 0);
  const issuesCreated = results.reduce(
    (sum, r) => sum + r.issuesCreated.filter((i) => i.status === 'created').length,
    0,
  );

  return {
    status: scanState.status,
    startedAt: scanState.startedAt,
    completedAt: scanState.completedAt,
    summary: {
      reposScanned: results.length,
      totalRecommendations: totalRecs,
      totalIssuesAttempted: totalIssues,
      issuesCreated,
    },
    results,
  };
}

interface StartScanParams {
  octokit: Octokit;
  token: string;
  options: ScanOptions;
}

/**
 * Start a proactive scan. Runs asynchronously (fire-and-forget).
 */
export async function startScan({ octokit, token, options }: StartScanParams): Promise<void> {
  const {
    createIssues = false,
    assignCopilot = false,
    minPriority = 'medium',
    maxRepos = 50,
    useAI = true,
    model,
  } = options;

  // Reset and start
  resetScanState();
  scanState.status = 'running';
  scanState.startedAt = new Date().toISOString();
  scanState.options = { createIssues, assignCopilot, minPriority, maxRepos, useAI };

  try {
    // 1. Fetch all repos
    const allRepos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner',
    });
    const activeRepos = allRepos.filter((r) => !r.archived).slice(0, maxRepos);
    scanState.progress.total = activeRepos.length;

    // 2. Deep-analyse each repo sequentially (to respect rate limits)
    for (let i = 0; i < activeRepos.length; i++) {
      const repo = activeRepos[i] as Record<string, unknown>;
      scanState.progress.current = i + 1;
      scanState.progress.currentRepo = (repo.full_name as string) || null;

      let analysis: FullAnalysisResult;
      try {
        analysis = await analyzeRepoFull({
          octokit,
          repo,
          token,
          options: { useAI, model },
        });
      } catch (err: unknown) {
        analysis = analyzeRepository(repo as unknown as Parameters<typeof analyzeRepository>[0]) as unknown as FullAnalysisResult;
        analysis.deepInsights = null;
        analysis.aiAnalyzed = false;
        console.warn(
          `Analyse feilet for ${repo.full_name}:`,
          (err as Error).message,
        );
      }

      // Filter recommendations by minPriority
      const filteredRecs = (analysis.recommendations || []).filter((r) =>
        meetsMinPriority(r.priority, minPriority),
      );

      const result = {
        repo: analysis.repo,
        deepInsights: analysis.deepInsights || null,
        recommendations: filteredRecs,
        issuesCreated: [] as Array<Record<string, unknown>>,
      };

      // 3. Create issues if requested
      if (createIssues && filteredRecs.length > 0) {
        const repoFullName = analysis.repo.fullName;
        const [owner, repoName] = repoFullName.split('/');

        let existingTitles = new Set<string>();
        try {
          const existingIssues = await octokit.paginate(octokit.issues.listForRepo, {
            owner,
            repo: repoName,
            state: 'open',
            labels: 'evo-scan',
            per_page: 100,
          });
          existingTitles = new Set(existingIssues.map((i) => i.title.toLowerCase().trim()));
        } catch {
          // ignore — dedup won't work but we still create issues
        }

        for (const rec of filteredRecs) {
          const issueTitle = `[Evo] ${rec.title}`;
          if (existingTitles.has(issueTitle.toLowerCase().trim())) {
            result.issuesCreated.push({ title: rec.title, status: 'skipped', reason: 'duplicate' });
            continue;
          }

          try {
            const body = buildScanIssueBody(rec);
            const labels = ['evo-scan'];
            if (rec.priority === 'high') labels.push('priority: high');
            if (rec.priority === 'medium') labels.push('priority: medium');
            if (rec.type) labels.push(rec.type);

            let issue: { html_url: string; number: number };
            try {
              const { data } = await octokit.issues.create({
                owner,
                repo: repoName,
                title: issueTitle,
                body,
                labels,
              });
              issue = data;
            } catch (labelErr: unknown) {
              if ((labelErr as { status?: number }).status === 422) {
                const { data } = await octokit.issues.create({
                  owner,
                  repo: repoName,
                  title: issueTitle,
                  body,
                  labels: ['evo-scan'],
                });
                issue = data;
              } else {
                throw labelErr;
              }
            }

            let copilotAssigned = false;
            if (assignCopilot && issue) {
              const assignment = await assignCopilotToIssue(octokit, {
                owner,
                repoName,
                issueNumber: issue.number,
              });
              copilotAssigned = assignment.copilotAssigned;
            }

            result.issuesCreated.push({
              title: rec.title,
              status: 'created',
              issueUrl: issue.html_url,
              issueNumber: issue.number,
              copilotAssigned,
            });
          } catch (err: unknown) {
            result.issuesCreated.push({
              title: rec.title,
              status: 'error',
              error: (err as Error).message,
            });
          }
        }
      }

      scanState.results.push(result as unknown as ScanState['results'][number]);
    }

    scanState.status = 'completed';
    scanState.completedAt = new Date().toISOString();
    scanState.progress.currentRepo = null;
    console.log(`✓ Proaktiv skanning fullført: ${scanState.results.length} repos analysert.`);
  } catch (err: unknown) {
    scanState.status = 'error';
    scanState.error = (err as Error).message;
    scanState.completedAt = new Date().toISOString();
    console.error('Proaktiv skanning feilet:', (err as Error).message);
  }
}

interface SelectionEntry {
  repoFullName: string;
  recIndex: number;
}

interface CreateIssuesFromResultsParams {
  octokit: Octokit;
  assignCopilot: boolean;
  selected: SelectionEntry[] | null;
}

/**
 * Create issues from existing scan results (batch / selective).
 */
export async function createIssuesFromResults({
  octokit,
  assignCopilot,
  selected,
}: CreateIssuesFromResultsParams): Promise<{
  created: unknown[];
  skipped: unknown[];
  errors: unknown[];
}> {
  const created: unknown[] = [];
  const skipped: unknown[] = [];
  const errors: unknown[] = [];

  // Build a lookup of selected items
  let selectionMap: Record<string, Set<number>> | null = null;
  if (Array.isArray(selected) && selected.length > 0) {
    selectionMap = {};
    for (const s of selected) {
      if (!selectionMap[s.repoFullName]) selectionMap[s.repoFullName] = new Set();
      selectionMap[s.repoFullName].add(s.recIndex);
    }
  }

  for (const result of scanState.results) {
    const resultAny = result as unknown as {
      repo: Record<string, unknown>;
      recommendations: Array<Record<string, unknown>>;
      issuesCreated: Array<Record<string, unknown>>;
    };

    if (resultAny.recommendations.length === 0) continue;

    const repoFullName = resultAny.repo.fullName as string;
    if (selectionMap && !selectionMap[repoFullName]) continue;
    if (
      !selectionMap &&
      resultAny.issuesCreated.some((i) => i.status === 'created')
    ) {
      continue;
    }

    const [owner, repoName] = repoFullName.split('/');

    let existingTitles = new Set<string>();
    try {
      const existing = await octokit.paginate(octokit.issues.listForRepo, {
        owner,
        repo: repoName,
        state: 'open',
        labels: 'evo-scan',
        per_page: 100,
      });
      existingTitles = new Set(existing.map((i) => i.title.toLowerCase().trim()));
    } catch {
      /* ignore */
    }

    const repoSelection = selectionMap ? selectionMap[repoFullName] : null;

    for (let idx = 0; idx < resultAny.recommendations.length; idx++) {
      const rec = resultAny.recommendations[idx];

      if (repoSelection && !repoSelection.has(idx)) continue;

      if (
        resultAny.issuesCreated.find(
          (ic) => ic.title === rec.title && ic.status === 'created',
        )
      ) {
        skipped.push({ repo: repoFullName, title: rec.title, reason: 'already-created' });
        continue;
      }

      const issueTitle = `[Evo] ${rec.title}`;
      if (existingTitles.has(issueTitle.toLowerCase().trim())) {
        skipped.push({ repo: repoFullName, title: rec.title, reason: 'duplicate' });
        continue;
      }

      try {
        const body = buildScanIssueBody(rec as unknown as Parameters<typeof buildScanIssueBody>[0], {
          compact: true,
        });
        const labels = ['evo-scan'];
        if (rec.priority === 'high') labels.push('priority: high');
        if (rec.priority === 'medium') labels.push('priority: medium');

        let issue: { html_url: string; number: number };
        try {
          const { data } = await octokit.issues.create({
            owner,
            repo: repoName,
            title: issueTitle,
            body,
            labels,
          });
          issue = data;
        } catch (labelErr: unknown) {
          if ((labelErr as { status?: number }).status === 422) {
            const { data } = await octokit.issues.create({
              owner,
              repo: repoName,
              title: issueTitle,
              body,
              labels: ['evo-scan'],
            });
            issue = data;
          } else throw labelErr;
        }

        let copilotAssigned = false;
        if (assignCopilot && issue) {
          const assignment = await assignCopilotToIssue(octokit, {
            owner,
            repoName,
            issueNumber: issue.number,
          });
          copilotAssigned = assignment.copilotAssigned;
        }

        created.push({
          repo: repoFullName,
          title: rec.title,
          issueUrl: issue.html_url,
          copilotAssigned,
        });
        resultAny.issuesCreated.push({
          title: rec.title,
          status: 'created',
          issueUrl: issue.html_url,
          issueNumber: issue.number,
          copilotAssigned,
        });
      } catch (err: unknown) {
        errors.push({
          repo: repoFullName,
          title: rec.title,
          error: (err as Error).message,
        });
        resultAny.issuesCreated.push({
          title: rec.title,
          status: 'error',
          error: (err as Error).message,
        });
      }
    }
  }

  return { created, skipped, errors };
}

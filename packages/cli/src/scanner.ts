/**
 * packages/cli/src/scanner.ts — Hovedfunksjon for proaktiv repo-skanning.
 */
import { Octokit } from '@octokit/rest';
import { analyzeRepository } from './analyzer';
import { analyzeWithAI } from './copilot';
import { createIssue } from './issues';
import {
  printInfo,
  printError,
  printProgress,
  printRepoResult,
  printSummary,
} from './output';
import { PRIORITY_RANK, meetsMinPriority } from '../../core';
import type { Recommendation } from '../../core';

interface ScanFilters {
  includeRepos?: string[];
  excludeRepos?: string[];
  includeLanguages?: string[];
  excludeLanguages?: string[];
}

interface RunScanParams {
  token: string;
  owner?: string | null;
  repo?: string | null;
  model: string;
  minPriority: string;
  createIssues: boolean;
  dryRun: boolean;
  useAi: boolean;
  maxRepos: number;
  maxIssuesPerRepo: number;
  assignCopilot: boolean;
  jsonOutput: boolean;
  filters?: ScanFilters;
  categories?: Record<string, boolean>;
}

/**
 * Hovedfunksjon: skann repos, analyser, opprett issues.
 */
export async function runScan({
  token,
  owner,
  repo: singleRepo,
  model,
  minPriority,
  createIssues,
  dryRun,
  useAi,
  maxRepos,
  maxIssuesPerRepo,
  assignCopilot: _assignCopilot,
  jsonOutput,
  filters,
  categories,
}: RunScanParams): Promise<void> {
  const octokit = new Octokit({ auth: token });
  const startTime = Date.now();

  // Config-drevne filtre
  const includeRepos = filters?.includeRepos || [];
  const excludeRepos = filters?.excludeRepos || [];
  const includeLanguages = filters?.includeLanguages || [];
  const excludeLanguages = filters?.excludeLanguages || [];
  const enabledCategories = categories || {};

  // ── Hent repos ────────────────────────────────────────────────
  let repos: Array<Record<string, unknown>> = [];

  if (singleRepo) {
    const [repoOwner, repoName] = singleRepo.includes('/')
      ? singleRepo.split('/')
      : [owner, singleRepo];

    if (!repoOwner) {
      throw new Error('Oppgi --owner eller bruk format "owner/repo" med --repo');
    }

    if (!jsonOutput) printInfo(`Henter repo: ${repoOwner}/${repoName}...`);
    const { data } = await octokit.repos.get({ owner: repoOwner, repo: repoName });
    repos = [data as unknown as Record<string, unknown>];
  } else {
    if (!jsonOutput) printInfo('Henter alle dine repos fra GitHub...');

    const fetchOpts = { sort: 'updated' as const, per_page: 100 };

    const allRepos = owner
      ? await octokit.paginate(octokit.repos.listForUser, {
          username: owner,
          type: 'owner',
          ...fetchOpts,
        })
      : await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
          affiliation: 'owner',
          ...fetchOpts,
        });

    repos = (allRepos as unknown as Array<Record<string, unknown>>)
      .filter((r) => !r.archived)
      .slice(0, maxRepos);
  }

  // Anvend config-filtre
  if (!singleRepo) {
    if (includeRepos.length > 0) {
      const includeSet = new Set(includeRepos.map((r) => r.toLowerCase()));
      repos = repos.filter(
        (r) =>
          includeSet.has((r.full_name as string).toLowerCase()) ||
          includeSet.has((r.name as string).toLowerCase()),
      );
    }
    if (excludeRepos.length > 0) {
      const excludeSet = new Set(excludeRepos.map((r) => r.toLowerCase()));
      repos = repos.filter(
        (r) =>
          !excludeSet.has((r.full_name as string).toLowerCase()) &&
          !excludeSet.has((r.name as string).toLowerCase()),
      );
    }
    if (includeLanguages.length > 0) {
      const langSet = new Set(includeLanguages.map((l) => l.toLowerCase()));
      repos = repos.filter((r) => r.language && langSet.has((r.language as string).toLowerCase()));
    }
    if (excludeLanguages.length > 0) {
      const langSet = new Set(excludeLanguages.map((l) => l.toLowerCase()));
      repos = repos.filter(
        (r) => !r.language || !langSet.has((r.language as string).toLowerCase()),
      );
    }
  }

  if (!jsonOutput) printInfo(`${repos.length} repo(s) klar til analyse.\n`);

  // ── Analyser hvert repo ───────────────────────────────────────
  const results: Array<{
    repo: Record<string, unknown>;
    recommendations: Array<Recommendation & { issueUrl?: string; source?: string }>;
    aiSummary: string | null;
  }> = [];

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];

    if (!jsonOutput) {
      printProgress(i + 1, repos.length, repo.name as string);
    }

    // 1. Regelbasert analyse
    const { repo: repoData, recommendations: ruleRecs } = analyzeRepository(repo as unknown as Parameters<typeof analyzeRepository>[0]);

    // 2. AI-analyse (valgfritt)
    let aiSummary: string | null = null;
    let aiRecs: Array<Recommendation & { source: string }> = [];

    if (useAi) {
      try {
        const aiResult = await analyzeWithAI({
          token,
          model,
          repo: repoData as unknown as Record<string, unknown>,
          existingRecs: ruleRecs.map((r) => r.title),
        });
        aiSummary = aiResult.summary || null;
        aiRecs = (aiResult.recommendations || []).map((r) => ({
          ...r,
          source: 'ai',
        }));
      } catch (err) {
        if (!jsonOutput) {
          process.stdout.write('\n');
          printError(
            `AI-analyse feilet for ${repo.name}: ${err instanceof Error ? err.message : String(err)} – bruker regelbasert.`,
          );
        }
      }
    }

    // 3. Slå sammen anbefalinger, filtrer på min-prioritet og kategorier
    const allRecs = [...ruleRecs, ...aiRecs]
      .filter((r) => meetsMinPriority(r.priority, minPriority))
      .filter((r) => {
        if (!r.type || Object.keys(enabledCategories).length === 0) return true;
        return enabledCategories[r.type] !== false;
      });

    // 4. Opprett issues (hvis aktivert)
    let issuesCreatedForRepo = 0;
    for (const rec of allRecs) {
      if (createIssues || dryRun) {
        if (maxIssuesPerRepo > 0 && issuesCreatedForRepo >= maxIssuesPerRepo) break;
        try {
          const fullName = (repoData as unknown as Record<string, unknown>).fullName as string;
          if (!fullName) {
            console.warn('Repo mangler full_name, hopper over issue-opprettelse');
            break;
          }
          const [rOwner, rName] = fullName.split('/');
          const issueUrl = await createIssue({
            token,
            owner: rOwner,
            repo: rName,
            recommendation: rec,
            dryRun,
          });
          if (issueUrl) {
            (rec as Recommendation & { issueUrl?: string }).issueUrl = issueUrl;
            issuesCreatedForRepo++;
          }
        } catch (err) {
          if (!jsonOutput) {
            process.stdout.write('\n');
            printError(
              `Kunne ikke opprette issue for "${rec.title}": ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    }

    results.push({ repo: repoData as unknown as Record<string, unknown>, recommendations: allRecs, aiSummary });
  }

  if (!jsonOutput) process.stdout.write('\n\n');

  // ── Output ────────────────────────────────────────────────────
  if (jsonOutput) {
    console.log(JSON.stringify({ results, scannedAt: new Date().toISOString() }, null, 2));
    return;
  }

  for (const result of results) {
    printRepoResult(result as Parameters<typeof printRepoResult>[0], { createIssues, dryRun });
  }

  printSummary(results as Parameters<typeof printSummary>[0], {
    createIssues,
    dryRun,
    elapsed: Date.now() - startTime,
  });

  if (!createIssues && !dryRun && results.some((r) => r.recommendations.length > 0)) {
    printInfo('Tips: Legg til --create-issues for å opprette GitHub Issues automatisk.');
    printInfo('      Legg til --dry-run for å forhåndsvise uten å opprette.\n');
  }
}

// PRIORITY_RANK used to suppress unused import warning
void PRIORITY_RANK;

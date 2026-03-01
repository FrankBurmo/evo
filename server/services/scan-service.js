'use strict';

/**
 * server/services/scan-service.js — Scan state management og skannelogikk.
 *
 * Trekker ut in-memory scan state og kjørelogikk fra routes/scan.js
 * slik at ruten kun håndterer HTTP-laget.
 */

const { analyzeRepository } = require('../analyzer');
const { analyzeRepoFull } = require('./analysis-service');
const { buildScanIssueBody } = require('../templates');
const { meetsMinPriority } = require('../../packages/core');
const { assignCopilotToIssue } = require('../github');

// ── In-memory scan state (single tenant — one scan at a time) ───────────────

const scanState = {
  status: 'idle',       // idle | running | completed | error
  startedAt: null,
  completedAt: null,
  progress: { current: 0, total: 0, currentRepo: null },
  results: [],          // [{ repo, recommendations, deepInsights, issuesCreated }]
  error: null,
  options: {},
};

function resetScanState() {
  scanState.status = 'idle';
  scanState.startedAt = null;
  scanState.completedAt = null;
  scanState.progress = { current: 0, total: 0, currentRepo: null };
  scanState.results = [];
  scanState.error = null;
  scanState.options = {};
}

/** Get a read-only snapshot of current scan state. */
function getScanStatus() {
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
function getScanResults(minPriority) {
  const { PRIORITY_RANK } = require('../../packages/core');

  let results = scanState.results;

  if (minPriority) {
    const min = PRIORITY_RANK[minPriority] || 0;
    results = results.map((r) => ({
      ...r,
      recommendations: r.recommendations.filter(
        (rec) => (PRIORITY_RANK[rec.priority] || 0) >= min,
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

/**
 * Start a proactive scan. Runs asynchronously (fire-and-forget).
 *
 * @param {object} params
 * @param {import('@octokit/rest').Octokit} params.octokit
 * @param {string} params.token
 * @param {object} params.options
 */
async function startScan({ octokit, token, options }) {
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
      const repo = activeRepos[i];
      scanState.progress.current = i + 1;
      scanState.progress.currentRepo = repo.full_name;

      let analysis;
      try {
        analysis = await analyzeRepoFull({
          octokit,
          repo,
          token,
          options: { useAI, model },
        });
      } catch (err) {
        analysis = analyzeRepository(repo);
        analysis.deepInsights = null;
        analysis.aiAnalyzed = false;
        console.warn(`Analyse feilet for ${repo.full_name}:`, err.message);
      }

      // Filter recommendations by minPriority
      const filteredRecs = (analysis.recommendations || []).filter((r) =>
        meetsMinPriority(r.priority, minPriority),
      );

      const result = {
        repo: analysis.repo,
        deepInsights: analysis.deepInsights || null,
        recommendations: filteredRecs,
        issuesCreated: [],
      };

      // 3. Create issues if requested
      if (createIssues && filteredRecs.length > 0) {
        const [owner, repoName] = repo.full_name.split('/');

        let existingTitles = new Set();
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

            let issue;
            try {
              const { data } = await octokit.issues.create({
                owner, repo: repoName, title: issueTitle, body, labels,
              });
              issue = data;
            } catch (labelErr) {
              if (labelErr.status === 422) {
                const { data } = await octokit.issues.create({
                  owner, repo: repoName, title: issueTitle, body, labels: ['evo-scan'],
                });
                issue = data;
              } else {
                throw labelErr;
              }
            }

            let copilotAssigned = false;
            if (assignCopilot && issue) {
              const assignment = await assignCopilotToIssue(octokit, {
                owner, repoName, issueNumber: issue.number,
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
          } catch (err) {
            result.issuesCreated.push({ title: rec.title, status: 'error', error: err.message });
          }
        }
      }

      scanState.results.push(result);
    }

    scanState.status = 'completed';
    scanState.completedAt = new Date().toISOString();
    scanState.progress.currentRepo = null;
    console.log(`✓ Proaktiv skanning fullført: ${scanState.results.length} repos analysert.`);
  } catch (err) {
    scanState.status = 'error';
    scanState.error = err.message;
    scanState.completedAt = new Date().toISOString();
    console.error('Proaktiv skanning feilet:', err.message);
  }
}

/**
 * Create issues from existing scan results (batch / selective).
 *
 * @param {object} params
 * @param {import('@octokit/rest').Octokit} params.octokit
 * @param {boolean} params.assignCopilot
 * @param {Array|null} params.selected  — [{repoFullName, recIndex}] or null for all
 * @returns {Promise<{created, skipped, errors}>}
 */
async function createIssuesFromResults({ octokit, assignCopilot, selected }) {
  const created = [];
  const skipped = [];
  const errors = [];

  // Build a lookup of selected items
  let selectionMap = null;
  if (Array.isArray(selected) && selected.length > 0) {
    selectionMap = {};
    for (const s of selected) {
      if (!selectionMap[s.repoFullName]) selectionMap[s.repoFullName] = new Set();
      selectionMap[s.repoFullName].add(s.recIndex);
    }
  }

  for (const result of scanState.results) {
    if (result.recommendations.length === 0) continue;

    if (selectionMap && !selectionMap[result.repo.fullName]) continue;
    if (!selectionMap && result.issuesCreated.some((i) => i.status === 'created')) continue;

    const [owner, repoName] = result.repo.fullName.split('/');

    let existingTitles = new Set();
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

    const repoSelection = selectionMap ? selectionMap[result.repo.fullName] : null;

    for (let idx = 0; idx < result.recommendations.length; idx++) {
      const rec = result.recommendations[idx];

      if (repoSelection && !repoSelection.has(idx)) continue;

      if (result.issuesCreated.find((ic) => ic.title === rec.title && ic.status === 'created')) {
        skipped.push({ repo: result.repo.fullName, title: rec.title, reason: 'already-created' });
        continue;
      }

      const issueTitle = `[Evo] ${rec.title}`;
      if (existingTitles.has(issueTitle.toLowerCase().trim())) {
        skipped.push({ repo: result.repo.fullName, title: rec.title, reason: 'duplicate' });
        continue;
      }

      try {
        const body = buildScanIssueBody(rec, { compact: true });
        const labels = ['evo-scan'];
        if (rec.priority === 'high') labels.push('priority: high');
        if (rec.priority === 'medium') labels.push('priority: medium');

        let issue;
        try {
          const { data } = await octokit.issues.create({
            owner, repo: repoName, title: issueTitle, body, labels,
          });
          issue = data;
        } catch (labelErr) {
          if (labelErr.status === 422) {
            const { data } = await octokit.issues.create({
              owner, repo: repoName, title: issueTitle, body, labels: ['evo-scan'],
            });
            issue = data;
          } else throw labelErr;
        }

        let copilotAssigned = false;
        if (assignCopilot && issue) {
          const assignment = await assignCopilotToIssue(octokit, {
            owner, repoName, issueNumber: issue.number,
          });
          copilotAssigned = assignment.copilotAssigned;
        }

        created.push({
          repo: result.repo.fullName,
          title: rec.title,
          issueUrl: issue.html_url,
          copilotAssigned,
        });
        result.issuesCreated.push({
          title: rec.title,
          status: 'created',
          issueUrl: issue.html_url,
          issueNumber: issue.number,
          copilotAssigned,
        });
      } catch (err) {
        errors.push({ repo: result.repo.fullName, title: rec.title, error: err.message });
        result.issuesCreated.push({ title: rec.title, status: 'error', error: err.message });
      }
    }
  }

  return { created, skipped, errors };
}

module.exports = {
  scanState,
  resetScanState,
  getScanStatus,
  getScanResults,
  startScan,
  createIssuesFromResults,
};

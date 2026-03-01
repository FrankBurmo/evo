/**
 * Proactive scan routes.
 *
 *   POST /api/scan/start
 *   GET  /api/scan/status
 *   GET  /api/scan/results
 *   POST /api/scan/create-issues
 */
const express = require('express');
const { getOctokit, extractToken, assignCopilotToIssue } = require('../github');
const { analyzeRepository, deepAnalyzeRepo } = require('../analyzer');
const { analyzeWithAI } = require('../copilot-client');
const { buildScanIssueBody, buildScanIssueBodyCompact } = require('../templates');
const { PRIORITY_RANK, meetsMinPriority } = require('../../packages/core');

const router = express.Router();

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

// ── Priority helpers (meetsMin bruker alias for bakoverkompatibilitet) ───────
const meetsMin = (p, minPriority) => meetsMinPriority(p, minPriority);

// ── POST /api/scan/start ────────────────────────────────────────────────────
router.post('/scan/start', async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (scanState.status === 'running') {
    return res.status(409).json({ error: 'En skanning kjører allerede. Vent til den er ferdig.' });
  }

  const {
    createIssues = false,
    assignCopilot = false,
    minPriority = 'medium',
    maxRepos = 50,
    useAI = true,
    model,
  } = req.body || {};

  // Reset and start
  resetScanState();
  scanState.status = 'running';
  scanState.startedAt = new Date().toISOString();
  scanState.options = { createIssues, assignCopilot, minPriority, maxRepos, useAI };

  // Respond immediately — scan runs in background
  res.json({
    status: 'started',
    message: 'Proaktiv skanning startet.',
    startedAt: scanState.startedAt,
  });

  // Run the scan asynchronously
  try {
    const octokit = getOctokit(token);

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
        analysis = await deepAnalyzeRepo(octokit, repo);
      } catch (err) {
        // Fallback to basic analysis if deep fails
        analysis = analyzeRepository(repo);
        analysis.deepInsights = null;
      }

      // KI-analyse (om aktivert)
      if (useAI && token) {
        try {
          const existingTitles = (analysis.recommendations || []).map((r) => r.title);
          const aiResult = await analyzeWithAI({
            token,
            model,
            repo: analysis.repo || {
              fullName: repo.full_name,
              language: repo.language,
              description: repo.description,
              visibility: repo.private ? 'private' : 'public',
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              openIssues: repo.open_issues_count,
              updatedAt: repo.updated_at,
              license: repo.license?.spdx_id,
            },
            deepInsights: analysis.deepInsights,
            existingRecs: existingTitles,
          });

          const existingSet = new Set(existingTitles.map((t) => t.toLowerCase()));
          const newAIRecs = (aiResult.recommendations || []).filter(
            (r) => !existingSet.has(r.title.toLowerCase()),
          );
          analysis.recommendations = [...(analysis.recommendations || []), ...newAIRecs];
          analysis.aiSummary = aiResult.summary;
          analysis.aiAnalyzed = true;
        } catch (aiErr) {
          console.warn(`KI-analyse feilet for ${repo.full_name}:`, aiErr.message);
          analysis.aiAnalyzed = false;
        }
      }

      // Filter recommendations by minPriority
      const filteredRecs = (analysis.recommendations || []).filter((r) =>
        meetsMin(r.priority, minPriority),
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

        // Fetch existing evo-scan issues once per repo for dedup
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
});

// ── GET /api/scan/status ────────────────────────────────────────────────────
router.get('/scan/status', (req, res) => {
  res.json({
    status: scanState.status,
    startedAt: scanState.startedAt,
    completedAt: scanState.completedAt,
    progress: scanState.progress,
    error: scanState.error,
    options: scanState.options,
    resultCount: scanState.results.length,
  });
});

// ── GET /api/scan/results ───────────────────────────────────────────────────
router.get('/scan/results', (req, res) => {
  const { minPriority } = req.query;

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

  res.json({
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
  });
});

// ── POST /api/scan/create-issues ────────────────────────────────────────────
router.post('/scan/create-issues', async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (scanState.status !== 'completed' || scanState.results.length === 0) {
    return res
      .status(400)
      .json({ error: 'Ingen skanningsresultater tilgjengelig. Kjør en skanning først.' });
  }

  const { assignCopilot = false, selected } = req.body || {};
  const octokit = getOctokit(token);
  const created = [];
  const skipped = [];
  const errors = [];

  // Build a lookup of selected items: { repoFullName: Set<recIndex> }
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

    // If selection provided, skip repos not in selection
    if (selectionMap && !selectionMap[result.repo.fullName]) continue;

    // Without selection, skip repos that already had all issues created
    if (!selectionMap && result.issuesCreated.some((i) => i.status === 'created')) continue;

    const [owner, repoName] = result.repo.fullName.split('/');

    // Dedup check
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

      // If selection provided, only process selected indices
      if (repoSelection && !repoSelection.has(idx)) continue;

      // Skip already-created issues
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
        const body = buildScanIssueBodyCompact(rec);
        const labels = ['evo-scan'];
        if (rec.priority === 'high') labels.push('priority: high');
        if (rec.priority === 'medium') labels.push('priority: medium');

        let issue;
        try {
          const { data } = await octokit.issues.create({
            owner,
            repo: repoName,
            title: issueTitle,
            body,
            labels,
          });
          issue = data;
        } catch (labelErr) {
          if (labelErr.status === 422) {
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

  res.json({
    success: true,
    summary: { created: created.length, skipped: skipped.length, errors: errors.length },
    created,
    skipped,
    errors,
  });
});

module.exports = router;

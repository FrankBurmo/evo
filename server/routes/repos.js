/**
 * Repository analysis routes.
 *
 *   GET  /api/repos
 *   GET  /api/repo/:owner/:name
 *   GET  /api/repo/:owner/:name/deep
 *   POST /api/repo/:owner/:name/ai-analyze
 */
const express = require('express');
const { getOctokit, extractToken } = require('../github');
const { analyzeRepository, deepAnalyzeRepo } = require('../analyzer');
const { analyzeWithAI } = require('../copilot-client');

const router = express.Router();

// ── GET /api/repos ──────────────────────────────────────────────────────────
router.get('/repos', async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'GitHub token required. Please provide a token.' });
    }

    const octokit = getOctokit(token);

    const allRepos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner',
    });

    const activeRepos = allRepos.filter((repo) => !repo.archived);
    const analyzedRepos = activeRepos.map((repo) => analyzeRepository(repo));

    res.json({
      totalRepos: analyzedRepos.length,
      repositories: analyzedRepos,
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories', message: error.message });
  }
});

// ── GET /api/repo/:owner/:name ──────────────────────────────────────────────
router.get('/repo/:owner/:name', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'GitHub token required' });
    }

    const octokit = getOctokit(token);
    const { data: repo } = await octokit.repos.get({ owner, repo: name });

    const analysis = await deepAnalyzeRepo(octokit, repo);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching repository:', error);
    res.status(500).json({ error: 'Failed to fetch repository', message: error.message });
  }
});

// ── GET /api/repo/:owner/:name/deep ─────────────────────────────────────────
router.get('/repo/:owner/:name/deep', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const token = extractToken(req);
    const useAI = req.query.ai !== 'false';

    if (!token) {
      return res.status(401).json({ error: 'GitHub token required' });
    }

    const octokit = getOctokit(token);
    const { data: repo } = await octokit.repos.get({ owner, repo: name });
    const analysis = await deepAnalyzeRepo(octokit, repo);

    // KI-analyse: kombiner regelbasert + AI-drevet
    if (useAI && token) {
      try {
        const existingTitles = (analysis.recommendations || []).map((r) => r.title);
        const aiResult = await analyzeWithAI({
          token,
          repo: analysis.repo,
          deepInsights: analysis.deepInsights,
          existingRecs: existingTitles,
        });

        const existingSet = new Set(existingTitles.map((t) => t.toLowerCase()));
        const newAIRecs = (aiResult.recommendations || []).filter(
          (r) => !existingSet.has(r.title.toLowerCase()),
        );
        analysis.recommendations = [...analysis.recommendations, ...newAIRecs];
        analysis.aiSummary = aiResult.summary;
        analysis.aiAnalyzed = true;
      } catch (aiError) {
        console.warn('KI-analyse feilet, bruker kun regelbasert analyse:', aiError.message);
        analysis.aiAnalyzed = false;
        analysis.aiError = aiError.message;
      }
    } else {
      analysis.aiAnalyzed = false;
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error in deep analysis:', error);
    res.status(500).json({ error: 'Failed to deep-analyse repository', message: error.message });
  }
});

// ── POST /api/repo/:owner/:name/ai-analyze ──────────────────────────────────
router.post('/repo/:owner/:name/ai-analyze', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'GitHub token required' });
    }

    const { model } = req.body || {};
    const octokit = getOctokit(token);
    const { data: repo } = await octokit.repos.get({ owner, repo: name });
    const analysis = await deepAnalyzeRepo(octokit, repo);

    const existingTitles = (analysis.recommendations || []).map((r) => r.title);
    const aiResult = await analyzeWithAI({
      token,
      model,
      repo: analysis.repo,
      deepInsights: analysis.deepInsights,
      existingRecs: existingTitles,
    });

    const existingSet = new Set(existingTitles.map((t) => t.toLowerCase()));
    const newAIRecs = (aiResult.recommendations || []).filter(
      (r) => !existingSet.has(r.title.toLowerCase()),
    );

    res.json({
      repo: analysis.repo,
      deepInsights: analysis.deepInsights,
      aiSummary: aiResult.summary,
      projectType: aiResult.projectType,
      recommendations: [...analysis.recommendations, ...newAIRecs],
      ruleBasedCount: analysis.recommendations.length,
      aiCount: newAIRecs.length,
    });
  } catch (error) {
    console.error('Error in AI analysis:', error);
    res.status(500).json({ error: 'KI-analyse feilet', message: error.message });
  }
});

module.exports = router;

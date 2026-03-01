/**
 * Repository analysis routes.
 *
 *   GET  /api/repos
 *   GET  /api/repo/:owner/:name
 *   GET  /api/repo/:owner/:name/deep
 *   POST /api/repo/:owner/:name/ai-analyze
 */
const express = require('express');
const { getOctokit } = require('../github');
const { analyzeRepository, deepAnalyzeRepo } = require('../analyzer');
const { analyzeRepoFull } = require('../services/analysis-service');
const { requireAuth } = require('../middleware');
const { validate, repoParamsSchema, aiAnalyzeSchema } = require('../validation');

const router = express.Router();

// Alle repo-ruter krever autentisering
router.use('/repos', requireAuth);
router.use('/repo', requireAuth);

// ── GET /api/repos ──────────────────────────────────────────────────────────
router.get('/repos', async (req, res, next) => {
  try {
    const octokit = getOctokit(req.token);

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
    next(error);
  }
});

// ── GET /api/repo/:owner/:name ──────────────────────────────────────────────
router.get('/repo/:owner/:name', validate({ params: repoParamsSchema }), async (req, res, next) => {
  try {
    const { owner, name } = req.params;
    const octokit = getOctokit(req.token);
    const { data: repo } = await octokit.repos.get({ owner, repo: name });

    const analysis = await deepAnalyzeRepo(octokit, repo);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// ── GET /api/repo/:owner/:name/deep ─────────────────────────────────────────
router.get('/repo/:owner/:name/deep', validate({ params: repoParamsSchema }), async (req, res, next) => {
  try {
    const { owner, name } = req.params;
    const useAI = req.query.ai !== 'false';

    const octokit = getOctokit(req.token);
    const { data: repo } = await octokit.repos.get({ owner, repo: name });
    const analysis = await analyzeRepoFull({ octokit, repo, token: req.token, options: { useAI } });
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// ── POST /api/repo/:owner/:name/ai-analyze ──────────────────────────────────
router.post(
  '/repo/:owner/:name/ai-analyze',
  validate({ params: repoParamsSchema, body: aiAnalyzeSchema }),
  async (req, res, next) => {
    try {
      const { owner, name } = req.params;
      const { model } = req.body || {};
      const octokit = getOctokit(req.token);
      const { data: repo } = await octokit.repos.get({ owner, repo: name });

      const analysis = await analyzeRepoFull({ octokit, repo, token: req.token, options: { useAI: true, model } });

      res.json({
        repo: analysis.repo,
        deepInsights: analysis.deepInsights,
        aiSummary: analysis.aiSummary,
        projectType: analysis.aiProjectType,
        recommendations: analysis.recommendations,
        ruleBasedCount: analysis.ruleBasedCount,
        aiCount: analysis.aiCount,
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;

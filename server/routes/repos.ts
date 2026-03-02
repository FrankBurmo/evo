/**
 * Repository analysis routes.
 *
 *   GET  /api/repos
 *   GET  /api/repo/:owner/:name
 *   GET  /api/repo/:owner/:name/deep
 *   POST /api/repo/:owner/:name/ai-analyze
 */
import { Router } from 'express';
import { getOctokit } from '../github';
import { analyzeRepository, deepAnalyzeRepo } from '../analyzer';
import { analyzeRepoFull } from '../services/analysis-service';
import { requireAuth } from '../middleware';
import { validate, repoParamsSchema, aiAnalyzeSchema } from '../validation';

const router = Router();

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
    const analyzedRepos = activeRepos.map((repo) => analyzeRepository(repo as unknown as Parameters<typeof analyzeRepository>[0]));

    res.json({
      totalRepos: analyzedRepos.length,
      repositories: analyzedRepos,
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/repo/:owner/:name ──────────────────────────────────────────────
router.get(
  '/repo/:owner/:name',
  validate({ params: repoParamsSchema }),
  async (req, res, next) => {
    try {
      const { owner, name } = req.params as { owner: string; name: string };
      const octokit = getOctokit(req.token);
      const { data: repo } = await octokit.repos.get({ owner, repo: name });

      const analysis = await deepAnalyzeRepo(octokit, repo as unknown as Record<string, unknown>);
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  },
);

// ── GET /api/repo/:owner/:name/deep ─────────────────────────────────────────
router.get(
  '/repo/:owner/:name/deep',
  validate({ params: repoParamsSchema }),
  async (req, res, next) => {
    try {
      const { owner, name } = req.params as { owner: string; name: string };
      const useAI = req.query.ai !== 'false';

      const octokit = getOctokit(req.token);
      const { data: repo } = await octokit.repos.get({ owner, repo: name });
      const analysis = await analyzeRepoFull({
        octokit,
        repo: repo as unknown as Record<string, unknown>,
        token: req.token,
        options: { useAI },
      });
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /api/repo/:owner/:name/ai-analyze ──────────────────────────────────
router.post(
  '/repo/:owner/:name/ai-analyze',
  validate({ params: repoParamsSchema, body: aiAnalyzeSchema }),
  async (req, res, next) => {
    try {
      const { owner, name } = req.params as { owner: string; name: string };
      const { model } = (req.body || {}) as { model?: string };
      const octokit = getOctokit(req.token);
      const { data: repo } = await octokit.repos.get({ owner, repo: name });

      const analysis = await analyzeRepoFull({
        octokit,
        repo: repo as unknown as Record<string, unknown>,
        token: req.token,
        options: { useAI: true, model },
      });

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

export = router;

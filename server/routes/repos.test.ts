const request = require('supertest');
const express = require('express');

// ── Resolve absolutte stier for cache-styring ────────────────────────────────
const reposPath = require.resolve('./repos');
const middlewarePath = require.resolve('../middleware');

// ── Behold referanser til ekte eksporter for restore ─────────────────────────
const github = require('../github');
const analyzer = require('../analyzer');
const analysisService = require('../services/analysis-service');

const originals = {
  getOctokit: github.getOctokit,
  analyzeRepository: analyzer.analyzeRepository,
  deepAnalyzeRepo: analyzer.deepAnalyzeRepo,
  analyzeRepoFull: analysisService.analyzeRepoFull,
};

// ── Tester ───────────────────────────────────────────────────────────────────

describe('routes/repos', () => {
  let app;
  let mockOctokit;

  beforeEach(() => {
    // Fjern cache for route og middleware slik at de re-importeres med patchede avhengigheter
    delete require.cache[reposPath];
    delete require.cache[middlewarePath];

    // Sett opp mock Octokit
    mockOctokit = {
      paginate: vi.fn(),
      repos: { listForAuthenticatedUser: vi.fn(), get: vi.fn() },
    };

    // Patch modul-eksporter FØR route-modulen lastes
    github.getOctokit = vi.fn(() => mockOctokit);
    analyzer.analyzeRepository = vi.fn((repo) => ({
      repo: { name: repo.name, fullName: repo.full_name, stars: repo.stargazers_count || 0 },
      recommendations: [{ title: 'Test-anbefaling', priority: 'medium', type: 'testing' }],
      insights: { recentActivity: true },
    }));
    analyzer.deepAnalyzeRepo = vi.fn(async (_octokit, repo) => ({
      repo: { name: repo.name, fullName: repo.full_name },
      recommendations: [{ title: 'Dyp anbefaling', priority: 'high', type: 'architecture' }],
      deepInsights: { projectType: 'web-app', hasTests: true },
    }));
    analysisService.analyzeRepoFull = vi.fn(async ({ repo }) => ({
      repo: { name: repo.name, fullName: repo.full_name },
      recommendations: [{ title: 'Full anbefaling', priority: 'high', type: 'security' }],
      deepInsights: { projectType: 'web-app' },
      aiSummary: 'AI-oppsummering av repoet.',
      aiProjectType: 'web-app',
      ruleBasedCount: 1,
      aiCount: 0,
    }));

    // Last route-modulen på nytt — den plukker opp de patchede avhengighetene
    const reposRoutes = require('./repos');
    app = express();
    app.use(express.json());
    app.use('/api', reposRoutes);
    app.use((err, _req, res, _next) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  afterEach(() => {
    github.getOctokit = originals.getOctokit;
    analyzer.analyzeRepository = originals.analyzeRepository;
    analyzer.deepAnalyzeRepo = originals.deepAnalyzeRepo;
    analysisService.analyzeRepoFull = originals.analyzeRepoFull;
  });

  // ── GET /api/repos ──────────────────────────────────────────────────────

  describe('GET /api/repos', () => {
    it('returnerer 401 uten Authorization-header', async () => {
      const res = await request(app).get('/api/repos');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returnerer analyserte repos', async () => {
      mockOctokit.paginate.mockResolvedValue([
        { name: 'repo-1', full_name: 'user/repo-1', archived: false, stargazers_count: 5 },
        { name: 'repo-2', full_name: 'user/repo-2', archived: false, stargazers_count: 10 },
      ]);

      const res = await request(app)
        .get('/api/repos')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.totalRepos).toBe(2);
      expect(res.body.repositories).toHaveLength(2);
      expect(github.getOctokit).toHaveBeenCalledWith('mock-token');
    });

    it('filtrerer bort arkiverte repos', async () => {
      mockOctokit.paginate.mockResolvedValue([
        { name: 'active', full_name: 'user/active', archived: false },
        { name: 'archived', full_name: 'user/archived', archived: true },
      ]);

      const res = await request(app)
        .get('/api/repos')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.totalRepos).toBe(1);
      expect(res.body.repositories[0].repo.name).toBe('active');
    });

    it('kaller analyzeRepository for hvert aktivt repo', async () => {
      mockOctokit.paginate.mockResolvedValue([
        { name: 'r1', full_name: 'u/r1', archived: false },
        { name: 'r2', full_name: 'u/r2', archived: false },
        { name: 'r3', full_name: 'u/r3', archived: false },
      ]);

      await request(app)
        .get('/api/repos')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(analyzer.analyzeRepository).toHaveBeenCalledTimes(3);
    });

    it('returnerer 500 ved Octokit-feil', async () => {
      mockOctokit.paginate.mockRejectedValue(new Error('GitHub API feil'));

      const res = await request(app)
        .get('/api/repos')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('GitHub API feil');
    });
  });

  // ── GET /api/repo/:owner/:name ──────────────────────────────────────────

  describe('GET /api/repo/:owner/:name', () => {
    it('returnerer dyp analyse av repo', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { name: 'evo', full_name: 'user/evo' },
      });

      const res = await request(app)
        .get('/api/repo/user/evo')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.repo.name).toBe('evo');
      expect(res.body.deepInsights).toBeDefined();
      expect(analyzer.deepAnalyzeRepo).toHaveBeenCalledWith(mockOctokit, { name: 'evo', full_name: 'user/evo' });
    });

    it('returnerer 500 når repo ikke finnes', async () => {
      mockOctokit.repos.get.mockRejectedValue(new Error('Not Found'));

      const res = await request(app)
        .get('/api/repo/user/nonexistent')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(500);
    });
  });

  // ── GET /api/repo/:owner/:name/deep ─────────────────────────────────────

  describe('GET /api/repo/:owner/:name/deep', () => {
    it('returnerer full analyse med AI', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { name: 'evo', full_name: 'user/evo' },
      });

      const res = await request(app)
        .get('/api/repo/user/evo/deep')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(analysisService.analyzeRepoFull).toHaveBeenCalledWith(
        expect.objectContaining({ options: { useAI: true } }),
      );
      expect(res.body.aiSummary).toBe('AI-oppsummering av repoet.');
    });

    it('respekterer ai=false query-parameter', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { name: 'evo', full_name: 'user/evo' },
      });

      await request(app)
        .get('/api/repo/user/evo/deep?ai=false')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(analysisService.analyzeRepoFull).toHaveBeenCalledWith(
        expect.objectContaining({ options: { useAI: false } }),
      );
    });
  });

  // ── POST /api/repo/:owner/:name/ai-analyze ─────────────────────────────

  describe('POST /api/repo/:owner/:name/ai-analyze', () => {
    it('returnerer AI-analyse med prosjekttype', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { name: 'evo', full_name: 'user/evo' },
      });

      const res = await request(app)
        .post('/api/repo/user/evo/ai-analyze')
        .set('Authorization', 'Bearer mock-token')
        .send({ model: 'openai/gpt-4.1' })
        .expect(200);

      expect(res.body.projectType).toBe('web-app');
      expect(res.body.aiSummary).toBeDefined();
      expect(res.body.recommendations).toBeDefined();
    });

    it('aksepterer tom body', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { name: 'evo', full_name: 'user/evo' },
      });

      const res = await request(app)
        .post('/api/repo/user/evo/ai-analyze')
        .set('Authorization', 'Bearer mock-token')
        .send({})
        .expect(200);

      expect(res.body.repo.name).toBe('evo');
    });

    it('returnerer 401 uten auth', async () => {
      const res = await request(app)
        .post('/api/repo/user/evo/ai-analyze')
        .send({});

      expect(res.status).toBe(401);
    });
  });
});

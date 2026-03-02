const request = require('supertest');
const express = require('express');

// ── Resolve absolutte stier for cache-styring ────────────────────────────────
const scanRoutePath = require.resolve('./scan');
const middlewarePath = require.resolve('../middleware');

const github = require('../github');
const scanService = require('../services/scan-service');

const originals = {
  getOctokit: github.getOctokit,
  scanState: { ...scanService.scanState },
  getScanStatus: scanService.getScanStatus,
  getScanResults: scanService.getScanResults,
  startScan: scanService.startScan,
  createIssuesFromResults: scanService.createIssuesFromResults,
};

describe('routes/scan', () => {
  let app;
  let mockOctokit;

  beforeEach(() => {
    delete require.cache[scanRoutePath];
    delete require.cache[middlewarePath];

    mockOctokit = {
      paginate: vi.fn(),
      repos: { listForAuthenticatedUser: vi.fn() },
      issues: { create: vi.fn(), listForRepo: vi.fn() },
    };

    github.getOctokit = vi.fn(() => mockOctokit);

    // Reset scan state til idle
    Object.assign(scanService.scanState, {
      status: 'idle',
      startedAt: null,
      completedAt: null,
      progress: { current: 0, total: 0, currentRepo: null },
      results: [],
      error: null,
      options: {},
    });

    scanService.getScanStatus = vi.fn(() => ({
      status: 'idle',
      startedAt: null,
      completedAt: null,
      progress: { current: 0, total: 0, currentRepo: null },
      error: null,
      options: {},
      resultCount: 0,
    }));
    scanService.getScanResults = vi.fn(() => ({
      status: 'idle',
      startedAt: null,
      completedAt: null,
      summary: { reposScanned: 0, totalRecommendations: 0, totalIssuesAttempted: 0, issuesCreated: 0 },
      results: [],
    }));
    scanService.startScan = vi.fn();
    scanService.createIssuesFromResults = vi.fn().mockResolvedValue({
      created: [{ title: 'Issue 1', url: 'https://github.com/u/r/issues/1' }],
      skipped: [],
      errors: [],
    });

    const scanRoutes = require('./scan');
    app = express();
    app.use(express.json());
    app.use('/api', scanRoutes);
    app.use((err, _req, res, _next) => {
      res.status(err.status || 500).json({ error: err.message || 'Server error' });
    });
  });

  afterEach(() => {
    github.getOctokit = originals.getOctokit;
    scanService.getScanStatus = originals.getScanStatus;
    scanService.getScanResults = originals.getScanResults;
    scanService.startScan = originals.startScan;
    scanService.createIssuesFromResults = originals.createIssuesFromResults;
    // Restore scan state
    Object.assign(scanService.scanState, {
      status: 'idle', startedAt: null, completedAt: null,
      progress: { current: 0, total: 0, currentRepo: null },
      results: [], error: null, options: {},
    });
  });

  // ── POST /api/scan/start ──────────────────────────────────────────────────

  describe('POST /api/scan/start', () => {
    it('starter skanning og returnerer umiddelbart', async () => {
      const res = await request(app)
        .post('/api/scan/start')
        .set('Authorization', 'Bearer mock-token')
        .send({})
        .expect(200);

      expect(res.body.status).toBe('started');
      expect(res.body.message).toContain('skanning');
      expect(scanService.startScan).toHaveBeenCalled();
    });

    it('returnerer 409 hvis skanning allerede kjører', async () => {
      scanService.scanState.status = 'running';

      const res = await request(app)
        .post('/api/scan/start')
        .set('Authorization', 'Bearer mock-token')
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
    });

    it('returnerer 401 uten auth', async () => {
      const res = await request(app)
        .post('/api/scan/start')
        .send({});
      expect(res.status).toBe(401);
    });

    it('sender options videre til startScan', async () => {
      const opts = { minPriority: 'high', maxRepos: 10, useAI: false };

      await request(app)
        .post('/api/scan/start')
        .set('Authorization', 'Bearer mock-token')
        .send(opts)
        .expect(200);

      expect(scanService.startScan).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'mock-token' }),
      );
    });
  });

  // ── GET /api/scan/status ──────────────────────────────────────────────────

  describe('GET /api/scan/status', () => {
    it('returnerer skanningsstatus', async () => {
      const res = await request(app)
        .get('/api/scan/status')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.status).toBe('idle');
      expect(scanService.getScanStatus).toHaveBeenCalled();
    });
  });

  // ── GET /api/scan/results ─────────────────────────────────────────────────

  describe('GET /api/scan/results', () => {
    it('returnerer skanningsresultater', async () => {
      const res = await request(app)
        .get('/api/scan/results')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.results).toEqual([]);
      expect(scanService.getScanResults).toHaveBeenCalled();
    });

    it('videresender minPriority query-param', async () => {
      await request(app)
        .get('/api/scan/results?minPriority=high')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(scanService.getScanResults).toHaveBeenCalledWith('high');
    });
  });

  // ── POST /api/scan/create-issues ──────────────────────────────────────────

  describe('POST /api/scan/create-issues', () => {
    it('returnerer 400 når ingen resultater finnes', async () => {
      const res = await request(app)
        .post('/api/scan/create-issues')
        .set('Authorization', 'Bearer mock-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Ingen skanningsresultater');
    });

    it('oppretter issues fra scan-resultater', async () => {
      // Sett scan state til completed med resultater
      scanService.scanState.status = 'completed';
      scanService.scanState.results = [{ repo: { name: 'test' }, recommendations: [{ title: 'R1' }] }];

      const res = await request(app)
        .post('/api/scan/create-issues')
        .set('Authorization', 'Bearer mock-token')
        .send({ assignCopilot: true })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.summary.created).toBe(1);
      expect(scanService.createIssuesFromResults).toHaveBeenCalledWith(
        expect.objectContaining({ assignCopilot: true }),
      );
    });
  });
});

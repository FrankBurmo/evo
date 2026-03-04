const request = require('supertest');
const express = require('express');

// ── Resolve absolutte stier for cache-styring ────────────────────────────────
const issuesPath = require.resolve('./issues');
const middlewarePath = require.resolve('../middleware');

const github = require('../github');
const issueService = require('../services/issue-service');

const originals = {
  getOctokit: github.getOctokit,
  assignCopilotToIssue: github.assignCopilotToIssue,
  createTemplateIssue: issueService.createTemplateIssue,
};

describe('routes/issues', () => {
  let app;
  let mockOctokit;

  beforeEach(() => {
    delete require.cache[issuesPath];
    delete require.cache[middlewarePath];

    mockOctokit = {
      issues: {
        create: vi.fn().mockResolvedValue({
          data: { number: 42, html_url: 'https://github.com/u/r/issues/42' },
        }),
      },
      graphql: vi.fn(),
    };

    github.getOctokit = vi.fn(() => mockOctokit);
    github.assignCopilotToIssue = vi.fn().mockResolvedValue({ copilotAssigned: true, botLogin: 'copilot-bot' });
    issueService.createTemplateIssue = vi.fn().mockResolvedValue({
      success: true,
      issueUrl: 'https://github.com/u/r/issues/99',
      issueNumber: 99,
      copilotAssigned: true,
      note: 'OK',
    });

    const issuesRoutes = require('./issues');
    app = express();
    app.use(express.json());
    app.use('/api', issuesRoutes);
    app.use((err, _req, res, _next) => {
      res.status(err.status || 500).json({ error: err.message || 'Server error' });
    });
  });

  afterEach(() => {
    github.getOctokit = originals.getOctokit;
    github.assignCopilotToIssue = originals.assignCopilotToIssue;
    issueService.createTemplateIssue = originals.createTemplateIssue;
  });

  // ── POST /api/create-agent-issue ──────────────────────────────────────────

  describe('POST /api/create-agent-issue', () => {
    const validBody = {
      owner: 'testuser',
      repo: 'testrepo',
      recommendation: {
        title: 'Legg til tester',
        description: 'Repoet mangler tester',
        priority: 'high',
        type: 'testing',
      },
    };

    it('oppretter issue og tildeler Copilot', async () => {
      const res = await request(app)
        .post('/api/create-agent-issue')
        .set('Authorization', 'Bearer mock-token')
        .send(validBody)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.issueNumber).toBe(42);
      expect(res.body.copilotAssigned).toBe(true);
      expect(mockOctokit.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'testuser',
          repo: 'testrepo',
          title: expect.stringContaining('Legg til tester'),
        }),
      );
    });

    it('returnerer 401 uten auth', async () => {
      const savedToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;

      const res = await request(app)
        .post('/api/create-agent-issue')
        .send(validBody);
      expect(res.status).toBe(401);

      if (savedToken !== undefined) process.env.GITHUB_TOKEN = savedToken;
    });

    it('returnerer valideringsfeil ved manglende felt', async () => {
      const res = await request(app)
        .post('/api/create-agent-issue')
        .set('Authorization', 'Bearer mock-token')
        .send({ owner: 'x' });

      expect(res.status).toBe(400);
    });

    it('inkluderer marketOpportunity i issue-body', async () => {
      const body = {
        ...validBody,
        recommendation: { ...validBody.recommendation, marketOpportunity: 'Stor verdi' },
      };

      await request(app)
        .post('/api/create-agent-issue')
        .set('Authorization', 'Bearer mock-token')
        .send(body)
        .expect(200);

      const createCall = mockOctokit.issues.create.mock.calls[0][0];
      expect(createCall.body).toContain('Stor verdi');
    });

    it('håndterer feil ved issue-opprettelse', async () => {
      mockOctokit.issues.create.mockRejectedValue(new Error('Create feilet'));

      const res = await request(app)
        .post('/api/create-agent-issue')
        .set('Authorization', 'Bearer mock-token')
        .send(validBody);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/guardrails/architecture-analysis ────────────────────────────

  describe('POST /api/guardrails/architecture-analysis', () => {
    const validBody = { owner: 'testuser', repo: 'testrepo' };

    it('oppretter architecture-analysis issue via createTemplateIssue', async () => {
      const res = await request(app)
        .post('/api/guardrails/architecture-analysis')
        .set('Authorization', 'Bearer mock-token')
        .send(validBody)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(issueService.createTemplateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'testuser',
          repoName: 'testrepo',
          logPrefix: 'Architecture analysis',
        }),
      );
    });

    it('returnerer valideringsfeil uten owner', async () => {
      const res = await request(app)
        .post('/api/guardrails/architecture-analysis')
        .set('Authorization', 'Bearer mock-token')
        .send({ repo: 'testrepo' });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/product-dev/:actionId ───────────────────────────────────────

  describe('POST /api/product-dev/:actionId', () => {
    const validBody = { owner: 'testuser', repo: 'testrepo' };

    it('oppretter issue for gyldig actionId', async () => {
      const res = await request(app)
        .post('/api/product-dev/ux-audit')
        .set('Authorization', 'Bearer mock-token')
        .send(validBody)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(issueService.createTemplateIssue).toHaveBeenCalledWith(
        expect.objectContaining({ logPrefix: 'Product-dev (ux-audit)' }),
      );
    });

    it('returnerer 400 for ukjent actionId', async () => {
      const res = await request(app)
        .post('/api/product-dev/nonexistent')
        .set('Authorization', 'Bearer mock-token')
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Ukjent product-dev action');
    });
  });

  // ── POST /api/engineering-velocity/:actionId ──────────────────────────────

  describe('POST /api/engineering-velocity/:actionId', () => {
    const validBody = { owner: 'testuser', repo: 'testrepo' };

    it('oppretter issue for gyldig actionId', async () => {
      const res = await request(app)
        .post('/api/engineering-velocity/cicd-maturity')
        .set('Authorization', 'Bearer mock-token')
        .send(validBody)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(issueService.createTemplateIssue).toHaveBeenCalledWith(
        expect.objectContaining({ logPrefix: 'Engineering-velocity (cicd-maturity)' }),
      );
    });

    it('returnerer 400 for ukjent actionId', async () => {
      const res = await request(app)
        .post('/api/engineering-velocity/nonexistent')
        .set('Authorization', 'Bearer mock-token')
        .send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Ukjent engineering-velocity action');
    });
  });
});

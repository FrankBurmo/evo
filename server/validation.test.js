/* global vi, describe, it, expect */
'use strict';

const {
  validate,
  createAgentIssueSchema,
  templateIssueSchema,
  scanStartSchema,
  aiAnalyzeSchema,
  repoParamsSchema,
  actionIdParamsSchema,
} = require('./validation');

// Hjelpefunksjon for å kjøre validate-middleware
function runValidate(schemas, req) {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  const next = vi.fn();
  const middleware = validate(schemas);
  middleware(req, res, next);
  return { res, next };
}

// ── validate() middleware ────────────────────────────────────────────────────

describe('validate()', () => {
  it('kaller next ved gyldig body', () => {
    const req = { body: { owner: 'usr', repo: 'rp' }, params: {} };
    const { next } = runValidate({ body: templateIssueSchema }, req);
    expect(next).toHaveBeenCalled();
  });

  it('returnerer 400 ved ugyldig body', () => {
    const req = { body: {}, params: {} };
    const { res, next } = runValidate({ body: templateIssueSchema }, req);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(next).not.toHaveBeenCalled();
  });

  it('erstatter req.body med parsed data (inkl. defaults)', () => {
    const req = { body: {}, params: {} };
    const { next } = runValidate({ body: scanStartSchema }, req);
    expect(next).toHaveBeenCalled();
    expect(req.body.useAI).toBe(true); // default
    expect(req.body.maxRepos).toBe(50); // default
  });

  it('validerer params', () => {
    const req = { params: { owner: 'x', name: 'y' }, body: {} };
    const { next } = runValidate({ params: repoParamsSchema }, req);
    expect(next).toHaveBeenCalled();
  });

  it('returnerer 400 ved ugyldige params', () => {
    const req = { params: { owner: '', name: '' }, body: {} };
    const { res, next } = runValidate({ params: repoParamsSchema }, req);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('URL-parametere');
    expect(next).not.toHaveBeenCalled();
  });
});

// ── Zod-skjemaer ─────────────────────────────────────────────────────────────

describe('createAgentIssueSchema', () => {
  it('godtar gyldig input', () => {
    const result = createAgentIssueSchema.safeParse({
      owner: 'user',
      repo: 'myrepo',
      recommendation: { title: 'Fix bug' },
    });
    expect(result.success).toBe(true);
    expect(result.data.recommendation.priority).toBe('medium'); // default
  });

  it('avviser manglende recommendation.title', () => {
    const result = createAgentIssueSchema.safeParse({
      owner: 'user',
      repo: 'myrepo',
      recommendation: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('scanStartSchema', () => {
  it('bruker defaults for alle felt', () => {
    const result = scanStartSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      createIssues: false,
      assignCopilot: false,
      minPriority: 'medium',
      maxRepos: 50,
      useAI: true,
    });
  });

  it('avviser maxRepos over 200', () => {
    const result = scanStartSchema.safeParse({ maxRepos: 201 });
    expect(result.success).toBe(false);
  });
});

describe('aiAnalyzeSchema', () => {
  it('aksepterer tom body via default', () => {
    const result = aiAnalyzeSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('aksepterer model-parameter', () => {
    const result = aiAnalyzeSchema.safeParse({ model: 'openai/gpt-4.1' });
    expect(result.success).toBe(true);
    expect(result.data.model).toBe('openai/gpt-4.1');
  });
});

describe('repoParamsSchema', () => {
  it('godtar gyldige parametere', () => {
    const result = repoParamsSchema.safeParse({ owner: 'frank', name: 'evo' });
    expect(result.success).toBe(true);
  });
});

describe('actionIdParamsSchema', () => {
  it('godtar gyldig actionId', () => {
    const result = actionIdParamsSchema.safeParse({ actionId: 'ux-audit' });
    expect(result.success).toBe(true);
  });

  it('avviser tom actionId', () => {
    const result = actionIdParamsSchema.safeParse({ actionId: '' });
    expect(result.success).toBe(false);
  });
});

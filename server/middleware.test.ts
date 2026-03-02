const { requireAuth, errorHandler, notFoundHandler } = require('./middleware');

// Hjelpefunksjon for å lage mock req/res
function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

describe('requireAuth', () => {
  it('setter req.token og kaller next ved gyldig auth header', () => {
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);
    expect(req.token).toBe('valid-token');
    expect(next).toHaveBeenCalled();
  });

  it('returnerer 401 uten auth header', () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(next).not.toHaveBeenCalled();

    if (original) process.env.GITHUB_TOKEN = original;
  });
});

describe('errorHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returnerer 500 for uventede feil', () => {
    const err = new Error('Noe gikk galt');
    const req = { method: 'GET', path: '/api/test' };
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal Server Error');
  });

  it('bruker err.status om tilgjengelig', () => {
    const err = new Error('Ikke funnet');
    err.status = 404;
    err.error = 'Not Found';
    const req = { method: 'GET', path: '/api/missing' };
    const res = mockRes();

    errorHandler(err, req, res, vi.fn());
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });

  it('skjuler feilmeldinger i produksjon for 5xx', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Hemmelig feil');
    const req = { method: 'GET', path: '/api/test' };
    const res = mockRes();

    errorHandler(err, req, res, vi.fn());
    expect(res.body.message).toBe('En intern serverfeil oppstod');

    process.env.NODE_ENV = original;
  });
});

describe('notFoundHandler', () => {
  it('returnerer 404 med ruteinformasjon', () => {
    const req = { method: 'GET', path: '/api/unknown' };
    const res = mockRes();

    notFoundHandler(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Not Found');
    expect(res.body.message).toContain('GET /api/unknown');
  });
});

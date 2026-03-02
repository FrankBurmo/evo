const copilotPath = require.resolve('./copilot');

describe('CLI: copilot', () => {
  let analyzeWithAI;
  let originalFetch;

  beforeEach(() => {
    delete require.cache[copilotPath];
    originalFetch = globalThis.fetch;
    ({ analyzeWithAI } = require('./copilot'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parser gyldig JSON-svar fra Copilot API', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'Prosjektet trenger bedre tester.',
            recommendations: [
              { title: 'Legg til unit tests', description: 'x', priority: 'high', type: 'testing' },
            ],
          }),
        },
      }],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await analyzeWithAI({
      token: 'fake',
      model: 'openai/gpt-4.1',
      repo: { fullName: 'u/r', language: 'JS', description: 'Test', visibility: 'public', stars: 0, forks: 0, openIssues: 0, updatedAt: null, license: null },
      existingRecs: [],
    });

    expect(result.summary).toBe('Prosjektet trenger bedre tester.');
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].title).toBe('Legg til unit tests');
  });

  it('kaster feil ved HTTP-feil', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
    });

    await expect(analyzeWithAI({
      token: 'fake',
      model: 'test',
      repo: { fullName: 'u/r', language: '', description: '', visibility: 'public', stars: 0, forks: 0, openIssues: 0 },
    })).rejects.toThrow('Copilot API feil (500)');
  });

  it('kaster feil ved ugyldig JSON-svar', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'Bare tekst uten JSON' } }] }),
    });

    await expect(analyzeWithAI({
      token: 'fake',
      model: 'test',
      repo: { fullName: 'u/r', language: '', description: '', visibility: 'public', stars: 0, forks: 0, openIssues: 0 },
    })).rejects.toThrow('kunne ikke parse JSON');
  });

  it('sender riktig modell og token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{"summary":"ok","recommendations":[]}' } }],
      }),
    });

    await analyzeWithAI({
      token: 'my-token',
      model: 'openai/gpt-4.1',
      repo: { fullName: 'u/r', language: '', description: '', visibility: 'public', stars: 0, forks: 0, openIssues: 0 },
    });

    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('githubcopilot.com');
    expect(opts.headers.Authorization).toBe('Bearer my-token');

    const body = JSON.parse(opts.body);
    expect(body.model).toBe('openai/gpt-4.1');
  });
});

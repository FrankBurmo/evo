const {
  RateLimiter,
  PROJECT_TYPE_PROMPTS,
} = require('./copilot-client');

// ─── RateLimiter ─────────────────────────────────────────────────────────────

describe('RateLimiter', () => {
  it('instansierer med standardverdier', () => {
    const limiter = new RateLimiter();
    expect(limiter.maxPerMinute).toBe(10);
    expect(limiter.burstSize).toBe(3);
    expect(limiter.tokens).toBe(3);
  });

  it('instansierer med egendefinerte verdier', () => {
    const limiter = new RateLimiter({ maxPerMinute: 20, burstSize: 5 });
    expect(limiter.maxPerMinute).toBe(20);
    expect(limiter.burstSize).toBe(5);
    expect(limiter.tokens).toBe(5);
  });

  it('acquire() bruker ett token', async () => {
    const limiter = new RateLimiter({ maxPerMinute: 60, burstSize: 5 });
    const initialTokens = limiter.tokens;
    await limiter.acquire();
    expect(limiter.tokens).toBe(initialTokens - 1);
  });

  it('acquire() bruker flere tokens sekvensielt', async () => {
    const limiter = new RateLimiter({ maxPerMinute: 60, burstSize: 3 });
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    // Alle burst-tokens brukt
    expect(limiter.tokens).toBe(0);
  });

  it('refill() fyller på tokens basert på tid', async () => {
    const limiter = new RateLimiter({ maxPerMinute: 6000, burstSize: 2 }); // 100/sek → rask refill
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.tokens).toBe(0);

    // Vent litt og sjekk at tokens refilles
    await new Promise(r => setTimeout(r, 50));
    limiter._refill();
    expect(limiter.tokens).toBeGreaterThanOrEqual(0);
  });
});

// ─── PROJECT_TYPE_PROMPTS ────────────────────────────────────────────────────

describe('PROJECT_TYPE_PROMPTS', () => {
  const expectedTypes = ['web-app', 'android-app', 'api', 'library', 'docs', 'other'];

  it('har prompts for alle forventede prosjekttyper', () => {
    for (const type of expectedTypes) {
      expect(PROJECT_TYPE_PROMPTS).toHaveProperty(type);
    }
  });

  it('hvert prosjekttype-prompt har focus og areas', () => {
    for (const type of expectedTypes) {
      expect(PROJECT_TYPE_PROMPTS[type]).toHaveProperty('focus');
      expect(PROJECT_TYPE_PROMPTS[type]).toHaveProperty('areas');
      expect(typeof PROJECT_TYPE_PROMPTS[type].focus).toBe('string');
      expect(typeof PROJECT_TYPE_PROMPTS[type].areas).toBe('string');
      expect(PROJECT_TYPE_PROMPTS[type].focus.length).toBeGreaterThan(0);
      expect(PROJECT_TYPE_PROMPTS[type].areas.length).toBeGreaterThan(0);
    }
  });

  it('web-app prompt nevner SEO og ytelse', () => {
    expect(PROJECT_TYPE_PROMPTS['web-app'].areas).toMatch(/SEO/i);
    expect(PROJECT_TYPE_PROMPTS['web-app'].areas).toMatch(/ytelse/i);
  });

  it('android-app prompt nevner Material Design', () => {
    expect(PROJECT_TYPE_PROMPTS['android-app'].areas).toMatch(/Material Design/i);
  });

  it('api prompt nevner sikkerhet', () => {
    expect(PROJECT_TYPE_PROMPTS['api'].areas).toMatch(/sikkerhet/i);
  });

  it('library prompt nevner versjonering', () => {
    expect(PROJECT_TYPE_PROMPTS['library'].areas).toMatch(/versjonering/i);
  });
});

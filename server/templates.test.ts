const {
  architectureAnalysisTemplate,
  PRODUCT_DEV_TEMPLATES,
  ENGINEERING_VELOCITY_TEMPLATES,
  buildScanIssueBody,
} = require('./templates');

describe('architectureAnalysisTemplate', () => {
  it('returnerer title, labels og body', () => {
    const t = architectureAnalysisTemplate('my-repo');
    expect(t.title).toContain('my-repo');
    expect(t.labels).toContain('copilot:run');
    expect(t.body).toContain('Arkitekturanalyse');
  });
});

describe('PRODUCT_DEV_TEMPLATES', () => {
  const expectedKeys = ['ux-audit', 'market-opportunity', 'feature-discovery', 'developer-experience', 'product-market-fit'];

  it('har alle forventede template-funksjoner', () => {
    for (const key of expectedKeys) {
      expect(PRODUCT_DEV_TEMPLATES.has(key)).toBe(true);
      expect(typeof PRODUCT_DEV_TEMPLATES.get(key)).toBe('function');
    }
  });

  it('hver template-funksjon returnerer title, labels og body', () => {
    for (const key of expectedKeys) {
      const t = PRODUCT_DEV_TEMPLATES.get(key)('test-repo');
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('labels');
      expect(t).toHaveProperty('body');
      expect(t.title).toContain('test-repo');
      expect(Array.isArray(t.labels)).toBe(true);
      expect(typeof t.body).toBe('string');
    }
  });
});

describe('ENGINEERING_VELOCITY_TEMPLATES', () => {
  const expectedKeys = ['cicd-maturity', 'dora-assessment', 'observability', 'release-hygiene', 'community-health'];

  it('har alle forventede template-funksjoner', () => {
    for (const key of expectedKeys) {
      expect(ENGINEERING_VELOCITY_TEMPLATES.has(key)).toBe(true);
      expect(typeof ENGINEERING_VELOCITY_TEMPLATES.get(key)).toBe('function');
    }
  });

  it('hver template returnerer copilot:run-label', () => {
    for (const key of expectedKeys) {
      const t = ENGINEERING_VELOCITY_TEMPLATES.get(key)('r');
      expect(t.labels).toContain('copilot:run');
    }
  });
});

describe('buildScanIssueBody', () => {
  const rec = {
    title: 'Legg til tester',
    description: 'Repoet mangler enhetstester.',
    priority: 'high',
    type: 'testing',
  };

  it('bygger en issue-body med riktig innhold', () => {
    const body = buildScanIssueBody(rec);
    expect(body).toContain('Legg til tester');
    expect(body).toContain('mangler enhetstester');
    expect(body).toContain('🔴'); // high priority emoji
    expect(body).toContain('Akseptansekriterier');
  });

  it('inkluderer marketOpportunity om tilgjengelig', () => {
    const recWithMO = { ...rec, marketOpportunity: 'Økt kodekvalitet' };
    const body = buildScanIssueBody(recWithMO);
    expect(body).toContain('Økt kodekvalitet');
    expect(body).toContain('Forretningsverdi');
  });

  it('bruker compact-format', () => {
    const body = buildScanIssueBody(rec, { compact: true });
    expect(body).toContain('Legg til tester');
    expect(body).toContain('PR er opprettet');
  });

  it('viser riktig prioritets-emoji', () => {
    expect(buildScanIssueBody({ ...rec, priority: 'medium' })).toContain('🟡');
    expect(buildScanIssueBody({ ...rec, priority: 'low' })).toContain('🔵');
  });

  it('bruker "generell" som fallback-type', () => {
    const body = buildScanIssueBody({ ...rec, type: undefined });
    expect(body).toContain('generell');
  });
});

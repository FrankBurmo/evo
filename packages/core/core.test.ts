const {
  meetsMinPriority,
  mergeAIRecommendations,
  PRIORITY_RANK,
  PROJECT_TYPE_LABELS,
} = require('./index');

describe('meetsMinPriority', () => {
  it('high ≥ high', () => expect(meetsMinPriority('high', 'high')).toBe(true));
  it('high ≥ medium', () => expect(meetsMinPriority('high', 'medium')).toBe(true));
  it('high ≥ low', () => expect(meetsMinPriority('high', 'low')).toBe(true));
  it('medium < high', () => expect(meetsMinPriority('medium', 'high')).toBe(false));
  it('medium ≥ medium', () => expect(meetsMinPriority('medium', 'medium')).toBe(true));
  it('low < medium', () => expect(meetsMinPriority('low', 'medium')).toBe(false));
  it('ukjent prioritet returnerer false mot medium', () => {
    expect(meetsMinPriority('unknown', 'medium')).toBe(false);
  });
});

describe('mergeAIRecommendations', () => {
  it('merger AI-recs med eksisterende', () => {
    const existing = [{ title: 'Legg til tester' }];
    const ai = [{ title: 'Forbedre CI' }];
    const result = mergeAIRecommendations(existing, ai);
    expect(result).toHaveLength(2);
    expect(result[1].title).toBe('Forbedre CI');
  });

  it('filtrerer bort duplikater (case-insensitive)', () => {
    const existing = [{ title: 'Legg til tester' }];
    const ai = [{ title: 'legg til tester' }, { title: 'Ny rec' }];
    const result = mergeAIRecommendations(existing, ai);
    expect(result).toHaveLength(2); // existing + 'Ny rec', uten duplikaten
  });

  it('håndterer null/undefined input', () => {
    expect(mergeAIRecommendations(null, [{ title: 'A' }])).toHaveLength(1);
    expect(mergeAIRecommendations([{ title: 'B' }], null)).toHaveLength(1);
    expect(mergeAIRecommendations(null, null)).toHaveLength(0);
  });
});

describe('PRIORITY_RANK', () => {
  it('har riktig rangering', () => {
    expect(PRIORITY_RANK.high).toBeGreaterThan(PRIORITY_RANK.medium);
    expect(PRIORITY_RANK.medium).toBeGreaterThan(PRIORITY_RANK.low);
  });
});

describe('PROJECT_TYPE_LABELS', () => {
  it('har labels for alle prosjekttyper', () => {
    const types = ['web-app', 'android-app', 'api', 'library', 'docs', 'other'];
    for (const type of types) {
      expect(PROJECT_TYPE_LABELS).toHaveProperty(type);
      expect(typeof PROJECT_TYPE_LABELS[type]).toBe('string');
    }
  });
});

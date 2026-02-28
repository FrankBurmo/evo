const { analyzeRepository, detectProjectType, PROJECT_TYPE_LABELS } = require('../src/analyzer');

// ─── detectProjectType ──────────────────────────────────────────────────────

describe('CLI: detectProjectType', () => {
  it('returnerer "android-app" for Kotlin-repo med android i navnet', () => {
    const repo = { language: 'Kotlin', name: 'my-android-app', description: '', topics: [] };
    expect(detectProjectType(repo)).toBe('android-app');
  });

  it('returnerer "web-app" for repo med react-topic', () => {
    const repo = { language: 'JavaScript', name: 'project', description: '', topics: ['react'] };
    expect(detectProjectType(repo)).toBe('web-app');
  });

  it('returnerer "web-app" for HTML-repo', () => {
    const repo = { language: 'HTML', name: 'page', description: '', topics: [] };
    expect(detectProjectType(repo)).toBe('web-app');
  });

  it('returnerer "api" for Python-repo', () => {
    const repo = { language: 'Python', name: 'service', description: '', topics: [] };
    expect(detectProjectType(repo)).toBe('api');
  });

  it('returnerer "api" for repo med "server" i navnet', () => {
    const repo = { language: 'JavaScript', name: 'my-server', description: '', topics: [] };
    expect(detectProjectType(repo)).toBe('api');
  });

  it('returnerer "docs" for repo med documentation-topic', () => {
    const repo = { language: '', name: 'guide', description: '', topics: ['documentation'] };
    expect(detectProjectType(repo)).toBe('docs');
  });

  it('returnerer "library" for Rust-repo', () => {
    const repo = { language: 'Rust', name: 'crate', description: '', topics: [] };
    expect(detectProjectType(repo)).toBe('library');
  });

  it('returnerer "library" for repo med sdk-topic', () => {
    const repo = { language: 'TypeScript', name: 'utils', description: '', topics: ['sdk'] };
    expect(detectProjectType(repo)).toBe('library');
  });

  it('returnerer "other" for ukjent type', () => {
    const repo = { language: 'C++', name: 'stuff', description: '', topics: [] };
    expect(detectProjectType(repo)).toBe('other');
  });

  it('håndterer null/undefined gracefully', () => {
    const repo = { language: null, name: null, description: null };
    expect(detectProjectType(repo)).toBe('other');
  });
});

// ─── PROJECT_TYPE_LABELS ─────────────────────────────────────────────────────

describe('CLI: PROJECT_TYPE_LABELS', () => {
  it('har labels for alle kjente prosjekttyper', () => {
    const types = ['web-app', 'android-app', 'api', 'library', 'docs', 'other'];
    for (const type of types) {
      expect(PROJECT_TYPE_LABELS).toHaveProperty(type);
      expect(typeof PROJECT_TYPE_LABELS[type]).toBe('string');
    }
  });

  it('bruker emoji-ikoner', () => {
    expect(PROJECT_TYPE_LABELS['web-app']).toContain('🌐');
    expect(PROJECT_TYPE_LABELS['android-app']).toContain('📱');
    expect(PROJECT_TYPE_LABELS['api']).toContain('⚙️');
    expect(PROJECT_TYPE_LABELS['library']).toContain('📦');
    expect(PROJECT_TYPE_LABELS['docs']).toContain('📚');
  });
});

// ─── analyzeRepository ──────────────────────────────────────────────────────

describe('CLI: analyzeRepository', () => {
  const baseRepo = {
    name: 'test-repo',
    full_name: 'user/test-repo',
    description: 'Test-beskrivelse',
    html_url: 'https://github.com/user/test-repo',
    language: 'JavaScript',
    stargazers_count: 5,
    forks_count: 1,
    open_issues_count: 2,
    updated_at: new Date().toISOString(),
    private: false,
    license: { spdx_id: 'MIT' },
    topics: [],
  };

  it('returnerer korrekt format', () => {
    const result = analyzeRepository(baseRepo);
    expect(result).toHaveProperty('repo');
    expect(result).toHaveProperty('recommendations');
    expect(result.repo).toHaveProperty('name', 'test-repo');
    expect(result.repo).toHaveProperty('fullName', 'user/test-repo');
  });

  it('inkluderer projectType i resultatet', () => {
    const result = analyzeRepository(baseRepo);
    expect(result.repo).toHaveProperty('projectType');
    expect(typeof result.repo.projectType).toBe('string');
  });

  it('inkluderer projectTypeLabel i resultatet', () => {
    const result = analyzeRepository(baseRepo);
    expect(result.repo).toHaveProperty('projectTypeLabel');
    expect(typeof result.repo.projectTypeLabel).toBe('string');
  });

  it('anbefaler beskrivelse når den mangler', () => {
    const repo = { ...baseRepo, description: null };
    const result = analyzeRepository(repo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).toContain('Legg til beskrivelse');
  });

  it('anbefaler ikke beskrivelse når den finnes', () => {
    const result = analyzeRepository(baseRepo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).not.toContain('Legg til beskrivelse');
  });

  it('flagger inaktive repos (>180 dager)', () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const repo = { ...baseRepo, updated_at: old };
    const result = analyzeRepository(repo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).toContain('Repositoryet er inaktivt');
  });

  it('flagger mange åpne issues', () => {
    const repo = { ...baseRepo, open_issues_count: 25 };
    const result = analyzeRepository(repo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).toContain('Mange åpne issues');
  });

  it('anbefaler lisens for offentlige repos uten lisens', () => {
    const repo = { ...baseRepo, license: null };
    const result = analyzeRepository(repo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).toContain('Legg til lisens');
  });

  it('anbefaler IKKE lisens for private repos', () => {
    const repo = { ...baseRepo, private: true, license: null };
    const result = analyzeRepository(repo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).not.toContain('Legg til lisens');
  });

  it('anbefaling-objekter har riktig struktur', () => {
    const repo = { ...baseRepo, description: null };
    const result = analyzeRepository(repo);
    for (const rec of result.recommendations) {
      expect(rec).toHaveProperty('type');
      expect(rec).toHaveProperty('priority');
      expect(rec).toHaveProperty('title');
      expect(rec).toHaveProperty('description');
      expect(['high', 'medium', 'low']).toContain(rec.priority);
    }
  });

  it('setter riktig synlighet', () => {
    const publicResult = analyzeRepository(baseRepo);
    expect(publicResult.repo.visibility).toBe('public');

    const privateResult = analyzeRepository({ ...baseRepo, private: true });
    expect(privateResult.repo.visibility).toBe('private');
  });
});

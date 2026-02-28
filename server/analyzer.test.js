const {
  analyzeRepository,
  detectProjectType,
  detectProjectTypeFromMetadata,
  analyzeFileTree,
} = require('./analyzer');

// ─── detectProjectTypeFromMetadata ──────────────────────────────────────────

describe('detectProjectTypeFromMetadata', () => {
  it('returnerer "android-app" for Kotlin-repo med android i navnet', () => {
    const repo = { language: 'Kotlin', name: 'my-android-app', description: '', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('android-app');
  });

  it('returnerer "android-app" for repo med android-topic', () => {
    const repo = { language: 'Java', name: 'MyApp', description: '', topics: ['android'] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('android-app');
  });

  it('returnerer "web-app" for repo med react-topic', () => {
    const repo = { language: 'JavaScript', name: 'my-project', description: '', topics: ['react'] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('web-app');
  });

  it('returnerer "web-app" for HTML-prosjekt', () => {
    const repo = { language: 'HTML', name: 'something', description: '', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('web-app');
  });

  it('returnerer "web-app" for TypeScript-prosjekt med "app" i navnet', () => {
    const repo = { language: 'TypeScript', name: 'my-dashboard-app', description: '', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('web-app');
  });

  it('returnerer "api" for Go-prosjekt', () => {
    const repo = { language: 'Go', name: 'service', description: '', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('api');
  });

  it('returnerer "api" for Python-prosjekt', () => {
    const repo = { language: 'Python', name: 'backend', description: '', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('api');
  });

  it('returnerer "api" for repo med "api" i navnet', () => {
    const repo = { language: 'JavaScript', name: 'my-api', description: '', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('api');
  });

  it('returnerer "docs" for repo med docs-topic', () => {
    const repo = { language: 'JavaScript', name: 'project', description: '', topics: ['docs'] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('docs');
  });

  it('returnerer "docs" for repo med "documentation" i beskrivelsen', () => {
    const repo = { language: '', name: 'stuff', description: 'Project documentation', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('docs');
  });

  it('returnerer "library" for Rust-prosjekt', () => {
    const repo = { language: 'Rust', name: 'my-crate', description: '', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('library');
  });

  it('returnerer "library" for repo med "sdk" i navnet', () => {
    const repo = { language: 'JavaScript', name: 'my-sdk', description: '', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('library');
  });

  it('returnerer "library" for repo med library-topic', () => {
    const repo = { language: 'TypeScript', name: 'utils', description: '', topics: ['library'] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('library');
  });

  it('returnerer "other" for ukjent prosjekttype', () => {
    const repo = { language: 'C++', name: 'stuff', description: '', topics: [] };
    expect(detectProjectTypeFromMetadata(repo)).toBe('other');
  });

  it('håndterer repo uten topics', () => {
    const repo = { language: null, name: 'test', description: null };
    expect(detectProjectTypeFromMetadata(repo)).toBe('other');
  });
});

// ─── detectProjectType (dyp — filbasert) ────────────────────────────────────

describe('detectProjectType', () => {
  it('returnerer "android-app" ved AndroidManifest.xml', () => {
    const result = detectProjectType({
      rootFiles: ['AndroidManifest.xml', 'build.gradle'],
      packageJsonContent: null,
      language: 'Java',
      repoName: 'myapp',
    });
    expect(result).toBe('android-app');
  });

  it('returnerer "android-app" ved gradlew og Kotlin', () => {
    const result = detectProjectType({
      rootFiles: ['gradlew', 'build.gradle.kts'],
      packageJsonContent: null,
      language: 'Kotlin',
      repoName: 'myapp',
    });
    expect(result).toBe('android-app');
  });

  it('returnerer "web-app" ved vite.config.js', () => {
    const result = detectProjectType({
      rootFiles: ['vite.config.js', 'package.json', 'index.html'],
      packageJsonContent: null,
      language: 'JavaScript',
      repoName: 'webapp',
    });
    expect(result).toBe('web-app');
  });

  it('returnerer "web-app" ved React-avhengighet i package.json', () => {
    const result = detectProjectType({
      rootFiles: ['package.json'],
      packageJsonContent: JSON.stringify({
        dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
      }),
      language: 'JavaScript',
      repoName: 'myapp',
    });
    expect(result).toBe('web-app');
  });

  it('returnerer "api" ved Express i package.json', () => {
    const result = detectProjectType({
      rootFiles: ['package.json'],
      packageJsonContent: JSON.stringify({
        dependencies: { express: '^5.0.0' },
      }),
      language: 'JavaScript',
      repoName: 'myservice',
    });
    expect(result).toBe('api');
  });

  it('returnerer "api" ved Dockerfile uten andre indikatorer', () => {
    const result = detectProjectType({
      rootFiles: ['Dockerfile', 'main.go'],
      packageJsonContent: null,
      language: 'Go',
      repoName: 'svc',
    });
    expect(result).toBe('api');
  });

  it('returnerer "docs" ved mkdocs.yml', () => {
    const result = detectProjectType({
      rootFiles: ['mkdocs.yml', 'docs'],
      packageJsonContent: null,
      language: 'Python',
      repoName: 'docs',
    });
    expect(result).toBe('docs');
  });

  it('returnerer "library" for package.json med main-felt', () => {
    const result = detectProjectType({
      rootFiles: ['package.json'],
      packageJsonContent: JSON.stringify({
        name: 'my-lib',
        main: 'dist/index.js',
      }),
      language: 'JavaScript',
      repoName: 'my-lib',
    });
    expect(result).toBe('library');
  });

  it('returnerer "other" uten klare indikatorer', () => {
    const result = detectProjectType({
      rootFiles: ['README.md'],
      packageJsonContent: null,
      language: 'C++',
      repoName: 'experiments',
    });
    expect(result).toBe('other');
  });

  it('håndterer ugyldig JSON i packageJsonContent', () => {
    const result = detectProjectType({
      rootFiles: ['package.json'],
      packageJsonContent: '{ invalid json }',
      language: 'JavaScript',
      repoName: 'test',
    });
    // Bør ikke krasje
    expect(typeof result).toBe('string');
  });
});

// ─── analyzeRepository ──────────────────────────────────────────────────────

describe('analyzeRepository', () => {
  const baseRepo = {
    name: 'test-repo',
    full_name: 'user/test-repo',
    description: 'En fin beskrivelse',
    html_url: 'https://github.com/user/test-repo',
    language: 'JavaScript',
    stargazers_count: 10,
    forks_count: 2,
    open_issues_count: 5,
    updated_at: new Date().toISOString(),
    private: false,
    license: { spdx_id: 'MIT' },
    topics: [],
  };

  it('returnerer repo-metadata med riktig format', () => {
    const result = analyzeRepository(baseRepo);
    expect(result).toHaveProperty('repo');
    expect(result).toHaveProperty('recommendations');
    expect(result.repo.name).toBe('test-repo');
    expect(result.repo.fullName).toBe('user/test-repo');
    expect(result.repo.language).toBe('JavaScript');
    expect(result.repo.stars).toBe(10);
    expect(result.repo.forks).toBe(2);
    expect(result.repo.visibility).toBe('public');
  });

  it('inkluderer projectType i resultatet', () => {
    const result = analyzeRepository(baseRepo);
    expect(result.repo).toHaveProperty('projectType');
    expect(typeof result.repo.projectType).toBe('string');
  });

  it('anbefaler beskrivelse når den mangler', () => {
    const repo = { ...baseRepo, description: null };
    const result = analyzeRepository(repo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).toContain('Legg til beskrivelse');
  });

  it('anbefaler nettside for offentlige repos uten homepage', () => {
    const repo = { ...baseRepo, homepage: null };
    const result = analyzeRepository(repo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).toContain('Legg til nettside/dokumentasjonslenke');
  });

  it('anbefaler oppdatering for inaktive repos (>180 dager)', () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const repo = { ...baseRepo, updated_at: old };
    const result = analyzeRepository(repo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).toContain('Repositoryet er inaktivt');
  });

  it('anbefaler triagering ved mange åpne issues', () => {
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

  it('gir ingen lisens-anbefaling for private repos', () => {
    const repo = { ...baseRepo, private: true, license: null };
    const result = analyzeRepository(repo);
    const titles = result.recommendations.map(r => r.title);
    expect(titles).not.toContain('Legg til lisens');
  });

  it('gir ingen anbefalinger for velholdt repo', () => {
    const repo = {
      ...baseRepo,
      homepage: 'https://example.com',
      open_issues_count: 0,
      updated_at: new Date().toISOString(),
    };
    const result = analyzeRepository(repo);
    // Bør ha null eller svært få anbefalinger
    expect(result.recommendations.length).toBeLessThanOrEqual(1);
  });
});

// ─── analyzeFileTree ────────────────────────────────────────────────────────

describe('analyzeFileTree', () => {
  const tree = [
    { path: 'src', type: 'tree', size: 0 },
    { path: 'src/index.js', type: 'blob', size: 500 },
    { path: 'src/app.jsx', type: 'blob', size: 1200 },
    { path: 'src/utils.ts', type: 'blob', size: 800 },
    { path: 'src/styles.css', type: 'blob', size: 300 },
    { path: 'README.md', type: 'blob', size: 200 },
    { path: 'package.json', type: 'blob', size: 100 },
    { path: '.eslintrc.json', type: 'blob', size: 50 },
    { path: 'test', type: 'tree', size: 0 },
    { path: 'test/app.test.js', type: 'blob', size: 600 },
    { path: 'public', type: 'tree', size: 0 },
    { path: 'public/logo.png', type: 'blob', size: 5000 },
  ];

  it('teller filer korrekt', () => {
    const metrics = analyzeFileTree(tree);
    expect(metrics.totalFiles).toBe(9); // 9 blobs (inkl. test/app.test.js)
    expect(metrics.totalDirs).toBe(3); // 3 trees
  });

  it('kategoriserer filer riktig', () => {
    const metrics = analyzeFileTree(tree);
    expect(metrics.byCategory.code).toBe(4); // .js, .jsx, .ts, .test.js
    expect(metrics.byCategory.docs).toBe(1); // .md
    expect(metrics.byCategory.styles).toBe(1); // .css
    expect(metrics.byCategory.images).toBe(1); // .png
  });

  it('finner testfiler', () => {
    const metrics = analyzeFileTree(tree);
    expect(metrics.testFileCount).toBe(1);
  });

  it('beregner total kodestørrelse', () => {
    const metrics = analyzeFileTree(tree);
    expect(metrics.totalCodeSize).toBe(500 + 1200 + 800 + 600); // inkl. test/app.test.js
  });

  it('finner toppnivå-mapper', () => {
    const metrics = analyzeFileTree(tree);
    expect(metrics.topLevelDirs).toContain('src');
    expect(metrics.topLevelDirs).toContain('test');
    expect(metrics.topLevelDirs).toContain('public');
  });

  it('identifiserer kilde-mapper', () => {
    const metrics = analyzeFileTree(tree);
    expect(metrics.sourceDirs).toContain('src');
  });

  it('beregner maks mappenivå', () => {
    const metrics = analyzeFileTree(tree);
    expect(metrics.maxDepth).toBeGreaterThanOrEqual(2);
  });

  it('håndterer tomt tre', () => {
    const metrics = analyzeFileTree([]);
    expect(metrics.totalFiles).toBe(0);
    expect(metrics.totalDirs).toBe(0);
  });
});

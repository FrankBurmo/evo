'use strict';

/**
 * server/analyzer.js — Utvidet analysemotor for Evo backend
 *
 * Eksporterer:
 *   analyzeRepository(repo)       — rask, regelbasert analyse (kun metadata)
 *   deepAnalyzeRepo(octokit, repo) — async, dyp analyse med GitHub API-kall
 */

// ─── Konstanter ──────────────────────────────────────────────────────────────

const ANDROID_INDICATORS = [
  'AndroidManifest.xml',
  'build.gradle',
  'build.gradle.kts',
  'gradlew',
  'app/src/main/AndroidManifest.xml',
];

const WEB_INDICATORS = [
  'index.html',
  'vite.config.js',
  'vite.config.ts',
  'next.config.js',
  'next.config.ts',
  'nuxt.config.js',
  'nuxt.config.ts',
  'angular.json',
  'svelte.config.js',
  'astro.config.mjs',
  'remix.config.js',
];

const API_INDICATORS = [
  'server.js',
  'server.ts',
  'app.js',
  'app.ts',
  'main.go',
  'main.py',
  'manage.py',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'openapi.yaml',
  'openapi.json',
  'swagger.yaml',
  'swagger.json',
];

const DOCS_INDICATORS = [
  'mkdocs.yml',
  'docusaurus.config.js',
  'docusaurus.config.ts',
  '_config.yml', // Jekyll
  'book.toml',   // mdBook
];

const TEST_DIRS = ['__tests__', 'test', 'tests', 'spec', 'specs', 'e2e', '__test__'];
const TEST_FILE_PATTERNS = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /Test\.java$/, /Tests\.cs$/, /test_.*\.py$/];

// Konfigurasjonsfiler som er viktige for prosjektanalyse
const CONFIG_FILES = [
  // JavaScript/TypeScript
  'tsconfig.json', 'jsconfig.json', '.eslintrc.json', '.eslintrc.js', '.eslintrc.yml',
  'eslint.config.js', 'eslint.config.mjs', '.prettierrc', '.prettierrc.json',
  'vitest.config.ts', 'vitest.config.js', 'jest.config.js', 'jest.config.ts',
  // Docker
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  // CI/CD
  '.github/dependabot.yml', '.github/CODEOWNERS',
  // Python
  'requirements.txt', 'pyproject.toml', 'setup.py', 'setup.cfg', 'Pipfile',
  // Go
  'go.mod', 'go.sum',
  // Rust
  'Cargo.toml',
  // Ruby
  'Gemfile',
  // Env/Config
  '.env.example', '.editorconfig', '.nvmrc', '.node-version',
  // Other
  'Makefile', 'justfile', 'turbo.json', 'nx.json', 'lerna.json',
  'renovate.json', '.changeset/config.json',
];

// Filtyper for metrikk-aggregering
const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.kts',
  '.cs', '.rb', '.php', '.swift', '.m', '.c', '.cpp', '.h',
  '.vue', '.svelte', '.astro',
]);
const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.txt', '.rst', '.adoc']);
const CONFIG_EXTENSIONS = new Set(['.json', '.yml', '.yaml', '.toml', '.xml', '.ini', '.cfg', '.env']);
const STYLE_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less', '.styl']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif']);

// ─── Regelbasert analyse (metadata-only) ─────────────────────────────────────

/**
 * Rask regelbasert analyse basert kun på repo-metadata (ingen ekstra API-kall).
 * Brukes for bulk-listingen i /api/repos.
 */
function analyzeRepository(repo) {
  const recommendations = [];

  const daysSinceUpdate = repo.updated_at
    ? Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const openIssues = repo.open_issues_count || 0;
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  const isPublic = !repo.private;

  // Dokumentasjon
  if (!repo.description) {
    recommendations.push({
      type: 'documentation',
      priority: 'medium',
      title: 'Legg til beskrivelse',
      description: 'Legg til en tydelig beskrivelse av hva prosjektet gjør.',
      marketOpportunity: 'Tydelig beskrivelse bedrer synligheten i GitHub-søk.',
    });
  }

  if (!repo.homepage && isPublic) {
    recommendations.push({
      type: 'documentation',
      priority: 'low',
      title: 'Legg til nettside/dokumentasjonslenke',
      description: 'Sett en homepage-URL i repo-innstillingene.',
      marketOpportunity: 'Profesjonell nettside øker troverdighet og brukertillit.',
    });
  }

  // Aktivitet
  if (daysSinceUpdate > 180) {
    recommendations.push({
      type: 'activity',
      priority: 'high',
      title: 'Repositoryet er inaktivt',
      description: `Siste aktivitet var ${daysSinceUpdate} dager siden. Vurder oppdatering eller arkivering.`,
      marketOpportunity: 'Regelmessige oppdateringer signaliserer aktivt vedlikehold til potensielle brukere.',
    });
  } else if (daysSinceUpdate > 60) {
    recommendations.push({
      type: 'activity',
      priority: 'medium',
      title: 'Oppdater repositoryet',
      description: `Siste aktivitet var ${daysSinceUpdate} dager siden.`,
      marketOpportunity: 'Jevnlig aktivitet holder prosjektet relevant.',
    });
  }

  // Issues
  if (openIssues > 20) {
    recommendations.push({
      type: 'maintenance',
      priority: 'high',
      title: 'Mange åpne issues',
      description: `${openIssues} åpne issues. Vurder triagering og lukking av utdaterte issues.`,
      marketOpportunity: 'Aktivt issue-arbeid viser prosjekthelse og tiltrekker bidragsytere.',
    });
  } else if (openIssues > 10) {
    recommendations.push({
      type: 'maintenance',
      priority: 'medium',
      title: 'Håndter åpne issues',
      description: `${openIssues} åpne issues – se gjennom og prioriter.`,
      marketOpportunity: 'Ryddig backlog er et faresignal for aktive brukere.',
    });
  }

  // Synlighet og community
  if (isPublic && stars < 5 && daysSinceUpdate < 90) {
    recommendations.push({
      type: 'visibility',
      priority: 'low',
      title: 'Promoter prosjektet',
      description: 'Del prosjektet i relevante forum, communities og sosiale medier.',
      marketOpportunity: 'Økt synlighet gir flere brukere og potensielle bidragsytere.',
    });
  }

  if (isPublic && stars > 50 && forks < 10) {
    recommendations.push({
      type: 'community',
      priority: 'medium',
      title: 'Tilrettelegg for bidragsytere',
      description: 'Opprett CONTRIBUTING.md og merk enkle issues med "good first issue".',
      marketOpportunity: 'Voksende bidragsyterbas akselererer produktutviklingen.',
    });
  }

  // Lisens
  if (isPublic && !repo.license) {
    recommendations.push({
      type: 'documentation',
      priority: 'high',
      title: 'Legg til lisens',
      description: 'Offentlige repos uten lisens er implisitt "alle rettigheter forbeholdt" og hindrer adopsjon.',
      marketOpportunity: 'MIT/Apache 2.0-lisens er industristandarden for åpen kildekode og øker adopsjon markant.',
    });
  }

  return {
    repo: {
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars,
      forks,
      openIssues,
      updatedAt: repo.updated_at,
      visibility: repo.private ? 'private' : 'public',
      license: repo.license?.spdx_id || null,
    },
    recommendations,
  };
}

// ─── Hjelpefunksjoner for dyp analyse ────────────────────────────────────────

/**
 * Hent rotnivå-filstruktur som flatt sett av filnavn.
 */
async function fetchRootContents(octokit, owner, repoName) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: '' });
    if (!Array.isArray(data)) return [];
    return data.map(f => f.name);
  } catch {
    return [];
  }
}

/**
 * Hent innholdet i en enkelt fil (base64-dekodes).
 * Returnerer null hvis filen ikke finnes eller er for stor.
 */
async function fetchFileContent(octokit, owner, repoName, filePath) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: filePath });
    if (data.type !== 'file' || !data.content) return null;
    return Buffer.from(data.content, 'base64').toString('utf-8').slice(0, 8000);
  } catch {
    return null;
  }
}

/**
 * Sjekk om en bane eksisterer i repositoryet.
 */
async function pathExists(octokit, owner, repoName, filePath) {
  try {
    await octokit.repos.getContent({ owner, repo: repoName, path: filePath });
    return true;
  } catch {
    return false;
  }
}

/**
 * List innholdet i en katalog. Returnerer tom liste ved feil.
 */
async function listDir(octokit, owner, repoName, dirPath) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: dirPath });
    if (!Array.isArray(data)) return [];
    return data.map(f => f.name);
  } catch {
    return [];
  }
}

// ─── Fullstendig filtre (Git Trees API) ──────────────────────────────────────

/**
 * Hent fullstendig filtre for et repo via Git Trees API (ett enkelt API-kall).
 * Returnerer et flatt array av { path, type, size } for alle filer og mapper.
 * Maks 100 000 oppføringer (GitHub-grense for recursive tree).
 *
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} owner
 * @param {string} repoName
 * @param {string} [defaultBranch='main'] — Branch som skal skannes
 * @returns {Promise<Array<{path: string, type: 'blob'|'tree', size: number}>>}
 */
async function fetchRepoTree(octokit, owner, repoName, defaultBranch = 'main') {
  try {
    const { data } = await octokit.git.getTree({
      owner,
      repo: repoName,
      tree_sha: defaultBranch,
      recursive: 'true',
    });
    if (data.truncated) {
      console.warn(`Filtre for ${owner}/${repoName} er avkuttet (>100k filer).`);
    }
    return (data.tree || []).map(item => ({
      path: item.path,
      type: item.type,   // 'blob' = fil, 'tree' = mappe
      size: item.size || 0,
    }));
  } catch (err) {
    // Fallback: prøv med 'master' om 'main' feiler
    if (defaultBranch === 'main') {
      try {
        const { data } = await octokit.git.getTree({
          owner,
          repo: repoName,
          tree_sha: 'master',
          recursive: 'true',
        });
        return (data.tree || []).map(item => ({
          path: item.path,
          type: item.type,
          size: item.size || 0,
        }));
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * Analyser filtreet og generer metrikker om kodebasen.
 *
 * @param {Array<{path: string, type: string, size: number}>} tree
 * @returns {object} Filtre-metrikker
 */
function analyzeFileTree(tree) {
  const files = tree.filter(f => f.type === 'blob');
  const dirs = tree.filter(f => f.type === 'tree');

  // Toppnivå-mapper
  const topLevelDirs = [...new Set(
    tree
      .filter(f => f.path.includes('/'))
      .map(f => f.path.split('/')[0])
  )].filter(d => dirs.some(dir => dir.path === d));

  // Filtell per kategori
  const byCategory = { code: 0, docs: 0, config: 0, styles: 0, images: 0, other: 0 };
  const byExtension = {};
  let totalCodeSize = 0;

  for (const file of files) {
    const ext = getExtension(file.path);
    byExtension[ext] = (byExtension[ext] || 0) + 1;

    if (CODE_EXTENSIONS.has(ext)) {
      byCategory.code++;
      totalCodeSize += file.size;
    } else if (DOC_EXTENSIONS.has(ext)) {
      byCategory.docs++;
    } else if (CONFIG_EXTENSIONS.has(ext) || file.path.startsWith('.')) {
      byCategory.config++;
    } else if (STYLE_EXTENSIONS.has(ext)) {
      byCategory.styles++;
    } else if (IMAGE_EXTENSIONS.has(ext)) {
      byCategory.images++;
    } else {
      byCategory.other++;
    }
  }

  // Topp-utvidelser sortert
  const topExtensions = Object.entries(byExtension)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ext, count]) => ({ ext, count }));

  // Testfiler
  const testFiles = files.filter(f =>
    TEST_DIRS.some(d => f.path.startsWith(d + '/') || f.path.includes('/' + d + '/')) ||
    TEST_FILE_PATTERNS.some(p => p.test(f.path))
  );

  // Kilde-mapper (src, lib, app, packages)
  const sourceDirs = topLevelDirs.filter(d =>
    ['src', 'lib', 'app', 'packages', 'modules', 'components', 'pages', 'server', 'client', 'api'].includes(d.toLowerCase())
  );

  // Maks mappenivå
  const maxDepth = files.reduce((max, f) => {
    const depth = f.path.split('/').length;
    return Math.max(max, depth);
  }, 0);

  return {
    totalFiles: files.length,
    totalDirs: dirs.length,
    totalCodeSize,
    topLevelDirs,
    sourceDirs,
    byCategory,
    topExtensions,
    testFileCount: testFiles.length,
    maxDepth,
  };
}

/**
 * Hent filendelsen fra en sti.
 */
function getExtension(filePath) {
  const base = filePath.split('/').pop() || '';
  const dotIndex = base.lastIndexOf('.');
  return dotIndex > 0 ? base.slice(dotIndex).toLowerCase() : '';
}

/**
 * Hent innholdet av flere konfigurasjonsfiler som finnes i treet.
 * Returnerer et objekt: { filnavn: innhold }.
 *
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} owner
 * @param {string} repoName
 * @param {Array<{path: string, type: string}>} tree — Fullt filtre
 * @returns {Promise<Record<string, string>>}
 */
async function fetchConfigFiles(octokit, owner, repoName, tree) {
  const treePathSet = new Set(tree.filter(f => f.type === 'blob').map(f => f.path));
  const configsToFetch = CONFIG_FILES.filter(cf => treePathSet.has(cf));

  // Begrens til maks 8 konfigurasjonsfiler for å spare API-kall
  const limited = configsToFetch.slice(0, 8);

  const results = {};
  const fetches = limited.map(async (configPath) => {
    const content = await fetchFileContent(octokit, owner, repoName, configPath);
    if (content) {
      results[configPath] = content;
    }
  });

  await Promise.all(fetches);
  return results;
}

/**
 * Hent GitHub Actions workflow-filer fra treet.
 *
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} owner
 * @param {string} repoName
 * @param {Array<{path: string, type: string}>} tree
 * @returns {Promise<Array<{name: string, content: string}>>}
 */
async function fetchWorkflowFiles(octokit, owner, repoName, tree) {
  const workflowPaths = tree
    .filter(f => f.type === 'blob' && f.path.startsWith('.github/workflows/') && (f.path.endsWith('.yml') || f.path.endsWith('.yaml')))
    .slice(0, 5); // Maks 5 workflows

  const workflows = [];
  const fetches = workflowPaths.map(async (wf) => {
    const content = await fetchFileContent(octokit, owner, repoName, wf.path);
    if (content) {
      workflows.push({ name: wf.path.split('/').pop(), content: content.slice(0, 3000) });
    }
  });

  await Promise.all(fetches);
  return workflows;
}

/**
 * Detekter prosjekttype basert på rotnivå-filer, README og package.json.
 * Returnerer: 'android-app' | 'web-app' | 'api' | 'library' | 'docs' | 'other'
 */
function detectProjectType({ rootFiles, packageJsonContent, language, repoName }) {
  const rootSet = new Set(rootFiles.map(f => f.toLowerCase()));

  // Android
  const androidMatch = ANDROID_INDICATORS.some(f => rootSet.has(f.toLowerCase()));
  if (androidMatch || language === 'Kotlin' || language === 'Java') {
    if (rootSet.has('androidmanifest.xml') || rootSet.has('gradlew')) {
      return 'android-app';
    }
  }

  // Docs
  const docsMatch = DOCS_INDICATORS.some(f => rootSet.has(f.toLowerCase()));
  if (docsMatch) return 'docs';

  // Web app (requires package.json or known web config)
  const webFileMatch = WEB_INDICATORS.some(f => rootSet.has(f.toLowerCase()));
  if (webFileMatch) return 'web-app';

  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const webFrameworks = ['react', 'vue', 'next', 'nuxt', 'angular', '@angular/core', 'svelte', 'astro', 'remix'];
      if (webFrameworks.some(fw => deps[fw])) return 'web-app';

      const serverFrameworks = ['express', 'fastify', 'koa', 'hapi', 'nestjs', '@nestjs/core', 'hono'];
      if (serverFrameworks.some(fw => deps[fw])) return 'api';
    } catch {
      // ignore JSON parse errors
    }
  }

  // API / Backend service
  const apiMatch = API_INDICATORS.some(f => rootSet.has(f.toLowerCase()));
  if (apiMatch) return 'api';

  // Library (has package.json with main/exports but no web framework)
  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      if (pkg.main || pkg.exports || pkg.module) return 'library';
    } catch {
      // ignore
    }
  }

  // Fallback based on language
  if (language === 'Python') return 'api';
  if (language === 'Go') return 'api';
  if (language === 'Rust') return 'library';
  if (language === 'HTML') return 'web-app';

  return 'other';
}

// ─── Dyp analyse (kaller GitHub API) ─────────────────────────────────────────

/**
 * Utfør dyp analyse av ett repo ved hjelp av GitHub API.
 * Returnerer et beriket analyse-objekt med prosjekttype, innhold og anbefalinger.
 *
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {object} repo – rå repo-objekt fra GitHub API
 * @returns {Promise<object>}
 */
async function deepAnalyzeRepo(octokit, repo) {
  const owner = repo.owner?.login || repo.full_name.split('/')[0];
  const repoName = repo.name;
  const isPublic = !repo.private;
  const defaultBranch = repo.default_branch || 'main';

  // ── 1. Parallell henting: fullt filtre + commits ──────────────
  const [repoTree, recentCommits] = await Promise.all([
    fetchRepoTree(octokit, owner, repoName, defaultBranch),
    fetchRecentCommits(octokit, owner, repoName),
  ]);

  // Utled rotnivå-filer fra treet (bakoverkompatibelt)
  const rootFiles = repoTree
    .filter(f => !f.path.includes('/') && f.type === 'blob')
    .map(f => f.path);

  // Filtre-metrikker
  const fileTreeMetrics = repoTree.length > 0 ? analyzeFileTree(repoTree) : null;

  // ── 2. Detekter nøkkelfiler fra treet ─────────────────────────
  const treePaths = new Set(repoTree.filter(f => f.type === 'blob').map(f => f.path));
  const hasPackageJson = treePaths.has('package.json');
  const hasBuildGradle = treePaths.has('build.gradle') || treePaths.has('build.gradle.kts');

  // ── 3. Hent nøkkelfiler + konfigurasjonsfiler parallelt ───────
  const readmePath = treePaths.has('README.md') ? 'README.md'
    : treePaths.has('readme.md') ? 'readme.md'
    : treePaths.has('Readme.md') ? 'Readme.md' : null;

  const [readmeContent, packageJsonContent, buildGradleContent, configFiles, workflowFiles] = await Promise.all([
    readmePath
      ? fetchFileContent(octokit, owner, repoName, readmePath)
      : Promise.resolve(null),
    hasPackageJson
      ? fetchFileContent(octokit, owner, repoName, 'package.json')
      : Promise.resolve(null),
    hasBuildGradle
      ? fetchFileContent(octokit, owner, repoName, treePaths.has('build.gradle') ? 'build.gradle' : 'build.gradle.kts')
      : Promise.resolve(null),
    repoTree.length > 0
      ? fetchConfigFiles(octokit, owner, repoName, repoTree)
      : Promise.resolve({}),
    repoTree.length > 0
      ? fetchWorkflowFiles(octokit, owner, repoName, repoTree)
      : Promise.resolve([]),
  ]);

  // ── 4. Utled tilstedeværelse av community-filer fra treet ─────
  const hasWorkflows = repoTree.some(f => f.path.startsWith('.github/workflows/') && f.type === 'blob');
  const hasContributing = treePaths.has('CONTRIBUTING.md') || treePaths.has('contributing.md');
  const hasSecurity = treePaths.has('SECURITY.md') || treePaths.has('security.md');
  const hasCodeOfConduct = treePaths.has('CODE_OF_CONDUCT.md');

  // Test-deteksjon via treet (ingen ekstra API-kall)
  const hasTests = detectTestsFromTree(repoTree, packageJsonContent);

  // ── 5. Prosjekttype ───────────────────────────────────────────
  const projectType = detectProjectType({
    rootFiles,
    packageJsonContent,
    language: repo.language,
    repoName,
  });

  // ── 6. Generer anbefalinger (regelbasert + dyp + kodestruktur)
  const baseAnalysis = analyzeRepository(repo);
  const deepRecs = generateDeepRecommendations({
    repo,
    isPublic,
    rootFiles,
    readmeContent,
    packageJsonContent,
    buildGradleContent,
    hasWorkflows,
    hasTests,
    hasContributing,
    hasSecurity,
    hasCodeOfConduct,
    recentCommits,
    projectType,
    configFiles,
    fileTreeMetrics,
    workflowFiles,
  });

  // Slå sammen — fjern duplikater basert på tittel
  const existingTitles = new Set(baseAnalysis.recommendations.map(r => r.title));
  const newRecs = deepRecs.filter(r => !existingTitles.has(r.title));
  const allRecommendations = [...baseAnalysis.recommendations, ...newRecs];

  // Komprimert filtre-oversikt for AI-prompt (maks 60 stier)
  const fileTreeSummary = repoTree.length > 0
    ? repoTree
        .filter(f => f.type === 'blob')
        .slice(0, 60)
        .map(f => f.path)
    : null;

  return {
    repo: {
      ...baseAnalysis.repo,
      projectType,
      defaultBranch,
    },
    deepInsights: {
      projectType,
      hasReadme: Boolean(readmeContent),
      hasPackageJson,
      hasBuildGradle,
      hasCI: hasWorkflows,
      hasTests,
      hasContributing,
      hasSecurity,
      hasCodeOfConduct,
      recentCommitsCount: recentCommits.length,
      lastCommitAt: recentCommits[0]?.commit?.author?.date || null,
      rootFileCount: rootFiles.length,
      packageJsonContent: packageJsonContent || null,
      buildGradleContent: buildGradleContent || null,
      readmeSummary: readmeContent ? readmeContent.slice(0, 500) : null,
      // Nye felter fra dyp kodeanalyse
      fileTreeMetrics,
      fileTreeSummary,
      configFiles: Object.keys(configFiles).length > 0 ? configFiles : null,
      workflowFiles: workflowFiles.length > 0 ? workflowFiles : null,
      hasDocker: treePaths.has('Dockerfile') || treePaths.has('docker-compose.yml') || treePaths.has('docker-compose.yaml'),
      hasTypeScript: treePaths.has('tsconfig.json'),
      hasLinter: treePaths.has('.eslintrc.json') || treePaths.has('.eslintrc.js') || treePaths.has('eslint.config.js') || treePaths.has('eslint.config.mjs'),
      hasFormatter: treePaths.has('.prettierrc') || treePaths.has('.prettierrc.json') || treePaths.has('.editorconfig'),
      hasDependabot: treePaths.has('.github/dependabot.yml'),
      hasEnvExample: treePaths.has('.env.example'),
      hasChangelog: treePaths.has('CHANGELOG.md') || treePaths.has('changelog.md'),
      hasLockfile: treePaths.has('package-lock.json') || treePaths.has('yarn.lock') || treePaths.has('pnpm-lock.yaml'),
    },
    recommendations: allRecommendations,
  };
}

// ─── Test-deteksjon (API-basert – legacy) ─────────────────────────────────────

async function detectTests(octokit, owner, repoName, rootFiles) {
  const rootSet = new Set(rootFiles.map(f => f.toLowerCase()));

  // Sjekk rotnivå-mapper
  for (const dir of TEST_DIRS) {
    if (rootSet.has(dir)) return true;
  }

  // Sjekk package.json for test-script
  try {
    const pkgContent = await fetchFileContent(octokit, owner, repoName, 'package.json');
    if (pkgContent) {
      const pkg = JSON.parse(pkgContent);
      if (pkg.scripts?.test && !pkg.scripts.test.includes('no test')) return true;
    }
  } catch {
    // ignore
  }

  // Sjekk src/-mappa for .test.js-filer
  try {
    const srcFiles = await listDir(octokit, owner, repoName, 'src');
    if (srcFiles.some(f => TEST_FILE_PATTERNS.some(p => p.test(f)))) return true;
  } catch {
    // ignore
  }

  return false;
}

// ─── Test-deteksjon fra filtre (ingen ekstra API-kall) ────────────────────────

/**
 * Detekter tester fra det fullstendige filtreet — sparer mange API-kall.
 * @param {Array<{path: string, type: string}>} tree — Fullt filtre
 * @param {string|null} packageJsonContent — Innholdet av package.json
 * @returns {boolean}
 */
function detectTestsFromTree(tree, packageJsonContent) {
  const files = tree.filter(f => f.type === 'blob');

  // Sjekk for testmapper
  for (const dir of TEST_DIRS) {
    if (files.some(f => f.path.startsWith(dir + '/') || f.path.includes('/' + dir + '/'))) {
      return true;
    }
  }

  // Sjekk for testfil-mønstre
  if (files.some(f => TEST_FILE_PATTERNS.some(p => p.test(f.path)))) {
    return true;
  }

  // Sjekk package.json for test-script
  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      if (pkg.scripts?.test && !pkg.scripts.test.includes('no test')) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

// ─── Dype anbefalinger ────────────────────────────────────────────────────────

function generateDeepRecommendations({
  repo,
  isPublic,
  rootFiles,
  readmeContent,
  packageJsonContent,
  buildGradleContent,
  hasWorkflows,
  hasTests,
  hasContributing,
  hasSecurity,
  hasCodeOfConduct,
  recentCommits,
  projectType,
  configFiles = {},
  fileTreeMetrics = null,
  workflowFiles = [],
}) {
  const recommendations = [];
  const rootSet = new Set(rootFiles.map(f => f.toLowerCase()));

  // ── README-kvalitet ───────────────────────────────────────────
  if (!readmeContent) {
    recommendations.push({
      type: 'documentation',
      priority: 'high',
      title: 'Opprett README.md',
      description: 'Repositoryet mangler README. Legg til installasjonsinstruksjoner, brukseksempler og bidragsguide.',
      marketOpportunity: 'README er førsteinntryket for alle besøkende – avgjørende for adopsjon.',
    });
  } else if (readmeContent.length < 300) {
    recommendations.push({
      type: 'documentation',
      priority: 'medium',
      title: 'Utvid README',
      description: 'README er veldig kort. Legg til installasjonsinstruksjoner, brukseksempler og skjermbilder.',
      marketOpportunity: 'Detaljert README øker brukertillit og viser prosjektmodenhet.',
    });
  }

  // ── CI/CD ─────────────────────────────────────────────────────
  if (!hasWorkflows) {
    recommendations.push({
      type: 'ci',
      priority: 'high',
      title: 'Sett opp CI/CD med GitHub Actions',
      description: 'Repositoryet mangler GitHub Actions workflows. Legg til automatisk testing og bygg ved push/PR.',
      marketOpportunity: 'CI/CD reduserer bugrate, øker trygghet for bidragsytere og signaliserer prosjektmodenhet.',
    });
  }

  // ── Tester ────────────────────────────────────────────────────
  if (!hasTests) {
    const priority = projectType === 'library' ? 'high' : 'medium';
    recommendations.push({
      type: 'testing',
      priority,
      title: 'Legg til automatiske tester',
      description: 'Ingen tester funnet. Legg til enhetstester for å sikre kvalitet og gjøre det tryggere å bidra.',
      marketOpportunity: 'Testdekning er kritisk for biblioteker og API-er og øker bidragsyternes trygghet.',
    });
  }

  // ── Community-filer ───────────────────────────────────────────
  if (isPublic && !hasContributing) {
    recommendations.push({
      type: 'community',
      priority: 'medium',
      title: 'Legg til CONTRIBUTING.md',
      description: 'Forklar hvordan andre kan bidra: branch-strategi, PR-prosess, kodestil.',
      marketOpportunity: 'Tydelig bidragsguide senker terskelen for nye bidragsytere markant.',
    });
  }

  if (isPublic && !hasSecurity && projectType !== 'docs') {
    recommendations.push({
      type: 'security',
      priority: 'medium',
      title: 'Legg til SECURITY.md',
      description: 'Opprett en security policy som forklarer hvordan sårbarheter skal rapporteres.',
      marketOpportunity: 'Sikkerhetsrutiner er forventet av seriøse brukere og organisasjoner.',
    });
  }

  // ── Kodestruktur-anbefalinger (basert på filtre) ──────────────
  if (fileTreeMetrics) {
    // Linting/formattering
    const hasLinterConfig = Object.keys(configFiles).some(f =>
      f.includes('eslint') || f.includes('.pylintrc') || f === 'tslint.json'
    );
    const hasFormatterConfig = Object.keys(configFiles).some(f =>
      f.includes('prettier') || f === '.editorconfig'
    );

    if (!hasLinterConfig && fileTreeMetrics.byCategory.code > 5 && projectType !== 'docs') {
      recommendations.push({
        type: 'architecture',
        priority: 'medium',
        title: 'Konfigurer linter',
        description: 'Prosjektet mangler en linter-konfigurasjon (ESLint, Pylint, etc.). Linting opprettholder konsistent kodekvalitet.',
        marketOpportunity: 'Konsistent kodestil gjør det enklere for nye bidragsytere å komme i gang.',
      });
    }

    if (!hasFormatterConfig && fileTreeMetrics.byCategory.code > 10 && projectType !== 'docs') {
      recommendations.push({
        type: 'architecture',
        priority: 'low',
        title: 'Legg til kodeformattering',
        description: 'Prosjektet mangler Prettier eller EditorConfig. Automatisk formattering sparer tid og reduserer PR-støy.',
        marketOpportunity: 'Automatisk formattering eliminerer formaterings-diskusjoner i code review.',
      });
    }

    // Dependabot
    const hasDependabotConfig = Object.keys(configFiles).includes('.github/dependabot.yml');
    if (!hasDependabotConfig && fileTreeMetrics.byCategory.code > 0 && isPublic) {
      recommendations.push({
        type: 'security',
        priority: 'low',
        title: 'Aktiver Dependabot',
        description: 'Konfigurer Dependabot for automatiske avhengighetsoppdateringer og sikkerhetsvarsler.',
        marketOpportunity: 'Automatiske avhengighetsoppdateringer reduserer sikkerhetsrisiko og vedlikeholdsbyrde.',
      });
    }

    // .env.example
    const hasEnvExampleFile = Object.keys(configFiles).includes('.env.example');
    if (!hasEnvExampleFile && (projectType === 'web-app' || projectType === 'api')) {
      if (packageJsonContent) {
        try {
          const pkg = JSON.parse(packageJsonContent);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps['dotenv'] || deps['@nestjs/config'] || deps['env-var']) {
            recommendations.push({
              type: 'documentation',
              priority: 'medium',
              title: 'Legg til .env.example',
              description: 'Prosjektet bruker miljøvariabler, men mangler .env.example. Dokumenter påkrevde variabler for enklere oppsett.',
              marketOpportunity: 'God onboarding-dokumentasjon er avgjørende for utviklertilfredshet.',
            });
          }
        } catch {
          // ignore
        }
      }
    }

    // Changelog
    const hasChangelogDoc = rootSet.has('changelog.md') || rootSet.has('history.md');
    if (!hasChangelogDoc && isPublic && projectType === 'library') {
      recommendations.push({
        type: 'documentation',
        priority: 'medium',
        title: 'Legg til CHANGELOG.md',
        description: 'Biblioteker bør ha en endringslogg. Bruk Keep a Changelog-format eller automatiser med Changesets/conventional-changelog.',
        marketOpportunity: 'Tydelig endringslogg gir brukere oversikt over nye funksjoner og breaking changes.',
      });
    }

    // Docker
    const hasDockerConfig = Object.keys(configFiles).includes('Dockerfile');
    if (!hasDockerConfig && projectType === 'api') {
      recommendations.push({
        type: 'architecture',
        priority: 'low',
        title: 'Legg til Dockerfile',
        description: 'API-et mangler Dockerfile. Containerisering forenkler deployment og sikrer konsistent kjøremiljø.',
        marketOpportunity: 'Docker-støtte er forventet for moderne API-er og forenkler self-hosting.',
      });
    }

    // Stor kodebase uten tilstrekkelige tester
    if (hasTests && fileTreeMetrics.testFileCount < 3 && fileTreeMetrics.byCategory.code > 20) {
      recommendations.push({
        type: 'testing',
        priority: 'medium',
        title: 'Øk testdekningen',
        description: `Kodebasen har ${fileTreeMetrics.byCategory.code} kodefiler, men kun ${fileTreeMetrics.testFileCount} testfil(er). Økt testdekning reduserer risiko for regresjoner.`,
        marketOpportunity: 'Høy testdekning signaliserer kvalitet og tiltrekker bidragsytere.',
      });
    }

    // Prosjekt med mange filer men uten kilde-mappe
    if (fileTreeMetrics.sourceDirs.length === 0 && fileTreeMetrics.byCategory.code > 10 && fileTreeMetrics.maxDepth < 3) {
      recommendations.push({
        type: 'architecture',
        priority: 'medium',
        title: 'Organiser kildekode i mapper',
        description: 'Kodefilene ligger spredt uten en tydelig mappestruktur (src/, lib/). God kodeorganisering letter navigasjon og vedlikehold.',
        marketOpportunity: 'Ryddig prosjektstruktur er avgjørende for skalerbarhet og nye bidragsytere.',
      });
    }
  }

  // ── Prosjekttype-spesifikke anbefalinger ─────────────────────
  if (projectType === 'android-app') {
    if (buildGradleContent && buildGradleContent.includes('minSdkVersion')) {
      const match = buildGradleContent.match(/minSdkVersion\s*[=:]?\s*(\d+)/);
      const minSdk = match ? parseInt(match[1]) : null;
      if (minSdk && minSdk < 24) {
        recommendations.push({
          type: 'maintenance',
          priority: 'medium',
          title: 'Vurder å heve minSdkVersion',
          description: `minSdkVersion er satt til ${minSdk}. Moderne Android-funksjonalitet krever SDK 24+.`,
          marketOpportunity: 'Høyere minSdkVersion gir tilgang til moderne API-er og reduserer vedlikeholdsbyrde.',
        });
      }
    }

    if (!buildGradleContent?.includes('kotlin') && repo.language !== 'Kotlin') {
      recommendations.push({
        type: 'architecture',
        priority: 'medium',
        title: 'Migrer til Kotlin',
        description: 'Kotlin er Googles foretrukne språk for Android og tilbyr bedre DSL, coroutines og null-safety.',
        marketOpportunity: 'Kotlin-adopsjon øker bidragsyterbas og forenkler bruk av Jetpack Compose.',
      });
    }
  }

  if (projectType === 'web-app') {
    if (packageJsonContent) {
      try {
        const pkg = JSON.parse(packageJsonContent);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Sjekk for TypeScript
        if (!deps['typescript'] && !deps['@types/node']) {
          recommendations.push({
            type: 'architecture',
            priority: 'medium',
            title: 'Vurder TypeScript',
            description: 'Prosjektet bruker ikke TypeScript. TypeScript øker kodesikkerhet og gir bedre IDE-støtte.',
            marketOpportunity: 'TypeScript er industristandard for seriøse web-prosjekter og øker bidragsyterbas.',
          });
        }
      } catch {
        // ignore
      }
    }
  }

  if (projectType === 'library') {
    if (packageJsonContent) {
      try {
        const pkg = JSON.parse(packageJsonContent);
        if (!pkg.version || pkg.version === '0.0.0' || pkg.version === '0.0.1') {
          recommendations.push({
            type: 'maintenance',
            priority: 'medium',
            title: 'Publiser stabil versjon',
            description: 'Biblioteket har ikke en stabil versjon (1.x.x). Vurder å publisere til npm med semantisk versjonering.',
            marketOpportunity: 'Stabil versjon signaliserer modenhet og gjør det tryggere å ta i bruk.',
          });
        }
        if (!pkg.description) {
          recommendations.push({
            type: 'documentation',
            priority: 'medium',
            title: 'Legg til beskrivelse i package.json',
            description: 'package.json mangler "description"-felt. Brukes av npm-søk og package-managers.',
            marketOpportunity: 'God npm-beskrivelse øker oppdagbarhet og adopsjon.',
          });
        }
      } catch {
        // ignore
      }
    }
  }

  // ── Commit-mønsteranalyse ─────────────────────────────────────
  if (recentCommits.length === 0) {
    recommendations.push({
      type: 'activity',
      priority: 'medium',
      title: 'Ingen commits siste 30 dager',
      description: 'Repositoryet har hatt null aktivitet siste 30 dager. Vurder å sette opp en vedlikeholdsplan.',
      marketOpportunity: 'Aktive repos rangeres høyere og tiltrekker seg flere brukere.',
    });
  }

  return recommendations;
}

// ─── Siste commits ────────────────────────────────────────────────────────────

/**
 * Hent commits fra siste 30 dager.
 */
async function fetchRecentCommits(octokit, owner, repoName) {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await octokit.repos.listCommits({
      owner,
      repo: repoName,
      since,
      per_page: 50,
    });
    return data;
  } catch {
    return [];
  }
}

// ─── Eksporter ────────────────────────────────────────────────────────────────

module.exports = {
  analyzeRepository,
  deepAnalyzeRepo,
  detectProjectType,
  analyzeFileTree,
  fetchRepoTree,
  fetchRootContents,
  fetchFileContent,
  fetchConfigFiles,
  fetchRecentCommits,
};

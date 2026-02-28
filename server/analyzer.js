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

  // ── 1. Parallell henting av grunnleggende data ────────────────
  const [rootFiles, recentCommits] = await Promise.all([
    fetchRootContents(octokit, owner, repoName),
    fetchRecentCommits(octokit, owner, repoName),
  ]);

  // ── 2. Detekter om vi trenger package.json eller build.gradle ─
  const hasPackageJson = rootFiles.some(f => f.toLowerCase() === 'package.json');
  const hasBuildGradle = rootFiles.some(f =>
    f.toLowerCase() === 'build.gradle' || f.toLowerCase() === 'build.gradle.kts'
  );

  // ── 3. Hent nøkkelfiler parallelt ────────────────────────────
  const filePromises = [
    fetchFileContent(octokit, owner, repoName, 'README.md').catch(() =>
      fetchFileContent(octokit, owner, repoName, 'readme.md')
    ),
    hasPackageJson
      ? fetchFileContent(octokit, owner, repoName, 'package.json')
      : Promise.resolve(null),
    hasBuildGradle
      ? fetchFileContent(octokit, owner, repoName, 'build.gradle')
      : Promise.resolve(null),
  ];

  const [readmeContent, packageJsonContent, buildGradleContent] = await Promise.all(filePromises);

  // ── 4. Sjekk for CI/CD, tester og community-filer parallelt ──
  const [hasWorkflows, hasTests, hasContributing, hasSecurity, hasCodeOfConduct] = await Promise.all([
    pathExists(octokit, owner, repoName, '.github/workflows'),
    detectTests(octokit, owner, repoName, rootFiles),
    pathExists(octokit, owner, repoName, 'CONTRIBUTING.md').then(v => v || pathExists(octokit, owner, repoName, 'contributing.md')),
    pathExists(octokit, owner, repoName, 'SECURITY.md').then(v => v || pathExists(octokit, owner, repoName, 'security.md')),
    pathExists(octokit, owner, repoName, 'CODE_OF_CONDUCT.md'),
  ]);

  // ── 5. Prosjekttype ───────────────────────────────────────────
  const projectType = detectProjectType({
    rootFiles,
    packageJsonContent,
    language: repo.language,
    repoName,
  });

  // ── 6. Generer anbefalinger ───────────────────────────────────
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
  });

  // Slå sammen — fjern duplikater basert på tittel
  const existingTitles = new Set(baseAnalysis.recommendations.map(r => r.title));
  const newRecs = deepRecs.filter(r => !existingTitles.has(r.title));
  const allRecommendations = [...baseAnalysis.recommendations, ...newRecs];

  return {
    repo: {
      ...baseAnalysis.repo,
      projectType,
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
    },
    recommendations: allRecommendations,
  };
}

// ─── Test-deteksjon ───────────────────────────────────────────────────────────

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
  fetchRootContents,
  fetchFileContent,
  fetchRecentCommits,
};

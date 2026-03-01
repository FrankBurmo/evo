'use strict';

/**
 * server/recommendation-engine.js — Dype, regelbaserte anbefalinger basert på repo-analyse.
 *
 * Eksporterer:
 *   generateDeepRecommendations(params) — Generer anbefalinger fra dyp analyse
 *   detectTestsFromTree(tree, packageJsonContent) — Detekter tester fra filtre
 *   TEST_DIRS, TEST_FILE_PATTERNS
 */

// ─── Konstanter ──────────────────────────────────────────────────────────────

const TEST_DIRS = ['__tests__', 'test', 'tests', 'spec', 'specs', 'e2e', '__test__'];
const TEST_FILE_PATTERNS = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /Test\.java$/, /Tests\.cs$/, /test_.*\.py$/];

// ─── Test-deteksjon fra filtre ────────────────────────────────────────────────

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

module.exports = {
  generateDeepRecommendations,
  detectTestsFromTree,
  TEST_DIRS,
  TEST_FILE_PATTERNS,
};

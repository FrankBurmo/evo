'use strict';

/**
 * server/copilot-client.js — GitHub Copilot Models API-klient for Express-backend
 *
 * Tilbyr KI-drevet repoanalyse via GitHub Copilot Models API.
 * Inkluderer:
 *   - Prosjekttypespesifikke analyse-prompts (web, android, api, library, generelt)
 *   - Token-bucket rate limiting (respekterer Copilot-abonnementskvote)
 *   - Strukturert JSON-output med fallback-parsing
 *   - Retry-logikk ved forbigående feil
 *
 * Eksporterer:
 *   analyzeWithAI(params)         — analyser ett repo med KI
 *   createCopilotClient(options)  — opprett en rate-limited klient-instans
 */

const { RateLimiter } = require('../packages/core');

const COPILOT_ENDPOINT = 'https://api.githubcopilot.com/inference/chat/completions';
const DEFAULT_MODEL = process.env.COPILOT_MODEL || 'openai/gpt-4.1';

// ─── Rate Limiter ────────────────────────────────────────────────────────────

// Global rate limiter — deles på tvers av alle forespørsler
const rateLimiter = new RateLimiter({
  maxPerMinute: parseInt(process.env.COPILOT_RATE_LIMIT || '10', 10),
  burstSize: 3,
});

// ─── Prosjekttypespesifikke prompts ──────────────────────────────────────────

const PROJECT_TYPE_PROMPTS = {
  'web-app': {
    focus: 'nettsted/web-app',
    areas: `Fokusér analysen på disse områdene for web-applikasjoner:
- **SEO:** Meta-tags, Open Graph, strukturerte data, sitemap, robots.txt
- **Ytelse:** Bundle-størrelse, code splitting, lazy loading, bildeoptimlisering, caching-strategi
- **Tilgjengelighet (a11y):** WCAG 2.1-samsvar, semantisk HTML, ARIA-attributter, tastaturnavigasjon
- **UX:** Responsivt design, mobilopplevelse, loading states, error boundaries
- **PWA-muligheter:** Service worker, manifest.json, offline-støtte
- **Sikkerhet:** CSP-headers, XSS-beskyttelse, HTTPS, avhengighetssårbarheter
- **Moderne praksis:** TypeScript, ESLint, Prettier, Vitest/Jest, Storybook`,
  },

  'android-app': {
    focus: 'Android-applikasjon',
    areas: `Fokusér analysen på disse områdene for Android-apper:
- **Material Design:** Følger Material Design 3-retningslinjer, tematisering, komponentbruk
- **Kotlin-migrasjon:** Bruk av Kotlin vs Java, coroutines, null-safety, Kotlin DSL i Gradle
- **Jetpack Compose:** Muligheter for å migrere til Compose UI, state management
- **Arkitektur:** MVVM/MVI-mønster, Repository-pattern, Clean Architecture-lag
- **Play Store-optimalisering:** App-størrelse, target SDK-versjon, ProGuard/R8-konfigurasjon
- **Testing:** Unit-tester, UI-tester (Espresso/Compose Test), screenshot-tester
- **CI/CD:** Automatisert bygging, signering, distribusjon via Fastlane eller GitHub Actions
- **Ytelse:** Memory leaks, ANR-risiko, database-optimalisering (Room)`,
  },

  'api': {
    focus: 'API/backend-tjeneste',
    areas: `Fokusér analysen på disse områdene for API-er og backend-tjenester:
- **Sikkerhet:** Autentisering/autorisasjon, input-validering, rate limiting, CORS, helmet, SQL injection
- **API-dokumentasjon:** OpenAPI/Swagger-spec, API-versjonering, Postman-collection
- **Feilhåndtering:** Strukturert error-format, feilkoder, logging av exceptions, graceful degradation
- **Logging & observability:** Strukturert logging (pino/winston), request tracing, helsesjekk-endepunkt
- **Database:** Migrasjonsstrategi, connection pooling, indeksering, N+1-problemer
- **Testing:** Unit-tester, integrasjonstester, API-kontrakttester, load-tester (k6/Artillery)
- **Distribusjon:** Docker, CI/CD-pipeline, miljøvariabler, secrets management
- **Skalerbarhet:** Caching-strategi (Redis), køer (BullMQ), horisontell skalering`,
  },

  'library': {
    focus: 'bibliotek/npm-pakke',
    areas: `Fokusér analysen på disse områdene for biblioteker og npm-pakker:
- **API-design:** Konsistent og intuitiv API, gode standardverdier, TypeScript-typer
- **Dokumentasjon:** API-referanse, brukseksempler, migrasjonsveiledning mellom versjoner
- **Testing:** Høy testdekning (>80%), edge-cases, kompatibilitetstester
- **Bundling:** Tree-shaking-støtte, ESM + CJS dual exports, bundle-størrelse
- **Versjonering:** Semantisk versjonering (semver), CHANGELOG.md, release notes
- **CI/CD:** Automatisk publisering til npm, GitHub Releases, pre-release-kanaler
- **Kompatibilitet:** Peer dependencies, Node.js-versjonsstøtte, browser-kompatibilitet
- **DX (Developer Experience):** Gode feilmeldinger, debugging-verktøy, playground/eksempler`,
  },

  'docs': {
    focus: 'dokumentasjonsside',
    areas: `Fokusér analysen på disse områdene for dokumentasjonssider:
- **Innhold:** Struktur, fullstendighet, oppdaterthet, lenkesjekk
- **Søk:** Implementert søkefunksjonalitet, indeksering
- **Navigasjon:** Logisk sidehierarki, breadcrumbs, «neste/forrige»-lenker
- **Tilgjengelighet:** Skjermleser-vennlighet, kontrastforhold, tastaturnavigasjon
- **Distribusjon:** CI/CD for automatisk publisering, forhåndsvisning av PRs`,
  },

  'other': {
    focus: 'generelt programvareprosjekt',
    areas: `Analyser prosjektet bredt på tvers av disse områdene:
- **Testing:** Testinfrastruktur, testdekning, testtyper (unit, integrasjon, e2e)
- **CI/CD:** Automatiserte bygge- og deploypipelines, GitHub Actions workflows
- **Avhengighetsoppdatering:** Utdaterte dependencies, Renovate/Dependabot-konfigurasjon
- **Kodeorganisering:** Mappestruktur, separasjon av ansvar, modularitet
- **Dokumentasjon:** README-kvalitet, kodekommentarer, arkitekturbeslutninger (ADR)
- **Sikkerhet:** Secrets i kode, avhengighetssårbarheter, sikkerhets-policy`,
  },
};

// ─── Hovedfunksjon: analyser med KI ──────────────────────────────────────────

/**
 * Analyser ett repo med GitHub Copilot Models API.
 *
 * @param {object} params
 * @param {string} params.token — GitHub PAT med models:read scope
 * @param {string} [params.model] — AI-modell (default: openai/gpt-4.1)
 * @param {object} params.repo — Repo-objekt (fra analyzeRepository/deepAnalyzeRepo)
 * @param {object} [params.deepInsights] — Dyp analyse-data (fra deepAnalyzeRepo)
 * @param {string[]} [params.existingRecs] — Titler på eksisterende regelbaserte anbefalinger
 * @param {boolean} [params.skipRateLimit] — Hopp over rate limiting (for testing)
 * @returns {Promise<{summary: string, recommendations: Array, projectType: string}>}
 */
async function analyzeWithAI({
  token,
  model = DEFAULT_MODEL,
  repo,
  deepInsights = null,
  existingRecs = [],
  skipRateLimit = false,
}) {
  if (!token) {
    throw new Error('GitHub token er påkrevd for Copilot Models API');
  }

  // Rate limiting
  if (!skipRateLimit) {
    await rateLimiter.acquire();
  }

  const projectType = deepInsights?.projectType || repo.projectType || 'other';
  const typeConfig = PROJECT_TYPE_PROMPTS[projectType] || PROJECT_TYPE_PROMPTS['other'];

  const systemPrompt = buildSystemPrompt(typeConfig);
  const userPrompt = buildUserPrompt({ repo, deepInsights, existingRecs, typeConfig });

  // Retry-logikk: opptil 2 forsøk ved forbigående feil
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callCopilotAPI({ token, model, systemPrompt, userPrompt });
      return { ...result, projectType };
    } catch (err) {
      lastError = err;

      // Retry kun ved 429 (rate limit) eller 5xx (serverfeil)
      if (err.statusCode === 429 || (err.statusCode >= 500 && err.statusCode < 600)) {
        const waitMs = attempt === 0 ? 3000 : 6000;
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── Prompt-bygging ──────────────────────────────────────────────────────────

function buildSystemPrompt(typeConfig) {
  return `Du er en erfaren software-arkitekt og produktstrateg som spesialiserer seg på ${typeConfig.focus}.
Analyser dette GitHub-repositoryet og gi 3-5 korte, konkrete forbedringsforslag.

${typeConfig.areas}

Svar KUN med gyldig JSON i dette formatet (ingen markdown, ingen forklaring utenfor JSON):
{
  "summary": "2-3 setninger om prosjektets nåværende tilstand og viktigste forbedringspotensial.",
  "recommendations": [
    {
      "title": "Kort, presis tittel (maks 80 tegn)",
      "description": "Konkret beskrivelse av hva som bør gjøres og hvorfor. Inkluder kodeeksempler eller filreferanser der relevant.",
      "priority": "high|medium|low",
      "type": "documentation|testing|ci|security|performance|community|architecture|ux|seo|accessibility"
    }
  ]
}

VIKTIG:
- Gi KUN forslag som er relevante og gjennomførbare for dette spesifikke prosjektet.
- Prioriter forslag etter faktisk verdi og gjennomførbarhet.
- Ikke gjenta anbefalinger som allerede er identifisert.
- Bruk norsk i alle tekster.`;
}

function buildUserPrompt({ repo, deepInsights, existingRecs, typeConfig }) {
  const parts = [];

  // Repo-metadata
  parts.push(`GitHub-repo: ${repo.fullName || repo.full_name}`);
  parts.push(`Prosjekttype: ${typeConfig.focus}`);
  parts.push(`Språk: ${repo.language || 'ukjent'}`);
  parts.push(`Beskrivelse: ${repo.description || '(ingen beskrivelse)'}`);
  parts.push(`Synlighet: ${repo.visibility || (repo.private ? 'private' : 'public')}`);
  parts.push(`Stjerner: ${repo.stars ?? repo.stargazers_count ?? 0}, Forks: ${repo.forks ?? repo.forks_count ?? 0}, Åpne issues: ${repo.openIssues ?? repo.open_issues_count ?? 0}`);

  const updatedAt = repo.updatedAt || repo.updated_at;
  if (updatedAt) {
    parts.push(`Siste oppdatering: ${new Date(updatedAt).toLocaleDateString('nb-NO')}`);
  }

  parts.push(`Lisens: ${repo.license?.spdx_id || repo.license?.name || 'ingen'}`);

  // Dyp innsikt (om tilgjengelig)
  if (deepInsights) {
    parts.push('');
    parts.push('--- Dyp analyse ---');
    parts.push(`Har README: ${deepInsights.hasReadme ? 'ja' : 'nei'}`);
    parts.push(`Har CI/CD: ${deepInsights.hasCI ? 'ja' : 'nei'}`);
    parts.push(`Har tester: ${deepInsights.hasTests ? 'ja' : 'nei'}`);
    parts.push(`Har CONTRIBUTING.md: ${deepInsights.hasContributing ? 'ja' : 'nei'}`);
    parts.push(`Har SECURITY.md: ${deepInsights.hasSecurity ? 'ja' : 'nei'}`);
    parts.push(`Antall commits siste 30 dager: ${deepInsights.recentCommitsCount ?? 'ukjent'}`);
    parts.push(`Antall filer i rot: ${deepInsights.rootFileCount ?? 'ukjent'}`);

    // Verktøy og konfigurasjon
    if (deepInsights.hasTypeScript !== undefined) {
      parts.push(`TypeScript: ${deepInsights.hasTypeScript ? 'ja' : 'nei'}`);
    }
    if (deepInsights.hasLinter !== undefined) {
      parts.push(`Linter: ${deepInsights.hasLinter ? 'ja' : 'nei'}`);
    }
    if (deepInsights.hasFormatter !== undefined) {
      parts.push(`Formatter: ${deepInsights.hasFormatter ? 'ja' : 'nei'}`);
    }
    if (deepInsights.hasDocker !== undefined) {
      parts.push(`Docker: ${deepInsights.hasDocker ? 'ja' : 'nei'}`);
    }
    if (deepInsights.hasDependabot !== undefined) {
      parts.push(`Dependabot: ${deepInsights.hasDependabot ? 'ja' : 'nei'}`);
    }
    if (deepInsights.hasLockfile !== undefined) {
      parts.push(`Lockfile: ${deepInsights.hasLockfile ? 'ja' : 'nei'}`);
    }

    // Filtre-metrikker
    if (deepInsights.fileTreeMetrics) {
      const m = deepInsights.fileTreeMetrics;
      parts.push('');
      parts.push('--- Filstruktur-metrikker ---');
      parts.push(`Totalt filer: ${m.totalFiles}, mapper: ${m.totalDirs}`);
      parts.push(`Kodefiler: ${m.byCategory.code}, docs: ${m.byCategory.docs}, config: ${m.byCategory.config}, styles: ${m.byCategory.styles}`);
      parts.push(`Testfiler: ${m.testFileCount}`);
      parts.push(`Total kodestørrelse: ${(m.totalCodeSize / 1024).toFixed(1)} KB`);
      parts.push(`Maks mappenivå: ${m.maxDepth}`);
      if (m.sourceDirs.length > 0) {
        parts.push(`Kilde-mapper: ${m.sourceDirs.join(', ')}`);
      }
      if (m.topExtensions.length > 0) {
        parts.push(`Topp filtyper: ${m.topExtensions.map(e => `${e.ext} (${e.count})`).join(', ')}`);
      }
      if (m.topLevelDirs.length > 0) {
        parts.push(`Toppnivå-mapper: ${m.topLevelDirs.join(', ')}`);
      }
    }

    // Filtre-oversikt (komprimert)
    if (deepInsights.fileTreeSummary && deepInsights.fileTreeSummary.length > 0) {
      const totalFiles = deepInsights.fileTreeMetrics?.totalFiles || deepInsights.fileTreeSummary.length;
      parts.push('');
      parts.push(`--- Filtre (${deepInsights.fileTreeSummary.length} av ${totalFiles} filer) ---`);
      parts.push(deepInsights.fileTreeSummary.join('\n'));
    }

    if (deepInsights.readmeSummary) {
      parts.push(`\nREADME (utdrag):\n${deepInsights.readmeSummary}`);
    }

    if (deepInsights.packageJsonContent) {
      // Trekk ut relevante felter for å spare tokens
      try {
        const pkg = JSON.parse(deepInsights.packageJsonContent);
        const relevantPkg = {
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          scripts: pkg.scripts ? Object.keys(pkg.scripts) : [],
          dependencies: pkg.dependencies ? Object.keys(pkg.dependencies) : [],
          devDependencies: pkg.devDependencies ? Object.keys(pkg.devDependencies) : [],
        };
        parts.push(`\npackage.json (sammendrag):\n${JSON.stringify(relevantPkg, null, 2)}`);
      } catch {
        parts.push(`\npackage.json:\n${deepInsights.packageJsonContent.slice(0, 2000)}`);
      }
    }

    if (deepInsights.buildGradleContent) {
      parts.push(`\nbuild.gradle (utdrag):\n${deepInsights.buildGradleContent.slice(0, 2000)}`);
    }

    // Konfigurasjonsfiler
    if (deepInsights.configFiles) {
      const configNames = Object.keys(deepInsights.configFiles);
      if (configNames.length > 0) {
        parts.push('');
        parts.push('--- Konfigurasjonsfiler ---');
        for (const [fileName, content] of Object.entries(deepInsights.configFiles)) {
          // Inkluder korte utdrag for å spare tokens
          const truncated = content.length > 1000 ? content.slice(0, 1000) + '\n...(avkuttet)' : content;
          parts.push(`\n${fileName}:\n${truncated}`);
        }
      }
    }

    // Workflow-filer
    if (deepInsights.workflowFiles && deepInsights.workflowFiles.length > 0) {
      parts.push('');
      parts.push('--- GitHub Actions Workflows ---');
      for (const wf of deepInsights.workflowFiles) {
        const truncated = wf.content.length > 800 ? wf.content.slice(0, 800) + '\n...(avkuttet)' : wf.content;
        parts.push(`\n${wf.name}:\n${truncated}`);
      }
    }
  }

  // Eksisterende anbefalinger (for dedup)
  parts.push('');
  parts.push('Allerede identifiserte forbedringsforslag (IKKE gjenta disse):');
  if (existingRecs.length > 0) {
    existingRecs.forEach(r => parts.push(`- ${r}`));
  } else {
    parts.push('(ingen)');
  }

  parts.push('');
  parts.push('Gi 3-5 nye, konkrete forbedringsforslag som IKKE overlapper med de eksisterende.');

  return parts.join('\n');
}

// ─── Copilot API-kall ────────────────────────────────────────────────────────

// A8: Konfigurerbar timeout for eksterne API-kall (standard: 30 sekunder)
const FETCH_TIMEOUT_MS = parseInt(process.env.COPILOT_FETCH_TIMEOUT || '30000', 10);

async function callCopilotAPI({ token, model, systemPrompt, userPrompt }) {
  // A8: AbortController med timeout for å unngå hengende forespørsler
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(COPILOT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const error = new Error(`Copilot API timeout etter ${FETCH_TIMEOUT_MS}ms`);
      error.statusCode = 504;
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(`Copilot API feil (${response.status}): ${text.slice(0, 300)}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse JSON fra svaret — støtter både rent JSON og JSON i markdown-blokker
  return parseAIResponse(content);
}

/**
 * Parse og valider KI-responsen. Robust mot ulike formater.
 */
function parseAIResponse(content) {
  // Fjern eventuell markdown code-block wrapper
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Forsøk 1: Parse hele strengen
  try {
    const parsed = JSON.parse(cleaned);
    return validateAIResult(parsed);
  } catch {
    // ignore
  }

  // Forsøk 2: Finn JSON-objekt i teksten
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateAIResult(parsed);
    } catch {
      // ignore
    }
  }

  // Forsøk 3: Returner fallback
  return {
    summary: 'KI-analyse fullført, men svaret kunne ikke parses strukturert.',
    recommendations: [],
  };
}

/**
 * Valider og normaliser KI-resultat.
 */
function validateAIResult(parsed) {
  const validPriorities = new Set(['high', 'medium', 'low']);
  const validTypes = new Set([
    'documentation', 'testing', 'ci', 'security', 'performance',
    'community', 'architecture', 'ux', 'seo', 'accessibility',
    'maintenance', 'activity', 'visibility',
  ]);

  const result = {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    recommendations: [],
  };

  if (Array.isArray(parsed.recommendations)) {
    result.recommendations = parsed.recommendations
      .filter(r => r && typeof r.title === 'string')
      .map(r => ({
        title: r.title.slice(0, 120),
        description: typeof r.description === 'string' ? r.description : r.title,
        priority: validPriorities.has(r.priority) ? r.priority : 'medium',
        type: validTypes.has(r.type) ? r.type : 'architecture',
        source: 'ai',
      }));
  }

  return result;
}

// ─── Hjelpefunksjoner ────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Factory for klient-instans (for fremtidig konfigurerbarhet) ─────────────

/**
 * Opprett en konfigurert Copilot-klient.
 * Returnerer et objekt med analyzeWithAI-metode og tilgang til rate limiter.
 *
 * @param {object} [options]
 * @param {string} [options.model] — Standard modell
 * @param {number} [options.maxPerMinute] — Maks API-kall per minutt
 * @returns {{ analyzeWithAI: Function, rateLimiter: RateLimiter }}
 */
function createCopilotClient({ model, maxPerMinute } = {}) {
  const clientModel = model || DEFAULT_MODEL;
  const clientLimiter = maxPerMinute
    ? new RateLimiter({ maxPerMinute, burstSize: Math.min(maxPerMinute, 3) })
    : rateLimiter;

  return {
    analyzeWithAI: (params) =>
      analyzeWithAI({
        ...params,
        model: params.model || clientModel,
      }),
    rateLimiter: clientLimiter,
  };
}

// ─── Eksporter ────────────────────────────────────────────────────────────────

module.exports = {
  analyzeWithAI,
  createCopilotClient,
  RateLimiter,
  PROJECT_TYPE_PROMPTS,
};

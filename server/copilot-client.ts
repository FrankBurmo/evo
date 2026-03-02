/**
 * server/copilot-client.ts — GitHub Copilot Models API-klient for Express-backend.
 */
import { RateLimiter } from '../packages/core';
import type { Recommendation, ProjectType } from '../packages/core';

const COPILOT_ENDPOINT = 'https://api.githubcopilot.com/inference/chat/completions';
const DEFAULT_MODEL = process.env.COPILOT_MODEL || 'openai/gpt-4.1';
const FETCH_TIMEOUT_MS = parseInt(process.env.COPILOT_FETCH_TIMEOUT || '30000', 10);

// ─── Rate Limiter ────────────────────────────────────────────────────────────

const rateLimiter = new RateLimiter({
  maxPerMinute: parseInt(process.env.COPILOT_RATE_LIMIT || '10', 10),
  burstSize: 3,
});

// ─── Prosjekttypespesifikke prompts ──────────────────────────────────────────

interface TypeConfig {
  focus: string;
  areas: string;
}

export const PROJECT_TYPE_PROMPTS: Record<string, TypeConfig> = {
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

// ─── Typer ────────────────────────────────────────────────────────────────────

export interface AIAnalysisResult {
  summary: string;
  recommendations: Recommendation[];
  projectType: ProjectType;
}

interface AnalyzeWithAIParams {
  token: string;
  model?: string;
  repo: Record<string, unknown>;
  deepInsights?: Record<string, unknown> | null;
  existingRecs?: string[];
  skipRateLimit?: boolean;
}

// ─── Hovedfunksjon ────────────────────────────────────────────────────────────

export async function analyzeWithAI({
  token,
  model = DEFAULT_MODEL,
  repo,
  deepInsights = null,
  existingRecs = [],
  skipRateLimit = false,
}: AnalyzeWithAIParams): Promise<AIAnalysisResult> {
  if (!token) {
    throw new Error('GitHub token er påkrevd for Copilot Models API');
  }

  if (!skipRateLimit) {
    await rateLimiter.acquire();
  }

  const projectType =
    ((deepInsights?.projectType as ProjectType) || (repo.projectType as ProjectType) || 'other');
  const typeConfig = PROJECT_TYPE_PROMPTS[projectType] || PROJECT_TYPE_PROMPTS['other'];

  const systemPrompt = buildSystemPrompt(typeConfig);
  const userPrompt = buildUserPrompt({ repo, deepInsights, existingRecs, typeConfig });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callCopilotAPI({ token, model, systemPrompt, userPrompt });
      return { ...result, projectType };
    } catch (err: unknown) {
      lastError = err;
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 429 || (statusCode !== undefined && statusCode >= 500 && statusCode < 600)) {
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

function buildSystemPrompt(typeConfig: TypeConfig): string {
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

function buildUserPrompt(params: {
  repo: Record<string, unknown>;
  deepInsights: Record<string, unknown> | null;
  existingRecs: string[];
  typeConfig: TypeConfig;
}): string {
  const { repo, deepInsights, existingRecs, typeConfig } = params;
  const parts: string[] = [];

  parts.push(`GitHub-repo: ${(repo.fullName as string) || (repo.full_name as string)}`);
  parts.push(`Prosjekttype: ${typeConfig.focus}`);
  parts.push(`Språk: ${(repo.language as string) || 'ukjent'}`);
  parts.push(`Beskrivelse: ${(repo.description as string) || '(ingen beskrivelse)'}`);
  parts.push(
    `Synlighet: ${(repo.visibility as string) || (repo.private ? 'private' : 'public')}`,
  );
  parts.push(
    `Stjerner: ${(repo.stars as number) ?? (repo.stargazers_count as number) ?? 0}, Forks: ${(repo.forks as number) ?? (repo.forks_count as number) ?? 0}, Åpne issues: ${(repo.openIssues as number) ?? (repo.open_issues_count as number) ?? 0}`,
  );

  const updatedAt = (repo.updatedAt as string) || (repo.updated_at as string);
  if (updatedAt) {
    parts.push(`Siste oppdatering: ${new Date(updatedAt).toLocaleDateString('nb-NO')}`);
  }

  const license = repo.license as { spdx_id?: string; name?: string } | null;
  parts.push(`Lisens: ${license?.spdx_id || license?.name || 'ingen'}`);

  if (deepInsights) {
    parts.push('');
    parts.push('--- Dyp analyse ---');
    parts.push(`Har README: ${deepInsights.hasReadme ? 'ja' : 'nei'}`);
    parts.push(`Har CI/CD: ${deepInsights.hasCI ? 'ja' : 'nei'}`);
    parts.push(`Har tester: ${deepInsights.hasTests ? 'ja' : 'nei'}`);
    parts.push(`Har CONTRIBUTING.md: ${deepInsights.hasContributing ? 'ja' : 'nei'}`);
    parts.push(`Har SECURITY.md: ${deepInsights.hasSecurity ? 'ja' : 'nei'}`);
    parts.push(
      `Antall commits siste 30 dager: ${(deepInsights.recentCommitsCount as number) ?? 'ukjent'}`,
    );
    parts.push(`Antall filer i rot: ${(deepInsights.rootFileCount as number) ?? 'ukjent'}`);

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

    const m = deepInsights.fileTreeMetrics as Record<string, unknown> | null;
    if (m) {
      parts.push('');
      parts.push('--- Filstruktur-metrikker ---');
      parts.push(`Totalt filer: ${m.totalFiles}, mapper: ${m.totalDirs}`);
      const cat = m.byCategory as Record<string, number>;
      parts.push(
        `Kodefiler: ${cat.code}, docs: ${cat.docs}, config: ${cat.config}, styles: ${cat.styles}`,
      );
      parts.push(`Testfiler: ${m.testFileCount}`);
      parts.push(
        `Total kodestørrelse: ${(((m.totalCodeSize as number) || 0) / 1024).toFixed(1)} KB`,
      );
      parts.push(`Maks mappenivå: ${m.maxDepth}`);
    }

    const fts = deepInsights.fileTreeSummary as string[] | null;
    if (fts && fts.length > 0) {
      const totalFiles = (m?.totalFiles as number) || fts.length;
      parts.push('');
      parts.push(`--- Filtre (${fts.length} av ${totalFiles} filer) ---`);
      parts.push(fts.join('\n'));
    }

    if (deepInsights.readmeSummary) {
      parts.push(`\nREADME (utdrag):\n${deepInsights.readmeSummary}`);
    }

    if (deepInsights.packageJsonContent) {
      try {
        const pkg = JSON.parse(deepInsights.packageJsonContent as string);
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
        parts.push(
          `\npackage.json:\n${(deepInsights.packageJsonContent as string).slice(0, 2000)}`,
        );
      }
    }

    if (deepInsights.buildGradleContent) {
      parts.push(
        `\nbuild.gradle (utdrag):\n${(deepInsights.buildGradleContent as string).slice(0, 2000)}`,
      );
    }

    const configFiles = deepInsights.configFiles as Record<string, string> | null;
    if (configFiles) {
      const configNames = Object.keys(configFiles);
      if (configNames.length > 0) {
        parts.push('');
        parts.push('--- Konfigurasjonsfiler ---');
        for (const [fileName, content] of Object.entries(configFiles)) {
          const truncated =
            content.length > 1000 ? content.slice(0, 1000) + '\n...(avkuttet)' : content;
          parts.push(`\n${fileName}:\n${truncated}`);
        }
      }
    }

    const workflowFiles = deepInsights.workflowFiles as Array<{
      name: string;
      content: string;
    }> | null;
    if (workflowFiles && workflowFiles.length > 0) {
      parts.push('');
      parts.push('--- GitHub Actions Workflows ---');
      for (const wf of workflowFiles) {
        const truncated =
          wf.content.length > 800 ? wf.content.slice(0, 800) + '\n...(avkuttet)' : wf.content;
        parts.push(`\n${wf.name}:\n${truncated}`);
      }
    }
  }

  parts.push('');
  parts.push('Allerede identifiserte forbedringsforslag (IKKE gjenta disse):');
  if (existingRecs.length > 0) {
    existingRecs.forEach((r) => parts.push(`- ${r}`));
  } else {
    parts.push('(ingen)');
  }

  parts.push('');
  parts.push('Gi 3-5 nye, konkrete forbedringsforslag som IKKE overlapper med de eksisterende.');

  return parts.join('\n');
}

// ─── Copilot API-kall ────────────────────────────────────────────────────────

async function callCopilotAPI(params: {
  token: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ summary: string; recommendations: Recommendation[] }> {
  const { token, model, systemPrompt, userPrompt } = params;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(COPILOT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if ((err as Error).name === 'AbortError') {
      const error = new Error(`Copilot API timeout etter ${FETCH_TIMEOUT_MS}ms`) as Error & {
        statusCode: number;
      };
      error.statusCode = 504;
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(
      `Copilot API feil (${response.status}): ${text.slice(0, 300)}`,
    ) as Error & { statusCode: number };
    error.statusCode = response.status;
    throw error;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content || '';
  return parseAIResponse(content);
}

function parseAIResponse(content: string): { summary: string; recommendations: Recommendation[] } {
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(cleaned);
    return validateAIResult(parsed);
  } catch {
    // ignore
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateAIResult(parsed);
    } catch {
      // ignore
    }
  }

  return { summary: 'KI-analyse fullført, men svaret kunne ikke parses strukturert.', recommendations: [] };
}

function validateAIResult(parsed: unknown): {
  summary: string;
  recommendations: Recommendation[];
} {
  const validPriorities = new Set(['high', 'medium', 'low']);
  const validTypes = new Set([
    'documentation', 'testing', 'ci', 'security', 'performance',
    'community', 'architecture', 'ux', 'seo', 'accessibility',
    'maintenance', 'activity', 'visibility',
  ]);

  const p = parsed as Record<string, unknown>;
  const result = {
    summary: typeof p.summary === 'string' ? p.summary : '',
    recommendations: [] as Recommendation[],
  };

  if (Array.isArray(p.recommendations)) {
    result.recommendations = (p.recommendations as Record<string, unknown>[])
      .filter((r) => r && typeof r.title === 'string')
      .map((r) => ({
        title: (r.title as string).slice(0, 120),
        description: typeof r.description === 'string' ? r.description : r.title as string,
        priority: validPriorities.has(r.priority as string)
          ? (r.priority as 'high' | 'medium' | 'low')
          : 'medium',
        type: validTypes.has(r.type as string) ? (r.type as string) : 'architecture',
        source: 'ai' as const,
      }));
  }

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Factory for klient-instans ──────────────────────────────────────────────

interface CopilotClientOptions {
  model?: string;
  maxPerMinute?: number;
}

export function createCopilotClient(options: CopilotClientOptions = {}): {
  analyzeWithAI: typeof analyzeWithAI;
  rateLimiter: RateLimiter;
} {
  const { model, maxPerMinute } = options;
  const clientModel = model || DEFAULT_MODEL;
  const clientLimiter = maxPerMinute
    ? new RateLimiter({ maxPerMinute, burstSize: Math.min(maxPerMinute, 3) })
    : rateLimiter;

  return {
    analyzeWithAI: (params) => analyzeWithAI({ ...params, model: params.model || clientModel }),
    rateLimiter: clientLimiter,
  };
}

export { RateLimiter };

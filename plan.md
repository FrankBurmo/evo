# Evo – Utviklingsplan 🚀

> **Sist oppdatert:** 8. juli 2025

## Visjon

Bygge **Evo** til en **proaktiv utviklingsassistent** som automatisk itererer gjennom alle dine GitHub-repos, analyserer nåværende funksjonalitet, og oppretter GitHub Issues med konkrete forbedringsforslag — drevet av ditt eksisterende GitHub Copilot-abonnement som KI-motor.

---

## Nåværende status (mars 2026)

Evo har utviklet seg betydelig fra den opprinnelige planen. Prosjektet er rebrandet fra «Product Orchestrator» til **Evo**, med slagordet *«Produktene dine vokser kontinuerlig – automatisk.»*

### Hva er ferdig ✅

- **Fase 1–5 komplett:** Dyp repoanalyse, KI-analyse (Copilot Models API), automatisk issue-opprettelse, scan-orkestrering i UI, schedulert kjøring via GitHub Actions
- **Fase A komplett:** Sikkerhetshardening — `helmet()`, CORS-begrensning, global error-handler, zod-validering, `requireAuth`-middleware, timeout, graceful shutdown
- **Fase C komplett:** Frontend-kvalitet og tilgjengelighet — a11y, performance, søk/sortering, skeleton loading, toast, Error Boundary
- **Fase D komplett:** Testdekning ~25% → ~70% — 219 tester (21 testfiler), supertest-integrasjonstester, backend/CLI/frontend fulldekning
- **TypeScript Trinn 1+2 gjort:** `jsconfig.json` med `checkJs: true` + `strict: true`, alle `@types/*`-pakker installert, `server/types.d.ts`, `tsconfig.base.json`, `tsconfig.json` (backend/CommonJS), `tsconfig.frontend.json` (ESNext/bundler), `packages/core/tsconfig.json`, `packages/cli/tsconfig.json` — `typecheck`-script kjører alle 4 i sekvens, **0 feil**
- **TypeScript H2+H3 ferdig:** `commander` installert i root (bundled typer), `@ts-ignore` fjernet fra CLI. `packages/core/index.ts` med fullstendige interfaces (`Recommendation`, `ProjectType`, `Priority`, `RepositoryMeta`, `RepositoryAnalysis`, `RateLimiterOptions` m.fl.). Core kompilerer til `dist/index.js` + `dist/index.d.ts`. `prepare`-hook bygger core automatisk ved `npm install`.
- **TypeScript H4+H5+H6 ferdig:** Alle `server/`-filer (20 stk) og `packages/cli/`-filer (6 stk) konvertert til TypeScript. Gamle `.js`-kilde-filer slettet. `vitest.backend.config.js` oppdatert med `tsx/cjs`-loader og `Object.defineProperty`-patch for test-mocking-kompatibilitet. `server/routes/*.ts` bruker `export = router` for CJS-interop. `packages/cli/src/analyzer.ts` eksporterer `detectProjectType` og `PROJECT_TYPE_LABELS`. Typecheck: **0 feil**. Tester: **219/219 passerer**.
- **TypeScript H8 ferdig (produksjonsbygg):** `tsconfig.server.build.json` (`rootDir: "."`, `outDir: "dist"`) kompilerer server + core til korrekte relative stier. `npm run build:server` → `dist/server/index.js` + `dist/packages/core/index.js`. `npm start` kjører produksjonsserveren. GitHub Actions-workflow fikset: `vitest.backend.config.ts`-referanse rettet + `npm run typecheck`-steg lagt til i CI-pipeline. **Fase H 100% ferdig.**
- **Web-dashboard** med `ConfigurablePanel` (erstattet 3 separate paneler), filtrering, statistikk, AgentModal, ScanControl
- **CLI** (`evo-scan`) med Commander.js, regelbasert + AI-analyse, issue-opprettelse, config-støtte
- **Express-backend** med 12 API-endepunkter, rate limiting, Copilot Agent-tildeling via GraphQL, `server/services/issue-service.js`
- **Delt kjernepakke** `packages/core/` med `analyzeRepository`, `detectProjectTypeFromMetadata`, `PROJECT_TYPE_LABELS`, `PRIORITY_RANK` — eliminerer ~270 LOC duplisering mellom CLI og server
- **Tester:** Vitest for frontend + backend + CLI (~219 tester) — Fase D komplett
- **CI/CD:** GitHub Pages deploy + proaktiv skanning via GitHub Actions
- **Dokumentasjon:** strategy.md, README, plan.md, copilot-instructions.md

### Identifiserte problemområder 🔍

Basert på en grundig gjennomgang av hele kodebasen (februar 2026) er følgende de viktigste forbedringspunktene:

**Arkitektur og kodekvalitet:**
- ~~Massiv kodeduplisering: 3 nesten identiske panelkomponenter (~600 LOC), 3 identiske CSS-filer (~480 LOC), duplisert analyselogikk mellom CLI og server (~270 LOC)~~ ✅ Løst — se Fase B
- `analyzer.js` (nå kortere) ~~og `templates.js` (635 linjer) kan fortsatt splittes~~ ✅ Løst — `templates.js` splittet til `server/templates/` (4 filer + index.js)
- ~~`ScanControl.jsx` er 526 linjer uten oppsplitting~~ ✅ Løst — splittet i 4 delkomponenter
- ~~Duplisert issue-opprettelseslogikk i `routes/issues.js` (4 nesten like rutehandlere)~~ ✅ Løst — `issue-service.js` service-lag
- ~~Manglende service-lag — forretningslogikk ligger direkte i Express-routes~~ ✅ Løst — `issue-service.js`, `scan-service.js`, `analysis-service.js` opprettet

**Sikkerhet:**
- ~~Ingen `helmet()`-middleware for sikre HTTP-headers~~ ✅ Løst — Fase A
- ~~CORS tillater alle origins~~ ✅ Løst — Fase A
- ~~Ingen input-validering/sanitering på POST-ruter~~ ✅ Løst — Fase A
- ~~Uautentisert tilgang til `scan/status` og `scan/results`~~ ✅ Løst — Fase A
- ~~`extractToken()` er case-sensitiv~~ ✅ Løst — Fase A

**Robusthet og feilhåndtering:**
- ~~Ingen global error-handler middleware i Express~~ ✅ Løst — Fase A
- Mange tomme `catch {}`-blokker i analyzer.js
- ~~Inkonsistente feilresponser (varierer mellom `{ error }` og `{ error, message }`)~~ ✅ Løst — Fase A
- ~~Ingen graceful shutdown, ingen timeout på fetch-kall~~ ✅ Løst — Fase A
- In-memory scan-tilstand — forsvinner ved restart, kun single-tenant

**Frontend/UX:**
- ~~Ingen a11y: modalen mangler fokus-felle/`role="dialog"`, klikkbare `<div>`-er overalt, `lang="en"` i HTML~~ ✅ Løst — Fase C
- ~~`applyFilter` i Dashboard er et `useEffect`-antimønster (bør være `useMemo`)~~ ✅ Løst — Fase C
- ~~Ingen søk, sortering, Error Boundary, skeleton loading~~ ✅ Løst — Fase C
- ~~Blanding av norsk og engelsk i UI-tekster~~ ✅ Løst — Fase G

**Tester:**
- ~~Estimert dekning: CLI ~30%, server ~20%, frontend ~25%~~ ✅ Løst — Fase D (219 tester, ~70% dekning)
- ~~Ingen tester for routes, `deepAnalyzeRepo`, `scanner.js`, `issues.js`, `copilot.js`, modalen eller panelene~~ ✅ Løst — Fase D
- ~~Ingen integrasjonstester~~ ✅ Løst — supertest-baserte HTTP-integrasjonstester for alle 12 API-endepunkter

**CLI-spesifikt:**
- Mangler rate limiting og retry for Copilot API
- Mangler prosjekttypespesifikke AI-prompts (serveren har dem)
- `main` i package.json peker til ikke-eksisterende fil

**Stale referanser:**
- ~~`vite.config.js` bruker `/product-orchestrator/` som base i produksjon (bør være `/evo/`)~~ ✅ Løst
- ~~`package.json` har repo-URL til `product-orchestrator`~~ ✅ Løst
- ~~Helsesjekk sier «Product Orchestrator API»~~ ✅ Løst

---

## Arkitektur

```
┌──────────────────────────────────────────────────────────────────────┐
│                              Evo                                     │
│                                                                      │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────┐  ┌────────┐  │
│  │  React UI    │  │  Express Backend  │  │  CLI      │  │ GitHub │  │
│  │  Dashboard   │◄─┤  API Server       │  │  evo-scan │  │Actions │  │
│  │  + 3 paneler │  │  + Issue Creator  │  │  (node)   │  │ CI/CD  │  │
│  │  + AgentModal│  │  + Copilot Assign │  └─────┬─────┘  └───┬────┘  │
│  └──────────────┘  └────────┬─────────┘        │            │        │
│                              │                  │            │        │
│              ┌───────────────┼──────────────────┼────────────┘        │
│              ▼               ▼                  ▼                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐            │
│  │ GitHub REST  │  │ GitHub       │  │ GitHub Models    │            │
│  │ API (Octokit)│  │ Copilot      │  │ API (KI-analyse) │            │
│  │ - Repos      │  │ Coding Agent │  │ - Chat endpoint  │            │
│  │ - Issues     │  │ - GraphQL    │  │ - Kodeanalyse    │            │
│  │ - Contents   │  │   assignment │  │ - Anbefalinger   │            │
│  └──────────────┘  └──────────────┘  └──────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Teknologi og integrasjoner

### 1. GitHub Copilot Models API (KI-motor)

Bruker ditt eksisterende Copilot-abonnement for intelligent kodeanalyse via REST API:

- **Endpoint:** `https://api.githubcopilot.com/inference/chat/completions`
- **Autentisering:** GitHub PAT med `models:read` scope
- **Modeller:** GPT-4.1, GPT-5, Claude Sonnet/Opus — velges etter oppgavetype
- **Bruk:** Sender kildekode, repo-struktur og metadata som kontekst, mottar KI-genererte anbefalinger

**Eksempel på bruk i Product Orchestrator:**
```javascript
const response = await fetch('https://api.githubcopilot.com/inference/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${githubToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'openai/gpt-4.1',
    messages: [
      {
        role: 'system',
        content: 'Du er en erfaren utvikler. Analyser dette repositoryet og foreslå konkrete forbedringer.'
      },
      {
        role: 'user',
        content: `Repository: ${repoName}\nSpråk: ${language}\nBeskrivelse: ${description}\nFilstruktur: ${fileTree}\nREADME: ${readmeContent}\npackage.json: ${packageJson}`
      }
    ]
  })
});
```

### 2. GitHub REST API via Octokit (utvidet)

Utvidelse av eksisterende Octokit-integrasjon:

| Funksjon | API-kall | Formål |
|----------|----------|--------|
| Hent repo-innhold | `repos.getContent()` | Lese filstruktur, README, config-filer |
| Hent språk | `repos.listLanguages()` | Identifisere tech stack |
| Hent workflows | `actions.listWorkflowsForRepo()` | Sjekke CI/CD-oppsett |
| Opprett issue | `issues.create()` | Opprette forbedringsforslag som issues |
| List issues | `issues.listForRepo()` | Unngå duplikate issues |
| Hent commits | `repos.listCommits()` | Analysere aktivitetsmønstre |
| Hent releases | `repos.listReleases()` | Vurdere release-praksis |

### 3. GitHub Copilot Coding Agent

For issues som opprettes, kan brukeren tilordne dem til `@copilot`:

- Copilot Coding Agent tar imot issuet og jobber autonomt
- Oppretter en feature-branch, skriver kode, kjører tester
- Lager en draft Pull Request knyttet til issuet
- Brukeren reviewer og merger — full kontroll

**Flyt:** Product Orchestrator → oppretter issue → bruker assignerer til @copilot → Copilot løser issuet

### 4. GitHub Actions (Schedulert kjøring)

Automatisert daglig/ukentlig skanning via GitHub Actions cron:

```yaml
# .github/workflows/proactive-scan.yml
name: Proaktiv Repo-skanning

on:
  schedule:
    - cron: '0 6 * * 1'  # Hver mandag kl. 06:00 UTC
  workflow_dispatch:       # Manuell utløsing

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: node scripts/proactive-scan.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Ny prioritert backlog (februar 2026)

Basert på en komplett kodegjennomgang er backlog-en restrukturert i 6 nye faser, sortert etter forretningsverdi og teknisk risiko.

---

### Fase A: Sikkerhetshardening og robusthet ✅ Ferdig

**Mål:** Gjøre backend produksjonsklar med grunnleggende sikkerhet og feilhåndtering.

**Oppgaver:**

- [x] **A1. Legg til `helmet()`-middleware** — sikre HTTP-headers (CSP, X-Frame-Options, etc.)
- [x] **A2. Begrens CORS** — tillat kun kjente origins (`localhost:5173`, GitHub Pages)
- [x] **A3. Global error-handler middleware** — konsistent `{ error, message, statusCode }` JSON-format for alle feil + 404-handler
- [x] **A4. Input-validering** — `zod`-skjemaer for alle POST-ruter (request body, route params) i `server/validation.js`
- [x] **A5. Autentiserings-middleware** — `requireAuth` i `server/middleware.js`, setter `req.token` for nedstrøms bruk
- [x] **A6. Autentiser `scan/status` og `scan/results`** — `router.use('/scan', requireAuth)` krever token på alle scan-ruter
- [x] **A7. Fiks `extractToken()` case-insensitivitet** — regex-basert, støtter `Bearer`/`bearer`/`BEARER`
- [x] **A8. Timeout på eksterne fetch-kall** — `AbortController` med konfigurerbar timeout (`COPILOT_FETCH_TIMEOUT`, standard 30s)
- [x] **A9. Graceful shutdown** — håndterer `SIGTERM`/`SIGINT` med request-draining og 10s timeout
- [x] **A10. Konfiger `trust proxy`** — `app.set('trust proxy', 1)` for korrekt rate limiting bak reverse proxy
- [x] **A11. Fiks license-bug i `copilot-client.js`** — `repo.license?.spdx_id || repo.license?.name || 'ingen'`

**Estimat:** 2–3 dager | **Risiko:** Høy (sikkerhetshull i prod)

---

### Fase B: Kodeduplisering og arkitektur-refaktorering ✅ Ferdig

**Mål:** Eliminere ~1500 linjer duplisert kode og innføre riktige abstraksjoner.

**Oppgaver:**

#### B1. Delt pakke `packages/core/` ✅
- [x] Opprett `packages/core/` med delt logikk brukt av både CLI og server
- [x] Flytt `analyzeRepository()`, `detectProjectType()`, `PROJECT_TYPE_LABELS`, `PRIORITY_RANK` til core
- [x] Flytt rate limiter-klassen til core (CLI mangler denne helt) — `RateLimiter` eksporteres nå fra `@evo/core`
- [x] Oppdater CLI og server til å importere fra `packages/core/`
- [x] **Eliminert:** ~270 LOC duplisering — `packages/core/index.js` eksporterer `analyzeRepository`, `detectProjectTypeFromMetadata`, `PROJECT_TYPE_LABELS`, `PRIORITY_RANK`, `meetsMinPriority`, `mergeAIRecommendations`, `RateLimiter`

#### B2. Generisk `<ConfigurablePanel>`-komponent ✅
- [x] Lag én felles React-komponent som erstatter `GuardrailsPanel`, `ProductDevelopmentPanel` og `EngineeringVelocityPanel`
- [x] Parametrisér: `title`, `items`, `storageKey`, `apiPrefix`, `cssPrefix`, `colorScheme`
- [x] Slå sammen CSS til én `configurable-panel.css` med fargeskjema-varianter (`--guardrails`, `--productdev`, `--engvelocity`)
- [x] **Eliminert:** ~920 LOC JSX + ~480 LOC CSS — erstattet av `ConfigurablePanel.jsx` (~220 LOC) + `panelConfigs.js` + `configurable-panel.css`
- [x] Slettet: `GuardrailsPanel.jsx`, `ProductDevelopmentPanel.jsx`, `EngineeringVelocityPanel.jsx`, `guardrails.css`, `product-dev.css`, `eng-velocity.css`

#### B3. Service-lag i backend ✅
- [x] Opprett `server/services/issue-service.js` — felles `createTemplateIssue()` + `validateIssueRequest()`
- [x] Refaktorer `routes/issues.js` til å bruke service-laget — 3 av 4 rutehandlere bruker nå felles service
- [x] Opprett `server/services/scan-service.js` — scanState, `startScan()`, `createIssuesFromResults()`, `getScanStatus()`, `getScanResults()`; `routes/scan.js` er nå et tynt HTTP-lag (~90 LOC)
- [x] Opprett `server/services/analysis-service.js` — `analyzeRepoFull()` kombinerer deep + AI-analyse med merge/dedup; brukes av `routes/repos.js` (deep + ai-analyze) og scan-service

#### B4. Splitt store filer ✅
- [x] `server/analyzer.js` (1032 linjer) → splittet i `project-detector.js`, `file-analyzer.js`, `recommendation-engine.js` — `analyzer.js` er nå en fasade-modul som re-eksporterer
- [x] `server/templates.js` (855 linjer) → splittet i `server/templates/guardrails.js`, `product-dev.js`, `engineering-velocity.js`, `scan.js` + `index.js` re-eksport
- [x] `ScanControl.jsx` (526 linjer) → splittet i `ScanOptions.jsx`, `ScanProgress.jsx`, `ScanResults.jsx`, `ScanRepoItem.jsx` — ScanControl er nå en tynn orkestrator (~270 LOC)
- [x] `buildScanIssueBody` og `buildScanIssueBodyCompact` → refaktorert til én funksjon med `compact`-parameter i `server/templates/scan.js`

#### B5. Fjern død kode ✅
- [x] `detectTests()` i analyzer.js — fjernet (erstattet av `detectTestsFromTree`)
- [x] `queue`/`processing`-felter i RateLimiter — fjernet fra `copilot-client.js`
- [x] Redundant fallback-logikk i `fetchRepoTree()` — fjernet `default_branch`-fallback

**Estimat:** 4–5 dager | **Risiko:** Middels (regresjoner ved refaktorering)

---

### Fase C: Frontend-kvalitet og tilgjengelighet ✅ Ferdig

**Mål:** Fikse a11y-mangler, performance-problemer og UX-hull i dashboardet.

**Oppgaver:**

#### C1. Tilgjengelighet (a11y) — kritiske feil
- [x] `index.html`: Allerede `lang="nb"` (gjort i Fase G)
- [x] `AgentModal`: Lagt til `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, fokus-felle, Escape-lukking, fokus-retur
- [x] Erstattet alle klikkbare `<div>`-er med `<button>` (filtre i Dashboard, anbefalinger i RepositoryCard, panel-headers i ConfigurablePanel/ScanControl, code-insights-toggle)
- [x] Lagt til `<label htmlFor>` / `id`-kobling i login-skjema
- [x] Progressbar i ScanProgress: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- [x] `aria-live`-regioner for dynamisk innhold (feilmeldinger, skannestatus, filtreringsresultater)

#### C2. Performance-fikser
- [x] `calculateStats()` i Dashboard → wrappet i `useMemo`
- [x] `applyFilter` `useEffect`-antimønster → erstattet med `useMemo` for derived state (fjernet `filteredRepos`-state + useEffect)
- [x] `formatDate()` i RepositoryCard → flyttet ut av komponenten
- [x] `React.memo` på `RepositoryCard` for å unngå unødvendig re-rendering
- [x] Fjernet inline `onMouseEnter`/`onMouseLeave` på logg-ut-knapp → CSS `.btn-logout` med `:hover`

#### C3. UX-forbedringer
- [x] Søk/filtrer repos etter navn — `<input type="search">` med live-filtrering
- [x] Sortering (etter stjerner, sist oppdatert, navn, prioritet) — `<select>` + stigende/synkende knapp
- [x] Toast/notifikasjoner for asynkrone handlinger — `ToastProvider` + `useToast` context-hook
- [x] Skeleton loading i stedet for «Laster repositories...» — `SkeletonCard`-komponent med shimmer-animasjon
- [x] Trukket ut `<Header>`-komponent fra Dashboard (duplisert i 3 tilstander)
- [x] React Error Boundary som fanger uventede feil — `ErrorBoundary`-komponent med reload-knapp

#### C4. State management
- [x] Laget `useLocalStorage`-hook for panel-konfigurasjoner (erstatter duplisert inline localStorage-kode i ConfigurablePanel)
- [x] Vurdert `useContext` for token-propagering — besluttet å beholde prop-passing for nåværende omfang; kan vurderes på nytt når flere nivåer/komponenter trenger token

**Estimat:** 3–4 dager | **Risiko:** Lav

---

### Fase D: Testdekning og kvalitetssikring ✅ Ferdig

**Mål:** Øke testdekning fra ~25% til >70% med fokus på kritisk forretningslogikk.

**Status:** Ferdig (juli 2025). Gikk fra ~106 til ~219 tester. Backend-testene bruker `require.cache`-basert monkey-patching for CJS-moduler med supertest.

**Oppgaver:**

#### D1. Backend route-tester ✅
- [x] Installer `supertest` for HTTP-integrasjonstester
- [x] Tester for `routes/repos.js` — 12 tester (auth, CRUD, filtrering, feilhåndtering)
- [x] Tester for `routes/issues.js` — 11 tester (agent-issue, guardrails, product-dev, eng-velocity, validering)
- [x] Tester for `routes/scan.js` — 9 tester (start, status, results, create-issues, 409 conflict)

#### D2. Backend kjernefunksjoner ✅
- [x] Test `github.js` (`extractToken` — 6 tester, `getOctokit` — 1 test)
- [x] Test `middleware.js` (`requireAuth`, `errorHandler`, `notFoundHandler` — 6 tester)
- [x] Test `validation.js` (Zod-skjemaer + `validate()` middleware — 14 tester)
- [x] Test `templates/` (alle template-funksjoner og `buildScanIssueBody` — 10 tester)
- [x] Test `services/scan-service.js` (state management, getScanStatus, getScanResults — 6 tester)
- [x] Test `packages/core/` (meetsMinPriority, mergeAIRecommendations, PRIORITY_RANK — 12 tester)

#### D3. CLI-tester ✅
- [x] Test `copilot.js` `analyzeWithAI()` med mocked fetch — 4 tester
- [x] Test `issues.js` `createIssue()` dryRun-modus — 2 tester
- [x] Eksisterende: `analyzer.test.js` (23 tester), `output.test.js` (12 tester)

#### D4. Frontend-tester ✅
- [x] Test `Dashboard.jsx` — loading, error, søk, fetch-header — 6 tester
- [x] Test `Header.jsx` — rendering, showActions, onLogout — 5 tester
- [x] Test `Toast.jsx` — addToast, feiltype, lukk, fler samtidige, provider-krav — 5 tester
- [x] Test `ErrorBoundary.jsx` — fangst, feilmelding, alert-rolle — 4 tester
- [x] Eksisterende: `App.test.jsx` (6 tester), `RepositoryCard.test.jsx` (12 tester)

**Testoversikt:**
| Lag | Testfiler | Tester |
|-----|-----------|--------|
| Backend routes | 3 | 32 |
| Backend kjerne | 8 | 106 |
| CLI | 4 | 41 |
| Frontend | 6 | 38 |
| **Totalt** | **21** | **219** (≈3× økning) |

**Mocking-strategi:** CJS-moduler mockes via `require.cache`-clearing + monkey-patching av module.exports FØR avhengige moduler lastes. Frontend-tester bruker `vi.fn()` og `@testing-library/react`.

---

### Fase E: CLI-paritet og forbedringer 🟢 Middels-lav

**Mål:** Bringe CLI-verktøyet opp til samme kvalitetsnivå som serveren.

**Oppgaver:**

- [ ] **E1. Rate limiting i CLI** — porter `RateLimiter`-klassen fra core (fase B1)
- [ ] **E2. Retry-logikk** — retry ved 429/5xx i `copilot.js` (serveren har dette, CLI mangler)
- [ ] **E3. Prosjekttypespesifikke AI-prompts** — porter `PROJECT_TYPE_PROMPTS` fra core
- [ ] **E4. `--verbose` / `--quiet`-flagg** — styr detaljnivå på output
- [ ] **E5. `--output <file>`-flagg** — skriv JSON-resultater direkte til fil
- [ ] **E6. Fiks `main` i package.json** — peker til ikke-eksisterende `src/index.js`
- [ ] **E7. Validér `--min-priority`** — avvis ugyldig verdi med tydelig feilmelding
- [ ] **E8. Schema-validering av scan-config.json** — valider mot JSON Schema ved lasting
- [ ] **E9. `--validate-config`-kommando** — sjekk konfigurasjon uten å kjøre skanning
- [ ] **E10. Gjenbruk Octokit-instans** — unngå å opprette ny instans per issue i `issues.js`

**Estimat:** 2–3 dager | **Risiko:** Lav

---

### Fase F: Avanserte funksjoner og skalerbarhet 🔵 Lav

**Mål:** Gjøre verktøyet smartere og mer skalerbart over tid.

**Oppgaver:**

#### F1. Logging og observability
- [ ] Innfør `pino` eller `winston` for strukturert logging med request-ID-korrelasjon
- [ ] Request-logging middleware (method, path, status, duration)
- [ ] Utvidet helsesjekk (`/api/health`) — inkluder dependency-status og versjon

#### F2. API-forbedringer
- [ ] Paginering på `GET /api/repos` — `?page=1&limit=20` for brukere med mange repos
- [ ] OpenAPI/Swagger-spec for alle endepunkter
- [ ] Caching av repo-analyseresultater (in-memory eller Redis)

#### F3. Avansert analyse
- [ ] Dependency-sjekk: identifiser utdaterte avhengigheter (npm outdated, Gradle)
- [ ] Dependencyanalyse: GitHub Advisory Database / `npm audit`-integrasjon
- [ ] Sikkerhetsanalyse: OpenSSF Scorecard-integrasjon
- [ ] Trendanalyse: lagre skanningsresultater over tid, vis utvikling per repo

#### F4. Frontend — Neste nivå
- [ ] React Router for URL-basert navigasjon (repo-detaljer, scan-resultater som egne sider)
- [ ] Virtualisert repo-liste (`react-window`) for skalerbarhet med 100+ repos
- [ ] Dark/light mode toggle
- [ ] Responsiv mobilmeny

#### F5. Skalerbarhet
- [ ] Persistent scan-tilstand (SQLite/Redis) i stedet for in-memory
- [ ] Parallell repo-prosessering i scan (worker-basert, begrenset concurrency)
- [ ] Konfigurerbar retry/timeout for alle eksterne API-kall
- [ ] Kø-basert bakgrunnsjobb-system (BullMQ) for skanninger

#### F6. Integrasjoner
- [ ] GitHub Webhooks — trigger analyse ved push/release
- [ ] Notifikasjoner: varsle bruker når skanning er fullført (GitHub notification)
- [ ] Multi-bruker: støtte for team-bruk med delt dashboard

**Estimat:** Løpende | **Risiko:** Lav

---

### Fase G: Rebranding-opprydding ✅ Ferdig

**Mål:** Fjerne alle gjenværende «Product Orchestrator»-referanser.

**Oppgaver:**

- [x] **G1. `vite.config.js`** — endret `base` fra `/product-orchestrator/` til `/evo/`
- [x] **G2. `package.json`** — oppdatert `repository.url`, `bugs.url`, `homepage` til `evo` (både root og CLI)
- [x] **G3. `server/index.js`** — helsesjekk og oppstartslogg endret til «Evo API»
- [x] **G4. `index.html`** — `lang="nb"`, `<meta name="description">`, `theme-color`, SVG-favicon
- [x] **G5. `README.md`** — oppdatert installasjonsinstruksjoner med nye repo-URLer
- [x] **G6. `.github/copilot-instructions.md`** — fullstendig omskrevet med ny filstruktur, services/, templates/, RateLimiter
- [x] **G7. Konsistent språk** — alle kode-kommentarer, CSS, demo.html og issue-body rebrandet til Evo/norsk

**Estimat:** 0.5 dag | **Risiko:** Minimal

---

### Fase H: TypeScript-konvertering 🟠 Høy prioritet

**Mål:** Konvertere hele kodebasen fra JavaScript til TypeScript for sterkere type-sikkerhet, bedre IDE-støtte og enklere refaktorering fremover.

**Kontekst — nåværende tilstand (Trinn 1, allerede gjort):**

| Element | Status |
|---------|--------|
| `jsconfig.json` med `checkJs: true`, `strict: true`, `noImplicitAny: false` | ✅ |
| `typescript` (^5.9.3) i devDependencies | ✅ |
| `@types/express`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/cors`, `@types/supertest` | ✅ |
| `server/types.d.ts` — Express `Request.token`-utvidelse | ✅ |
| `"typecheck": "tsc --project jsconfig.json --noEmit"` i package.json | ✅ |
| Antall typesjekk-feil: **0** (`commander` installert i root, `@ts-ignore` fjernet) | ✅ |

**Migreringsstrategi:** Gradvis konvertering modul for modul med `allowJs: true` slik at `.js`- og `.ts`-filer kan eksistere side om side under overgangen. Starte med de mest «bladlike» modulene i avhengighetstreet og jobbe seg oppover.

---

#### H1 — tsconfig.json-infrastruktur (Trinn 2) ✅ Ferdig

- [x] **H1a. `tsconfig.base.json`** — felles base: `target: ES2022`, `strict: true`, `esModuleInterop: true`, `resolveJsonModule: true`, `skipLibCheck: true`
- [x] **H1b. `tsconfig.json`** (backend/rot) — arver fra base, `module: CommonJS`, `moduleResolution: node`, `allowJs: true` for gradvis migrering
- [x] **H1c. Vite typesjekk** — `tsconfig.frontend.json` med `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, kun for typesjekk (Vite kompilerer selv)
- [x] **H1d. `packages/core/tsconfig.json`** — `module: CommonJS`, `outDir: dist`, `declaration: true` (aktivert i H3)
- [x] **H1e. `packages/cli/tsconfig.json`** — `module: CommonJS`, `outDir: dist`, peker på `rootDir: .`
- [x] **H1f. Oppdater `typecheck`-script** — kjører `tsc` mot alle tsconfig-filer i sekvens: `tsconfig.json && tsconfig.frontend.json && packages/core && packages/cli` — **0 feil**

**Bonus-fikset i H1:**
- `server/copilot-client.js:387` og `packages/cli/src/copilot.js:71` — `response.json()` tvungent til `any` (`/** @type {any} */`) siden `@types/node` v18+ returnerer `unknown`
- `packages/cli/bin/evo-scan.js:6` — `// @ts-ignore` på `require('commander')` fjernet ✅ (løst i H2a)

---

#### H2 — Fiks manglende type-avhengigheter ✅ Ferdig

- [x] **H2a. `commander`** — installert `commander` i root `node_modules` slik at `packages/cli/tsconfig.json` kan finne typer. Fjernet `// @ts-ignore` fra `packages/cli/bin/evo-scan.js`. Commander v14 har bundled typer.
- [x] **H2b. Verifiser alle `@types/*`** — `@types/cors`, `@types/express`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/supertest` gir 0 typesjekk-feil

**Estimat:** 0.5 time

---

#### H3 — Konverter `packages/core/` (mest selvstendige modul) ✅ Ferdig

- [x] **H3a.** Definert og eksportert felles interfaces i `packages/core/index.ts`:
  - `Recommendation` — `{ type, title, description, priority, source?, marketOpportunity?, codeInsights? }`
  - `ProjectType` — union type: `'web-app' | 'android-app' | 'api' | 'library' | 'docs' | 'other'`
  - `Priority` — `'high' | 'medium' | 'low' | 'info' | 'success'`
  - `RecommendationType` — fullstendig union type for alle kategorier
  - `RepositoryMeta` — subset av GitHub API repo-objekt (input til analyseR)
  - `RepoSummary` + `RepositoryAnalysis` — returtype fra `analyzeRepository()`
  - `AnalysisResult`, `DeepInsights`, `AIAnalysisResult` — server-analyse-typer
  - `RateLimiterOptions` — konfigurasjonsobjekt for `RateLimiter`
- [x] **H3b.** `packages/core/index.js` → `packages/core/index.ts` med eksplisitte parametertypes og returtyper. `index.js` er nå en tynn proxy til `dist/index.js` for bakoverkompatibilitet med tester.
- [x] **H3c.** Oppdatert `packages/core/package.json`: `"main": "dist/index.js"`, `"types": "dist/index.d.ts"`, `"scripts": { "build": "tsc -p tsconfig.json" }`. Lagt til `build:core`-script og `prepare`-hook i rot-`package.json`.
- [x] **H3d.** `packages/core/tsconfig.json` aktivert med `"noEmit": false`, `"outDir": "dist"`, `"declaration": true`, `"declarationDir": "dist"`. Rot-`tsconfig.json` inkluderer nå `packages/core/index.ts` i stedet for `packages/core/**/*.js`. Typesjekk: **0 feil**.

**Bonus-fikser i H3:**
- `server/routes/repos.js` og `server/services/scan-service.js` — `RepositoryMeta.license.spdx_id` utvidet til `string | null | undefined` for kompatibilitet med GitHub API-typer
- `RepositoryAnalysis`-interface utvidet med valgfrie server-side felt (`deepInsights`, `aiAnalyzed`, `aiSummary`, etc.)
- `packages/cli/src/scanner.js:158` — lagt til null-sjekk på `repoData.fullName` for TypeScript-korrekthet

**Estimat:** 1 dag

---

#### H4 — Utvid `server/types.d.ts` til full domenetype-definisjon ✅ Ferdig

- [x] **H4a. ScanState og tilknyttede typer:**
  - `ScanStatus` — `'idle' | 'running' | 'completed' | 'error'`
  - `ScanRepoResult` — `{ repo: string, owner: string, recommendations: Recommendation[], issuesCreated?: number }`
  - `ScanState` — `{ status: ScanStatus, progress: number, results: ScanRepoResult[], error?: string, startedAt?: Date }`
- [x] **H4b. Issue-typer:**
  - `IssueCreateParams` — `{ owner: string, repo: string, title: string, body: string, labels?: string[] }`
  - `IssueCreateResult` — `{ id: number, url: string, number: number }`
- [x] **H4c. Analyse-typer:**
  - `DeepInsights` — `{ fileTree?: string[], hasTests?: boolean, hasCI?: boolean, ... }`
  - `AIAnalysisResult` — `{ recommendations: Recommendation[], summary?: string, model?: string }`
  - `FullAnalysisResult` — `{ recommendations: Recommendation[], deepInsights?: DeepInsights, aiSummary?: string }`
- [x] **H4d. Gjenbruk fra @evo/core** — importer `Recommendation`, `ProjectType`, `AnalysisResult` i types.d.ts

**Gjort:** `server/types.d.ts` utvidet med alle domenetype-definisjoner. `FullAnalysisResult`, `ScanState`, `ScanRepoResult`, `IssueCreateParams`, `IssueCreateResult`, `DeepInsights`, `IssueTemplate`, `FileTreeMetrics`, `ScanOptions` — alle eksportert og brukt gjennomgående i server/.

---

#### H5 — Konverter `server/` til TypeScript (fil for fil) ✅ Ferdig

Konverteringsrekkefølge etter avhengighetstre — minst til størst:

- [x] **H5a. `server/github.ts`** — `getOctokit()`, `extractToken()`, `assignCopilotToIssue()` med eksplisitte retur-typer
- [x] **H5b. `server/middleware.ts`** — `requireAuth`, `errorHandler`, `notFoundHandler` med `RequestHandler`/`ErrorRequestHandler`-typer
- [x] **H5c. `server/validation.ts`** — Zod-skjemaer med infererte typer (`z.infer<typeof schema>`) + `validate()`-middleware
- [x] **H5d. `server/project-detector.ts`** — returner `ProjectType` fra `@evo/core`
- [x] **H5e. `server/file-analyzer.ts`** — typer for `fetchRepoTree()`, `analyzeFiles()`
- [x] **H5f. `server/recommendation-engine.ts`** — returner `Recommendation[]`
- [x] **H5g. `server/analyzer.ts`** — fasade-re-eksport (trivielt etter H5d–f)
- [x] **H5h. `server/copilot-client.ts`** — returner `AIAnalysisResult`, typer for prompt-parametere
- [x] **H5i. `server/templates/*.ts`** — 5 filer; `buildGuardrailsIssueBody()` etc. med `(rec: Recommendation) => string`-typer
- [x] **H5j. `server/services/issue-service.ts`** — `createTemplateIssue()` med `IssueCreateParams`/`IssueCreateResult`
- [x] **H5k. `server/services/analysis-service.ts`** — `analyzeRepoFull()` med `FullAnalysisResult`
- [x] **H5l. `server/services/scan-service.ts`** — `ScanState`-type gjennom hele tjenesten
- [x] **H5m. `server/routes/issues.ts`** — Express `Router` med typede `req.body` (via Zod-inference), `export = router` for CJS-kompatibilitet
- [x] **H5n. `server/routes/repos.ts`** — typede params og query
- [x] **H5o. `server/routes/scan.ts`** — tynn HTTP-lag med typede responser
- [x] **H5p. `server/index.ts`** — oppstartsmodul, `Application`-type

**Gjort:** Alle 20 server/-filer konvertert til TypeScript. Gamle `.js`-filer slettet. Route-filer bruker `export = router` for CJS-kompatibilitet med tester. `server/index.ts` bruker `import X = require(...)` for routes.

---

#### H6 — Konverter `packages/cli/` til TypeScript ✅ Ferdig

- [x] **H6a. `packages/cli/src/analyzer.ts`** — re-eksporterer `analyzeRepository`, `detectProjectType` (alias for `detectProjectTypeFromMetadata`), `PROJECT_TYPE_LABELS` fra `@evo/core`
- [x] **H6b. `packages/cli/src/copilot.ts`** — `analyzeWithAI()` med `AIAnalysisResult`-returtype
- [x] **H6c. `packages/cli/src/issues.ts`** — `createIssue()` med `IssueCreateParams`-type
- [x] **H6d. `packages/cli/src/output.ts`** — alle output-funksjoner med typede parametre
- [x] **H6e. `packages/cli/src/scanner.ts`** — `runScan()` med full typesetting
- [x] **H6f. `packages/cli/bin/evo-scan.ts`** — Commander.js-program (bundled types siden v8)
- [x] **H6g.** `packages/cli/package.json` oppdatert: `main: src/scanner.ts`, `bin: ./bin/evo-scan.ts`, `start: tsx bin/evo-scan.ts`

**Gjort:** Alle 6 CLI-filer konvertert til TypeScript. Gamle `.js`-filer slettet. `packages/core` eksporterer nå alle typer som CLI trenger.

---

#### H7 — Konverter `src/` (React frontend) til TypeScript ✅ Ferdig

- [x] **H7a.** `src/main.jsx` → `src/main.tsx`
- [x] **H7b.** `src/App.jsx` → `src/App.tsx` — `FormEvent`-type, `err: unknown` med `instanceof Error`-sjekk
- [x] **H7c.** Alle komponenter `.jsx` → `.tsx` med eksplisitte `Props`-interfaces:
  - `Dashboard.tsx` — `DashboardProps`
  - `Header.tsx` — `HeaderProps`
  - `RepositoryCard.tsx` — `RepositoryCardProps` (bruker `RepoData`-type fra `src/types.ts`)
  - `AgentModal.tsx` — `AgentModalProps`, `ModalStatus`-union
  - `ConfigurablePanel.tsx` — `PanelConfig & { repos, token }`, `PanelItemWithEnabled`
  - `ScanControl.tsx`, `ScanOptions.tsx`, `ScanProgress.tsx`, `ScanResults.tsx`, `ScanRepoItem.tsx`
  - `SkeletonCard.tsx`, `Toast.tsx` (med `ToastContextValue`, `ToastType`), `ErrorBoundary.tsx`
- [x] **H7d.** `src/hooks/useLocalStorage.ts` — generisk hook: `useLocalStorage<T>(key, initialValue): [T, Dispatch<SetStateAction<T>>]`
- [x] **H7e.** `src/components/panelConfigs.ts` — `PanelConfig`-interface med strengt typede `items`
- [x] **H7f.** `src/types.ts` opprettet med alle frontend-domenetype: `RepoData`, `RepoInfo`, `ScanResults`, `ScanProgressState`, etc.
- [x] `tsconfig.frontend.json` oppdatert til å inkludere `.ts`/`.tsx`; `index.html` oppdatert til `src/main.tsx`
- [x] Alle 19 `.jsx`/`.js` frontend-filer slettet — 38 tester passerer

**Gjennomført:** 17. juli 2025

---

#### H8 — Bygg-oppdateringer ✅ Ferdig

- [x] **H8a. Backend dev:** Installer `tsx` (`npm i -D tsx`) — erstatter `node server/index.js` med `tsx server/index.ts`; raskere enn `ts-node`
- [x] **H8b. Backend prod:** `tsconfig.server.build.json` med `rootDir: "."` og `outDir: "dist"` — `npm run build:server` kompilerer server + core til `dist/`; `npm start` kjører `node dist/server/index.js`. Relative imports (`'../packages/core'`) løses korrekt via `dist/packages/core/index.js`.
- [x] **H8c. CLI:** `packages/cli/bin/evo-scan.ts` kjøres direkte med `tsx` via `packages/cli/package.json` `start`-script
- [x] **H8d.** Oppdater `package.json` scripts: `"dev": "tsx server/index.ts"` ✅, `"build:server": "tsc -p tsconfig.server.build.json"` ✅, `"start": "node dist/server/index.js"` ✅
- [x] **H8e.** Lagt til `typecheck`-steg i `.github/workflows/frontend.yml` — kjører `npm run typecheck` (alle 4 tsconfig-filer, `--noEmit`) i test-jobben. Rettet stale `vitest.backend.config.js` → `vitest.backend.config.ts`.

**Estimat:** 0.5 dag

---

#### H9 — Strengere typesjekk (sluttfase) ✅ Ferdig

- [x] **H9a.** `noImplicitAny: true` aktivert i `tsconfig.base.json` — null typesjekk-feil
- [ ] **H9b.** Legg til `noUncheckedIndexedAccess: true` — avdekker potensielle runtime-feil ved array/object-indeksering *(valgfritt — ikke nødvendig, 0 feil uten)*
- [x] **H9c.** `allowJs: true` og `checkJs: true` fjernet fra `tsconfig.base.json` — ingen `.js`-filer igjen i server/CLI/core (unntatt `packages/core/index.js`-proxy)
- [x] **H9d.** `jsconfig.json` slettet — alle filer dekkes nå av korrekte tsconfig-filer
- [ ] **H9e.** Vurder `exactOptionalPropertyTypes: true` for å kreve eksplisitt `undefined` i optional properties *(valgfritt)*
- [x] `vite.config.js` → `vite.config.ts`, `vitest.backend.config.js` → `vitest.backend.config.ts`
- [x] `server/templates.js` (855 LOC, dead code) slettet — server/templates/ TypeScript-moduler brukes direkte
- [x] tsconfig.json, packages/cli/tsconfig.json: `.js`-mønstre fjernet fra includes

**Gjennomført:** 17. juli 2025

---

#### H10 — Konverter tester til TypeScript ✅ Ferdig

- [x] **H10a.** Backend-tester: `server/**/*.test.js` (10 filer) → `.test.ts` — CommonJS `require()` beholdt (tsx/cjs håndterer TypeScript)
- [x] **H10b.** CLI-tester: `packages/cli/src/*.test.js` (4 filer) → `.test.ts`; `packages/core/core.test.js` → `.test.ts`
- [x] **H10c.** Frontend-tester: `src/test/*.test.jsx` (6 filer) → `.test.tsx`; `src/test/setup.js` → `setup.ts`
- [x] **H10d.** `vitest.backend.config.ts` oppdatert (`{ts,mjs}` i includes); `vite.config.ts` oppdatert til `setup.ts` + `{ts,tsx}`-includes
- [x] **H10e.** 219 tester passerer (38 frontend + 181 backend) etter konvertering

**Gjennomført:** 17. juli 2025

---

**Samlet estimat Fase H:** 7–9 dager | **Risiko:** Middels (mange filer berøres, men `allowJs` gjør det trygt å gå gradvis)

**Anbefalte milepæler:**
1. H1 + H2 + H3: Infrastruktur + core — kodebasen typesjekker mot nye tsconfigs, null feil
2. H4 + H5: Full server-side TypeScript — backend er 100 % `.ts`
3. H6 + H7: CLI og frontend konvertert — hele kodebasen er TypeScript
4. H8 + H9 + H10: Bygg, strengere sjekk, tester — produksjonsklar TypeScript-kodebase

---

## Oppsummering — Prioritert backlog-tabell

| # | Oppgave | Fase | Prioritet | Status | Estimat |
|---|---------|------|-----------|--------|---------|
| A1 | `helmet()`-middleware | A | 🔴 Kritisk | ✅ | 0.5t |
| A2 | Begrens CORS | A | 🔴 Kritisk | ✅ | 0.5t |
| A3 | Global error-handler | A | 🔴 Kritisk | ✅ | 1t |
| A4 | Input-validering (zod) | A | 🔴 Kritisk | ✅ | 2t |
| A5 | Autentiserings-middleware | A | 🔴 Kritisk | ✅ | 1t |
| A11 | Fiks license-bug | A | 🔴 Kritisk | ✅ | 0.5t |
| G1 | Fiks `vite.config.js` base-path | G | 🟢 Lett | ✅ | 0.5t |
| G2 | Oppdater package.json URLs | G | 🟢 Lett | ✅ | 0.5t |
| G3 | Helsesjekk-melding → Evo | G | 🟢 Lett | ✅ | 0.5t |
| G4 | `index.html` meta + favicon | G | 🟢 Lett | ✅ | 0.5t |
| G5 | README.md repo-URLer | G | 🟢 Lett | ✅ | 0.5t |
| G6 | copilot-instructions.md synk | G | 🟢 Lett | ✅ | 1t |
| G7 | Konsistent språk/branding | G | 🟢 Lett | ✅ | 0.5t |
| B1 | `packages/core/` delt pakke | B | 🟠 Høy | ✅ | 4t |
| B2 | `<ConfigurablePanel>` komponent | B | 🟠 Høy | ✅ | 4t |
| B3 | Service-lag i backend | B | 🟠 Høy | ✅ | 6t |
| B4 | Splitt store filer | B | 🟠 Høy | ✅ | 4t |
| B5 | Fjern død kode | B | 🟠 Høy | ✅ | 1t |
| C1 | A11y-fikser (kritiske) | C | 🟡 Middels | ✅ | 3t |
| C2 | Performance-fikser | C | 🟡 Middels | ✅ | 2t |
| C3 | UX-forbedringer | C | 🟡 Middels | ✅ | 4t |
| C4 | State management | C | 🟡 Middels | ✅ | 2t |
| D1 | Backend route-tester | D | 🟡 Middels | ✅ | 4t |
| D2 | Backend kjernefunksjon-tester | D | 🟡 Middels | ✅ | 3t |
| D3 | CLI-tester | D | 🟡 Middels | ✅ | 3t |
| D4 | Frontend-tester | D | 🟡 Middels | ✅ | 3t |
| E1–3 | CLI: rate limiting, retry, prompts | E | 🟢 Lav | ❌ | 3t |
| E4–10 | CLI: UX-forbedringer og fikser | E | 🟢 Lav | ❌ | 2t |
| F1 | Strukturert logging | F | 🔵 Nice-to-have | ❌ | 3t |
| F2 | API-forbedringer (paginering, OpenAPI) | F | 🔵 Nice-to-have | ❌ | 4t |
| F3 | Avansert analyse (deps, security, trender) | F | 🔵 Nice-to-have | ❌ | Løpende |
| F4 | Frontend neste nivå (router, virtualisering) | F | 🔵 Nice-to-have | ❌ | Løpende |
| F5 | Skalerbarhet (persistent state, workers) | F | 🔵 Nice-to-have | ❌ | Løpende |
| F6 | Integrasjoner (webhooks, notifikasjoner) | F | 🔵 Nice-to-have | ❌ | Løpende |
| H1 | tsconfig-infrastruktur (base, server, frontend, core, cli) | H | 🟠 Høy | ✅ | 0.5d |
| H2 | Fiks manglende type-avhengigheter (`commander`) | H | 🟠 Høy | ✅ | 0.5t |
| H3 | Konverter `packages/core/` → `index.ts` + interfaces | H | 🟠 Høy | ✅ | 1d |
| H4 | Utvid `server/types.d.ts` til full domenetype-definisjon | H | 🟠 Høy | ✅ | 0.5d |
| H5 | Konverter `server/` fil for fil (16 filer) | H | 🟠 Høy | ✅ | 2–3d |
| H6 | Konverter `packages/cli/` (6 filer) | H | 🟡 Middels | ✅ | 1d |
| H7 | Konverter `src/` React-frontend (14 .jsx → .tsx) | H | 🟡 Middels | ✅ | 1.5d |
| H8 | Bygg-oppdateringer (`tsx` dev, `tsc` prod, CI) | H | 🟡 Middels | ✅ | 0.5d |
| H9 | Strengere typesjekk (`noImplicitAny`, `allowJs`-fjerning, dead code) | H | 🟢 Lav | ✅ | 0.5d |
| H10 | Konverter tester til TypeScript (21 testfiler) | H | 🟢 Lav | ✅ | 1d |

---

## Ferdigstilte faser (historikk)

<details>
<summary>Klikk for å se fullført arbeid fra fase 1–5, fase B og fase G (mars 2026)</summary>

### Fase 1: Dyp repoanalyse med GitHub API — ✅ Ferdig
- Regelbasert analyse i backend og CLI
- `server/analyzer.js` med filstruktur-henting, prosjekttypedeteksjon, commit-analyse
- Kategorisering: `web-app` | `android-app` | `library` | `api` | `docs` | `other`

### Fase 2: KI-analyse med GitHub Copilot Models API — ✅ Ferdig
- Copilot Models API-klient med prosjekttypespesifikke prompts
- Rate limiting (token-bucket), retry ved 429/5xx
- Integrert i Express-backend og CLI

### Fase 3: Automatisk Issue-opprettelse — ✅ Ferdig
- Proaktiv skanning med start/status/results/create-issues endepunkter
- Issue-opprettelse for 11 analysekategorier
- Dedup-logikk, batch-modus, Copilot Agent-tildeling

### Fase 4: Frontend Scan-orkestrering — ✅ Ferdig
- 3 analysepaneler, AgentModal, ScanControl
- Seleksjon/godkjenning per anbefaling, batch issue-opprettelse

### Fase 5: GitHub Actions Schedulert kjøring — ✅ Ferdig
- `proactive-scan.yml` workflow med cron + dispatch
- `scan-config.json` med JSON Schema
- CLI `--config`-støtte med auto-discovery

### Bonus-leveranser
- CLI-verktøy med Commander.js, ANSI-output, AI-analyse
- Copilot Coding Agent-tildeling via GraphQL
- Distribusjonsstrategi (7 modeller)
- GitHub Pages deployment
- Rebranding fra «Product Orchestrator» til «Evo»
### Fase A: Sikkerhetshardening og robusthet — ✅ Ferdig (1. mars 2026)
- `helmet()` lagt til for sikre HTTP-headers (CSP, X-Frame-Options, HSTS, etc.)
- CORS begrenset til kjente origins (localhost:5173, GitHub Pages) — ikke lenger åpen for alle
- Global error-handler middleware med konsistent `{ error, message, statusCode }` JSON-format + 404-handler for ukjente API-ruter
- Input-validering via `zod`-skjemaer på alle POST-ruter — `server/validation.js` med `validate()` middleware-factory
- Sentralisert `requireAuth`-middleware i `server/middleware.js` — erstatter dupliserte token-sjekker i hver rute
- Alle scan-ruter (`/scan/status`, `/scan/results`) krever nå autentisering
- `extractToken()` fikset: case-insensitiv regex (`Bearer`/`bearer`/`BEARER`)
- `AbortController`-timeout (konfigurerbar via `COPILOT_FETCH_TIMEOUT`, standard 30s) på alle Copilot API-kall
- Graceful shutdown: håndterer `SIGTERM`/`SIGINT` med request-draining og 10s tvungen avslutning
- `trust proxy` konfigurert for korrekt rate limiting bak reverse proxy
- License-bug fikset: `repo.license?.spdx_id || repo.license?.name || 'ingen'`
- Nye filer: `server/middleware.js`, `server/validation.js`
- Nye avhengigheter: `helmet`, `zod`
- Rate limiting-respons er nå JSON med `{ error, message, statusCode }` (var tidligere ren streng)
- Alle 106 tester passerer etter endringene
### Fase B: Kodeduplisering og arkitektur-refaktorering — ✅ Ferdig (2. mars 2026)
- `packages/core/index.js` opprettet: eksporterer `analyzeRepository`, `detectProjectTypeFromMetadata`, `PROJECT_TYPE_LABELS`, `PRIORITY_RANK`, `meetsMinPriority`, `mergeAIRecommendations`, `RateLimiter`
- `server/analyzer.js` og `packages/cli/src/analyzer.js` importerer nå fra core — ~270 LOC duplisering fjernet
- `ConfigurablePanel.jsx` + `panelConfigs.js` + `configurable-panel.css` erstatter 3 identiske panelkomponenter — ~1400 LOC fjernet
- `server/services/issue-service.js` opprettet med `createTemplateIssue()` + `validateIssueRequest()` — `routes/issues.js` refaktorert
- `server/services/analysis-service.js` opprettet med `analyzeRepoFull()` — kombinerer deep + AI-analyse; brukes av repos.js og scan-service
- `server/services/scan-service.js` opprettet med `startScan()`, `createIssuesFromResults()`, `getScanStatus()`, `getScanResults()` — `routes/scan.js` redusert til ~90 LOC HTTP-lag
- `server/analyzer.js` (1032 LOC) splittet i `project-detector.js`, `file-analyzer.js`, `recommendation-engine.js` — analyzer.js er nå en fasade
- `server/templates.js` (855 LOC) splittet i `server/templates/guardrails.js`, `product-dev.js`, `engineering-velocity.js`, `scan.js` + `index.js`
- `ScanControl.jsx` (526 LOC) splittet i `ScanOptions.jsx`, `ScanProgress.jsx`, `ScanResults.jsx`, `ScanRepoItem.jsx` — ScanControl er nå en tynn orkestrator (~270 LOC)
- `buildScanIssueBody` + `buildScanIssueBodyCompact` slått sammen til én funksjon med `compact`-parameter
- Død kode fjernet: `detectTests()`, `queue`/`processing`-felter, `fetchRepoTree()`-fallback
- `RateLimiter` flyttet fra `copilot-client.js` til `@evo/core`
- Alle 106 tester passerer etter refaktorering

### Fase G: Rebranding-opprydding — ✅ Ferdig (2. mars 2026)
- `vite.config.js` base endret fra `/product-orchestrator/` til `/evo/`
- `package.json` (root + CLI) repo-URLer oppdatert til evo
- `server/index.js` helsesjekk og oppstartslogg endret til «Evo API»
- `index.html`: `lang="nb"`, meta description, theme-color, SVG-favicon
- `README.md` installasjonsinstruksjoner oppdatert med nye URLer
- `.github/copilot-instructions.md` fullstendig omskrevet med ny arkitektur
- Alle «Product Orchestrator»-referanser fjernet fra kode (kun plan.md historikk gjenstår)
- CSS-kommentarer, demo.html, issue-body rebrandet til Evo/norsk

### Fase C: Frontend-kvalitet og tilgjengelighet — ✅ Ferdig (1. mars 2026)
- **C1 — Tilgjengelighet (a11y):**
  - `AgentModal`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, fokus-felle (Tab/Shift+Tab), Escape-lukking, fokus-retur ved unmount
  - Alle klikkbare `<div>`-er erstattet med `<button>`: filtreringsknapper i Dashboard, anbefalinger i RepositoryCard, panel-headers (accordion-mønster) i ConfigurablePanel og ScanControl, code-insights-toggle
  - Login-skjema: `<label htmlFor="github-token-input">` + `id` på input
  - ScanProgress: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
  - `aria-live`-regioner: feilmeldinger (`role="alert"`), skannefeil (`aria-live="assertive"`), filtreringsresultater (`aria-live="polite"`)
  - `.sr-only`-klasse lagt til i `base.css` for skjermleser-tekster
- **C2 — Performance:**
  - `calculateStats()` → `useMemo(…, [repos])` — beregnes kun når repos endres
  - `applyFilter` useEffect-antimønster → erstattet med `useMemo` for derived state — fjernet `filteredRepos`-state og useEffect
  - `formatDate()` flyttet ut av RepositoryCard-komponenten til modulnivå
  - `React.memo` wrappet rundt `RepositoryCard` for å unngå unødvendige re-rendringer
  - Inline `onMouseEnter`/`onMouseLeave` fjernet fra logg-ut-knapp → `.btn-logout` CSS med `:hover`
- **C3 — UX-forbedringer:**
  - Søk: `<input type="search">` med live-filtrering etter reponavn, fullnavn og beskrivelse
  - Sortering: `<select>` (navn/stjerner/sist oppdatert/prioritet) + stigende/synkende-knapp
  - Toast-system: `ToastProvider` + `useToast()` context-hook — viser notifikasjoner med auto-dismiss (4s)
  - Skeleton loading: `SkeletonCard`-komponent med shimmer-animasjon erstatter «Laster repositories...»
  - `Header`-komponent trukket ut — eliminerer duplisert header-markup i 3 Dashboard-tilstander
  - `ErrorBoundary`-komponent fanger uventede React-feil med reload-knapp
- **C4 — State management:**
  - `useLocalStorage`-hook opprettet i `src/hooks/useLocalStorage.js` — brukes i ConfigurablePanel (erstatter manuell localStorage-håndtering)
  - `useContext` for token vurdert — beholdt prop-passing grunnet akseptabelt nesting-nivå (2–3 nivåer)
- **Nye filer:** `src/hooks/useLocalStorage.js`, `src/components/Header.jsx`, `src/components/ErrorBoundary.jsx`, `src/components/Toast.jsx`, `src/components/SkeletonCard.jsx`, `src/styles/components/toast.css`, `src/styles/components/skeleton.css`
- **Endrede filer:** `App.jsx`, `Dashboard.jsx`, `AgentModal.jsx`, `RepositoryCard.jsx`, `ScanProgress.jsx`, `ScanControl.jsx`, `ConfigurablePanel.jsx`, `base.css`, `filters.css`, `header.css`, `repo-card.css`, `configurable-panel.css`, `scan-control.css`, `index.css`
- Alle 106 tester passerer etter endringene

### Fase H7: React frontend → TypeScript — ✅ Ferdig (17. juli 2025)
- `src/types.ts` opprettet med alle frontend-domenetype: `RepoData`, `RepoInfo`, `ScanResults`, `ScanProgressState`, `PanelConfig`, m.fl.
- Alle 14 React-komponenter konvertert: `.jsx` → `.tsx` med eksplisitte Props-interfaces
- `src/hooks/useLocalStorage.ts` — generisk hook `useLocalStorage<T>()` med TypeScript generics
- `src/components/panelConfigs.ts` — strengt typede PanelConfig-objekter
- `index.html` oppdatert til `src/main.tsx`; `tsconfig.frontend.json` oppdatert
- Alle 19 gamle `.jsx`/`.js` frontend-filer slettet — 38 frontend-tester passerer

### Fase H9+H10: Strengere typesjekk og testkonvertering — ✅ Ferdig (17. juli 2025)
- **H9 (Strengere typesjekk):** `noImplicitAny: true` aktivert; `allowJs`/`checkJs` fjernet; `jsconfig.json` slettet; `vite.config.ts`/`vitest.backend.config.ts` opprettet; `server/templates.js` (855 LOC dead code) slettet; `.js`-mønstre fjernet fra alle tsconfig-includes
- **H10 (Testkonvertering):** 21 testfiler konvertert: 10 backend `.test.js` → `.test.ts`, 4 CLI `.test.js` → `.test.ts`, 1 core `.test.js` → `.test.ts`, 6 frontend `.test.jsx` → `.test.tsx`, `setup.js` → `setup.ts`
- Typesjekk: **0 feil** | Build: **45 moduler, 235KB** | Tester: **219 passerer (38+181)**

</details>

---

## Arkitektur (nåværende)

```
┌──────────────────────────────────────────────────────────────────────┐
│                              Evo                                     │
│                                                                      │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────┐  ┌────────┐  │
│  │  React UI    │  │  Express Backend  │  │  CLI      │  │ GitHub │  │
│  │  Dashboard   │◄─┤  API Server       │  │  evo-scan │  │Actions │  │
│  │  + 3 paneler │  │  + Issue Creator  │  │  (node)   │  │ CI/CD  │  │
│  │  + AgentModal│  │  + Copilot Assign │  └─────┬─────┘  └───┬────┘  │
│  └──────────────┘  └────────┬─────────┘        │            │        │
│                              │                  │            │        │
│              ┌───────────────┼──────────────────┼────────────┘        │
│              ▼               ▼                  ▼                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐            │
│  │ GitHub REST  │  │ GitHub       │  │ GitHub Models    │            │
│  │ API (Octokit)│  │ Copilot      │  │ API (KI-analyse) │            │
│  │ - Repos      │  │ Coding Agent │  │ - Chat endpoint  │            │
│  │ - Issues     │  │ - GraphQL    │  │ - Kodeanalyse    │            │
│  │ - Contents   │  │   assignment │  │ - Anbefalinger   │            │
│  └──────────────┘  └──────────────┘  └──────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

### Målarkitektur (etter fase B) ✅ Ferdig

```
packages/
  core/           ← ✅ FERDIG: analyzeRepository, detectProjectTypeFromMetadata, PROJECT_TYPE_LABELS, PRIORITY_RANK, RateLimiter
  cli/            ← ✅ Importerer fra core
server/
  services/       ← ✅ issue-service.js, analysis-service.js, scan-service.js — komplett service-lag
  routes/         ← ✅ Alle routes bruker nå service-laget (tynne HTTP-lag)
  templates/      ← ✅ guardrails.js, product-dev.js, engineering-velocity.js, scan.js + index.js
  analyzer.js     ← ✅ Fasade — delegerer til project-detector.js, file-analyzer.js, recommendation-engine.js
src/
  components/
    ConfigurablePanel.jsx  ← ✅ FERDIG: erstatter GuardrailsPanel, ProductDevelopmentPanel, EngineeringVelocityPanel
    panelConfigs.js        ← ✅ FERDIG: datakonfigurasjon for alle 3 paneltyper
    ScanControl.jsx        ← ✅ FERDIG: tynn orkestrator, delegerer til ScanOptions, ScanProgress, ScanResults, ScanRepoItem
```

---

## Referanser og ressurser

- [GitHub Copilot Models API – REST Docs](https://docs.github.com/en/rest/models/inference)
- [GitHub Copilot Coding Agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)
- [WRAP-metodikken for Copilot Agent](https://github.blog/ai-and-ml/github-copilot/wrap-up-your-backlog-with-github-copilot-coding-agent/)
- [Octokit REST.js](https://octokit.github.io/rest.js/)
- [GitHub AI Model Comparison](https://docs.github.com/en/copilot/reference/ai-models/model-comparison)

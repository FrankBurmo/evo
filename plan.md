# Evo – Utviklingsplan 🚀

> **Sist oppdatert:** 1. mars 2026

## Visjon

Bygge **Evo** til en **proaktiv utviklingsassistent** som automatisk itererer gjennom alle dine GitHub-repos, analyserer nåværende funksjonalitet, og oppretter GitHub Issues med konkrete forbedringsforslag — drevet av ditt eksisterende GitHub Copilot-abonnement som KI-motor.

---

## Nåværende status (februar 2026)

Evo har utviklet seg betydelig fra den opprinnelige planen. Prosjektet er rebrandet fra «Product Orchestrator» til **Evo**, med slagordet *«Produktene dine vokser kontinuerlig – automatisk.»*

### Hva er ferdig ✅

- **Fase 1–5 komplett:** Dyp repoanalyse, KI-analyse (Copilot Models API), automatisk issue-opprettelse, scan-orkestrering i UI, schedulert kjøring via GitHub Actions
- **Web-dashboard** med `ConfigurablePanel` (erstattet 3 separate paneler), filtrering, statistikk, AgentModal, ScanControl
- **CLI** (`evo-scan`) med Commander.js, regelbasert + AI-analyse, issue-opprettelse, config-støtte
- **Express-backend** med 12 API-endepunkter, rate limiting, Copilot Agent-tildeling via GraphQL, `server/services/issue-service.js`
- **Delt kjernepakke** `packages/core/` med `analyzeRepository`, `detectProjectTypeFromMetadata`, `PROJECT_TYPE_LABELS`, `PRIORITY_RANK` — eliminerer ~270 LOC duplisering mellom CLI og server
- **Tester:** Vitest for frontend + backend + CLI (~106 tester)
- **CI/CD:** GitHub Pages deploy + proaktiv skanning via GitHub Actions
- **Dokumentasjon:** strategy.md, README, plan.md, copilot-instructions.md

### Identifiserte problemområder 🔍

Basert på en grundig gjennomgang av hele kodebasen (februar 2026) er følgende de viktigste forbedringspunktene:

**Arkitektur og kodekvalitet:**
- ~~Massiv kodeduplisering: 3 nesten identiske panelkomponenter (~600 LOC), 3 identiske CSS-filer (~480 LOC), duplisert analyselogikk mellom CLI og server (~270 LOC)~~ ✅ Løst — se Fase B
- `analyzer.js` (nå kortere) og `templates.js` (635 linjer) kan fortsatt splittes
- `ScanControl.jsx` er 526 linjer uten oppsplitting
- ~~Duplisert issue-opprettelseslogikk i `routes/issues.js` (4 nesten like rutehandlere)~~ ✅ Løst — `issue-service.js` service-lag
- ~~Manglende service-lag — forretningslogikk ligger direkte i Express-routes~~ ✅ Delvis løst — `server/services/issue-service.js` opprettet

**Sikkerhet:**
- Ingen `helmet()`-middleware for sikre HTTP-headers
- CORS tillater alle origins
- Ingen input-validering/sanitering på POST-ruter
- Uautentisert tilgang til `scan/status` og `scan/results`
- `extractToken()` er case-sensitiv

**Robusthet og feilhåndtering:**
- Ingen global error-handler middleware i Express
- Mange tomme `catch {}`-blokker i analyzer.js
- Inkonsistente feilresponser (varierer mellom `{ error }` og `{ error, message }`)
- Ingen graceful shutdown, ingen timeout på fetch-kall
- In-memory scan-tilstand — forsvinner ved restart, kun single-tenant

**Frontend/UX:**
- Ingen a11y: modalen mangler fokus-felle/`role="dialog"`, klikkbare `<div>`-er overalt, `lang="en"` i HTML
- `applyFilter` i Dashboard er et `useEffect`-antimønster (bør være `useMemo`)
- Ingen søk, sortering, Error Boundary, URL-routing, skeleton loading
- Blanding av norsk og engelsk i UI-tekster

**Tester:**
- Estimert dekning: CLI ~30%, server ~20%, frontend ~25%
- Ingen tester for routes, `deepAnalyzeRepo`, `scanner.js`, `issues.js`, `copilot.js`, modalen eller panelene
- Ingen integrasjonstester

**CLI-spesifikt:**
- Mangler rate limiting og retry for Copilot API
- Mangler prosjekttypespesifikke AI-prompts (serveren har dem)
- `main` i package.json peker til ikke-eksisterende fil

**Stale referanser:**
- `vite.config.js` bruker `/product-orchestrator/` som base i produksjon (bør være `/evo/`)
- `package.json` har repo-URL til `product-orchestrator`
- Helsesjekk sier «Product Orchestrator API»

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

### Fase A: Sikkerhetshardening og robusthet 🔴 Kritisk

**Mål:** Gjøre backend produksjonsklar med grunnleggende sikkerhet og feilhåndtering.

**Oppgaver:**

- [ ] **A1. Legg til `helmet()`-middleware** — sikre HTTP-headers (CSP, X-Frame-Options, etc.)
- [ ] **A2. Begrens CORS** — tillat kun kjente origins (`localhost:3000` i dev, GitHub Pages i prod)
- [ ] **A3. Global error-handler middleware** — konsistent `{ error, message, statusCode }` JSON-format for alle feil
- [ ] **A4. Input-validering** — innfør `zod`-skjemaer for alle POST-ruter (request body, route params)
- [ ] **A5. Autentiserings-middleware** — flytt token-sjekk fra individuelle routes til én `requireAuth`-middleware
- [ ] **A6. Autentiser `scan/status` og `scan/results`** — krever token for å lese skanningsresultater
- [ ] **A7. Fiks `extractToken()` case-insensitivitet** — støtt `Bearer`, `bearer`, `BEARER`
- [ ] **A8. Timeout på eksterne fetch-kall** — `AbortController` med konfigurerbar timeout for Copilot API og GitHub API
- [ ] **A9. Graceful shutdown** — håndter `SIGTERM`/`SIGINT` med pågående request-draining
- [ ] **A10. Konfiger `trust proxy`** — nødvendig for korrekt rate limiting bak reverse proxy
- [ ] **A11. Fiks license-bug i `copilot-client.js`** — `repo.license || repo.license?.spdx_id` → `repo.license?.spdx_id || 'ingen'`

**Estimat:** 2–3 dager | **Risiko:** Høy (sikkerhetshull i prod)

---

### Fase B: Kodeduplisering og arkitektur-refaktorering 🟠 Høy

**Mål:** Eliminere ~1500 linjer duplisert kode og innføre riktige abstraksjoner.

**Oppgaver:**

#### B1. Delt pakke `packages/core/` ✅
- [x] Opprett `packages/core/` med delt logikk brukt av både CLI og server
- [x] Flytt `analyzeRepository()`, `detectProjectType()`, `PROJECT_TYPE_LABELS`, `PRIORITY_RANK` til core
- [ ] Flytt rate limiter-klassen til core (CLI mangler denne helt)
- [x] Oppdater CLI og server til å importere fra `packages/core/`
- [x] **Eliminert:** ~270 LOC duplisering — `packages/core/index.js` eksporterer `analyzeRepository`, `detectProjectTypeFromMetadata`, `PROJECT_TYPE_LABELS`, `PRIORITY_RANK`, `meetsMinPriority`, `mergeAIRecommendations`

#### B2. Generisk `<ConfigurablePanel>`-komponent ✅
- [x] Lag én felles React-komponent som erstatter `GuardrailsPanel`, `ProductDevelopmentPanel` og `EngineeringVelocityPanel`
- [x] Parametrisér: `title`, `items`, `storageKey`, `apiPrefix`, `cssPrefix`, `colorScheme`
- [x] Slå sammen CSS til én `configurable-panel.css` med fargeskjema-varianter (`--guardrails`, `--productdev`, `--engvelocity`)
- [x] **Eliminert:** ~920 LOC JSX + ~480 LOC CSS — erstattet av `ConfigurablePanel.jsx` (~220 LOC) + `panelConfigs.js` + `configurable-panel.css`
- [x] Slettet: `GuardrailsPanel.jsx`, `ProductDevelopmentPanel.jsx`, `EngineeringVelocityPanel.jsx`, `guardrails.css`, `product-dev.css`, `eng-velocity.css`

#### B3. Service-lag i backend ✅ (delvis)
- [x] Opprett `server/services/issue-service.js` — felles `createTemplateIssue()` + `validateIssueRequest()`
- [x] Refaktorer `routes/issues.js` til å bruke service-laget — 3 av 4 rutehandlere bruker nå felles service
- [ ] Opprett `server/services/scan-service.js` — flytt scan-logikk ut fra routes
- [ ] Opprett `server/services/analysis-service.js` — AI-merge og dedup-logikk (duplisert i 3 filer)

#### B4. Splitt store filer
- [ ] `server/analyzer.js` (1032 linjer) → splitt i `project-detector.js`, `file-analyzer.js`, `recommendation-engine.js`
- [ ] `server/templates.js` (635 linjer) → flytt templates til egne markdown-filer eller splitt per kategori
- [ ] `ScanControl.jsx` (526 linjer) → splitt i `ScanOptions`, `ScanProgress`, `ScanResults`, `ScanRepoItem`
- [ ] `buildScanIssueBody` og `buildScanIssueBodyCompact` → refaktorér til én funksjon med `compact`-parameter

#### B5. Fjern død kode ✅ (delvis)
- [x] `detectTests()` i analyzer.js — fjernet (erstattet av `detectTestsFromTree`)
- [x] `queue`/`processing`-felter i RateLimiter — fjernet fra `copilot-client.js`
- [ ] Redundant fallback-logikk i `fetchRepoTree()` — `default_branch` er allerede tilgjengelig

**Estimat:** 4–5 dager | **Risiko:** Middels (regresjoner ved refaktorering)

---

### Fase C: Frontend-kvalitet og tilgjengelighet 🟡 Middels-høy

**Mål:** Fikse a11y-mangler, performance-problemer og UX-hull i dashboardet.

**Oppgaver:**

#### C1. Tilgjengelighet (a11y) — kritiske feil
- [ ] `index.html`: Endre `lang="en"` til `lang="nb"`
- [ ] `AgentModal`: Legg til `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, fokus-felle, Escape-lukking, fokus-retur
- [ ] Erstatt alle klikkbare `<div>`-er med `<button>` (filtre i Dashboard, anbefalinger i RepositoryCard, panel-headers)
- [ ] Legg til `<label htmlFor>` / `id`-kobling i login-skjema
- [ ] Progressbar i ScanControl: `role="progressbar"`, `aria-valuenow`, `aria-valuemax`
- [ ] `aria-live`-regioner for dynamisk innhold (feilmeldinger, skannestatus)

#### C2. Performance-fikser
- [ ] `calculateStats()` i Dashboard → wrap i `useMemo`
- [ ] `applyFilter` `useEffect`-antimønster → erstatt med `useMemo` for derived state
- [ ] `formatDate()` i RepositoryCard → flytt ut av komponenten
- [ ] `React.memo` på `RepositoryCard` for å unngå unødvendig re-rendering
- [ ] Fjern inline `onMouseEnter`/`onMouseLeave` → CSS `:hover`

#### C3. UX-forbedringer
- [ ] Søk/filtrer repos etter navn
- [ ] Sortering (etter stjerner, sist oppdatert, navn, prioritet)
- [ ] Toast/notifikasjoner for asynkrone handlinger (issue opprettet, skanning ferdig)
- [ ] Skeleton loading i stedet for «Laster repositories...»
- [ ] Trekk ut `<Header>`-komponent fra Dashboard (duplisert i 3 tilstander)
- [ ] React Error Boundary som fanger uventede feil

#### C4. State management
- [ ] Lag `useLocalStorage`-hook for panel-konfigurasjoner (erstatter duplisert inline-kode)
- [ ] Vurder `useContext` for token-propagering (sendes gjennom 3+ nivåer via props)

**Estimat:** 3–4 dager | **Risiko:** Lav

---

### Fase D: Testdekning og kvalitetssikring 🟡 Middels

**Mål:** Øke testdekning fra ~25% til >70% med fokus på kritisk forretningslogikk.

**Oppgaver:**

#### D1. Backend route-tester (høyest prioritet)
- [ ] Installer `supertest` for HTTP-integrasjonstester
- [ ] Tester for `routes/repos.js` — mock Octokit, test alle 4 endepunkter
- [ ] Tester for `routes/issues.js` — mock Octokit, test issue-opprettelse og Copilot-tildeling
- [ ] Tester for `routes/scan.js` — test scan-livssyklus (start → status → results → create-issues)

#### D2. Backend kjernefunksjoner
- [ ] Test `deepAnalyzeRepo()` med mocked Octokit-responses
- [ ] Test `analyzeWithAI()` og `callCopilotAPI()` med mocked fetch
- [ ] Test `github.js` (`extractToken`, `assignCopilotToIssue`)
- [ ] Test `templates.js` (verify output-struktur og sanitering)

#### D3. CLI-tester
- [ ] Test `scanner.js` `runScan()` med mocked Octokit og fetch
- [ ] Test `copilot.js` `analyzeWithAI()` med mocked fetch
- [ ] Test `issues.js` `createIssue()` og `issueAlreadyExists()` med mocked Octokit
- [ ] Test CLI-argumentparsing og config-lasting i `evo-scan.js`

#### D4. Frontend-tester
- [ ] Test `Dashboard.jsx` — loading, error, filtrering, statistikk
- [ ] Test `ScanControl.jsx` — skanning-livssyklus, seleksjon, batch-opprettelse
- [ ] Test `AgentModal.jsx` — state-maskin (idle → loading → success/error)
- [ ] Test minst én panel-komponent (eller den nye `ConfigurablePanel` etter fase B2)

**Estimat:** 3–4 dager | **Risiko:** Lav

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

### Fase G: Rebranding-opprydding 🟢 Lett

**Mål:** Fjerne alle gjenværende «Product Orchestrator»-referanser.

**Oppgaver:**

- [ ] **G1. `vite.config.js`** — endre `base` fra `/product-orchestrator/` til `/evo/`
- [ ] **G2. `package.json`** — oppdater `repository.url`, `bugs.url`, `homepage` til `evo`
- [ ] **G3. `server/index.js`** — helsesjekk: endre «Product Orchestrator API» til «Evo API»
- [ ] **G4. `index.html`** — legg til `<meta name="description">`, favicon, `theme-color`
- [ ] **G5. `README.md`** — oppdater installasjonsinstruksjoner med nye repo-URLer
- [ ] **G6. `.github/copilot-instructions.md`** — synkroniser med ny filstruktur og arkitektur
- [ ] **G7. Konsistent språk** — rydd opp i blanding av norsk/engelsk i feilmeldinger og UI-tekster

**Estimat:** 0.5 dag | **Risiko:** Minimal

---

## Oppsummering — Prioritert backlog-tabell

| # | Oppgave | Fase | Prioritet | Status | Estimat |
|---|---------|------|-----------|--------|---------|
| A1 | `helmet()`-middleware | A | 🔴 Kritisk | ❌ | 0.5t |
| A2 | Begrens CORS | A | 🔴 Kritisk | ❌ | 0.5t |
| A3 | Global error-handler | A | 🔴 Kritisk | ❌ | 1t |
| A4 | Input-validering (zod) | A | 🔴 Kritisk | ❌ | 2t |
| A5 | Autentiserings-middleware | A | 🔴 Kritisk | ❌ | 1t |
| A11 | Fiks license-bug | A | 🔴 Kritisk | ❌ | 0.5t |
| G1 | Fiks `vite.config.js` base-path | G | 🟢 Lett | ❌ | 0.5t |
| G2 | Oppdater package.json URLs | G | 🟢 Lett | ❌ | 0.5t |
| G3 | Helsesjekk-melding → Evo | G | 🟢 Lett | ❌ | 0.5t |
| B1 | `packages/core/` delt pakke | B | 🟠 Høy | ✅ (delvis — rate limiter gjenstår) | 4t |
| B2 | `<ConfigurablePanel>` komponent | B | 🟠 Høy | ✅ | 4t |
| B3 | Service-lag i backend | B | 🟠 Høy | ✅ (delvis — scan/analysis gjenstår) | 6t |
| B4 | Splitt store filer | B | 🟠 Høy | ❌ | 4t |
| B5 | Fjern død kode | B | 🟠 Høy | ✅ (delvis — fetchRepoTree gjenstår) | 1t |
| C1 | A11y-fikser (kritiske) | C | 🟡 Middels | ❌ | 3t |
| C2 | Performance-fikser | C | 🟡 Middels | ❌ | 2t |
| C3 | UX-forbedringer | C | 🟡 Middels | ❌ | 4t |
| C4 | State management | C | 🟡 Middels | ❌ | 2t |
| D1 | Backend route-tester | D | 🟡 Middels | ❌ | 4t |
| D2 | Backend kjernefunksjon-tester | D | 🟡 Middels | ❌ | 3t |
| D3 | CLI-tester | D | 🟡 Middels | ❌ | 3t |
| D4 | Frontend-tester | D | 🟡 Middels | ❌ | 3t |
| E1–3 | CLI: rate limiting, retry, prompts | E | 🟢 Lav | ❌ | 3t |
| E4–10 | CLI: UX-forbedringer og fikser | E | 🟢 Lav | ❌ | 2t |
| F1 | Strukturert logging | F | 🔵 Nice-to-have | ❌ | 3t |
| F2 | API-forbedringer (paginering, OpenAPI) | F | 🔵 Nice-to-have | ❌ | 4t |
| F3 | Avansert analyse (deps, security, trender) | F | 🔵 Nice-to-have | ❌ | Løpende |
| F4 | Frontend neste nivå (router, virtualisering) | F | 🔵 Nice-to-have | ❌ | Løpende |
| F5 | Skalerbarhet (persistent state, workers) | F | 🔵 Nice-to-have | ❌ | Løpende |
| F6 | Integrasjoner (webhooks, notifikasjoner) | F | 🔵 Nice-to-have | ❌ | Løpende |

---

## Ferdigstilte faser (historikk)

<details>
<summary>Klikk for å se fullført arbeid fra fase 1–5 og fase B (mars 2026)</summary>

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

### Fase B (delvis): Kodeduplisering og arkitektur-refaktorering — ✅ Delvis ferdig (1. mars 2026)
- `packages/core/index.js` opprettet: eksporterer `analyzeRepository`, `detectProjectTypeFromMetadata`, `PROJECT_TYPE_LABELS`, `PRIORITY_RANK`, `meetsMinPriority`, `mergeAIRecommendations`
- `server/analyzer.js` og `packages/cli/src/analyzer.js` importerer nå fra core — ~270 LOC duplisering fjernet
- `ConfigurablePanel.jsx` + `panelConfigs.js` + `configurable-panel.css` erstatter 3 identiske panelkomponenter — ~1400 LOC fjernet
- `server/services/issue-service.js` opprettet med `createTemplateIssue()` + `validateIssueRequest()` — `routes/issues.js` refaktorert
- Død kode fjernet: `detectTests()`, `queue`/`processing`-felter i RateLimiter
- Alle 106 tester passerer etter refaktorering
- Gjenstår: rate limiter til core, `scan-service.js`, `analysis-service.js`, splitt av store filer

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

### Målarkitektur (etter fase B)

```
packages/
  core/           ← ✅ FERDIG: analyzeRepository, detectProjectTypeFromMetadata, PROJECT_TYPE_LABELS, PRIORITY_RANK
  cli/            ← ✅ Importerer fra core
server/
  services/       ← ✅ issue-service.js ferdig — scan-service.js og analysis-service.js gjenstår
  routes/         ← ✅ issues.js bruker nå service-laget
src/
  components/
    ConfigurablePanel.jsx  ← ✅ FERDIG: erstatter GuardrailsPanel, ProductDevelopmentPanel, EngineeringVelocityPanel
    panelConfigs.js        ← ✅ FERDIG: datakonfigurasjon for alle 3 paneltyper
    ScanControl/           ← Gjenstår: splittes i delkomponenter
```

---

## Referanser og ressurser

- [GitHub Copilot Models API – REST Docs](https://docs.github.com/en/rest/models/inference)
- [GitHub Copilot Coding Agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)
- [WRAP-metodikken for Copilot Agent](https://github.blog/ai-and-ml/github-copilot/wrap-up-your-backlog-with-github-copilot-coding-agent/)
- [Octokit REST.js](https://octokit.github.io/rest.js/)
- [GitHub AI Model Comparison](https://docs.github.com/en/copilot/reference/ai-models/model-comparison)

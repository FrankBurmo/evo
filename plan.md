# Evo – Utviklingsplan 🚀

> **Sist oppdatert:** 28. februar 2026

## Visjon

Bygge **Evo** til en **proaktiv utviklingsassistent** som automatisk itererer gjennom alle dine GitHub-repos, analyserer nåværende funksjonalitet, og oppretter GitHub Issues med konkrete forbedringsforslag — drevet av ditt eksisterende GitHub Copilot-abonnement som KI-motor.

---

## Nåværende status (februar 2026)

Evo har utviklet seg betydelig fra den opprinnelige planen. Prosjektet er rebrandet fra «Product Orchestrator» til **Evo**, med slagordet *«Produktene dine vokser kontinuerlig – automatisk.»*

### Hva er ferdig

**Web-dashboard (React + Vite):**
- Autentisering via GitHub PAT med `localStorage`-persistering
- Henter alle brukerens repos via Octokit med paginering (filtrerer bort arkiverte)
- Regelbasert analyse med anbefalinger per repo (dokumentasjon, aktivitet, vedlikehold, synlighet)
- Filtrering: alle, markedsmuligheter, trenger oppmerksomhet, aktive, inaktive
- Statistikk-oversikt: totalt repos, aktive, stjerner, trenger oppmerksomhet
- **3 analysepaneler** med til sammen 11 AI-agent-analyser man kan trigge per repo:
  - **Guardrails** (1): Arkitekturanalyse
  - **Produktutvikling** (5): UX-audit, markedsmuligheter, feature discovery, DX-analyse, PMF-analyse
  - **Leveransekvalitet** (5): CI/CD-modenhet, DORA-metrikker, observability, release-hygiene, community-helse
- Hvert panel kan slås av/på, og trigger opprettelse av detaljert GitHub-issue med automatisk tildeling til Copilot Coding Agent via GraphQL
- `AgentModal` — klikk på en anbefaling for å opprette issue tildelt Copilot direkte
- GitHub Pages-deployment via GitHub Actions CI/CD-pipeline (`frontend.yml`)

**CLI-verktøy (`packages/cli/` — `evo-scan`):**
- Komplett CLI med Commander.js (`npx evo-scan scan`)
- Regelbasert analyse (`analyzer.js`) — utvidet og norskspråklig versjon
- **GitHub Copilot Models API-integrasjon** (`copilot.js`) — AI-analyse med strukturert JSON-output
- Issue-opprettelse med dedup-sjekk (`issues.js`) — `evo-scan`-label, prioritetslabeler
- Pen terminal-output med ANSI-farger, fremdriftsindikator og sammendrag
- JSON-output-modus for integrasjon med andre verktøy
- Flagg: `--create-issues`, `--dry-run`, `--no-ai`, `--model`, `--min-priority`, `--max-repos`

**Express-backend (port 3001):**
- `GET /api/health` — helsesjekk
- `GET /api/repos` — hent alle repos med regelbasert analyse
- `GET /api/repo/:owner/:name` — enkelt-repo analyse
- `POST /api/create-agent-issue` — opprett issue med Copilot assignment via GraphQL
- `POST /api/guardrails/architecture-analysis` — dyp arkitekturanalyse-issue
- `POST /api/product-dev/:actionId` — 5 produktutviklings-issue-typer
- `POST /api/engineering-velocity/:actionId` — 5 leveransekvalitet-issue-typer
- Rate limiting og CORS konfigurert

**Dokumentasjon:**
- `docs/strategy.md` — distribusjonsstrategi med 7 modeller (SaaS, GitHub App, Docker, CLI, Copilot Extension, etc.)
- `README.md`, `plan.md`, `.github/copilot-instructions.md`

### Hva mangler

- **~~Ingen AI-analyse i web-dashboard~~** — ✅ **Løst i fase 2**: `server/copilot-client.js` med prosjekttypespesifikke prompts, rate limiting og integrering i Express-endepunkter
- **~~Ingen dyp kodeanalyse~~** — ✅ **Løst i fase 1**: `server/analyzer.js` henter filstruktur, kildekode, commits og kategoriserer prosjekttype
- **Ingen proaktiv bulk-skanning fra UI** — ingen «Start skanning»-knapp, fremdriftsvising eller resultatoversikt
- **Ingen schedulert kjøring** — mangler `proactive-scan.yml` workflow og `scan-config.json`
- **Ingen prosjekttypegjenkjenning** — Android, web, API, etc. kategoriseres ikke
- **Ingen dependency-analyse, sikkerhetsanalyse eller trendanalyse** (Fase 6)
- **Ingen tester** — verken unit, integration eller e2e

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

## Utviklingsplan – Faser

### Fase 1: Dyp repoanalyse med GitHub API (backend) — ✅ Ferdig
**Mål:** Utvide backend-analysen til å hente og vurdere faktisk innhold fra hvert repo

**Oppgaver:**
- [x] Regelbasert analyse i backend (`server/index.js`) og CLI (`packages/cli/src/analyzer.js`)
- [x] Ny modul `server/analyzer.js` — utvidet analysemotor (separat fra index.js)
  - Hent filstruktur (`repos.getContent`) for å identifisere prosjekttype
  - Detekter om det er en Android-app (sjekk for `AndroidManifest.xml`, `build.gradle`)
  - Detekter om det er et nettsted (sjekk for `index.html`, `package.json` med React/Vue/Next)
  - Hent `README.md`-innhold for kontekst
  - Hent `package.json` / `build.gradle` for dependency-analyse
  - Sjekk for CI/CD-oppsett (`/.github/workflows/`)
  - Sjekk for tester (`__tests__/`, `test/`, `*.test.js`, `*Test.java`)
  - Sjekk for lisens, CONTRIBUTING.md, SECURITY.md
- [x] Hent siste commits for aktivitetsanalyse
- [x] Hent eksisterende issues for å unngå duplikater (implementert i CLI: `issues.js`)
- [x] Kategoriser repos: `web-app` | `android-app` | `library` | `api` | `docs` | `other`

### Fase 2: KI-drevet analyse med GitHub Copilot Models API — ✅ Ferdig
**Mål:** Bruke Copilot Models API til intelligent vurdering av hvert repo

**Oppgaver:**
- [x] Copilot Models API-klient med strukturert JSON-output (CLI: `packages/cli/src/copilot.js`)
- [x] Fallback hvis Models API ikke er tilgjengelig — bruker regelbasert analyse (CLI: `scanner.js`)
- [x] Ny modul `server/copilot-client.js` — samme funksjonalitet som CLI, men for Express-backend
- [x] Definer analyse-prompts per prosjekttype:
  - **Nettsted:** SEO, ytelse, tilgjengelighet, UX, PWA-muligheter, responsive design
  - **Android-app:** Material Design, Kotlin-migrasjon, Jetpack Compose, Play Store-optimalisering
  - **API/Backend:** Sikkerhet, dokumentasjon (OpenAPI/Swagger), feilhåndtering, logging
  - **Bibliotek:** API-design, bundling, versjonering, DX
  - **Dokumentasjon:** Innhold, søk, navigasjon, tilgjengelighet
  - **Generelt:** Testing, CI/CD, avhengighetsoppdatering, kodeorganisering
- [x] Rate limiting for Models API-kall (token-bucket med konfigurerbar kvote)
- [x] KI-analyse integrert i Express-backend (`/api/repo/:owner/:name/deep` og `/api/scan/start`)
- [x] Dedikert KI-analyse-endepunkt `POST /api/repo/:owner/:name/ai-analyze`
- [x] Retry-logikk ved forbigående feil (429, 5xx)

### Fase 3: Automatisk Issue-opprettelse — ✅ Ferdig
**Mål:** Opprette GitHub Issues i repos der forbedringer er hensiktsmessige

**Oppgaver:**
- [x] Nytt API-endepunkt `POST /api/scan/start` — starter proaktiv skanning med dyp analyse
- [x] Nytt API-endepunkt `GET /api/scan/status` — sjekk status på pågående skanning
- [x] Nytt API-endepunkt `GET /api/scan/results` — hent resultater fra siste skanning
- [x] Nytt API-endepunkt `POST /api/scan/create-issues` — batch issue-opprettelse fra skanningsresultater
- [x] Issue-opprettelse via `POST /api/create-agent-issue` — med Copilot-tildeling
- [x] Issue-opprettelse for 11 analysekategorier via `/api/guardrails/*`, `/api/product-dev/*`, `/api/engineering-velocity/*`
- [x] CLI: `--create-issues` og `--dry-run` med full issue-opprettelse
- [x] Issue-mal med tydelig tittel, detaljert beskrivelse, labels, prioritet
- [x] Dedup-logikk i CLI (`issues.js` — sjekker eksisterende issues med `evo-scan`-label)
- [x] Batch-modus i CLI (skanner alle repos og oppretter issues automatisk)
- [x] Batch-modus i web-UI (`ScanControl.jsx` — opprett alle foreslåtte issues med én knapp)

### Fase 4: Frontend – Scan-orkestrering — ✅ Ferdig
**Mål:** Utvide dashboardet med UI for å starte og overvåke skanninger

> **Merk:** All funksjonalitet er implementert i `ScanControl.jsx`.

**Oppgaver:**
- [x] `GuardrailsPanel.jsx` — arkitekturanalyse per repo med av/på-toggles
- [x] `ProductDevelopmentPanel.jsx` — 5 produktutviklingsanalyser per repo
- [x] `EngineeringVelocityPanel.jsx` — 5 leveransekvalitetsanalyser per repo
- [x] `AgentModal.jsx` — modal for å opprette issue og tildele til Copilot
- [x] `Dashboard.jsx` oppdatert med paneler, filtrering og statistikk
- [x] `ScanControl.jsx` — start/stopp proaktiv bulk-skanning
  - Knapp "Start proaktiv skanning"
  - Fremdriftsindikator per repo
  - Vise resultater fortløpende
  - Batch issue-opprettelse med Copilot-tildeling
- [x] Godkjenne/avvise individuelle forslag — `ScanControl.jsx` med seleksjon
  - Checkbox per anbefaling for å velge/avvelge
  - "Velg alle" / "Fjern alle" — både globalt og per repo
  - Teller for valgte anbefalinger i oppsummering
  - Opprett enkeltstående issue per anbefaling (📝-knapp)
  - Batch-opprettelse kun for valgte anbefalinger
  - Backend `POST /api/scan/create-issues` støtter `selected`-parameter for selektiv issue-opprettelse

### Fase 5: GitHub Actions – Schedulert kjøring — ✅ Ferdig
**Mål:** Automatisk daglig/ukentlig skanning uten manuell innsats

**Oppgaver:**
- [x] GitHub Actions workflow `.github/workflows/frontend.yml` (CI/CD for frontend)
- [x] CLI-verktøyet `evo-scan` kan brukes som basis for headless skanning
- [x] GitHub Actions workflow `.github/workflows/proactive-scan.yml`
  - Cron-schedule: ukentlig (mandag kl. 06:00 UTC), konfigurerbar
  - `workflow_dispatch` med inputs: min-priority, create-issues, max-repos, dry-run, no-ai
  - Kjører `node packages/cli/bin/evo-scan.js scan --config scan-config.json --json`
  - Laster opp resultater som artefakt (`scan-results.json`)
  - Genererer GitHub Actions Step Summary med metrikker
- [x] Konfigurasjonsfil `scan-config.json` med JSON Schema (`scan-config.schema.json`)
  - Include/exclude-lister for repos og språk
  - Minimum prioritetsnivå for å opprette issue (`high`, `medium`, `low`)
  - Maks antall issues per repo per kjøring
  - Aktivering/deaktivering av analyse-kategorier
  - AI-modell, createIssues, assignCopilot-innstillinger
- [x] CLI-utvidelse: `--config <path>` flagg for å laste scan-config.json
  - Auto-detekterer `scan-config.json` i arbeidsmappe
  - CLI-flagg overstyrer alltid config-verdier
  - `--max-issues-per-repo` nytt flagg
  - Filtrering på repos og språk fra config

### Fase 6: Avanserte funksjoner — ❌ Ikke startet
**Mål:** Gjøre verktøyet smartere over tid

**Oppgaver:**
- [ ] Dependency-sjekk: identifiser utdaterte avhengigheter (npm, Gradle)
- [ ] Sikkerhetsanalyse: sjekk for kjente sårbarheter via GitHub Advisory Database
- [ ] Trendanalyse: track repo-utvikling over tid (historisk data)
- [ ] Prioriteringsmotor: rangering av forslag basert på estimert påvirkning
- [ ] Flerspråklig støtte: analyse tilpasset repo-språk (Kotlin/Java, JavaScript/TypeScript, Python)
- [ ] Notifikasjoner: varsle bruker når ny skanning er fullført (e-post, GitHub notification)
- [ ] Multi-bruker: støtte for team-bruk med delt dashboard

### Utenfor opprinnelig plan — ✅ Bonus-leveranser

Følgende ble bygget utover det som var planlagt:

1. **CLI-verktøy (`packages/cli/`)** — Komplett `evo-scan` med Commander.js, ANSI-output, AI-analyse, issue-opprettelse
2. **Copilot Coding Agent-tildeling** — GraphQL-basert `replaceActorsForAssignable`-mutasjon for automatisk agent-assignment
3. **11 analysekategorier** — Detaljerte issue-templates for arkitektur, UX, marked, features, DX, PMF, CI/CD, DORA, observability, release, community
4. **Distribusjonsstrategi** (`docs/strategy.md`) — 7 modeller analysert (SaaS, GitHub App, Docker, CLI, Copilot Extension, etc.)
5. **GitHub Pages deployment** — Automatisk frontend-deploy via CI/CD
6. **Rebranding** — Fra «Product Orchestrator» til «Evo»

---

## Teknisk detaljer

### Nye avhengigheter

| Pakke | Versjon | Formål |
|-------|---------|--------|
| `node-cron` | ^3.x | Schedulering i backend (alternativ til GitHub Actions) |
| `p-limit` | ^5.x | Begrens samtidige API-kall |

> **Merk:** Ingen ekstra KI-avhengigheter trengs — Copilot Models API nås via standard `fetch()` med GitHub PAT.

### Nye miljøvariabler

```env
# Eksisterende
GITHUB_TOKEN=ghp_...

# Nye
COPILOT_MODEL=openai/gpt-4.1          # Modell for KI-analyse
SCAN_SCHEDULE=0 6 * * 1               # Cron-uttrykk for automatisk skanning
SCAN_MIN_PRIORITY=medium              # Minimum prioritet for issue-opprettelse
SCAN_MAX_ISSUES_PER_REPO=5            # Maks issues per repo per skanning
SCAN_EXCLUDE_REPOS=repo1,repo2        # Repos som skal ekskluderes
```

### Ny filstruktur (oppdatert vs. faktisk)

```
evo/
├── server/
│   ├── index.js                    # API-server — all backend-logikk (1364 linjer)
│   ├── analyzer.js                 # Utvidet analysemotor — dyp repo-analyse, prosjekttype-deteksjon
│   └── copilot-client.js           # Copilot Models API-klient — KI-analyse med prosjekttype-prompts
├── src/
│   ├── App.jsx                     # Autentiseringsflyt
│   ├── main.jsx                    # React entry point
│   ├── index.css                   # Global CSS
│   └── components/
│       ├── Dashboard.jsx           # Hovedlayout med paneler, filtre, stats
│       ├── RepositoryCard.jsx      # Repo-kort med klikkbare anbefalinger
│       ├── AgentModal.jsx          # Modal for Copilot issue-opprettelse
│       ├── GuardrailsPanel.jsx     # Arkitekturanalyse-trigger
│       ├── ProductDevelopmentPanel.jsx  # 5 produktutviklings-analyser
│       ├── EngineeringVelocityPanel.jsx # 5 leveransekvalitet-analyser
│       └── ScanControl.jsx         # Proaktiv bulk-skanning med fremdrift og batch-issues
├── packages/
│   └── cli/
│       ├── package.json            # evo-scan npm-pakke (v0.1.0)
│       ├── bin/
│       │   └── evo-scan.js         # CLI entry point (Commander.js)
│       └── src/
│           ├── scanner.js          # Hovedlogikk: hent → analyser → issues
│           ├── analyzer.js         # Regelbasert analyse
│           ├── copilot.js          # Copilot Models API-klient
│           ├── issues.js           # Issue-opprettelse med dedup
│           └── output.js           # Terminal-output med ANSI-farger
├── docs/
│   └── strategy.md                 # Distribusjonsstrategi (7 modeller)
├── public/
│   └── demo.html                   # Demo/landingsside
├── .github/
│   ├── copilot-instructions.md     # Copilot Context
│   └── workflows/
│       └── frontend.yml            # CI: Build + Deploy til GitHub Pages
├── plan.md                         # DENNE FILEN
├── package.json                    # Root — Express + React
├── vite.config.js                  # Vite-konfigurasjon med proxy
└── index.html                      # Vite HTML entry point
```

**Nylig opprettede filer (Fase 5):**
```
├── .github/workflows/
│   └── proactive-scan.yml          # Schedulert skanning (cron + dispatch)
├── scan-config.json                # Skanningskonfigurasjon
└── scan-config.schema.json         # JSON Schema for validation/intellisense
```

### API-endepunkter

| Status | Metode | Endepunkt | Beskrivelse |
|--------|--------|-----------|-------------|
| ✅ | `GET` | `/api/health` | Helsesjekk |
| ✅ | `GET` | `/api/repos` | Hent alle repos med regelbasert analyse |
| ✅ | `GET` | `/api/repo/:owner/:name` | Analyse av enkelt repo |
| ✅ | `POST` | `/api/create-agent-issue` | Opprett issue med Copilot-tildeling |
| ✅ | `POST` | `/api/guardrails/architecture-analysis` | Arkitekturanalyse-issue |
| ✅ | `POST` | `/api/product-dev/:actionId` | 5 produktutviklings-issues |
| ✅ | `POST` | `/api/engineering-velocity/:actionId` | 5 leveransekvalitet-issues |
| ✅ | `POST` | `/api/repo/:owner/:name/ai-analyze` | Dedikert KI-analyse med Copilot Models API |
| ✅ | `POST` | `/api/scan/start` | Start proaktiv skanning av alle repos |
| ✅ | `GET` | `/api/scan/status` | Hent status for pågående skanning |
| ✅ | `GET` | `/api/scan/results` | Hent resultater fra siste skanning |
| ✅ | `POST` | `/api/scan/create-issues` | Opprett valgte/alle foreslåtte issues |

---

## Flyt – Proaktiv skanning

```
1. Bruker klikker "Start proaktiv skanning" (eller cron trigger)
        │
2. Hent alle brukerens GitHub-repos via Octokit
        │
3. For hvert repo:
   ├── a. Hent filstruktur, README, config-filer
   ├── b. Kategoriser prosjekttype (web, android, api, etc.)
   ├── c. Kjør regelbasert analyse (eksisterende + utvidet)
   ├── d. Send kontekst til Copilot Models API for KI-analyse
   ├── e. Motta strukturerte forbedringsforslag
   └── f. Sjekk for eksisterende issues (dedup)
        │
4. Samle alle forslag og presenter i dashboard
        │
5. Bruker reviewer og godkjenner forslag
        │
6. Opprett GitHub Issues i relevante repos
        │
7. (Valgfritt) Bruker tilordner issues til @copilot for automatisk løsning
```

---

## Integrasjon med GitHub Copilot Coding Agent

En av de viktigste fordelene med denne rigging er at issues som opprettes er **designet for å kunne løses av GitHub Copilot Coding Agent**:

1. **Velstrukturerte issues** — tydelig tittel, kontekst, og akseptkriterier
2. **Atomære oppgaver** — én issue per konkret forbedring (følger WRAP-metodikken)
3. **Instruksjoner i issue-body** — Copilot forstår hva som skal gjøres
4. **Assign til @copilot** — Agent starter automatisk, oppretter branch og PR
5. **Human review** — Bruker godkjenner/ber om endringer på PR-en

**Eksempel på issue som opprettes:**
```markdown
## Legg til enhets­tester for hovedkomponentene

### Kontekst
Repositoryet `my-web-app` har ingen testinfrastruktur. 
Prosjektet bruker React 19 med Vite som build-verktøy.

### Oppgave
1. Installer Vitest og React Testing Library
2. Konfigurer Vitest i `vite.config.js`
3. Skriv tester for `App.jsx`, `Dashboard.jsx` og `RepositoryCard.jsx`
4. Legg til `test`-script i `package.json`
5. Sørg for at alle tester passerer

### Akseptkriterier
- [ ] Testinfrastruktur er konfigurert
- [ ] Minst 3 testfiler er opprettet
- [ ] `npm test` kjører uten feil
- [ ] Test coverage > 60%

Opprettet av Product Orchestrator 🚀
```

---

## Prioritert backlog (oppdatert feb 2026)

| # | Oppgave | Fase | Status | Prioritet | Neste steg |
|---|---------|------|--------|-----------|------------|
| 1 | Refaktorér `server/index.js` — trekk ut analyse, templates, issues | 1 | ❌ | Høy | Splitt 1461 linjer til moduler |
| 2 | Copilot Models API i Express-backend | 2 | ✅ | Høy | `server/copilot-client.js` med prosjekttype-prompts |
| 3 | AI-drevet repo-analyse i dashboard | 2 | ✅ | Høy | Integrert i `/api/repo/:owner/:name/deep` og `/api/scan/start` |
| 4 | Dyp kodeanalyse (`repos.getContent`) | 1 | ❌ | Høy | Hent filstruktur, README, config |
| 5 | Bulk-skanning fra UI (ScanControl + godkjenn/avvis) | 4 | ✅ | Medium | Ferdig — seleksjon + batch |
| 6 | Prosjekttypegjenkjenning | 1 | ❌ | Medium | Android/web/API/library-deteksjon |
| 7 | `proactive-scan.yml` GitHub Actions workflow | 5 | ✅ | Medium | Ferdig — cron + dispatch + artefakt |
| 8 | `scan-config.json` konfigurasjonsfil | 5 | ✅ | Medium | Ferdig — med JSON Schema |
| 9 | Tester (unit + integration) | — | ❌ | Medium | Sett opp Vitest for frontend, Jest for CLI |
| 10 | Dependency-analyse | 6 | ❌ | Lav | npm audit / GitHub Advisory API |
| 11 | Sikkerhetsanalyse | 6 | ❌ | Lav | OpenSSF Scorecard-integrasjon |
| 12 | Trendanalyse og historikk | 6 | ❌ | Lav | Lagre skanningsresultater over tid |

---

## Referanser og ressurser

- [GitHub Copilot Models API – REST Docs](https://docs.github.com/en/rest/models/inference) — Endepunkt for chat completions
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) — Multi-platform SDK for agentic workflows
- [GitHub Copilot Coding Agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent) — Assign issues til @copilot
- [WRAP-metodikken for Copilot Agent](https://github.blog/ai-and-ml/github-copilot/wrap-up-your-backlog-with-github-copilot-coding-agent/) — Best practices for issues
- [Building Agents with Copilot SDK](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/building-agents-with-github-copilot-sdk-a-practical-guide-to-automated-tech-upda/4488948) — Praktisk guide
- [GitHub Actions Workflow Dispatch](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch) — Manuell og schedulert trigger
- [Octokit REST.js](https://octokit.github.io/rest.js/) — GitHub API-klient for Node.js
- [GitHub AI Model Comparison](https://docs.github.com/en/copilot/reference/ai-models/model-comparison) — Modell-oversikt

# Product Orchestrator – Utviklingsplan 🚀

## Visjon

Bygge ut Product Orchestrator til en **proaktiv utviklingsassistent** som automatisk itererer gjennom alle dine GitHub-repos, analyserer nåværende funksjonalitet, og oppretter GitHub Issues med konkrete forbedringsforslag — drevet av ditt eksisterende GitHub Copilot-abonnement som KI-motor.

---

## Nåværende status

Product Orchestrator er i dag et dashboard-verktøy som:
- Henter brukerens GitHub-repos via Octokit/GitHub REST API
- Kjører regelbasert analyse (dokumentasjon, aktivitet, synlighet, vedlikehold)
- Viser anbefalinger i et React-dashboard med filtrering og statistikk
- Bruker Express-backend med rate limiting og token-autentisering

**Hva mangler:**
- Ingen KI-drevet analyse — kun statiske regler
- Ingen mulighet til å opprette GitHub Issues automatisk
- Ingen planlagt/schedulert kjøring — kun manuell bruk via dashboard
- Ingen dyp kodeanalyse (ser bare på repo-metadata, ikke kildekoden)
- Ingen støtte for Android-spesifikk analyse

---

## Arkitektur – Ny proaktiv rigg

```
┌─────────────────────────────────────────────────────────────────┐
│                    Product Orchestrator                         │
│                                                                 │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │  React UI    │   │  Express Backend  │   │ GitHub Actions │  │
│  │  Dashboard   │◄──┤  API Server       │   │ Cron Workflow  │  │
│  │  + Scan UI   │   │  + Scan Engine    │◄──┤ (Schedulert)   │  │
│  └──────────────┘   │  + Issue Creator  │   └────────────────┘  │
│                     └────────┬─────────┘                        │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ GitHub REST  │  │ GitHub       │  │ GitHub Models    │      │
│  │ API (Octokit)│  │ Copilot      │  │ API (KI-analyse) │      │
│  │ - Repos      │  │ Coding Agent │  │ - Chat endpoint  │      │
│  │ - Issues     │  │ - Assign     │  │ - Kodeanalyse    │      │
│  │ - Contents   │  │   issues     │  │ - Anbefalinger   │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
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

### Fase 1: Dyp repoanalyse med GitHub API (backend)
**Mål:** Utvide backend-analysen til å hente og vurdere faktisk innhold fra hvert repo

**Oppgaver:**
- [ ] Ny modul `server/analyzer.js` — utvidet analysemotor
  - Hent filstruktur (`repos.getContent`) for å identifisere prosjekttype
  - Detekter om det er en Android-app (sjekk for `AndroidManifest.xml`, `build.gradle`)
  - Detekter om det er et nettsted (sjekk for `index.html`, `package.json` med React/Vue/Next)
  - Hent `README.md`-innhold for kontekst
  - Hent `package.json` / `build.gradle` for dependency-analyse
  - Sjekk for CI/CD-oppsett (`/.github/workflows/`)
  - Sjekk for tester (`__tests__/`, `test/`, `*.test.js`, `*Test.java`)
  - Sjekk for lisens, CONTRIBUTING.md, SECURITY.md
- [ ] Hent siste commits for aktivitetsanalyse
- [ ] Hent eksisterende issues for å unngå duplikater
- [ ] Kategoriser repos: `web-app` | `android-app` | `library` | `api` | `docs` | `other`

### Fase 2: KI-drevet analyse med GitHub Copilot Models API
**Mål:** Bruke Copilot Models API til intelligent vurdering av hvert repo

**Oppgaver:**
- [ ] Ny modul `server/copilot-client.js` — wrapper for Models API
  - Chat completions-kall med repo-kontekst
  - System-prompt tilpasset analyse av nettsteder og Android-apper
  - Strukturert output (JSON) med konkrete forbedringsforslag
- [ ] Definer analyse-prompts per prosjekttype:
  - **Nettsted:** SEO, ytelse, tilgjengelighet, UX, PWA-muligheter, responsive design
  - **Android-app:** Material Design, Kotlin-migrasjon, Jetpack Compose, Play Store-optimalisering
  - **API/Backend:** Sikkerhet, dokumentasjon (OpenAPI/Swagger), feilhåndtering, logging
  - **Generelt:** Testing, CI/CD, avhengighetsoppdatering, kodeorganisering
- [ ] Implementer fallback hvis Models API ikke er tilgjengelig (bruk regelbasert analyse)
- [ ] Rate limiting for Models API-kall (respekter kvote fra Copilot-abonnement)

### Fase 3: Automatisk Issue-opprettelse
**Mål:** Opprette GitHub Issues i repos der forbedringer er hensiktsmessige

**Oppgaver:**
- [ ] Nytt API-endepunkt `POST /api/scan/start` — starter proaktiv skanning
- [ ] Nytt API-endepunkt `GET /api/scan/status` — sjekk status på pågående skanning
- [ ] Nytt API-endepunkt `GET /api/scan/results` — hent resultater fra siste skanning
- [ ] Nytt API-endepunkt `POST /api/issues/create` — opprett issue i spesifikt repo
- [ ] Nytt API-endepunkt `POST /api/scan/create-all-issues` — opprett alle foreslåtte issues
- [ ] Issue-mal med:
  - Tydelig tittel basert på anbefaling
  - Detaljert beskrivelse med kontekst fra KI-analysen
  - Label: `product-orchestrator` (for identifisering)
  - Prioritet-label: `priority:high` / `priority:medium` / `priority:low`
  - Instruksjoner som gjør issuet egnet for Copilot Coding Agent
- [ ] Dedup-logikk: sjekk om lignende issue allerede eksisterer
- [ ] Batch-modus: opprett issues for alle repos i én kjøring

### Fase 4: Frontend – Scan-orkestrering
**Mål:** Utvide dashboardet med UI for å starte og overvåke skanninger

**Oppgaver:**
- [ ] Ny komponent `ScanControl.jsx` — start/stopp proaktiv skanning
  - Knapp "Start proaktiv skanning"
  - Fremdriftsindikator per repo
  - Vise resultater fortløpende
- [ ] Ny komponent `ScanResults.jsx` — vise skanningsresultater
  - Liste med foreslåtte issues per repo
  - Mulighet til å godkjenne/avvise individuelle forslag
  - "Opprett alle issues"-knapp
  - "Opprett issue og tilordne til @copilot"-knapp
- [ ] Oppdater `Dashboard.jsx` med ny fane/seksjon for proaktiv skanning
- [ ] Statusindikator: vise når siste skanning ble kjørt

### Fase 5: GitHub Actions – Schedulert kjøring
**Mål:** Automatisk daglig/ukentlig skanning uten manuell innsats

**Oppgaver:**
- [ ] GitHub Actions workflow `.github/workflows/proactive-scan.yml`
  - Cron-schedule (konfigurerbar, f.eks. ukentlig)
  - `workflow_dispatch` for manuell utløsing
- [ ] Skript `scripts/proactive-scan.js` — headless skanningskjøring
  - Itererer gjennom alle brukerens repos
  - Kjører analyse med Copilot Models API
  - Oppretter issues automatisk (med konfigurerbar terskel)
  - Logger resultater til workflow-output
- [ ] Konfigurasjonsfil `scan-config.json` for å styre:
  - Hvilke repos som skal skannes (include/exclude-lister)
  - Minimum prioritetsnivå for å opprette issue (`high`, `medium`, `low`)
  - Maks antall issues per repo per kjøring
  - Hvilke analyse-kategorier som er aktivert

### Fase 6: Avanserte funksjoner
**Mål:** Gjøre verktøyet smartere over tid

**Oppgaver:**
- [ ] Dependency-sjekk: identifiser utdaterte avhengigheter (npm, Gradle)
- [ ] Sikkerhetsanalyse: sjekk for kjente sårbarheter via GitHub Advisory Database
- [ ] Trendanalyse: track repo-utvikling over tid (historisk data)
- [ ] Prioriteringsmotor: rangering av forslag basert på estimert påvirkning
- [ ] Flerspråklig støtte: analyse tilpasset repo-språk (Kotlin/Java, JavaScript/TypeScript, Python)
- [ ] Notifikasjoner: varsle bruker når ny skanning er fullført (e-post, GitHub notification)
- [ ] Multi-bruker: støtte for team-bruk med delt dashboard

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

### Ny filstruktur

```
product-orchestrator/
├── server/
│   ├── index.js                    # Eksisterende API-server (utvides)
│   ├── analyzer.js                 # NY: Utvidet analysemotor
│   ├── copilot-client.js           # NY: Copilot Models API-klient
│   ├── issue-creator.js            # NY: Automatisk issue-opprettelse
│   └── scan-engine.js              # NY: Proaktiv skanningsmotor
├── src/
│   ├── App.jsx                     # Eksisterende (utvides med routing)
│   ├── components/
│   │   ├── Dashboard.jsx           # Eksisterende (utvides med scan-tab)
│   │   ├── RepositoryCard.jsx      # Eksisterende
│   │   ├── ScanControl.jsx         # NY: Start/overvåk skanning
│   │   └── ScanResults.jsx         # NY: Vis og godkjenn forslag
│   └── ...
├── scripts/
│   └── proactive-scan.js           # NY: Headless skanningsskript
├── .github/
│   └── workflows/
│       └── proactive-scan.yml      # NY: Schedulert GitHub Actions workflow
├── scan-config.json                # NY: Skanningskonfigurasjon
├── plan.md                         # DENNE FILEN
└── ...
```

### API-endepunkter (nye)

| Metode | Endepunkt | Beskrivelse |
|--------|-----------|-------------|
| `POST` | `/api/scan/start` | Start proaktiv skanning av alle repos |
| `GET` | `/api/scan/status` | Hent status for pågående skanning |
| `GET` | `/api/scan/results` | Hent resultater fra siste skanning |
| `POST` | `/api/issues/create` | Opprett issue i spesifikt repo |
| `POST` | `/api/scan/create-all-issues` | Opprett alle foreslåtte issues |

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

## Prioritert backlog

| # | Oppgave | Fase | Prioritet | Estimat |
|---|---------|------|-----------|---------|
| 1 | Utvidet repo-innholdsanalyse | Fase 1 | Høy | 2-3 dager |
| 2 | Copilot Models API-integrasjon | Fase 2 | Høy | 2-3 dager |
| 3 | Issue-opprettelse via API | Fase 3 | Høy | 1-2 dager |
| 4 | Frontend scan-kontroll | Fase 4 | Medium | 2-3 dager |
| 5 | GitHub Actions cron-workflow | Fase 5 | Medium | 1 dag |
| 6 | Headless skanningsskript | Fase 5 | Medium | 1-2 dager |
| 7 | Dedup og konfigurasjon | Fase 3/5 | Medium | 1 dag |
| 8 | Dependency-analyse | Fase 6 | Lav | 2-3 dager |
| 9 | Sikkerhets­analyse | Fase 6 | Lav | 2-3 dager |
| 10 | Trendanalyse og historikk | Fase 6 | Lav | 3-5 dager |

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

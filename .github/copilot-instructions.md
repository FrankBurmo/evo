# Copilot Instructions – Evo

## Prosjektoversikt

Evo er en **proaktiv utviklingsassistent** og orkestreringsplattform for produktutvikling. Verktøyet analyserer alle GitHub-repos en bruker eier, gir AI-drevne anbefalinger for hvert produkt, og kan automatisk opprette GitHub Issues med konkrete forbedringsforslag.

**GitHub-repo:** https://github.com/FrankBurmo/evo

---

## Arkitektur

```
React + Vite (frontend)  ←→  Express (backend, port 3001)  ←→  GitHub REST API (Octokit)
                                        ↕
                              GitHub Copilot Models API
                              (https://api.githubcopilot.com/inference/chat/completions)
```

- **Frontend:** React 19 + Vite, custom CSS (ingen CSS-rammeverk)
- **Backend:** Node.js + Express 5, CommonJS (`require`/`module.exports`)
- **GitHub-integrasjon:** `@octokit/rest` for alle GitHub API-kall
- **AI-motor:** GitHub Copilot Models API (GPT-4.1 etc) via brukerens PAT
- **Autentisering:** GitHub Personal Access Token (PAT) — lagres i `localStorage`, sendes som `Authorization`-header til backend

---

## Katalogstruktur

```
server/index.js               – Express API-server — oppsett, middleware, route-montering, graceful shutdown
server/middleware.js           – Express-middleware: requireAuth, errorHandler, notFoundHandler
server/validation.js           – Zod-skjemaer og validate()-middleware for input-validering
server/github.js              – Octokit-helpers: getOctokit, extractToken (case-insensitiv), assignCopilotToIssue
server/analyzer.js            – Fasade-modul — re-eksporterer fra sub-moduler
server/project-detector.js    – Prosjekttypegjenkjenning fra filstruktur
server/file-analyzer.js       – Filtre-henting og analyse via GitHub API
server/recommendation-engine.js – Regelbasert anbefalingsgenerering
server/copilot-client.js      – Copilot Models API-klient — KI-analyse med prosjekttype-prompts, AbortController-timeout
server/templates/              – Issue-body-templates (guardrails, product-dev, eng-velocity, scan)
server/routes/repos.js        – Ruter for repo-analyse (GET /api/repos, /repo/:o/:n, /deep, /ai-analyze)
server/routes/issues.js       – Ruter for issue-opprettelse (create-agent-issue, guardrails, etc.)
server/routes/scan.js         – Ruter for proaktiv skanning (tynn HTTP-lag)
server/services/analysis-service.js – Felles AI-analyse-logikk (deep + AI merge)
server/services/scan-service.js     – Scan-tilstand og kjørelogikk
server/services/issue-service.js    – Felles issue-opprettelseshjelper
packages/core/index.js        – @evo/core — delt kode mellom CLI og server
packages/cli/                  – evo-scan CLI-verktøy
src/App.jsx                    – Root React-komponent, autentiseringsflyt
src/components/                – React-komponenter (Dashboard, panels, cards, modals, scan)
src/styles/                    – CSS-filer (base, komponenter, animasjoner, responsiv)
public/                        – Statiske filer
plan.md                        – Detaljert utviklingsplan og roadmap
```

---

## Kodekonvensjoner

### Generelt
- **Språk i kode:** Engelsk (variabelnavn, funksjonsnavn, kommentarer i kode)
- **Språk i UI/brukervendt tekst:** Norsk
- **Språk i Git commits og issues:** Norsk
- Backend bruker **CommonJS** (`require`, `module.exports`) — ikke ESM
- Frontend bruker **ESM** (`import`/`export`) via Vite

### React (frontend)
- Funksjonelle komponenter med hooks — ingen klassekomponenter
- Props destruktureres direkte i funksjonsparametere
- State håndteres lokalt med `useState`; ingen global state-løsning per nå
- CSS-klasser navngis med kebab-case, definert i `src/styles/`
- Komponenter i `src/components/` eksporteres som default export

### Express (backend)
- Alle API-ruter prefixes med `/api/`
- GitHub-token sendes fra frontend via `Authorization: Bearer <token>`-header, eller hentes fra `process.env.GITHUB_TOKEN`
- Bruk `getOctokit(token)` for å instansiere Octokit-klienten
- Rate limiting er satt opp globalt for `/api/`-ruter
- Feilhåndtering: returner `{ error: 'beskrivelse' }` med passende HTTP-statuskode

### GitHub API-kall
- Bruk alltid `@octokit/rest` — ikke `fetch` direkte mot GitHub API
- Håndter rate limiting og paginering der det er relevant
- Unngå duplikate issues: sjekk eksisterende issues før opprettelse

---

## Nøkkelfunksjoner og mønstre

### AI-analyse via GitHub Copilot Models API
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
      { role: 'system', content: 'Du er en erfaren utvikler...' },
      { role: 'user', content: `Repository: ${repoName}\n...` }
    ]
  })
});
```

### Repo-analyse
- `analyzeRepository(repo)` i `packages/core` utfører rask regelbasert analyse (kun metadata)
- `deepAnalyzeRepo(octokit, repo)` i `server/analyzer.js` (fasade) utfører dyp analyse med GitHub API-kall
- `analyzeRepoFull({octokit, repo, token})` i `server/services/analysis-service.js` kombinerer deep + AI
- `analyzeWithAI(params)` i `server/copilot-client.js` utfører KI-drevet analyse via Copilot Models API
- Returnerer `{ recommendations, deepInsights, aiSummary }` per repo
- Prioriteter: `'high'`, `'medium'`, `'low'`
- Anbefalingstyper: `'documentation'`, `'activity'`, `'community'`, `'visibility'`, `'maintenance'`, `'testing'`, `'ci'`, `'security'`, `'performance'`, `'architecture'`, `'ux'`, `'seo'`, `'accessibility'`
- KI-anbefalinger markeres med `source: 'ai'` for å skille fra regelbaserte

### KI-analyse (server/copilot-client.js)
- Bruker GitHub Copilot Models API med prosjekttypespesifikke prompts
- Støtter prosjekttyper: `web-app`, `android-app`, `api`, `library`, `docs`, `other`
- Token-bucket rate limiting via `@evo/core` RateLimiter (standard: 10 req/min, konfigurerbar via `COPILOT_RATE_LIMIT`)
- Retry-logikk ved 429 og 5xx-feil
- Strukturert JSON-output med robust parsing og validering

### Issue-opprettelse
- Bruk `octokit.issues.create()` med label `['evo-scan']`
- Sjekk alltid eksisterende issues med `octokit.issues.listForRepo()` for å unngå duplikater

---

## Planlagte utvidelser (se plan.md for detaljer)

- **~~AI-drevet kodeanalyse~~** ✅ Ferdig — `server/copilot-client.js` + `server/analyzer.js`
- **~~Automatisk issue-opprettelse~~** ✅ Ferdig — `POST /api/create-agent-issue` + scan-endepunkter
- **Schedulert skanning:** GitHub Actions cron-workflow for daglig/ukentlig analyse
- **~~Copilot Coding Agent-integrasjon~~** ✅ Ferdig — GraphQL-basert tildeling
- **~~Android-spesifikk analyse~~** ✅ Ferdig — Prosjekttypegjenkjenning med tilpassede prompts

---

## Miljøvariabler

| Variabel | Beskrivelse |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub PAT (fallback hvis token ikke sendes fra frontend) |
| `PORT` | Backend-port (standard: `3001`) |
| `COPILOT_MODEL` | AI-modell for KI-analyse (standard: `openai/gpt-4.1`) |
| `COPILOT_RATE_LIMIT` | Maks Copilot API-kall per minutt (standard: `10`) |
| `COPILOT_FETCH_TIMEOUT` | Timeout i ms for Copilot API-kall (standard: `30000`) |

Token kan også legges inn i frontend-UI og lagres i `localStorage`.

---

## Utvikling

```bash
# Start backend (port 3001)
npm run dev

# Start frontend (Vite dev server)
npm run dev:client

# Bygg for produksjon
npm run build
```

Frontend-proxyen er konfigurert i `vite.config.js` til å sende `/api/*`-kall til `http://localhost:3001`.

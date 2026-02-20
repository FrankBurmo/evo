# Copilot Instructions – Product Orchestrator

## Prosjektoversikt

Product Orchestrator er en **proaktiv utviklingsassistent** og orkestreringsplattform for produktutvikling. Verktøyet analyserer alle GitHub-repos en bruker eier, gir AI-drevne anbefalinger for hvert produkt, og kan automatisk opprette GitHub Issues med konkrete forbedringsforslag.

**GitHub-repo:** https://github.com/FrankBurmo/product-orchestrator

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
- **AI-motor:** GitHub Copilot Models API (Claude Sonnet, etc) via brukerens PAT
- **Autentisering:** GitHub Personal Access Token (PAT) — lagres i `localStorage`, sendes som `Authorization`-header til backend

---

## Katalogstruktur

```
server/index.js          – Express API-server (all backend-logikk samlet her foreløpig)
src/App.jsx              – Root React-komponent, autentiseringsflyt
src/components/          – React-komponenter (Dashboard, panels, cards, modals)
src/index.css            – Global CSS
public/                  – Statiske filer
plan.md                  – Detaljert utviklingsplan og roadmap
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
- CSS-klasser navngis med kebab-case, definert i `src/index.css`
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
- `analyzeRepository(repo)` i `server/index.js` utfører regelbasert analyse
- Returnerer `{ recommendations, insights, score, priority }` per repo
- Prioriteter: `'critical'`, `'high'`, `'medium'`, `'low'`
- Anbefalingstyper: `'documentation'`, `'activity'`, `'community'`, `'visibility'`, `'maintenance'`

### Issue-opprettelse
- Bruk `octokit.issues.create()` med label `['product-orchestrator', 'enhancement']`
- Sjekk alltid eksisterende issues med `octokit.issues.listForRepo()` for å unngå duplikater

---

## Planlagte utvidelser (se plan.md for detaljer)

- **AI-drevet kodeanalyse:** Hente og analysere faktisk kildekode, ikke bare repo-metadata
- **Automatisk issue-opprettelse:** Backend oppretter GitHub Issues med AI-forslag direkte
- **Schedulert skanning:** GitHub Actions cron-workflow for daglig/ukentlig analyse
- **Copilot Coding Agent-integrasjon:** Tildele opprettede issues til `@copilot`
- **Android-spesifikk analyse:** Gjenkjenne Android-prosjekter og gi tilpassede anbefalinger

---

## Miljøvariabler

| Variabel | Beskrivelse |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub PAT (fallback hvis token ikke sendes fra frontend) |
| `PORT` | Backend-port (standard: `3001`) |

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

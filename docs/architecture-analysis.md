# Arkitekturanalyse — Dyp Teknisk Gjennomgang av Evo

> **Dato:** Februar 2026  
> **Analysert av:** Copilot Coding Agent  
> **Referanse-issue:** [Arkitekturanalyse] Dyp teknisk gjennomgang av evo

---

## 1. Executive Summary

**Score: 6 / 10**

Evo er en gjennomtenkt og godt strukturert produktutviklingsassistent med tydelig separasjon av ansvar mellom backend (Express), frontend (React + Vite) og CLI. Kodebasen demonstrerer god forretningslogikk, lesbar kode og en solid distribusjonsstrategi. Imidlertid er det kritiske mangler knyttet til **testing** (ingen tester overhodet), **sikkerhetseksponering av GitHub-token via localStorage**, **åpen CORS-konfigurasjon** og **in-memory skannetilstand** som begrenser skalerbarheten. Disse funnene bør utbedres før produksjonsdistribusjon.

---

## 2. Styrker

| Område | Beskrivelse |
|--------|-------------|
| **Modularisering** | Tydelig separasjon mellom `server/routes/`, `server/analyzer.js`, `server/copilot-client.js` og `server/templates.js`. |
| **Rate limiting** | Token-bucket implementasjon i `copilot-client.js` respekterer Copilot API-kvoter. Global `express-rate-limit` på `/api/`-ruter. |
| **Prosjekttypegjenkjenning** | `detectProjectType()` i `analyzer.js` håndterer Android, web, API, library og docs på en strukturert og utvidbar måte. |
| **CLI-støtte** | `packages/cli/` er en selvstendig npm-pakke (`evo-scan`) som muliggjør headless bruk og CI-integrasjon uten backend. |
| **GitHub Actions workflow** | `proactive-scan.yml` er godt strukturert med manuell og schedulert trigger, konfigurerbare inputs og oppsummering i workflow-summary. |
| **Distribusjonsstrategi** | `docs/strategy.md` viser gjennomtenkt faseinndelt strategi (CLI → GitHub App → Docker → Copilot Extension). |
| **JSDoc** | Viktige moduler (`analyzer.js`, `copilot-client.js`, `github.js`) er dokumentert med JSDoc. |
| **Retry-logikk** | `copilot-client.js` har retry ved 429 og 5xx-feil. |

---

## 3. Kritiske Funn

### 🔴 K-1: GitHub-token eksponert i localStorage (XSS-risiko)

**Problem:** `App.jsx` lagrer brukerens GitHub PAT i `localStorage`. Enhver XSS-sårbarhet (f.eks. i tredjepartsbiblioteker eller injisert innhold) vil gi en angriper full tilgang til tokenet.

**Hvorfor det er viktig:** GitHub PAT med `repo`- og `models:read`-scope gir full skrivetilgang til alle brukerens repositories. Dette er OWASP A02:2021 (Cryptographic Failures) / A03:2021 (Injection).

**Løsning:** Bruk `sessionStorage` (kortere levetid) eller — best — en `HttpOnly`-cookie satt av backend etter autentisering:

```javascript
// server/routes/auth.js — eksempel på HttpOnly-cookie-flyt
router.post('/api/auth/token', (req, res) => {
  const { token } = req.body;
  // Valider at tokenet er et gyldig GitHub PAT-format
  if (!token || !/^gh[ps]_[A-Za-z0-9]{36,}$/.test(token)) {
    return res.status(400).json({ error: 'Ugyldig token-format' });
  }
  res.cookie('gh_token', token, {
    httpOnly: true,   // Ikke tilgjengelig via JavaScript
    secure: true,     // Kun over HTTPS
    sameSite: 'Strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 timer
  });
  res.json({ ok: true });
});
```

**Estimert innsats:** Middels

---

### 🔴 K-2: CORS er fullstendig åpen

**Problem:** `server/index.js` bruker `app.use(cors())` uten konfigurasjon, noe som tillater forespørsler fra *alle* opprinnelser.

**Løsning:**

```javascript
// server/index.js
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));
```

**Estimert innsats:** Lav

---

### 🔴 K-3: In-memory skannetilstand — ingen persistens, ingen multi-bruker

**Problem:** `server/routes/scan.js` bruker et globalt `scanState`-objekt i prosessminnet. Dette betyr:
- Skannetilstand mistes ved serverrestart
- Kun én skanning kan kjøre om gangen på tvers av *alle* brukere
- Ikke egnet for produksjonsmiljø

**Løsning:** Kort sikt — bruk en enkel filbasert cache eller Redis. Lang sikt — session-basert isolasjon:

```javascript
// Kort sikt: en Map per session-ID
const scanStates = new Map(); // sessionId -> scanState

router.post('/scan/start', (req, res) => {
  const sessionId = req.headers['x-session-id'] || generateId();
  if (!scanStates.has(sessionId)) {
    scanStates.set(sessionId, createInitialState());
  }
  const state = scanStates.get(sessionId);
  // ...
});
```

**Estimert innsats:** Middels

---

### 🔴 K-4: Ingen tester

**Problem:** Begge `package.json`-filer (rot og `packages/cli/`) har `"test": "echo \"Error: no test specified\" && exit 1"`. Det finnes ingen unit-, integrasjons- eller e2e-tester i hele kodebasen.

**Kritiske funksjoner som trenger tester:**
- `analyzeRepository()` og `detectProjectType()` i `analyzer.js` — kjernelogikk
- `extractToken()` i `github.js` — sikkerhetsrelevant
- `RateLimiter.acquire()` i `copilot-client.js`
- CLI-argumentparsing i `evo-scan.js`

**Løsning (minimalt oppsett):**

```bash
npm install --save-dev vitest
```

```javascript
// server/analyzer.test.js
import { describe, it, expect } from 'vitest';
import { analyzeRepository } from './analyzer.js';

describe('analyzeRepository', () => {
  it('should return high-priority recommendation for repo without README', () => {
    const mockRepo = {
      name: 'test-repo', full_name: 'user/test-repo',
      description: null, homepage: null, private: false,
      stargazers_count: 0, forks_count: 0, open_issues_count: 0,
      language: 'JavaScript', pushed_at: new Date().toISOString(),
      has_issues: true, license: null, topics: [],
    };
    const result = analyzeRepository(mockRepo);
    expect(result.recommendations.some(r => r.type === 'documentation')).toBe(true);
  });
});
```

**Estimert innsats:** Høy

---

### 🔴 K-5: GitHub Actions bruker ikke-eksisterende versjoner

**Problem:** `proactive-scan.yml` refererer til `actions/checkout@v6` og `actions/setup-node@v6`, som ikke finnes (siste stabile er `@v4`). Dette vil føre til feil ved kjøring.

**Løsning:**

```yaml
# .github/workflows/proactive-scan.yml
- uses: actions/checkout@v4       # var: @v6
- uses: actions/setup-node@v4     # var: @v6
  with:
    node-version: '20'
    cache: 'npm'
```

**Estimert innsats:** Lav

---

## 4. Anbefalinger

### 🟡 A-1: Legg til input-validering i alle API-ruter (Høy prioritet)

**Problem:** Ruter som `POST /api/create-agent-issue` validerer at `owner` og `repo` er til stede, men sjekker ikke innholdet. En angriper kan sende vilkårlige strenger som injiseres i issue-body.

**Løsning:** Bruk `express-validator` eller en egendefinert validerings-middleware:

```javascript
// server/middleware/validate.js
function validateRepoParams(req, res, next) {
  const { owner, repo } = req.body;
  // GitHub brukernavn/repo-navn: kun alfanumerisk + bindestrek/understrek
  const safe = /^[a-zA-Z0-9._-]{1,100}$/;
  if (!safe.test(owner) || !safe.test(repo)) {
    return res.status(400).json({ error: 'Ugyldig owner eller repo-navn' });
  }
  next();
}
module.exports = { validateRepoParams };
```

**Estimert innsats:** Lav

---

### 🟡 A-2: Migrer til TypeScript (Middels prioritet)

**Problem:** Hele kodebasen er JavaScript uten type-annotering. Feil som `recommendation.title` på `undefined` oppdages ikke før runtime.

**Løsning — inkrementell TypeScript-migrasjon:**

```bash
npm install --save-dev typescript @types/node @types/express
npx tsc --init
```

```jsonc
// tsconfig.json — gradvis migrasjon
{
  "compilerOptions": {
    "allowJs": true,          // La JS-filer kompileres
    "checkJs": true,          // Type-sjekk i JS med JSDoc
    "strict": false,          // Start mildt
    "outDir": "dist",
    "target": "ES2022",
    "module": "CommonJS"
  }
}
```

**Estimert innsats:** Høy

---

### 🟡 A-3: Legg til Dockerfile for produksjon (Middels prioritet)

**Problem:** `docs/strategy.md` beskriver Docker som en nøkkelkanal for enterprise-adopsjon, men det finnes ingen `Dockerfile` eller `docker-compose.yml` i repoet.

**Løsning:**

```dockerfile
# Dockerfile (multi-stage)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
EXPOSE 3001
ENV NODE_ENV=production
USER node
CMD ["node", "server/index.js"]
```

```yaml
# docker-compose.yml
services:
  evo:
    build: .
    ports:
      - "3001:3001"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - PORT=3001
    restart: unless-stopped
```

**Estimert innsats:** Lav

---

### 🟡 A-4: Konfigurer linter og formatter (Middels prioritet)

**Problem:** Det finnes ingen `.eslintrc` eller `.prettierrc` i kodebasen. Kode-stil er inkonsistent mellom filer (f.eks. `'use strict'` kun i noen backend-filer, varierende bruk av semikolon i JSX).

**Løsning:**

```bash
npm install --save-dev eslint @eslint/js prettier eslint-config-prettier
```

```javascript
// eslint.config.js
import js from '@eslint/js';
export default [
  js.configs.recommended,
  { rules: { 'no-unused-vars': 'warn', 'no-console': 'off' } },
];
```

**Estimert innsats:** Lav

---

### 🟡 A-5: Skill frontend- og backend-avhengigheter (Lav prioritet)

**Problem:** `package.json` blander frontend-avhengigheter (`react`, `react-dom`) med backend-avhengigheter (`express`, `cors`, `express-rate-limit`) i samme `dependencies`-blokk. `react` og `react-dom` bør flyttes til `devDependencies` siden de bundles av Vite og ikke trengs i produksjon på serveren.

**Løsning:**

```json
{
  "dependencies": {
    "@octokit/rest": "^22.0.1",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "express-rate-limit": "^8.2.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1.4",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "vite": "^7.3.1"
  }
}
```

**Estimert innsats:** Lav

---

### 🟢 A-6: Legg til Dependabot for automatisk avhengighetsoppdatering (Lav prioritet)

**Problem:** Det finnes ingen `dependabot.yml` i `.github/`. Avhengigheter som `express@^5.2.1` (Express v5 er fortsatt relativt ny) og `@octokit/rest@^22.0.1` oppdateres ikke automatisk.

**Løsning:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    labels: ["dependencies"]
  - package-ecosystem: "npm"
    directory: "/packages/cli"
    schedule:
      interval: "weekly"
    labels: ["dependencies", "cli"]
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

**Estimert innsats:** Lav

---

## 5. Teknisk Gjeld

| ID | Beskrivelse | Alvorlighetsgrad | Estimert innsats |
|----|-------------|-----------------|-----------------|
| TD-1 | Ingen tester — 0% kodedekning | Kritisk | Høy (2–4 uker) |
| TD-2 | JavaScript uten type-sikkerhet | Høy | Høy (iterativt) |
| TD-3 | In-memory scan-tilstand | Høy | Middels (3–5 dager) |
| TD-4 | Token i localStorage | Kritisk | Middels (2–3 dager) |
| TD-5 | Åpen CORS | Høy | Lav (1–2 timer) |
| TD-6 | Feil Actions-versjoner i CI | Kritisk | Lav (30 min) |
| TD-7 | Ingen Docker-støtte | Middels | Lav (1–2 dager) |
| TD-8 | Ingen linter/formatter | Middels | Lav (2–4 timer) |
| TD-9 | Frontend/backend-avhengigheter blandet | Lav | Lav (1 time) |
| TD-10 | `vite.config.js` hardkodet base-path | Lav | Lav (30 min) |

---

## 6. Veikart — Prioritert Implementeringsrekkefølge

### 🔴 Sprint 1 — Sikkerhet og CI (1 uke)

1. **[K-5]** Fiks GitHub Actions versjoner (`@v6` → `@v4`) — 30 min
2. **[K-2]** Begrens CORS til tillatte opprinnelser — 2 timer
3. **[A-1]** Legg til input-validering i alle ruter — 4 timer
4. **[K-1]** Flytt token-håndtering fra localStorage til `sessionStorage` (kortsiktig) → HttpOnly-cookie (langsiktig) — 1–2 dager
5. **[A-5]** Flytt React-avhengigheter til `devDependencies` — 1 time

### 🟡 Sprint 2 — Stabilitet og DevOps (2 uker)

6. **[K-3]** Implementer session-isolert skannetilstand — 3–5 dager
7. **[A-3]** Legg til `Dockerfile` og `docker-compose.yml` — 1–2 dager
8. **[A-4]** Konfigurer ESLint og Prettier — 4 timer
9. **[A-6]** Legg til `dependabot.yml` — 1 time
10. **[A-2]** Start TypeScript-migrasjon med `checkJs: true` og JSDoc-types — iterativt

### 🟢 Sprint 3 — Testdekning (2–4 uker)

11. **[K-4]** Sett opp Vitest og skriv enhetstester for `analyzer.js`, `github.js` og CLI
12. Mål: ≥ 70% kodedekning for serverlogikk

### 🔵 Sprint 4 — Arkitekturelle forbedringer (løpende)

13. Full TypeScript-migrasjon
14. Persistens for skannetilstand (Redis eller SQLite)
15. GitHub App-autentisering (erstatter PAT) — se `docs/strategy.md`

---

## Analysedekning

| Område | Status |
|--------|--------|
| 1. Overordnet arkitektur | ✅ Dekket |
| 2. Kodekvalitet | ✅ Dekket |
| 3. Avhengigheter og pakker | ✅ Dekket |
| 4. Testing | ✅ Dekket |
| 5. Sikkerhet | ✅ Dekket |
| 6. Ytelse | ✅ Dekket |
| 7. DevOps og CI/CD | ✅ Dekket |
| 8. Dokumentasjon | ✅ Dekket |

---

*Rapporten ble generert av Copilot Coding Agent basert på analyse av kodebasen per februar 2026.*

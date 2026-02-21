# Evo – Distribusjonsstrategi for bred adopsjon

> **Dato:** Februar 2026  
> **Mål:** Maksimal adopsjon blant utviklere og organisasjoner

---

## Kontekst og premisser

Evo er en proaktiv utviklingsassistent som:
- Leser og analyserer brukerens/org. GitHub-repos via GitHub API
- Kaller GitHub Copilot Models API for AI-drevet analyse
- Oppretter GitHub Issues automatisk basert på analysefunn
- Krever et GitHub Personal Access Token (PAT) med `repo`- og `models:read`-scope

Dette gjør distribusjon ikke-trivielt: verktøyet trenger **tilgang til sensitiv infrastruktur** (tokens, repoinnhold, org-data). Valg av distribusjonsmodell er derfor avgjørende for om organisasjoner tør å ta i bruk Evo.

---

## De syv distribusjonsmodellene

| # | Modell | Kort beskrivelse |
|---|--------|------------------|
| A | **Ren SaaS** | Evo-teamet hoster alt. Bruker logger inn med GitHub OAuth. |
| B | **GitHub App (Marketplace)** | GitHub App installeres i org. Backend hostes av Evo-teamet. |
| C | **Hybrid: Hostet frontend + self-hosted backend** | Evo-teamet hoster kun React-UI. Org kjører Express-backend selv. |
| D | **Fullstendig self-hosted (Docker)** | Org kjører hele stacken selv via Docker Compose / Helm. |
| E | **GitHub Action** | Headless modus: workflow i org-repo som trigger Evo-logikken. |
| F | **CLI-verktøy (npm-pakke)** | `npx evo-scan` – kjøres lokalt eller i CI. |
| G | **GitHub Copilot Extension** | Evo som Copilot Chat-utvidelse via `@evo`-agent. |

---

## Detaljert matrise

### Modell A – Ren SaaS

```
Bruker → evo.app → GitHub OAuth → Evo backend → GitHub API + Copilot API
```

| Dimensjon | Vurdering |
|-----------|-----------|
| **Friksjon for bruker** | ✅ Svært lav – bare logg inn med GitHub |
| **Friksjon for org-admin** | ⚠️ Medium – admin må godkjenne OAuth-app |
| **Token-eksponering** | ❌ Høy – GitHub-token håndteres av ekstern part |
| **Datakontroll** | ❌ Ingen – repo-innhold analyseres av Evo-servere |
| **GDPR/compliance** | ❌ Vanskelig – data forlater org, krever DPA-avtale |
| **Enterprise-aksept** | ❌ Lav – vil bli blokkert hos compliance-sensitive org |
| **Vedlikeholdskostnad** | ❌ Høy – Evo-teamet betaler for hosting, skalering |
| **Utvikling/oppdateringer** | ✅ Enkel – deployer til én instans |
| **Mulighet for bredest adopsjon** | ⚠️ Kun individuelle utviklere og startups |

**Konklusjon:** Raskest å lansere, men mister enterprise-segmentet fullstendig. Ikke egnet som eneste modell.

---

### Modell B – GitHub App (Marketplace)

```
Org installerer GitHub App → GitHub OAuth-flow → Evo-backend (hostet av Evo)
→ GitHub API via installasjons-token (ikke PAT)
```

GitHub Apps bruker **installasjonstokens** (kortlevde, begrenset scope) i stedet for brukerens PAT. Org-admin velger eksplisitt hvilke repos appen får tilgang til.

| Dimensjon | Vurdering |
|-----------|-----------|
| **Friksjon for bruker** | ✅ Svært lav – "Install"-knapp på GitHub Marketplace |
| **Friksjon for org-admin** | ✅ Lav – standard GitHub App-installasjon med granulære permissions |
| **Token-eksponering** | ✅ God – kortlevde installasjonstokens, ikke brukerens PAT |
| **Datakontroll** | ⚠️ Medium – innhold sendes til Evo-backend, men kontrollert scope |
| **GDPR/compliance** | ⚠️ Krever DPA, men permissions er transparente og revokable |
| **Enterprise-aksept** | ✅ God – kjent GitHub-mønster (Dependabot, CodeClimate etc.) |
| **Vedlikeholdskostnad** | ⚠️ Medium – Evo-teamet betaler hosting, men infrastruktur deles |
| **Utvikling/oppdateringer** | ✅ Enkel – deployer til én backend |
| **Mulighet for bredest adopsjon** | ✅ Best for individuelle og SMB |
| **Mulighet for monetisering** | ✅ GitHub Marketplace støtter betalte planer |
| **Discoverability** | ✅ Svært høy – synlig i GitHub Marketplace |

**Konklusjon:** Den sterkeste modellen for rask og bred adopsjon. Industristandard for GitHub-integrerte verktøy. Krever seriøs backend-hosting.

---

### Modell C – Hybrid: Hostet frontend + self-hosted backend

```
Evo hoster React-UI → Bruker/org kjører Express-backend lokalt/internt
→ Frontend kommuniserer med lokal backend via konfigurert URL
```

| Dimensjon | Vurdering |
|-----------|-----------|
| **Friksjon for bruker** | ❌ Høy – må sette opp backend selv, konfigurere CORS, URL |
| **Friksjon for org-admin** | ❌ Høy – krever ops-kompetanse |
| **Token-eksponering** | ✅ God – token forlater aldri org |
| **Datakontroll** | ✅ Høy – backend kjører internt |
| **GDPR/compliance** | ✅ Enklere – data forblir i org |
| **Enterprise-aksept** | ⚠️ Medium – noen vil synes dette er komplisert |
| **Vedlikeholdskostnad** | ✅ Lav for Evo-teamet |
| **Utvikling/oppdateringer** | ⚠️ Versjonering er komplisert: frontend og backend må holdes i sync |
| **Mulighet for bredest adopsjon** | ❌ Dårlig – høy friksjon stopper de fleste |
| **Teknisk kobling** | ❌ Dårlig separation of concerns – frontend er avhengig av tilgjengelig backend-URL |

**Konklusjon:** Løser ingenting egentlig – flytter friksjon til brukeren uten å gi dem full kontroll. Worst of both worlds. **Ikke anbefalt som primærmodell.**

---

### Modell D – Fullstendig self-hosted (Docker)

```
Org kjører docker compose up evo
→ Hele stacken (frontend + backend) internt
→ Ingen data forlater org
```

| Dimensjon | Vurdering |
|-----------|-----------|
| **Friksjon for bruker** | ⚠️ Medium – krever Docker, én kommando |
| **Friksjon for org-admin** | ✅ Akseptabel for org med DevOps-team |
| **Token-eksponering** | ✅ Excellent – token håndteres kun internt |
| **Datakontroll** | ✅ Excellent – full kontroll |
| **GDPR/compliance** | ✅ Excellent – data forblir i org-infrastruktur |
| **Enterprise-aksept** | ✅ Høy – kjent mønster (GitLab, Grafana, Plane etc.) |
| **Vedlikeholdskostnad** | ✅ Minimal for Evo-teamet |
| **Oppdateringer** | ⚠️ Org må aktivt oppdatere container-image |
| **Mulighet for bredest adopsjon** | ⚠️ Avhengig av org-type – perfekt for enterprise, ikke for enkeltpersoner |

**Konklusjon:** Kritisk viktig for enterprise-segmentet og compliance-tunge sektorer (finans, helse, forsvar). Bør tilbys som Enterprise-tier.

---

### Modell E – GitHub Action

```
.github/workflows/evo-scan.yml i org-repo
→ Kjøres av GitHub Actions (runner i org eller GitHub-hostet)
→ Bruker GITHUB_TOKEN (automatisk utstedt, ingen PAT trengs)
→ Oppretter issues direkte i workflowen
```

```yaml
name: Evo – Proaktiv repo-skanning
on:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:

jobs:
  evo-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: FrankBurmo/evo-action@v1
        with:
          model: 'openai/gpt-4.1'
          min-priority: 'medium'
          create-issues: true
```

| Dimensjon | Vurdering |
|-----------|-----------|
| **Friksjon for bruker** | ✅ Lav – kopier workflow-YAML |
| **Friksjon for org-admin** | ✅ Lav – bare tillat action i org-policy |
| **Token-eksponering** | ✅ Excellent – bruker `GITHUB_TOKEN` som er auto-utstedt |
| **Datakontroll** | ✅ Høy – kjøres på GitHub-hostet eller org-hostet runner |
| **GDPR/compliance** | ✅ God – GitHub håndterer secrets, ingen tredjepartsserver |
| **Enterprise-aksept** | ✅ Høy – GitHub Actions er allment akseptert |
| **Vedlikeholdskostnad** | ✅ Svært lav for Evo-teamet |
| **Dashboard/UI** | ❌ Ingen – headless kun |
| **Discoverability** | ✅ GitHub Actions Marketplace |
| **Mulighet for bredest adopsjon** | ✅ Svært bred – lav friksjon, kjent mønster |

**Konklusjon:** Ideelt som tilleggskanal for den automatiske/schedulerte skanningsfunksjonen. Noen vil foretrekke dette fremfor et dashbord. Lav overhead.

---

### Modell F – CLI-verktøy (npm-pakke)

```
npx evo-scan --token $GITHUB_TOKEN --model gpt-4.1
```

| Dimensjon | Vurdering |
|-----------|-----------|
| **Friksjon for bruker** | ✅ Svært lav for utviklere |
| **Friksjon for org-admin** | ✅ Lav – ingen server, ingen installasjon |
| **Token-eksponering** | ✅ God – data forlater ikke org-nettverket |
| **Datakontroll** | ✅ God |
| **GDPR/compliance** | ✅ Enkel – ingen hosting |
| **Enterprise-aksept** | ✅ Høy – kjent mønster (ESLint, Dependabot CLI etc.) |
| **Dashboard/UI** | ❌ Ingen |
| **Vedlikeholdskostnad** | ✅ Minimal |
| **Discoverability** | ⚠️ Medium – npm og GitHub |
| **Mulighet for bredest adopsjon** | ✅ God – spesielt for DevOps-team og CI-integrasjon |

**Konklusjon:** Kraftig supplement som lowfriction entry-point. Bygger tillit siden verktøyet er åpen kildekode og kjøres lokalt.

---

### Modell G – GitHub Copilot Extension

```
@evo scan repos for improvements
@evo create issues for my-repo
```

Registreres som Copilot Extension og er tilgjengelig i VS Code, GitHub.com og GitHub Mobile.

| Dimensjon | Vurdering |
|-----------|-----------|
| **Friksjon for bruker** | ✅ Absolutt null – brukes der de allerede er |
| **Friksjon for org-admin** | ⚠️ Medium – org må aktivere extensions |
| **Token-eksponering** | ✅ God – GitHub håndterer auth |
| **Datakontroll** | ⚠️ Data sendes til Copilot-infrastruktur |
| **Enterprise-aksept** | ✅ Høy – Copilot er allerede enterprise-godkjent mange steder |
| **Vedlikeholdskostnad** | ⚠️ Krever Copilot Extension-backend (men liten) |
| **Modenhet** | ⚠️ Extensions API er relativt nytt (2024-) |
| **Discoverability** | ✅ Høy – GitHub Marketplace + Copilot Chat |
| **Mulighet for bredest adopsjon** | ✅ Svært høy fremover – Copilot er i massiv vekst |

**Konklusjon:** Fremtidsstrategi med høy potensiell adopsjon. Bør bygges som et later-stage supplement.

---

## Samlet sammenligningsmatrise

| Modell | Friksjon | Token-sikkerhet | Enterprise | Adopsjon SMB | Adopsjon Enterprise | Maint.kostnad | Discoverability | Samlet score |
|--------|----------|-----------------|------------|--------------|---------------------|---------------|-----------------|-------------|
| **A – SaaS** | ✅ Lav | ❌ | ❌ | ✅✅ | ❌ | ❌ Høy | ✅ God | ⭐⭐ |
| **B – GitHub App** | ✅ Lav | ✅ God | ✅ God | ✅✅ | ✅ God | ⚠️ Medium | ✅✅ Høy | ⭐⭐⭐⭐⭐ |
| **C – Hybrid** | ❌ Høy | ✅ | ⚠️ | ❌ | ⚠️ | ✅ Lav | ❌ | ⭐ |
| **D – Docker** | ⚠️ Medium | ✅✅ | ✅✅ | ❌ | ✅✅ | ✅ Lav | ⚠️ Lav | ⭐⭐⭐⭐ |
| **E – GitHub Action** | ✅ Lav | ✅✅ | ✅ God | ✅ | ✅ God | ✅ Lav | ✅✅ Høy | ⭐⭐⭐⭐ |
| **F – CLI** | ✅ Lav | ✅ | ✅ | ✅ | ✅ | ✅ Lav | ⚠️ Medium | ⭐⭐⭐ |
| **G – Copilot Ext** | ✅✅ Null | ✅ | ✅ God | ✅✅ | ✅✅ | ⚠️ Medium | ✅✅ Høy | ⭐⭐⭐⭐⭐ (fremtid) |

---

## Anbefalt strategi: Lagdelt distribusjonsmodell

Svaret er ikke én modell – det er en **faseoppdelt strategi** som legger til distribusjonslag ettersom Evo modnes.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FASE 1 (Nå → 3 mnd)                         │
│                    "Kom i gang, bygg tillit"                        │
│                                                                     │
│   [F] CLI-verktøy (npx evo-scan)   +   [E] GitHub Action           │
│                                                                     │
│   • Null hosting-kostnad for Evo-teamet                             │
│   • Token forlater aldri tredjepart → høy tillit                    │
│   • Kode er åpen kildekode → granskes av security-folk              │
│   • Raskt å se verdi uten å måtte ha et UI                          │
│   • Bygger brukerbasen og gir feedback                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FASE 2 (3–9 mnd)                             │
│                 "Bred adopsjon via GitHub-plattformen"               │
│                                                                     │
│              [B] GitHub App på GitHub Marketplace                   │
│                                                                     │
│   • Dashboard + proaktiv skanning med én-klikk-installasjon         │
│   • Granulære permissions – org-admin velger repo-tilgang           │
│   • Kortlevde installasjonstokens – ikke brukerens PAT              │
│   • Industristandard (Dependabot, Renovate, CodeClimate)            │
│   • Synlig i Marketplace – built-in discoverability                 │
│   • Muliggjør fremtidig monetisering via Marketplace                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FASE 3 (9–18 mnd)                             │
│              "Enterprise-adopsjon og compliance-segmentet"          │
│                                                                     │
│              [D] Self-hosted Docker / Helm-chart                    │
│                                                                     │
│   • docker compose up – alt kjøres internt                          │
│   • Data forlater aldri organisasjonen                              │
│   • GDPR, SOC2, FedRAMP: ingen problemer                            │
│   • Air-gapped environments støttes                                  │
│   • Målrettet mot finans, helse, forsvar og offentlig sektor        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FASE 4 (18+ mnd)                              │
│                   "Innebygd der folk allerede jobber"                │
│                                                                     │
│           [G] GitHub Copilot Extension (@evo i chat)                │
│                                                                     │
│   • Neste generasjon developer experience                           │
│   • @evo scan / @evo create-issues – direkte i editor/GitHub.com    │
│   • Treffer alle Copilot-brukere (millioner av devs)                │
│   • Utnytter eksisterende Copilot-abonnement i org                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Spesifikt svar: Bør du hoste frontenden og la org kjøre backend?

**Nei – ikke som primærmodell.** Hybrid-modellen (C) er det minst attraktive alternativet:

1. **Løser ikke sikkerhetsproblemet** – backend-serveren har fortsatt tilgang til token og repo-data, selv om den er "selvhostet"
2. **Øker friksjon dramatisk** – org må sette opp og vedlikeholde en backend-server
3. **Versjonerings-helvete** – frontend og backend må være kompatible, noe som er vanskeligere å håndtere
4. **Mange vil gi opp under onboarding** – oppsettprosessen dreper adopsjon

Det orgs faktisk vil ha er enten:
- **Null-friksjon** (GitHub App / Copilot Extension): "Installer og glem"
- **Full kontroll** (Docker self-hosted): "Alt kjøres hos oss"

Det eksisterer ingen attraktiv mellomting.

---

## Teknisk veikart for fasene

### Fase 1: CLI + GitHub Action

**`packages/cli/`** – npm-pakke publisert til npmjs.com
```
evo-cli/
├── bin/evo.js          – CLI entry point
├── src/
│   ├── scan.js         – Skanningslogikk (fra server/analyzer.js)
│   ├── copilot.js      – Copilot Models API-klient
│   └── issues.js       – Issue-opprettelse
├── package.json        – bin: { "evo": "./bin/evo.js" }
└── README.md
```

```bash
npx evo-scan --owner FrankBurmo --token $GITHUB_TOKEN --create-issues
```

**`.github/actions/evo-scan/`** – GitHub Action (composite)
```yaml
# action.yml
name: 'Evo – Repo Scanner'
runs:
  using: 'node20'
  main: 'dist/index.js'
```

### Fase 2: GitHub App

- Registrer GitHub App under `github.com/settings/apps`
- Implementer OAuth-flow i `server/auth.js`
- Bytt fra PAT til installasjonstoken via `octokit.auth()`
- Minimum permissions: `contents:read`, `issues:write`, `models:read`
- Deploy backend til f.eks. Railway, Render eller Azure App Service
- Publiser til GitHub Marketplace med logo og beskrivelse

### Fase 3: Self-hosted Docker

```dockerfile
# Dockerfile (multi-stage)
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 3001
CMD ["node", "server/index.js"]
```

```yaml
# docker-compose.yml
services:
  evo:
    image: ghcr.io/frankburmo/evo:latest
    ports:
      - "3001:3001"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - PORT=3001
```

**Lansering:** Publiser image til GitHub Container Registry (`ghcr.io`). Lag Helm chart for Kubernetes-miljøer.

### Fase 4: Copilot Extension

Registreres via GitHub Apps med `copilot` capability:
```json
{
  "copilot": {
    "chat": {
      "enabled": true,
      "agent": {
        "url": "https://api.evo.app/copilot",
        "event_handlers": [...]
      }
    }
  }
}
```

---

## Risiko og mitigering

| Risiko | Sannsynlighet | Konsekvens | Mitigering |
|--------|--------------|-----------|-----------|
| Org blokkerer GitHub App-installasjon | Medium | Høy | Tilby self-hosted Docker som alternativ |
| GitHub Marketplace-godkjenning tar lang tid | Høy | Medium | Start med direkte install-URL, Marketplace parallelt |
| Hosting-kostnader for GitHub App-backend | Medium | Medium | Start på gratis tier (Railway/Render), skalér gradvis |
| Versjonerings-kompleksitet mellom tiers | Medium | Medium | Semantic versioning, changelog – Docker og CLI tagges likt |
| Copilot Extensions API endres | Medium | Lav | Bygg sent, etter API er stabilt |
| GitHub PAT-krav er en adopsjonsblokkerer | Høy | Høy | Gå over til GitHub App installasjonstoken så tidlig som mulig |

---

## Åpen kildekode som adopsjonsstrategi

**Kodebasen bør være åpen kildekode (MIT eller Apache 2.0).** Dette er en av de viktigste enkeltstående beslutningene for adopsjon:

1. **Tillit:** Sikkerhets-teams kan se hva koden faktisk gjør med tokenet
2. **Adopsjons-friksjon:** Mange organisasjoner kan ikke bruke closed-source tools uten lengre juridisk vurdering
3. **Community-bidrag:** Andre vil fikse bugs, legge til integrasjoner, og markedsføre verktøyet
4. **GitHub-native:** GitHub er åpen kildekode-plattformen – det er kulturelt forventet
5. **Copilot-synergi:** "Evo ble bygget med Copilot og analyserer repos for Copilot-brukere" er en sterk story

**Monetisering med åpen kildekode:**
- Åpen kode + hostet SaaS/GitHub App: "Open core"-modellen (GitLab, Grafana, Plane)
- Enterprise-lisens for self-hosted med støtte og avanserte features
- GitHub Marketplace betalte planer

---

## Prioritert handlingsliste

| Prioritet | Tiltak | Hvorfor nå |
|-----------|--------|------------|
| 🔴 1 | Gjør repo offentlig, legg til MIT-lisens | Tillit er grunnlaget for adopsjon |
| 🔴 2 | Bygg CLI-pakke (`npx evo-scan`) | Laveste friksjon, null hosting-kostnad |
| 🔴 3 | Bygg GitHub Action (`FrankBurmo/evo-action@v1`) | Treffer CI/CD-workflows direkte |
| 🟡 4 | Registrer GitHub App, implementer installasjonstoken | Rydder opp i PAT-problemet |
| 🟡 5 | Lanser på GitHub Marketplace (gratis tier) | Discoverability |
| 🟡 6 | Docker-image til ghcr.io | Enterprise-segmentet |
| 🟢 7 | Helm chart for Kubernetes | Modne enterprise-kunder |
| 🟢 8 | Copilot Extension | Fremtidssikring |

---

## Konklusjon

**Bredest mulig adopsjon krever en lagdelt strategi – ikke én enkelt distribusjonsmodell.**

Den anbefalte tilnærmingen er:

> **Fase 1:** Åpen kildekode + CLI + GitHub Action → Bygg tillit og brukerbas  
> **Fase 2:** GitHub App på Marketplace → Bred, lavfriks adopsjon  
> **Fase 3:** Docker self-hosted → Enterprise og compliance-kunder  
> **Fase 4:** Copilot Extension → Integrasjon der folk allerede jobber  

Den hybride modellen (hostet frontend + self-hosted backend) bør **ikke** prioriteres – den gir verken lavest friksjon eller best sikkerhet, og er den modellen med dårligst adopsjonspotensial.

Nøkkelinnsikten er at de fleste organisasjoner er enten **convenience-first** (GitHub App) eller **control-first** (Docker). Evo må møte begge på deres egne premisser.

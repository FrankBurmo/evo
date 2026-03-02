/**
 * Engineering Velocity issue-templates.
 *
 * Keys: cicd-maturity, dora-assessment, observability, release-hygiene, community-health
 */
import type { IssueTemplate } from '../types';

export const ENGINEERING_VELOCITY_TEMPLATES: Record<string, (repoName: string) => IssueTemplate> =
  {
    'cicd-maturity': (repoName) => ({
      title: `[CI/CD-modenhet] Pipeline-analyse av ${repoName}`,
      labels: ['copilot:run', 'ci-cd', 'engineering-velocity'],
      body: `## ⚙️ CI/CD-modenhet Analyse

Dette issuet ble automatisk opprettet av **Evo** og ber om en grundig gjennomgang av CI/CD-pipelines og leveranseprosessen i dette repositoryet.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren DevOps-ingeniør og platform engineer**, analyser hele CI/CD-oppsettet i dette repositoryet og vurder modenheten opp mot bransjestandarder i 2026.

### 🔍 Analysér følgende områder:

1. **Pipeline-arkitektur og struktur**
   - Gjennomgå alle workflow-filer (GitHub Actions, Jenkins, GitLab CI, etc.)
   - Vurder stage-inndeling: build → test → lint → security scan → deploy
   - Identifiser manglende gater og steg
   - Parallellisering og cachingstrategi

2. **Testautomatisering og kvalitetsgater**
   - Testdekning i pipeline (unit, integration, e2e)
   - Threshold for testdekning — avvisning ved for lav dekning
   - Static analysis og linting automatisering
   - SAST/DAST-integrasjon (sikkerhetsskanning)

3. **Deployment og release-strategi**
   - Deployment-strategi: blue/green, canary, rolling update?
   - Feature flags og gradvis utrulling
   - Automatisk rollback ved feil
   - Miljøhåndtering (dev/staging/prod)

4. **Flaskehalser og optimaliseringer**
   - Gjennomsnittlig pipeline-kjøretid — estimer nåværende
   - Cachingstrategi for avhengigheter og build-artefakter
   - Matrix builds og parallelisering
   - Self-hosted runners vs. GitHub-hosted

5. **CI/CD-sikkerhet (supply chain)**
   - Pinning av action-versjoner (SHA vs. tag)
   - Secrets-håndtering og miljøvariabler
   - OIDC vs. statiske credentials
   - Dependency review og Dependabot-konfigurasjon

---

### 📊 Forventet Output

1. **Modenhetsscore** — 1-5 skala (Ad-hoc → Elite) med begrunnelse
2. **Kritiske mangler** — Ting som bør fikses umiddelbart
3. **Topp 5 forbedringsforslag** — Rangert etter ROI (effekt vs. innsats)
4. **Konkrete workflow-eksempler** — Klar-til-bruk YAML for topp 3 forbedringer
5. **Estimert tidsgevinst** — Beregnet reduksjon i pipeline-tid etter optimaliseringer

### ✅ Akseptansekriterier

- [ ] Alle 5 analyseområder er dekket
- [ ] Modenhetsvurdering med konkrete kriterier
- [ ] Minimum 3 komplette YAML-eksempler klar til implementering
- [ ] Estimert tidsgevinst for foreslåtte optimaliseringer

---

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`cicd-maturity\`*
`,
    }),

    'dora-assessment': (repoName) => ({
      title: `[DORA-analyse] Leveransehastighet-vurdering av ${repoName}`,
      labels: ['copilot:run', 'dora-metrics', 'engineering-velocity'],
      body: `## 📊 DORA-metrikker & Leveransehastighet

Dette issuet ble automatisk opprettet av **Evo** og ber om en DORA-basert vurdering av leveransepraksis i dette repositoryet.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren engineering manager og DevOps-forsker**, analyser dette repositoryet opp mot de 5 DORA-metrikkene (slik definert i 2025 State of DevOps Report) og foreslå konkrete tiltak for å nå elite-nivå.

### 🔍 De 5 DORA-metrikkene:

1. **Deployment Frequency** *(Leveransehyppighet)*
   - Analyser commit- og release-mønstre fra repo-historikk
   - Estimer nåværende deployment-frekvens
   - Elite-benchmark: On demand (multiple per dag)
   - Hva hindrer hyppigere deployments?

2. **Lead Time for Changes** *(Ledetid for endringer)*
   - Tidsrommet fra commit til produksjon
   - Identifiser ventetider: PR-review, CI-kjøretid, manuell godkjenning
   - Elite-benchmark: Under 1 time
   - Spesifikke flaskehalser i dette repoet

3. **Change Failure Rate** *(Endrings-feilrate)*
   - Andel deployments som krever hotfix eller rollback
   - Analyser test-dekning og testpraksis som indikator
   - Elite-benchmark: Under 2%
   - Tiltak for å redusere feilrate

4. **Failed Deployment Recovery Time** *(MTTR)*
   - Tid fra feil oppdages til service er gjenopprettet
   - Finnes det runbooks, automatisk rollback, alerting?
   - Elite-benchmark: Under 1 time
   - Beredskapsplan og incident response-prosess

5. **Rework Rate** *(Omarbeidingsrate — ny i 2024)*
   - Uplanlagte deployments for å fikse brukersynlige bugs
   - Elite-benchmark: Under 2%
   - Tiltak for å redusere teknisk gjeld og bug-rate

---

### 📊 Forventet Output

1. **DORA-scorecard** — Alle 5 metrikker vurdert som Elite/High/Medium/Low
2. **Nåværende benchmark** — Estimert posisjon basert på repoets praksis
3. **Gap-analyse** — Avstand til elite for hver metrikk
4. **Prioriterte tiltak** — Top 3 endringer med størst DORA-forbedring
5. **Instrumenteringsplan** — Hvordan mål DORA-metrikker i dette repoet konkret

### ✅ Akseptansekriterier

- [ ] Alle 5 DORA-metrikker vurdert
- [ ] Nåværende og mål-benchmark definert
- [ ] Minimum 5 konkrete forbedringstiltak med estimert innvirkning
- [ ] Konkret instrumenteringsplan med kodeksempler

---

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`dora-assessment\`*
`,
    }),

    'observability': (repoName) => ({
      title: `[Observability] Monitorering og synlighets-analyse av ${repoName}`,
      labels: ['copilot:run', 'observability', 'engineering-velocity'],
      body: `## 🔭 Observability & Monitorering

Dette issuet ble automatisk opprettet av **Evo** og ber om en grundig vurdering av observability-implementasjonen i dette repositoryet.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren SRE (Site Reliability Engineer)**, analyser observability-praksisen i dette repositoryet basert på OpenTelemetry-standarder og Google SRE-boken.

### 🔍 Analysér følgende områder (de 3 pillarene):

1. **Logging**
   - Strukturert logging (JSON) vs. plaintext
   - Log-nivåer brukt korrekt (DEBUG/INFO/WARN/ERROR)
   - Korrelasjon-ID for request tracing
   - Sensitivt data i logger (GDPR-hensyn)
   - Log-aggregering og søkbarhet

2. **Metrikker**
   - Applikasjons-metrikker eksponert (Prometheus, OpenTelemetry)
   - RED-metrikker: Rate, Errors, Duration for alle tjenester
   - USE-metrikker: Utilization, Saturation, Errors for infrastruktur
   - Custom business metrics
   - Alerting-regler og thresholds

3. **Tracing (Distributed)**
   - Distributed tracing implementert (OpenTelemetry, Jaeger, Zipkin)?
   - Span-dekning på tvers av tjenestelaget
   - Context propagation for async operasjoner
   - Sampling-strategi

4. **SLI/SLO/SLA-definisjon**
   - Definerte Service Level Indicators (SLI)
   - Service Level Objectives (SLO) med feilbudsjett
   - Alerting på SLO-brudd
   - Runbooks for vanlige feilsituasjoner

5. **Dashboards og beredskap**
   - Finnes observability-dashboard (Grafana, Datadog, etc.)?
   - On-call rutiner og incident response
   - Post-mortem praksis
   - Kaos-engineering og resilience testing

---

### 📊 Forventet Output

1. **Observability-modenhetsscore** — 1-5 (Blind → Full Observability)
2. **Kritiske blinde flekker** — Hva er usynlig i produksjon i dag?
3. **OpenTelemetry-implementasjonsplan** — Klar-til-bruk kode for instrumentering
4. **SLO-forslag** — Konkrete SLI/SLO-definisjoner tilpasset dette repoet
5. **Dashboard-template** — Foreslått Grafana/Datadog-konfigurasjon

### ✅ Akseptansekriterier

- [ ] Alle 5 analyseområder dekket
- [ ] OpenTelemetry-kodeeksempler for dette repoets stack
- [ ] Minimum 3 konkrete SLO-definisjoner
- [ ] Prioritert liste over observability-investeringer

---

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`observability\`*
`,
    }),

    'release-hygiene': (repoName) => ({
      title: `[Release-hygiene] Versjonering og release-prosess i ${repoName}`,
      labels: ['copilot:run', 'release-management', 'engineering-velocity'],
      body: `## 🏷️ Release-hygiene & Versjonering

Dette issuet ble automatisk opprettet av **Evo** og ber om en gjennomgang av release-praksis og versjonering i dette repositoryet.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren release engineer og platform architect**, gjennomgå release-praksisen i dette repositoryet og anbefal forbedringer som gjør releases tryggere, raskere og mer forutsigbare.

### 🔍 Analysér følgende områder:

1. **Versjonering og SemVer**
   - Brukes Semantic Versioning (MAJOR.MINOR.PATCH) korrekt?
   - Automatisk versjonsøkning (Conventional Commits, semantic-release)?
   - Git-tagging-praksis
   - Pre-release og release candidate håndtering

2. **Branching-strategi**
   - Nåværende strategi: Git Flow, GitHub Flow, Trunk-Based Development?
   - Er strategien dokumentert og fulgt konsekvent?
   - Long-lived branches og merge-konflikter
   - Feature branches og livslengde

3. **Changelog og release notes**
   - Vedlikeholdes CHANGELOG.md?
   - Automatisk generering fra Conventional Commits?
   - Kvaliteten på release notes for sluttbrukere
   - Breaking change-kommunikasjon

4. **Feature Flags**
   - Brukes feature flags for gradvis utrulling?
   - Mønster for flag-lifecycle (opprettelse → utrulling → sletting)
   - Teknisk gjeld fra gamle flags
   - Anbefalte verktøy og implementasjonsmønster

5. **Release-pipeline og godkjenning**
   - Manuell vs. automatisk release-godkjenning
   - Automated smoke tests etter deploy
   - Rollback-prosedyre og automatisering
   - Release-frekvensmål vs. faktisk frekvens

---

### 📊 Forventet Output

1. **Release-modenhetsvurdering** — Nåværende praksis vs. best practice
2. **Versjoneringsplan** — Konkret oppsett med \`semantic-release\` eller tilsvarende
3. **Branching-strategi-anbefaling** — Med migreringsplan fra nåværende tilstand
4. **Changelog-automatisering** — Klar-til-bruk konfigurasjon
5. **Feature flag-implementasjon** — Kodeeksempel tilpasset dette repoets stack

### ✅ Akseptansekriterier

- [ ] Alle 5 analyseområder dekket
- [ ] Konkret versjoneringsoppsett med konfigurasjonfiler
- [ ] Branching-strategi med diagram og eksempler
- [ ] Klar-til-bruk changelog-automatisering

---

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`release-hygiene\`*
`,
    }),

    'community-health': (repoName) => ({
      title: `[Community-helse] CHAOSS-basert analyse av ${repoName}`,
      labels: ['copilot:run', 'community', 'engineering-velocity'],
      body: `## 🌱 Community-helse & Bærekraft

Dette issuet ble automatisk opprettet av **Evo** og ber om en CHAOSS-basert vurdering av prosjektets community-helse og langsiktige bærekraft.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren open source community strateg**, analyser dette repositoryet basert på CHAOSS-rammeverket (Community Health Analytics in Open Source Software) og Google's OSPO best practices.

### 🔍 Analysér følgende områder:

1. **Bus factor & Contributor diversity**
   - Hvor mange nøkkelbidragsytere bærer prosjektet?
   - Bus factor-estimering: Hva skjer om X personer slutter?
   - Geografisk og organisasjonsmessig diversitet blant bidragsytere
   - Kjønns- og bakgrunns-diversitet i synlige roller
   - Plan for å redusere bus factor

2. **Contributor onboarding og beholde**
   - Konverteringsrate: nye brukere → første bidrag
   - Tid til første bidrag for nye contributors
   - CONTRIBUTING.md kvalitet og completeness
   - Good first issues og mentoring-muligheter
   - Churn-rate blant bidragsytere

3. **Responsivitet og vedlikehold**
   - Gjennomsnittlig svartid på issues
   - PR-review-tid og merge-rate
   - Proporsjon av åpne vs. lukkede issues
   - Stale issues og PR-prosess
   - Vedlikeholderstatus (aktiv/passiv/abandoned)

4. **Governance og beslutningsprosess**
   - Er beslutningsprosessen dokumentert?
   - Finnes et styringsdokument (GOVERNANCE.md)?
   - Roadmap-prosess og community-involvering
   - Code of Conduct og håndheving
   - Conflict resolution-prosess

5. **Langsiktig bærekraft**
   - Finansieringsmodell (sponsorer, dual-license, fond)?
   - Avhengighet av enkeltpersoner eller organisasjoner
   - Succession planning for maintainers
   - Project health score (OpenSSF Scorecard)
   - Lisens-kompatibilitet og compliance

---

### 📊 Forventet Output

1. **CHAOSS Health Score** — Overordnet vurdering av community-helse
2. **Bus factor-rapport** — Identifiserte risikoer og mitigeringstiltak
3. **Onboarding-plan** — Konkrete steg for å tiltrekke og beholde contributors
4. **Governance-forslag** — GOVERNANCE.md template eller forbedringer
5. **90-dagers community-tiltak** — Prioriterte steg for økt bærekraft

### ✅ Akseptansekriterier

- [ ] Alle 5 analyseområder dekket
- [ ] Bus factor estimert og risikovurdert
- [ ] Minimum 5 konkrete community-tiltak med prioritering
- [ ] GOVERNANCE.md template eller forbedret versjon
- [ ] OpenSSF Scorecard-vurdering og anbefalinger

---

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`community-health\`*
`,
    }),
  };

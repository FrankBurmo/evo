/**
 * Issue body templates for all panel categories.
 *
 * Each category exports a map of { actionId: (repoName) => { title, labels, body } }.
 */

// ─── Guardrails ─────────────────────────────────────────────────────────────

function architectureAnalysisTemplate(repoName) {
  return {
    title: `[Arkitekturanalyse] Dyp teknisk gjennomgang av ${repoName}`,
    labels: ['copilot:run', 'architecture', 'tech-debt'],
    body: `## 🏗️ Arkitekturanalyse — Dyp Teknisk Gjennomgang

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en grundig teknisk analyse av dette repositoryet.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren software-arkitekt**, analyser hele dette repositoryet dypt og grundig. Gå gjennom all kode, konfigurasjon, mappestruktur, avhengigheter og arkitekturmønstre.

### 🔍 Analysér følgende områder:

1. **Overordnet arkitektur**
   - Mappestruktur og organisering
   - Separasjon av ansvar (Separation of Concerns)
   - Arkitekturmønstre som brukes (MVC, Clean Architecture, Micro-services, osv.)
   - Skalerbarhet og vedlikeholdbarhet

2. **Kodekvalitet**
   - Koding-standarder og konsistens
   - Error handling og robusthet
   - Typer og type-sikkerhet
   - Gjenbruk av kode og DRY-prinsippet
   - Kompleksitet (syklomatisk kompleksitet, nesting)

3. **Avhengigheter og pakker**
   - Utdaterte avhengigheter
   - Unødvendige avhengigheter
   - Sikkerhetssårbarheter i dependencies
   - Bundle-størrelse og optimalisering

4. **Testing**
   - Testdekning og teststrategi
   - Type tester (unit, integration, e2e)
   - Test-kvalitet og vedlikeholdbarhet

5. **Sikkerhet**
   - Autentisering og autorisering
   - Input-validering
   - Hemmeligheter og miljøvariabler
   - OWASP Top 10 relevante funn

6. **Ytelse**
   - Potensielle flaskehalser
   - Caching-strategier
   - Database-spørringer (om relevant)
   - Frontend-ytelse (om relevant)

7. **DevOps og CI/CD**
   - Build-pipeline
   - Miljø-konfigurasjon
   - Docker/containerisering
   - Deployment-strategi

8. **Dokumentasjon**
   - API-dokumentasjon
   - README og onboarding
   - Kode-kommentarer
   - Arkitektur-dokumentasjon

---

### 📊 Forventet Output

Lever en **detaljert rapport** med:

1. **Executive Summary** — Overordnet vurdering (1-10 score) med 2-3 setninger
2. **Styrker** — Hva som er bra og bør beholdes
3. **Kritiske funn** — Ting som bør fikses umiddelbart
4. **Anbefalinger** — Konkrete forbedringsforslag rangert etter prioritet (høy/middels/lav)
5. **Teknisk gjeld** — Identifisert teknisk gjeld med estimert innsats for å løse
6. **Veikart** — Foreslått rekkefølge for implementering av forbedringer

For hver anbefaling, inkluder:
- Beskrivelse av problemet
- Hvorfor det er viktig
- Konkret forslag til løsning (gjerne med kodeeksempler)
- Estimert innsats (lav/middels/høy)

---

### ✅ Akseptansekriterier

- [ ] Alle 8 analyseområder er dekket
- [ ] Minimum 5 konkrete forbedringsforslag med kodeeksempler
- [ ] Prioritert veikart for implementering
- [ ] Executive summary med score

---

*Dette issuet ble automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Guardrail: \`architecture-analysis\`*
`,
  };
}

// ─── Product Development ────────────────────────────────────────────────────

const PRODUCT_DEV_TEMPLATES = {
  'ux-audit': (repoName) => ({
    title: `[UX-audit] Brukeropplevelse-gjennomgang av ${repoName}`,
    labels: ['copilot:run', 'ux', 'product-development'],
    body: `## 🎨 Brukeropplevelse (UX) Audit

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en grundig UX-gjennomgang av dette repositoryet.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren UX-ekspert og produktdesigner**, analyser hele dette repositoryet fra et brukerperspektiv. Fokuser på hvordan sluttbrukeren opplever produktet.

### 🔍 Analysér følgende områder:

1. **Brukerflyt og navigasjon**
   - Er brukerreisene intuitive og logiske?
   - Finnes det unødvendige steg eller blindveier?
   - Hvordan håndteres feilsituasjoner fra brukerens perspektiv?
   - Onboarding-opplevelse for nye brukere

2. **Tilgjengelighet (a11y)**
   - WCAG 2.1 AA-samsvar
   - Skjermleser-støtte og ARIA-attributter
   - Tastaturnavigasjon
   - Fargekontrast og lesbarhet
   - Responsivt design og mobile opplevelser

3. **UI-konsistens og designsystem**
   - Konsistent bruk av farger, spacing, typografi
   - Gjenbrukbare komponenter vs. duplikat-kode
   - Visuelt hierarki og informasjonsarkitektur
   - Loading-states, tomme tilstander og feilmeldinger

4. **Ytelse fra brukerens perspektiv**
   - Opplevd hastighet og responstid
   - Optimistisk UI og tilbakemelding
   - Lazy loading og progressiv innlasting
   - Animasjoner og overganger

5. **Mikrointeraksjoner og detaljer**
   - Tilbakemelding ved brukerhandlinger (klikk, submit, etc.)
   - Validering og hjelpetekster i skjemaer
   - Bekreftelsesdialoger for destruktive handlinger
   - Suksess- og feilmeldinger

---

### 📊 Forventet Output

1. **UX-score** — Overordnet vurdering (1-10) med kort oppsummering
2. **Kritiske UX-problemer** — Ting som skader brukeropplevelsen og bør fikses umiddelbart
3. **Forbedringsforslag** — Konkrete forslag rangert etter brukerverdi (høy/middels/lav)
4. **Tilgjengelighetsrapport** — Funn og anbefalinger for bedre a11y
5. **Kodeeksempler** — Vis konkret hvordan forbedringene kan implementeres

### ✅ Akseptansekriterier

- [ ] Alle 5 analyseområder er dekket
- [ ] Minimum 5 konkrete forbedringsforslag med kodeeksempler
- [ ] Tilgjengelighetsvurdering med WCAG-referanser
- [ ] Prioritert liste over UX-forbedringer

---

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`ux-audit\`*
`,
  }),

  'market-opportunity': (repoName) => ({
    title: `[Markedsmuligheter] Vekst- og markedsanalyse av ${repoName}`,
    labels: ['copilot:run', 'market-analysis', 'product-development'],
    body: `## 📈 Markedsmuligheter & Vekstanalyse

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en strategisk markedsanalyse av dette repositoryet.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren produktstrateg**, analyser dette repositoryet for å identifisere markedsmuligheter, vekstpotensial og strategisk posisjonering.

### 🔍 Analysér følgende områder:

1. **Markedsposisjon og konkurranseanalyse**
   - Hvilke alternativer/konkurrenter finnes i markedet?
   - Hva er dette produktets unike verdiforslag (USP)?
   - Hvilke gap i markedet kan dette produktet fylle?
   - SWOT-analyse (styrker, svakheter, muligheter, trusler)

2. **Målgrupper og brukersegmenter**
   - Hvem er de primære og sekundære brukergruppene?
   - Finnes det uutnyttede brukersegmenter?
   - Hvilke brukerproblemer løser produktet i dag vs. potensielle problemer det kan løse?
   - Brukerreisen fra oppdagelse til daglig bruk

3. **Vekstmuligheter**
   - Funksjoner som kan drive organisk vekst
   - Integrasjonsmuligheter med andre verktøy/plattformer
   - Community-building og økosystem-potensial
   - Potensial for nettverkseffekter

4. **Monetiserings- og forretningsmodell**
   - Vurdering av mulige inntektsmodeller (freemium, SaaS, open-core, etc.)
   - Prisstrategier basert på markedsanalyse
   - Verdi-metrikker som brukere er villige til å betale for
   - Total adresserbart marked (TAM/SAM/SOM)

5. **Go-to-market og distribusjon**
   - Effektive distribusjonskanaler
   - Developer relations og advocacy-strategi
   - Innholdsmarkedsføring og SEO-muligheter
   - Partnerskap og integrasjonsmuligheter

---

### 📊 Forventet Output

1. **Executive Summary** — Overordnet markedsposisjon og vekstpotensial
2. **Konkurransematrise** — Sammenligning med relevante alternativer
3. **Topp 5 vekstmuligheter** — Rangert etter potensial og gjennomførbarhet
4. **Forretningsmodell-anbefaling** — Konkret forslag til monetisering
5. **90-dagers veikart** — Prioriterte tiltak for vekst

### ✅ Akseptansekriterier

- [ ] Konkurranseanalyse med minst 3 alternativer
- [ ] Minimum 5 konkrete vekstmuligheter
- [ ] Handlingsbart 90-dagers veikart
- [ ] Forretningsmodell-vurdering

---

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`market-opportunity\`*
`,
  }),

  'feature-discovery': (repoName) => ({
    title: `[Feature Discovery] Funksjonsanalyse og prioritering for ${repoName}`,
    labels: ['copilot:run', 'feature-discovery', 'product-development'],
    body: `## 💡 Feature Discovery & Prioritering

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en grundig funksjonsanalyse med forslag til nye features og forbedringer.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren produktsjef (Product Manager)**, analyser dette repositoryet for å identifisere nye funksjoner, forbedringer og optimaliseringer som kan gjøre produktet mer verdifullt for brukerne.

### 🔍 Analysér følgende områder:

1. **Nåværende funksjonslandskap**
   - Kartlegg all eksisterende funksjonalitet
   - Identifiser underutnyttede eller halvferdige features
   - Vurder kvaliteten og fullstendigheten til hver funksjon
   - Finn funksjoner som bør fjernes eller forenkles (feature pruning)

2. **Nye funksjonsmuligheter**
   - Basert på kodens arkitektur, hvilke features er naturlige utvidelser?
   - Hvilke vanlige brukerbehov dekkes ikke i dag?
   - Muligheter for AI/LLM-integrasjoner
   - Automatiseringsmuligheter som kan spare brukere tid

3. **Forbedringer av eksisterende features**
   - Funksjoner som kan gjøres raskere eller enklere
   - Manglende konfigurasjons- eller tilpasningsmuligheter
   - Bulk-operasjoner eller batch-funksjonalitet
   - Bedre integrasjon mellom eksisterende features

4. **Prioriteringsrammeverk**
   - RICE-scoring (Reach, Impact, Confidence, Effort) for hvert forslag
   - Must-have vs. nice-to-have vs. delighter
   - Avhengigheter mellom features
   - Teknisk gjeld som må adresseres for å muliggjøre nye features

5. **Rapid prototyping-forslag**
   - Hvilke features kan bygges som MVP på under en uke?
   - Feature flags for gradvis utrulling
   - A/B-testing muligheter
   - Feedback-mekanismer for å validere nye features

---

### 📊 Forventet Output

1. **Funksjonskart** — Visuell oversikt over nåværende og foreslåtte features
2. **Topp 10 feature-forslag** — Med RICE-scoring og estimert innsats
3. **Quick wins** — Features som kan implementeres raskt med høy verdi
4. **Produkt-veikart** — 30/60/90-dagers plan for feature-utvikling
5. **Kodeeksempler** — Pseudokode eller skisser for topp 3 features

### ✅ Akseptansekriterier

- [ ] Komplett kartlegging av eksisterende funksjonalitet
- [ ] Minimum 10 forslag til nye features eller forbedringer
- [ ] RICE-scoring for hvert forslag
- [ ] 30/60/90-dagers produkt-veikart
- [ ] Kodeeksempler for topp 3 forslag

---

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`feature-discovery\`*
`,
  }),

  'developer-experience': (repoName) => ({
    title: `[DX-analyse] Utvikleropplevelse-gjennomgang av ${repoName}`,
    labels: ['copilot:run', 'developer-experience', 'product-development'],
    body: `## 🛠️ Utvikleropplevelse (DX) Analyse

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en grundig analyse av utvikleropplevelsen i dette repositoryet.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren Developer Advocate og DX-ekspert**, analyser dette repositoryet fra perspektivet til en ny utvikler som ønsker å bruke, bidra til eller integrere med dette prosjektet.

### 🔍 Analysér følgende områder:

1. **Onboarding og førstegangsopplevelse**
   - Hvor lang tid tar det å gå fra \`git clone\` til kjørende app?
   - Er oppsettsinstruksjonene klare og komplette?
   - Finnes det en \`Makefile\`, \`docker-compose\`, eller lignende for enkel oppstart?
   - Fungerer instruksjonene på tvers av operativsystemer?

2. **Dokumentasjon og læringsressurser**
   - README-kvalitet og fullstendighet
   - API-dokumentasjon (om relevant)
   - Kodeeksempler og tutorials
   - CONTRIBUTING.md og retningslinjer for bidrag
   - Changelog og versjonshåndtering

3. **Kodekvalitet og konvensjoner**
   - Konsistent kodestil og automatisk formatering (Prettier, ESLint, etc.)
   - Type-sikkerhet og IntelliSense-støtte
   - Navnekonvensjoner og lesbarhet
   - Kommentarer i kode — nok men ikke for mye

4. **Utviklerverktøy og produktivitet**
   - CI/CD-pipeline og automatisering
   - Pre-commit hooks og kvalitetssjekker
   - Hot reload og rask feedback-loop under utvikling
   - Debugging-oppsett og logging

5. **API- og integrasjonsdesign** (om relevant)
   - Er API-et intuitivt og forutsigbart?
   - Konsistent feilhåndtering og statuskoder
   - Versjonering og bakoverkompatibilitet
   - SDK/klientbibliotek-kvalitet

---

### 📊 Forventet Output

1. **DX-score** — Overordnet vurdering (1-10) med kort oppsummering
2. **Onboarding-tidsestimat** — Tid fra clone til kjørende app
3. **Topp 5 DX-hindringer** — De største friksjonspunktene for nye utviklere
4. **Forbedringsforslag** — Konkrete tiltak rangert etter innvirkning
5. **Eksempelkode** — Forbedrede docs, config-filer, scripts som kan implementeres direkte

### ✅ Akseptansekriterier

- [ ] Alle 5 analyseområder er dekket
- [ ] Minimum 5 konkrete forbedringsforslag med kodeeksempler
- [ ] Onboarding-test gjennomført (simulert eller faktisk)
- [ ] README-forbedring foreslått med faktisk innhold

---

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`developer-experience\`*
`,
  }),

  'product-market-fit': (repoName) => ({
    title: `[PMF-analyse] Produkt-markedstilpasning for ${repoName}`,
    labels: ['copilot:run', 'product-market-fit', 'product-development'],
    body: `## 🎯 Produkt-Markedstilpasning (PMF) Analyse

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en evaluering av produkt-markedstilpasningen for dette prosjektet.

---

### 📋 Oppgavebeskrivelse

Som en **erfaren startup-rådgiver og produktstrateg**, analyser dette repositoryet for å vurdere i hvilken grad produktet har funnet sin plass i markedet, og foreslå tiltak for å styrke produkt-markedstilpasningen.

### 🔍 Analysér følgende områder:

1. **Problemdefinisjon og løsningsvurdering**
   - Hvilket problem forsøker produktet å løse?
   - Hvor godt løser det dette problemet i dag?
   - Er problemet stort nok til å bygge et produkt rundt?
   - Intervju-spørsmål som bør stilles til brukere for validering

2. **Brukervalidering og signaler**
   - Hvilke signaler på PMF kan observeres? (stars, forks, issues, community)
   - Bruker folk dette aktivt, eller er det mest \"stars uten bruk\"?
   - Hvilken type feedback indikerer om PMF er oppnådd?
   - Sean Ellis-testen: Ville brukere bli \"veldig skuffet\" uten produktet?

3. **Retaining og engasjement**
   - Finnes det mekanismer som driver gjentatt bruk?
   - Hva får brukere til å slutte å bruke produktet (churn-risiko)?
   - Muligheter for å øke stickiness og lock-in (positiv)
   - Hva er produktets \"aha-moment\"?

4. **Pivot- og justeringsmuligheter**
   - Hvilke justeringer kan forbedre PMF uten å bygge om?
   - Bør produktet fokusere smalere (niche down) eller bredere?
   - Er det et annet brukersegment som passer bedre?
   - Kan kjerneverdien pakkes eller leveres annerledes?

5. **Metrikker og måling**
   - Foreslå 5-7 nøkkelmetrikker for å måle PMF
   - Instrumentering som bør legges til i kodebasen
   - Feedback-loops for kontinuerlig PMF-måling
   - Benchmarks og mål for hvert mål

---

### 📊 Forventet Output

1. **PMF-vurdering** — Nåværende tilstand (Pre-PMF / Nær PMF / Post-PMF) med begrunnelse
2. **Problemanalyse** — Er riktig problem identifisert og løst?
3. **Topp 5 PMF-tiltak** — Konkrete handlinger for å styrke PMF, rangert etter innvirkning
4. **Metrikkforslag** — Dashboard med nøkkelmetrikker og instrumenteringskode
5. **Brukervaliderings-plan** — Konkrete steg for å validere PMF med ekte brukere

### ✅ Akseptansekriterier

- [ ] Alle 5 analyseområder er dekket
- [ ] PMF-vurdering med klar begrunnelse
- [ ] Minimum 5 konkrete tiltak for å styrke PMF
- [ ] Metrikkforslag med instrumenteringskode
- [ ] Brukervaliderings-plan med intervjuguide

---

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`product-market-fit\`*
`,
  }),
};

// ─── Engineering Velocity ───────────────────────────────────────────────────

const ENGINEERING_VELOCITY_TEMPLATES = {
  'cicd-maturity': (repoName) => ({
    title: `[CI/CD-modenhet] Pipeline-analyse av ${repoName}`,
    labels: ['copilot:run', 'ci-cd', 'engineering-velocity'],
    body: `## ⚙️ CI/CD-modenhet Analyse

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en grundig gjennomgang av CI/CD-pipelines og leveranseprosessen i dette repositoryet.

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

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`cicd-maturity\`*
`,
  }),

  'dora-assessment': (repoName) => ({
    title: `[DORA-analyse] Leveransehastighet-vurdering av ${repoName}`,
    labels: ['copilot:run', 'dora-metrics', 'engineering-velocity'],
    body: `## 📊 DORA-metrikker & Leveransehastighet

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en DORA-basert vurdering av leveransepraksis i dette repositoryet.

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

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`dora-assessment\`*
`,
  }),

  'observability': (repoName) => ({
    title: `[Observability] Monitorering og synlighets-analyse av ${repoName}`,
    labels: ['copilot:run', 'observability', 'engineering-velocity'],
    body: `## 🔭 Observability & Monitorering

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en grundig vurdering av observability-implementasjonen i dette repositoryet.

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

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`observability\`*
`,
  }),

  'release-hygiene': (repoName) => ({
    title: `[Release-hygiene] Versjonering og release-prosess i ${repoName}`,
    labels: ['copilot:run', 'release-management', 'engineering-velocity'],
    body: `## 🏷️ Release-hygiene & Versjonering

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en gjennomgang av release-praksis og versjonering i dette repositoryet.

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

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`release-hygiene\`*
`,
  }),

  'community-health': (repoName) => ({
    title: `[Community-helse] CHAOSS-basert analyse av ${repoName}`,
    labels: ['copilot:run', 'community', 'engineering-velocity'],
    body: `## 🌱 Community-helse & Bærekraft

Dette issuet ble automatisk opprettet av **Product Orchestrator** og ber om en CHAOSS-basert vurdering av prosjektets community-helse og langsiktige bærekraft.

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

*Automatisk opprettet av [Product Orchestrator](https://github.com/FrankBurmo/product-orchestrator). Kategori: \`community-health\`*
`,
  }),
};

// ─── Scan issue body builder ────────────────────────────────────────────────

/**
 * Build a scan-issue body for a recommendation.
 * @param {object} rec - { title, description, priority, type, marketOpportunity }
 * @param {object} [options]
 * @param {boolean} [options.compact=false] - Use compact format for batch creation
 * @returns {string}
 */
function buildScanIssueBody(rec, { compact = false } = {}) {
  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🔵' }[rec.priority] || '⚪';

  if (compact) {
    return `## ${priorityEmoji} ${rec.title}\n\n> Automatisk opprettet av **Evo** — proaktiv skanning.\n\n---\n\n### 📋 Beskrivelse\n\n${rec.description}\n\n${rec.marketOpportunity ? `### 💡 Forretningsverdi\n\n${rec.marketOpportunity}\n\n` : ''}---\n\n### ✅ Akseptansekriterier\n\n- [ ] Problemet er løst\n- [ ] Endringen er testet\n- [ ] PR er opprettet\n\n---\n\n*Opprettet av Evo • Prioritet: \`${rec.priority}\` • Type: \`${rec.type || 'generell'}\`*`;
  }

  return `## ${priorityEmoji} ${rec.title}

> Automatisk opprettet av **[Evo](https://github.com/FrankBurmo/evo)** — proaktiv skanning.

---

### 📋 Beskrivelse

${rec.description}

${rec.marketOpportunity ? `### 💡 Forretningsverdi\n\n${rec.marketOpportunity}\n` : ''}

---

### ✅ Akseptansekriterier

- [ ] Problemet beskrevet over er løst
- [ ] Endringen er testet
- [ ] En pull request er opprettet med løsningen

---

*Opprettet av Evo proaktiv skanning • Prioritet: \`${rec.priority}\` • Type: \`${rec.type || 'generell'}\`*
`;
}

module.exports = {
  architectureAnalysisTemplate,
  PRODUCT_DEV_TEMPLATES,
  ENGINEERING_VELOCITY_TEMPLATES,
  buildScanIssueBody,
};

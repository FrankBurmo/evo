/**
 * Product Development issue-templates.
 *
 * Keys: ux-audit, market-opportunity, feature-discovery, developer-experience, product-market-fit
 */
import type { IssueTemplate } from '../types';

export const PRODUCT_DEV_TEMPLATES = new Map<string, (repoName: string) => IssueTemplate>([
  ['ux-audit', (repoName) => ({
    title: `[UX-audit] Brukeropplevelse-gjennomgang av ${repoName}`,
    labels: ['copilot:run', 'ux', 'product-development'],
    body: `## 🎨 Brukeropplevelse (UX) Audit

Dette issuet ble automatisk opprettet av **Evo** og ber om en grundig UX-gjennomgang av dette repositoryet.

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

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`ux-audit\`*
`,
  })],

  ['market-opportunity', (repoName) => ({
    title: `[Markedsmuligheter] Vekst- og markedsanalyse av ${repoName}`,
    labels: ['copilot:run', 'market-analysis', 'product-development'],
    body: `## 📈 Markedsmuligheter & Vekstanalyse

Dette issuet ble automatisk opprettet av **Evo** og ber om en strategisk markedsanalyse av dette repositoryet.

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

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`market-opportunity\`*
`,
  })],

  ['feature-discovery', (repoName) => ({
    title: `[Feature Discovery] Funksjonsanalyse og prioritering for ${repoName}`,
    labels: ['copilot:run', 'feature-discovery', 'product-development'],
    body: `## 💡 Feature Discovery & Prioritering

Dette issuet ble automatisk opprettet av **Evo** og ber om en grundig funksjonsanalyse med forslag til nye features og forbedringer.

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

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`feature-discovery\`*
`,
  })],

  ['developer-experience', (repoName) => ({
    title: `[DX-analyse] Utvikleropplevelse-gjennomgang av ${repoName}`,
    labels: ['copilot:run', 'developer-experience', 'product-development'],
    body: `## 🛠️ Utvikleropplevelse (DX) Analyse

Dette issuet ble automatisk opprettet av **Evo** og ber om en grundig analyse av utvikleropplevelsen i dette repositoryet.

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

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`developer-experience\`*
`,
  })],

  ['product-market-fit', (repoName) => ({
    title: `[PMF-analyse] Produkt-markedstilpasning for ${repoName}`,
    labels: ['copilot:run', 'product-market-fit', 'product-development'],
    body: `## 🎯 Produkt-Markedstilpasning (PMF) Analyse

Dette issuet ble automatisk opprettet av **Evo** og ber om en evaluering av produkt-markedstilpasningen for dette prosjektet.

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

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Kategori: \`product-market-fit\`*
`,
  })],
]);

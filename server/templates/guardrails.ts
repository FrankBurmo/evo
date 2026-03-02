/**
 * Guardrails issue-templates.
 */
import type { IssueTemplate } from '../types';

export function architectureAnalysisTemplate(repoName: string): IssueTemplate {
  return {
    title: `[Arkitekturanalyse] Dyp teknisk gjennomgang av ${repoName}`,
    labels: ['copilot:run', 'architecture', 'tech-debt'],
    body: `## 🏗️ Arkitekturanalyse — Dyp Teknisk Gjennomgang

Dette issuet ble automatisk opprettet av **Evo** og ber om en grundig teknisk analyse av dette repositoryet.

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

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Guardrail: \`architecture-analysis\`*
`,
  };
}

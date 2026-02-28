require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Octokit } = require('@octokit/rest');
const { analyzeRepository, deepAnalyzeRepo } = require('./analyzer');
const { analyzeWithAI } = require('./copilot-client');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// GitHub API client
const getOctokit = (token) => {
  return new Octokit({
    auth: token || process.env.GITHUB_TOKEN
  });
};

// ── analyzeRepository og deepAnalyzeRepo er importert fra ./analyzer ──

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Product Orchestrator API is running' });
});

app.get('/api/repos', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token && !process.env.GITHUB_TOKEN) {
      return res.status(401).json({ 
        error: 'GitHub token required. Please provide a token.' 
      });
    }

    const octokit = getOctokit(token);

    // Paginate through all pages (max 100 per page) and filter out archived repos.
    const allRepos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner'
    });

    const activeRepos = allRepos.filter(repo => !repo.archived);

    // Analyze each repository
    const analyzedRepos = activeRepos.map(repo => analyzeRepository(repo));

    res.json({
      totalRepos: analyzedRepos.length,
      repositories: analyzedRepos
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repositories', 
      message: error.message 
    });
  }
});

app.get('/api/repo/:owner/:name', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token && !process.env.GITHUB_TOKEN) {
      return res.status(401).json({ 
        error: 'GitHub token required' 
      });
    }

    const octokit = getOctokit(token);
    
    const { data: repo } = await octokit.repos.get({
      owner,
      repo: name
    });

    // Dyp analyse: henter filstruktur, commits, prosjekttype m.m.
    const analysis = await deepAnalyzeRepo(octokit, repo);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching repository:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repository', 
      message: error.message 
    });
  }
});

// Eksplisitt deep-analyse-endepunkt (alias for bakoverkompatibilitet)
app.get('/api/repo/:owner/:name/deep', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    const useAI = req.query.ai !== 'false'; // KI er på som standard, ?ai=false for å slå av

    if (!token && !process.env.GITHUB_TOKEN) {
      return res.status(401).json({ error: 'GitHub token required' });
    }

    const octokit = getOctokit(token);
    const { data: repo } = await octokit.repos.get({ owner, repo: name });
    const analysis = await deepAnalyzeRepo(octokit, repo);

    // KI-analyse: kombiner regelbasert + AI-drevet
    if (useAI && (token || process.env.GITHUB_TOKEN)) {
      try {
        const existingTitles = (analysis.recommendations || []).map(r => r.title);
        const aiResult = await analyzeWithAI({
          token: token || process.env.GITHUB_TOKEN,
          repo: analysis.repo,
          deepInsights: analysis.deepInsights,
          existingRecs: existingTitles,
        });

        // Slå sammen AI-anbefalinger med regelbaserte
        const existingSet = new Set(existingTitles.map(t => t.toLowerCase()));
        const newAIRecs = (aiResult.recommendations || []).filter(
          r => !existingSet.has(r.title.toLowerCase())
        );
        analysis.recommendations = [...analysis.recommendations, ...newAIRecs];
        analysis.aiSummary = aiResult.summary;
        analysis.aiAnalyzed = true;
      } catch (aiError) {
        console.warn('KI-analyse feilet, bruker kun regelbasert analyse:', aiError.message);
        analysis.aiAnalyzed = false;
        analysis.aiError = aiError.message;
      }
    } else {
      analysis.aiAnalyzed = false;
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error in deep analysis:', error);
    res.status(500).json({ error: 'Failed to deep-analyse repository', message: error.message });
  }
});

/**
 * POST /api/repo/:owner/:name/ai-analyze
 * Dedikert KI-analyse-endepunkt. Kjører dyp analyse etterfulgt av Copilot Models API.
 * Body: { model?: string }
 */
app.post('/api/repo/:owner/:name/ai-analyze', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token && !process.env.GITHUB_TOKEN) {
      return res.status(401).json({ error: 'GitHub token required' });
    }

    const { model } = req.body || {};
    const octokit = getOctokit(token);
    const { data: repo } = await octokit.repos.get({ owner, repo: name });
    const analysis = await deepAnalyzeRepo(octokit, repo);

    const existingTitles = (analysis.recommendations || []).map(r => r.title);
    const aiResult = await analyzeWithAI({
      token: token || process.env.GITHUB_TOKEN,
      model,
      repo: analysis.repo,
      deepInsights: analysis.deepInsights,
      existingRecs: existingTitles,
    });

    const existingSet = new Set(existingTitles.map(t => t.toLowerCase()));
    const newAIRecs = (aiResult.recommendations || []).filter(
      r => !existingSet.has(r.title.toLowerCase())
    );

    res.json({
      repo: analysis.repo,
      deepInsights: analysis.deepInsights,
      aiSummary: aiResult.summary,
      projectType: aiResult.projectType,
      recommendations: [...analysis.recommendations, ...newAIRecs],
      ruleBasedCount: analysis.recommendations.length,
      aiCount: newAIRecs.length,
    });
  } catch (error) {
    console.error('Error in AI analysis:', error);
    res.status(500).json({ error: 'KI-analyse feilet', message: error.message });
  }
});

app.post('/api/create-agent-issue', async (req, res) => {
  const { owner, repo: repoName, recommendation } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token && !process.env.GITHUB_TOKEN) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (!owner || !repoName || !recommendation) {
    return res.status(400).json({ error: 'Missing required fields: owner, repo, recommendation' });
  }

  const octokit = getOctokit(token);

  const issueTitle = `[Copilot Agent] ${recommendation.title}`;
  const issueBody = `## 🤖 Copilot Agent Task

This issue was automatically created by **Product Orchestrator** and assigned to Copilot for automated resolution.

---

### 📋 Problem Description

**${recommendation.title}**

${recommendation.description}

${recommendation.marketOpportunity ? `### 💼 Business Value\n\n${recommendation.marketOpportunity}\n` : ''}
---

### ✅ Acceptance Criteria

- [ ] The issue described above is resolved
- [ ] Changes are tested and working
- [ ] A pull request is submitted with the fix

---

*This issue was created automatically by [Product Orchestrator](https://github.com). Priority: \`${recommendation.priority}\`*
`;

  // Step 1: Create the issue (without assignee — Copilot must be assigned separately)
  let issue;
  try {
    const labels = ['copilot:run'];
    if (recommendation.priority === 'high') labels.push('priority: high');
    if (recommendation.type) labels.push(recommendation.type);

    const { data } = await octokit.issues.create({
      owner,
      repo: repoName,
      title: issueTitle,
      body: issueBody,
      labels,
    });
    issue = data;
  } catch (error) {
    console.error('Error creating issue:', error);
    return res.status(500).json({ error: 'Failed to create issue', message: error.message });
  }

  // Step 2: Assign Copilot using GitHub GraphQL API
  // This is the same method GitHub CLI uses: replaceActorsForAssignable mutation
  let copilotAssigned = false;
  let assignmentMethod = null;

  try {
    console.log('Attempting Copilot assignment via GitHub GraphQL (same as gh CLI)...');
    
    // Step 2a: Get the issue's node ID via GraphQL
    console.log('Step 1: Fetching issue node ID...');
    const issueQuery = await octokit.graphql(
      `query GetIssueNodeId($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            id
          }
        }
      }`,
      {
        owner,
        repo: repoName,
        number: issue.number,
      }
    );
    
    const issueNodeId = issueQuery.repository.issue.id;
    console.log('Issue node ID:', issueNodeId);

    // Step 2b: Get assignable actors to find Copilot's ID
    console.log('Step 2: Fetching assignable actors...');
    const actorsQuery = await octokit.graphql(
      `query RepositoryAssignableActors($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          suggestedActors(first: 100, capabilities: CAN_BE_ASSIGNED) {
            nodes {
              ... on User {
                id
                login
                __typename
              }
              ... on Bot {
                id
                login
                __typename
              }
            }
          }
        }
      }`,
      {
        owner,
        repo: repoName,
      }
    );

    // Find Copilot bot (login: "copilot-swe-agent" or your custom agent)
    const copilotBot = actorsQuery.repository.suggestedActors.nodes.find(
      actor => actor.login === 'min-kode-agent' || actor.login === 'copilot-swe-agent'
    );

    if (!copilotBot) {
      throw new Error('Copilot bot not found in assignable actors. Make sure Copilot is enabled for this repository.');
    }

    console.log('Found bot:', copilotBot.login, 'with ID:', copilotBot.id);

    // Step 2c: Assign using GraphQL mutation
    console.log('Step 3: Assigning via replaceActorsForAssignable mutation...');
    await octokit.graphql(
      `mutation ReplaceActorsForAssignable($input: ReplaceActorsForAssignableInput!) {
        replaceActorsForAssignable(input: $input) {
          __typename
        }
      }`,
      {
        input: {
          assignableId: issueNodeId,
          actorIds: [copilotBot.id],
        },
      }
    );

    copilotAssigned = true;
    assignmentMethod = 'graphql-mutation';
    console.log(`✓ Issue #${issue.number} - ${copilotBot.login} assigned successfully via GraphQL!`);
  } catch (assignError) {
    console.warn('✗ GraphQL assignment failed:', assignError.message);
    console.error('Full error:', assignError);
  }

  return res.json({
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    copilotAssigned,
    assignmentMethod,
    ...(copilotAssigned && {
      note: 'Issue created and assigned to Copilot agent successfully!',
    }),
    ...(!copilotAssigned && {
      note: 'Issue created, but Copilot agent could not be assigned automatically. Make sure GitHub Copilot is enabled for this repository and try assigning manually.',
    }),
  });
});

// Guardrails: Architecture Analysis — create a deep-dive issue
app.post('/api/guardrails/architecture-analysis', async (req, res) => {
  const { owner, repo: repoName } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token && !process.env.GITHUB_TOKEN) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (!owner || !repoName) {
    return res.status(400).json({ error: 'Missing required fields: owner, repo' });
  }

  const octokit = getOctokit(token);

  const issueTitle = `[Arkitekturanalyse] Dyp teknisk gjennomgang av ${repoName}`;
  const issueBody = `## 🏗️ Arkitekturanalyse — Dyp Teknisk Gjennomgang

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
`;

  let issue;
  try {
    const { data } = await octokit.issues.create({
      owner,
      repo: repoName,
      title: issueTitle,
      body: issueBody,
      labels: ['copilot:run', 'architecture', 'tech-debt'],
    });
    issue = data;
  } catch (error) {
    console.error('Error creating architecture analysis issue:', error);
    return res.status(500).json({ error: 'Failed to create issue', message: error.message });
  }

  // Try to assign Copilot agent
  let copilotAssigned = false;
  try {
    const issueQuery = await octokit.graphql(
      `query GetIssueNodeId($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            id
          }
        }
      }`,
      { owner, repo: repoName, number: issue.number }
    );

    const issueNodeId = issueQuery.repository.issue.id;

    const actorsQuery = await octokit.graphql(
      `query RepositoryAssignableActors($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          suggestedActors(first: 100, capabilities: CAN_BE_ASSIGNED) {
            nodes {
              ... on User { id login __typename }
              ... on Bot { id login __typename }
            }
          }
        }
      }`,
      { owner, repo: repoName }
    );

    const copilotBot = actorsQuery.repository.suggestedActors.nodes.find(
      actor => actor.login === 'min-kode-agent' || actor.login === 'copilot-swe-agent'
    );

    if (copilotBot) {
      await octokit.graphql(
        `mutation ReplaceActorsForAssignable($input: ReplaceActorsForAssignableInput!) {
          replaceActorsForAssignable(input: $input) { __typename }
        }`,
        { input: { assignableId: issueNodeId, actorIds: [copilotBot.id] } }
      );
      copilotAssigned = true;
      console.log(`✓ Architecture analysis issue #${issue.number} assigned to ${copilotBot.login}`);
    }
  } catch (assignError) {
    console.warn('Copilot assignment failed for architecture analysis:', assignError.message);
  }

  return res.json({
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    copilotAssigned,
    note: copilotAssigned
      ? 'Arkitekturanalyse-issue opprettet og tildelt Copilot-agent!'
      : 'Issue opprettet, men Copilot-agent kunne ikke tildeles automatisk. Tildel manuelt om nødvendig.',
  });
});

// ─── Product Development endpoints ──────────────────────────────────────────

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

// Generic Product Development endpoint — handles all 5 categories
app.post('/api/product-dev/:actionId', async (req, res) => {
  const { actionId } = req.params;
  const { owner, repo: repoName } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token && !process.env.GITHUB_TOKEN) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (!owner || !repoName) {
    return res.status(400).json({ error: 'Missing required fields: owner, repo' });
  }

  const templateFn = PRODUCT_DEV_TEMPLATES[actionId];
  if (!templateFn) {
    return res.status(400).json({ error: `Unknown product-dev action: ${actionId}` });
  }

  const octokit = getOctokit(token);
  const { title, labels, body } = templateFn(repoName);

  let issue;
  try {
    const { data } = await octokit.issues.create({
      owner,
      repo: repoName,
      title,
      body,
      labels,
    });
    issue = data;
  } catch (error) {
    console.error(`Error creating product-dev issue (${actionId}):`, error);
    return res.status(500).json({ error: 'Failed to create issue', message: error.message });
  }

  // Try to assign Copilot agent
  let copilotAssigned = false;
  try {
    const issueQuery = await octokit.graphql(
      `query GetIssueNodeId($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) { id }
        }
      }`,
      { owner, repo: repoName, number: issue.number }
    );

    const issueNodeId = issueQuery.repository.issue.id;

    const actorsQuery = await octokit.graphql(
      `query RepositoryAssignableActors($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          suggestedActors(first: 100, capabilities: CAN_BE_ASSIGNED) {
            nodes {
              ... on User { id login __typename }
              ... on Bot { id login __typename }
            }
          }
        }
      }`,
      { owner, repo: repoName }
    );

    const copilotBot = actorsQuery.repository.suggestedActors.nodes.find(
      actor => actor.login === 'min-kode-agent' || actor.login === 'copilot-swe-agent'
    );

    if (copilotBot) {
      await octokit.graphql(
        `mutation ReplaceActorsForAssignable($input: ReplaceActorsForAssignableInput!) {
          replaceActorsForAssignable(input: $input) { __typename }
        }`,
        { input: { assignableId: issueNodeId, actorIds: [copilotBot.id] } }
      );
      copilotAssigned = true;
      console.log(`✓ Product-dev issue #${issue.number} (${actionId}) assigned to ${copilotBot.login}`);
    }
  } catch (assignError) {
    console.warn(`Copilot assignment failed for ${actionId}:`, assignError.message);
  }

  return res.json({
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    copilotAssigned,
    note: copilotAssigned
      ? `Produktutviklings-issue opprettet og tildelt Copilot-agent!`
      : 'Issue opprettet, men Copilot-agent kunne ikke tildeles automatisk. Tildel manuelt om nødvendig.',
  });
});

// ─── Engineering Velocity endpoints ─────────────────────────────────────────

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

// Generic Engineering Velocity endpoint — handles all 5 categories
app.post('/api/engineering-velocity/:actionId', async (req, res) => {
  const { actionId } = req.params;
  const { owner, repo: repoName } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token && !process.env.GITHUB_TOKEN) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (!owner || !repoName) {
    return res.status(400).json({ error: 'Missing required fields: owner, repo' });
  }

  const templateFn = ENGINEERING_VELOCITY_TEMPLATES[actionId];
  if (!templateFn) {
    return res.status(400).json({ error: `Unknown engineering-velocity action: ${actionId}` });
  }

  const octokit = getOctokit(token);
  const { title, labels, body } = templateFn(repoName);

  let issue;
  try {
    const { data } = await octokit.issues.create({
      owner,
      repo: repoName,
      title,
      body,
      labels,
    });
    issue = data;
  } catch (error) {
    console.error(`Error creating engineering-velocity issue (${actionId}):`, error);
    return res.status(500).json({ error: 'Failed to create issue', message: error.message });
  }

  // Try to assign Copilot agent
  let copilotAssigned = false;
  try {
    const issueQuery = await octokit.graphql(
      `query GetIssueNodeId($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) { id }
        }
      }`,
      { owner, repo: repoName, number: issue.number }
    );

    const issueNodeId = issueQuery.repository.issue.id;

    const actorsQuery = await octokit.graphql(
      `query RepositoryAssignableActors($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          suggestedActors(first: 100, capabilities: CAN_BE_ASSIGNED) {
            nodes {
              ... on User { id login __typename }
              ... on Bot { id login __typename }
            }
          }
        }
      }`,
      { owner, repo: repoName }
    );

    const copilotBot = actorsQuery.repository.suggestedActors.nodes.find(
      actor => actor.login === 'min-kode-agent' || actor.login === 'copilot-swe-agent'
    );

    if (copilotBot) {
      await octokit.graphql(
        `mutation ReplaceActorsForAssignable($input: ReplaceActorsForAssignableInput!) {
          replaceActorsForAssignable(input: $input) { __typename }
        }`,
        { input: { assignableId: issueNodeId, actorIds: [copilotBot.id] } }
      );
      copilotAssigned = true;
      console.log(`✓ Engineering-velocity issue #${issue.number} (${actionId}) assigned to ${copilotBot.login}`);
    }
  } catch (assignError) {
    console.warn(`Copilot assignment failed for ${actionId}:`, assignError.message);
  }

  return res.json({
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    copilotAssigned,
    note: copilotAssigned
      ? 'Leveransekvalitet-issue opprettet og tildelt Copilot-agent!'
      : 'Issue opprettet, men Copilot-agent kunne ikke tildeles automatisk. Tildel manuelt om nødvendig.',
  });
});

// ─── Proaktiv skanning ────────────────────────────────────────────────────────
// In-memory scan state (single tenant — one scan at a time)
const scanState = {
  status: 'idle',       // idle | running | completed | error
  startedAt: null,
  completedAt: null,
  progress: { current: 0, total: 0, currentRepo: null },
  results: [],          // [{ repo, recommendations, deepInsights, issuesCreated }]
  error: null,
  options: {},
};

function resetScanState() {
  scanState.status = 'idle';
  scanState.startedAt = null;
  scanState.completedAt = null;
  scanState.progress = { current: 0, total: 0, currentRepo: null };
  scanState.results = [];
  scanState.error = null;
  scanState.options = {};
}

/**
 * POST /api/scan/start
 * Body: { createIssues?: boolean, assignCopilot?: boolean, minPriority?: string, maxRepos?: number }
 */
app.post('/api/scan/start', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token && !process.env.GITHUB_TOKEN) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (scanState.status === 'running') {
    return res.status(409).json({ error: 'En skanning kjører allerede. Vent til den er ferdig.' });
  }

  const {
    createIssues = false,
    assignCopilot = false,
    minPriority = 'medium',
    maxRepos = 50,
    useAI = true,
    model,
  } = req.body || {};

  // Reset and start
  resetScanState();
  scanState.status = 'running';
  scanState.startedAt = new Date().toISOString();
  scanState.options = { createIssues, assignCopilot, minPriority, maxRepos, useAI };

  // Respond immediately — scan runs in background
  res.json({
    status: 'started',
    message: 'Proaktiv skanning startet.',
    startedAt: scanState.startedAt,
  });

  // Run the scan asynchronously
  const PRIORITY_RANK = { high: 3, medium: 2, low: 1, info: 0 };
  const meetsMin = (p) => (PRIORITY_RANK[p] || 0) >= (PRIORITY_RANK[minPriority] || 0);

  try {
    const octokit = getOctokit(token);

    // 1. Fetch all repos
    const allRepos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner',
    });
    const activeRepos = allRepos.filter(r => !r.archived).slice(0, maxRepos);

    scanState.progress.total = activeRepos.length;

    // 2. Deep-analyse each repo sequentially (to respect rate limits)
    for (let i = 0; i < activeRepos.length; i++) {
      const repo = activeRepos[i];
      scanState.progress.current = i + 1;
      scanState.progress.currentRepo = repo.full_name;

      let analysis;
      try {
        analysis = await deepAnalyzeRepo(octokit, repo);
      } catch (err) {
        // Fallback to basic analysis if deep fails
        analysis = analyzeRepository(repo);
        analysis.deepInsights = null;
      }

      // KI-analyse (om aktivert)
      if (useAI && (token || process.env.GITHUB_TOKEN)) {
        try {
          const existingTitles = (analysis.recommendations || []).map(r => r.title);
          const aiResult = await analyzeWithAI({
            token: token || process.env.GITHUB_TOKEN,
            model,
            repo: analysis.repo || { fullName: repo.full_name, language: repo.language, description: repo.description, visibility: repo.private ? 'private' : 'public', stars: repo.stargazers_count, forks: repo.forks_count, openIssues: repo.open_issues_count, updatedAt: repo.updated_at, license: repo.license?.spdx_id },
            deepInsights: analysis.deepInsights,
            existingRecs: existingTitles,
          });

          const existingSet = new Set(existingTitles.map(t => t.toLowerCase()));
          const newAIRecs = (aiResult.recommendations || []).filter(
            r => !existingSet.has(r.title.toLowerCase())
          );
          analysis.recommendations = [...(analysis.recommendations || []), ...newAIRecs];
          analysis.aiSummary = aiResult.summary;
          analysis.aiAnalyzed = true;
        } catch (aiErr) {
          console.warn(`KI-analyse feilet for ${repo.full_name}:`, aiErr.message);
          analysis.aiAnalyzed = false;
        }
      }

      // Filter recommendations by minPriority
      const filteredRecs = (analysis.recommendations || []).filter(r => meetsMin(r.priority));

      const result = {
        repo: analysis.repo,
        deepInsights: analysis.deepInsights || null,
        recommendations: filteredRecs,
        issuesCreated: [],
      };

      // 3. Create issues if requested
      if (createIssues && filteredRecs.length > 0) {
        const [owner, repoName] = repo.full_name.split('/');

        // Fetch existing evo-scan issues once per repo for dedup
        let existingTitles = new Set();
        try {
          const existingIssues = await octokit.paginate(octokit.issues.listForRepo, {
            owner,
            repo: repoName,
            state: 'open',
            labels: 'evo-scan',
            per_page: 100,
          });
          existingTitles = new Set(existingIssues.map(i => i.title.toLowerCase().trim()));
        } catch {
          // ignore — dedup won't work but we still create issues
        }

        for (const rec of filteredRecs) {
          const issueTitle = `[Evo] ${rec.title}`;
          if (existingTitles.has(issueTitle.toLowerCase().trim())) {
            result.issuesCreated.push({ title: rec.title, status: 'skipped', reason: 'duplicate' });
            continue;
          }

          try {
            const priorityEmoji = { high: '🔴', medium: '🟡', low: '🔵' }[rec.priority] || '⚪';
            const body = `## ${priorityEmoji} ${rec.title}

> Automatisk opprettet av **[Evo](https://github.com/FrankBurmo/product-orchestrator)** — proaktiv skanning.

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

            const labels = ['evo-scan'];
            if (rec.priority === 'high') labels.push('priority: high');
            if (rec.priority === 'medium') labels.push('priority: medium');
            if (rec.type) labels.push(rec.type);

            let issue;
            try {
              const { data } = await octokit.issues.create({
                owner, repo: repoName, title: issueTitle, body, labels,
              });
              issue = data;
            } catch (labelErr) {
              // Retry without extra labels
              if (labelErr.status === 422) {
                const { data } = await octokit.issues.create({
                  owner, repo: repoName, title: issueTitle, body, labels: ['evo-scan'],
                });
                issue = data;
              } else {
                throw labelErr;
              }
            }

            let copilotAssigned = false;
            if (assignCopilot && issue) {
              try {
                const issueQuery = await octokit.graphql(
                  `query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){issue(number:$number){id}}}`,
                  { owner, repo: repoName, number: issue.number }
                );
                const issueNodeId = issueQuery.repository.issue.id;
                const actorsQuery = await octokit.graphql(
                  `query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){suggestedActors(first:100,capabilities:CAN_BE_ASSIGNED){nodes{...on User{id login __typename}...on Bot{id login __typename}}}}}`,
                  { owner, repo: repoName }
                );
                const bot = actorsQuery.repository.suggestedActors.nodes.find(
                  a => a.login === 'copilot-swe-agent' || a.login === 'min-kode-agent'
                );
                if (bot) {
                  await octokit.graphql(
                    `mutation($input:ReplaceActorsForAssignableInput!){replaceActorsForAssignable(input:$input){__typename}}`,
                    { input: { assignableId: issueNodeId, actorIds: [bot.id] } }
                  );
                  copilotAssigned = true;
                }
              } catch {
                // non-critical
              }
            }

            result.issuesCreated.push({
              title: rec.title,
              status: 'created',
              issueUrl: issue.html_url,
              issueNumber: issue.number,
              copilotAssigned,
            });
          } catch (err) {
            result.issuesCreated.push({ title: rec.title, status: 'error', error: err.message });
          }
        }
      }

      scanState.results.push(result);
    }

    scanState.status = 'completed';
    scanState.completedAt = new Date().toISOString();
    scanState.progress.currentRepo = null;
    console.log(`✓ Proaktiv skanning fullført: ${scanState.results.length} repos analysert.`);
  } catch (err) {
    scanState.status = 'error';
    scanState.error = err.message;
    scanState.completedAt = new Date().toISOString();
    console.error('Proaktiv skanning feilet:', err.message);
  }
});

/**
 * GET /api/scan/status
 */
app.get('/api/scan/status', (req, res) => {
  res.json({
    status: scanState.status,
    startedAt: scanState.startedAt,
    completedAt: scanState.completedAt,
    progress: scanState.progress,
    error: scanState.error,
    options: scanState.options,
    resultCount: scanState.results.length,
  });
});

/**
 * GET /api/scan/results
 */
app.get('/api/scan/results', (req, res) => {
  const { minPriority } = req.query;
  const PRIORITY_RANK = { high: 3, medium: 2, low: 1, info: 0 };

  let results = scanState.results;

  // Optional client-side re-filter
  if (minPriority) {
    const min = PRIORITY_RANK[minPriority] || 0;
    results = results.map(r => ({
      ...r,
      recommendations: r.recommendations.filter(rec => (PRIORITY_RANK[rec.priority] || 0) >= min),
    }));
  }

  const totalRecs = results.reduce((sum, r) => sum + r.recommendations.length, 0);
  const totalIssues = results.reduce((sum, r) => sum + r.issuesCreated.length, 0);
  const issuesCreated = results.reduce(
    (sum, r) => sum + r.issuesCreated.filter(i => i.status === 'created').length, 0
  );

  res.json({
    status: scanState.status,
    startedAt: scanState.startedAt,
    completedAt: scanState.completedAt,
    summary: {
      reposScanned: results.length,
      totalRecommendations: totalRecs,
      totalIssuesAttempted: totalIssues,
      issuesCreated,
    },
    results,
  });
});

/**
/**
 * POST /api/scan/create-issues
 * Batch-opprett issues for valgte anbefalinger fra siste skanning.
 * Body: { assignCopilot?: boolean, selected?: [{ repoFullName, recIndex }] }
 * Hvis `selected` er oppgitt, opprettes kun issues for de valgte anbefalingene.
 * Uten `selected` opprettes issues for alle anbefalinger (bakoverkompatibel).
 */
app.post('/api/scan/create-issues', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token && !process.env.GITHUB_TOKEN) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (scanState.status !== 'completed' || scanState.results.length === 0) {
    return res.status(400).json({ error: 'Ingen skanningsresultater tilgjengelig. Kjør en skanning først.' });
  }

  const { assignCopilot = false, selected } = req.body || {};
  const octokit = getOctokit(token);
  const created = [];
  const skipped = [];
  const errors = [];

  // Build a lookup of selected items: { repoFullName: Set<recIndex> }
  let selectionMap = null;
  if (Array.isArray(selected) && selected.length > 0) {
    selectionMap = {};
    for (const s of selected) {
      if (!selectionMap[s.repoFullName]) selectionMap[s.repoFullName] = new Set();
      selectionMap[s.repoFullName].add(s.recIndex);
    }
  }

  for (const result of scanState.results) {
    if (result.recommendations.length === 0) continue;

    // If selection provided, skip repos not in selection
    if (selectionMap && !selectionMap[result.repo.fullName]) continue;

    // Without selection, skip repos that already had all issues created
    if (!selectionMap && result.issuesCreated.some(i => i.status === 'created')) continue;

    const [owner, repoName] = result.repo.fullName.split('/');

    // Dedup check
    let existingTitles = new Set();
    try {
      const existing = await octokit.paginate(octokit.issues.listForRepo, {
        owner, repo: repoName, state: 'open', labels: 'evo-scan', per_page: 100,
      });
      existingTitles = new Set(existing.map(i => i.title.toLowerCase().trim()));
    } catch { /* ignore */ }

    const repoSelection = selectionMap ? selectionMap[result.repo.fullName] : null;

    for (let idx = 0; idx < result.recommendations.length; idx++) {
      const rec = result.recommendations[idx];

      // If selection provided, only process selected indices
      if (repoSelection && !repoSelection.has(idx)) continue;

      // Skip already-created issues
      if (result.issuesCreated.find(ic => ic.title === rec.title && ic.status === 'created')) {
        skipped.push({ repo: result.repo.fullName, title: rec.title, reason: 'already-created' });
        continue;
      }

      const issueTitle = `[Evo] ${rec.title}`;
      if (existingTitles.has(issueTitle.toLowerCase().trim())) {
        skipped.push({ repo: result.repo.fullName, title: rec.title, reason: 'duplicate' });
        continue;
      }

      try {
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🔵' }[rec.priority] || '⚪';
        const body = `## ${priorityEmoji} ${rec.title}\n\n> Automatisk opprettet av **Evo** — proaktiv skanning.\n\n---\n\n### 📋 Beskrivelse\n\n${rec.description}\n\n${rec.marketOpportunity ? `### 💡 Forretningsverdi\n\n${rec.marketOpportunity}\n\n` : ''}---\n\n### ✅ Akseptansekriterier\n\n- [ ] Problemet er løst\n- [ ] Endringen er testet\n- [ ] PR er opprettet\n\n---\n\n*Opprettet av Evo • Prioritet: \`${rec.priority}\` • Type: \`${rec.type || 'generell'}\`*`;

        const labels = ['evo-scan'];
        if (rec.priority === 'high') labels.push('priority: high');
        if (rec.priority === 'medium') labels.push('priority: medium');

        let issue;
        try {
          const { data } = await octokit.issues.create({ owner, repo: repoName, title: issueTitle, body, labels });
          issue = data;
        } catch (labelErr) {
          if (labelErr.status === 422) {
            const { data } = await octokit.issues.create({ owner, repo: repoName, title: issueTitle, body, labels: ['evo-scan'] });
            issue = data;
          } else throw labelErr;
        }

        let copilotAssigned = false;
        if (assignCopilot && issue) {
          try {
            const iq = await octokit.graphql(`query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){issue(number:$n){id}}}`, { o: owner, r: repoName, n: issue.number });
            const aq = await octokit.graphql(`query($o:String!,$r:String!){repository(owner:$o,name:$r){suggestedActors(first:100,capabilities:CAN_BE_ASSIGNED){nodes{...on User{id login}...on Bot{id login}}}}}`, { o: owner, r: repoName });
            const bot = aq.repository.suggestedActors.nodes.find(a => a.login === 'copilot-swe-agent' || a.login === 'min-kode-agent');
            if (bot) {
              await octokit.graphql(`mutation($i:ReplaceActorsForAssignableInput!){replaceActorsForAssignable(input:$i){__typename}}`, { i: { assignableId: iq.repository.issue.id, actorIds: [bot.id] } });
              copilotAssigned = true;
            }
          } catch { /* non-critical */ }
        }

        created.push({ repo: result.repo.fullName, title: rec.title, issueUrl: issue.html_url, copilotAssigned });
        result.issuesCreated.push({ title: rec.title, status: 'created', issueUrl: issue.html_url, issueNumber: issue.number, copilotAssigned });
      } catch (err) {
        errors.push({ repo: result.repo.fullName, title: rec.title, error: err.message });
        result.issuesCreated.push({ title: rec.title, status: 'error', error: err.message });
      }
    }
  }

  res.json({
    success: true,
    summary: { created: created.length, skipped: skipped.length, errors: errors.length },
    created,
    skipped,
    errors,
  });
});

app.listen(port, () => {
  console.log(`Product Orchestrator API running on port ${port}`);
  console.log(`Visit http://localhost:${port}/api/health to check status`);
});

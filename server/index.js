require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Octokit } = require('@octokit/rest');

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

// Analyze repository and provide recommendations
function analyzeRepository(repo) {
  const recommendations = [];
  const insights = {
    hasReadme: false,
    hasLicense: false,
    hasCI: false,
    hasTests: false,
    recentActivity: false,
    hasDocumentation: false,
    openIssues: repo.open_issues_count || 0,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
  };

  // Note: README detection would require an additional API call to check repo contents
  // For now, we assume repos with good descriptions are more likely to have READMEs
  insights.hasReadme = repo.description ? true : false;
  
  // Check for recent activity (updated in last 30 days)
  const daysSinceUpdate = repo.updated_at 
    ? Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  insights.recentActivity = daysSinceUpdate < 30;

  // Generate recommendations
  if (!insights.hasReadme) {
    recommendations.push({
      type: 'documentation',
      priority: 'high',
      title: 'Add README',
      description: 'Create a comprehensive README to explain your project',
      marketOpportunity: 'Good documentation increases user adoption and contributions'
    });
  }

  if (!repo.description) {
    recommendations.push({
      type: 'metadata',
      priority: 'medium',
      title: 'Add description',
      description: 'Add a clear description to help users understand the project',
      marketOpportunity: 'Clear description improves discoverability in GitHub search'
    });
  }

  if (insights.openIssues > 10) {
    recommendations.push({
      type: 'maintenance',
      priority: 'high',
      title: 'Address open issues',
      description: `You have ${insights.openIssues} open issues. Consider triaging and addressing them.`,
      marketOpportunity: 'Active issue management shows project health and attracts contributors'
    });
  }

  if (!insights.recentActivity) {
    recommendations.push({
      type: 'activity',
      priority: 'medium',
      title: 'Update repository',
      description: `Last updated ${daysSinceUpdate} days ago. Consider adding new features or improvements.`,
      marketOpportunity: 'Regular updates signal active maintenance to potential users'
    });
  }

  if (insights.stars < 10 && repo.visibility === 'public') {
    recommendations.push({
      type: 'promotion',
      priority: 'low',
      title: 'Promote your project',
      description: 'Share your project on social media, forums, or communities',
      marketOpportunity: 'Increased visibility can lead to more users and contributors'
    });
  }

  if (!repo.homepage) {
    recommendations.push({
      type: 'website',
      priority: 'medium',
      title: 'Add project website',
      description: 'Set up a homepage or documentation site for your project',
      marketOpportunity: 'Professional website increases credibility and user trust'
    });
  }

  // Add general growth recommendations
  if (insights.stars > 50 && insights.forks < 10) {
    recommendations.push({
      type: 'market',
      priority: 'medium',
      title: 'Encourage contributions',
      description: 'Create CONTRIBUTING.md and good first issues to attract contributors',
      marketOpportunity: 'Growing contributor base accelerates product development'
    });
  }

  return {
    repo: {
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: insights.stars,
      forks: insights.forks,
      openIssues: insights.openIssues,
      updatedAt: repo.updated_at,
      visibility: repo.visibility || (repo.private ? 'private' : 'public')
    },
    insights,
    recommendations: recommendations.length > 0 ? recommendations : [{
      type: 'success',
      priority: 'info',
      title: 'Looking good!',
      description: 'This repository appears to be in good shape. Keep up the great work!',
      marketOpportunity: 'Continue monitoring trends and user feedback for optimization'
    }]
  };
}

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

    const analysis = analyzeRepository(repo);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching repository:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repository', 
      message: error.message 
    });
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

app.listen(port, () => {
  console.log(`Product Orchestrator API running on port ${port}`);
  console.log(`Visit http://localhost:${port}/api/health to check status`);
});

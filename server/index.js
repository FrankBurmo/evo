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
    
    // Get authenticated user's repositories.
    // Note: the GitHub API does not support filtering archived repos server-side,
    // so we filter them out after fetching.
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 200,
      affiliation: 'owner'
    });

    const activeRepos = repos.filter(repo => !repo.archived);

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

app.listen(port, () => {
  console.log(`Product Orchestrator API running on port ${port}`);
  console.log(`Visit http://localhost:${port}/api/health to check status`);
});

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

  // Step 2: Assign Copilot using the undocumented GitHub.com endpoint
  // This is the same endpoint the GitHub UI uses when clicking "Assign to Copilot"
  let copilotAssigned = false;
  let assignmentMethod = null;

  try {
    const assignmentUrl = `https://github.com/${owner}/${repoName}/issues/agent_assignments`;
    const assignmentPayload = {
      issue_ids: [issue.number],
      repo_name_with_owner: `${owner}/${repoName}`,
      base_ref: 'main',
      custom_instructions: '',
    };

    console.log('Method 1: Attempting Copilot assignment via GitHub UI endpoint...');
    console.log('URL:', assignmentUrl);
    console.log('Payload:', JSON.stringify(assignmentPayload, null, 2));

    const response = await fetch(assignmentUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token || process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(assignmentPayload),
    });

    console.log('Response status:', response.status, response.statusText);

    if (response.ok) {
      copilotAssigned = true;
      assignmentMethod = 'github-ui-endpoint';
      const responseData = await response.text();
      console.log(`✓ Issue #${issue.number} - Copilot assigned successfully via UI endpoint!`);
      console.log('Response:', responseData);
    } else {
      const errorText = await response.text();
      console.warn(`✗ Method 1 failed (${response.status}):`, errorText);
      throw new Error(`GitHub UI endpoint returned ${response.status}`);
    }
  } catch (assignError) {
    console.warn('✗ Method 1 (UI endpoint) failed:', assignError.message);
    
    // Fallback: Try adding a comment that triggers Copilot workspace
    try {
      console.log('Method 2: Attempting agent assignment via GitHub assignees API...');
      
      await octokit.issues.addAssignees({
        owner,
        repo: repoName,
        issue_number: issue.number,
        assignees: ['min-kode-agent'],
      });

      copilotAssigned = true;
      assignmentMethod = 'assignees-api';
      console.log(`✓ Issue #${issue.number} - min-kode-agent assigned via API!`);
    } catch (assigneeError) {
      console.warn('✗ Method 2 (assignees API) also failed:', assigneeError.message);
    }
  }

  return res.json({
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    copilotAssigned,
    assignmentMethod,
    ...(copilotAssigned && assignmentMethod === 'assignees-api' && {
      note: 'Issue created and assigned to min-kode-agent via GitHub API.',
    }),
    ...(!copilotAssigned && {
      note: 'Issue created, but min-kode-agent could not be assigned automatically. Please assign min-kode-agent manually in the issue.',
    }),
  });
});

app.listen(port, () => {
  console.log(`Product Orchestrator API running on port ${port}`);
  console.log(`Visit http://localhost:${port}/api/health to check status`);
});

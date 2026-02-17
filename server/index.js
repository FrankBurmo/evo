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
    
    // Get authenticated user's repositories
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner'
    });

    // Analyze each repository
    const analyzedRepos = repos.map(repo => analyzeRepository(repo));

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

app.listen(port, () => {
  console.log(`Product Orchestrator API running on port ${port}`);
  console.log(`Visit http://localhost:${port}/api/health to check status`);
});

/**
 * Issue-creation routes — agent issues, guardrails, product-dev, engineering-velocity.
 *
 *   POST /api/create-agent-issue
 *   POST /api/guardrails/architecture-analysis
 *   POST /api/product-dev/:actionId
 *   POST /api/engineering-velocity/:actionId
 */
const express = require('express');
const { getOctokit, extractToken, assignCopilotToIssue } = require('../github');
const {
  architectureAnalysisTemplate,
  PRODUCT_DEV_TEMPLATES,
  ENGINEERING_VELOCITY_TEMPLATES,
} = require('../templates');

const router = express.Router();

// ── POST /api/create-agent-issue ────────────────────────────────────────────
router.post('/create-agent-issue', async (req, res) => {
  const { owner, repo: repoName, recommendation } = req.body;
  const token = extractToken(req);

  if (!token) {
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

  // Create issue
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

  // Assign Copilot
  const { copilotAssigned, botLogin } = await assignCopilotToIssue(octokit, {
    owner,
    repoName,
    issueNumber: issue.number,
  });

  if (copilotAssigned) {
    console.log(`✓ Issue #${issue.number} - ${botLogin} assigned successfully via GraphQL!`);
  }

  return res.json({
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    copilotAssigned,
    assignmentMethod: copilotAssigned ? 'graphql-mutation' : null,
    note: copilotAssigned
      ? 'Issue created and assigned to Copilot agent successfully!'
      : 'Issue created, but Copilot agent could not be assigned automatically. Make sure GitHub Copilot is enabled for this repository and try assigning manually.',
  });
});

// ── POST /api/guardrails/architecture-analysis ──────────────────────────────
router.post('/guardrails/architecture-analysis', async (req, res) => {
  const { owner, repo: repoName } = req.body;
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'GitHub token required' });
  }
  if (!owner || !repoName) {
    return res.status(400).json({ error: 'Missing required fields: owner, repo' });
  }

  const octokit = getOctokit(token);
  const { title, labels, body } = architectureAnalysisTemplate(repoName);

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
    console.error('Error creating architecture analysis issue:', error);
    return res.status(500).json({ error: 'Failed to create issue', message: error.message });
  }

  const { copilotAssigned, botLogin } = await assignCopilotToIssue(octokit, {
    owner,
    repoName,
    issueNumber: issue.number,
  });

  if (copilotAssigned) {
    console.log(`✓ Architecture analysis issue #${issue.number} assigned to ${botLogin}`);
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

// ── POST /api/product-dev/:actionId ─────────────────────────────────────────
router.post('/product-dev/:actionId', async (req, res) => {
  const { actionId } = req.params;
  const { owner, repo: repoName } = req.body;
  const token = extractToken(req);

  if (!token) {
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
    const { data } = await octokit.issues.create({ owner, repo: repoName, title, body, labels });
    issue = data;
  } catch (error) {
    console.error(`Error creating product-dev issue (${actionId}):`, error);
    return res.status(500).json({ error: 'Failed to create issue', message: error.message });
  }

  const { copilotAssigned, botLogin } = await assignCopilotToIssue(octokit, {
    owner,
    repoName,
    issueNumber: issue.number,
  });

  if (copilotAssigned) {
    console.log(`✓ Product-dev issue #${issue.number} (${actionId}) assigned to ${botLogin}`);
  }

  return res.json({
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    copilotAssigned,
    note: copilotAssigned
      ? 'Produktutviklings-issue opprettet og tildelt Copilot-agent!'
      : 'Issue opprettet, men Copilot-agent kunne ikke tildeles automatisk. Tildel manuelt om nødvendig.',
  });
});

// ── POST /api/engineering-velocity/:actionId ────────────────────────────────
router.post('/engineering-velocity/:actionId', async (req, res) => {
  const { actionId } = req.params;
  const { owner, repo: repoName } = req.body;
  const token = extractToken(req);

  if (!token) {
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
    const { data } = await octokit.issues.create({ owner, repo: repoName, title, body, labels });
    issue = data;
  } catch (error) {
    console.error(`Error creating engineering-velocity issue (${actionId}):`, error);
    return res.status(500).json({ error: 'Failed to create issue', message: error.message });
  }

  const { copilotAssigned, botLogin } = await assignCopilotToIssue(octokit, {
    owner,
    repoName,
    issueNumber: issue.number,
  });

  if (copilotAssigned) {
    console.log(`✓ Engineering-velocity issue #${issue.number} (${actionId}) assigned to ${botLogin}`);
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

module.exports = router;

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
const { createTemplateIssue, validateIssueRequest } = require('../services/issue-service');

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
  const issueBody = `## 🤖 Copilot Agent-oppgave

Dette issuet ble automatisk opprettet av **Evo** og tildelt Copilot for automatisert løsning.

---

### 📋 Problembeskrivelse

**${recommendation.title}**

${recommendation.description}

${recommendation.marketOpportunity ? `### 💼 Forretningsverdi\n\n${recommendation.marketOpportunity}\n` : ''}
---

### ✅ Akseptansekriterier

- [ ] Problemet beskrevet over er løst
- [ ] Endringen er testet
- [ ] En pull request er opprettet med løsningen

---

*Automatisk opprettet av [Evo](https://github.com/FrankBurmo/evo). Prioritet: \`${recommendation.priority}\`*
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
  const validated = validateIssueRequest(req, res);
  if (!validated) return;

  const { token, owner, repoName } = validated;
  const template = architectureAnalysisTemplate(repoName);

  try {
    const result = await createTemplateIssue({
      token, owner, repoName, template,
      logPrefix: 'Architecture analysis',
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.error, message: err.message });
  }
});

// ── POST /api/product-dev/:actionId ─────────────────────────────────────────
router.post('/product-dev/:actionId', async (req, res) => {
  const { actionId } = req.params;
  const validated = validateIssueRequest(req, res);
  if (!validated) return;

  const templateFn = PRODUCT_DEV_TEMPLATES[actionId];
  if (!templateFn) {
    return res.status(400).json({ error: `Unknown product-dev action: ${actionId}` });
  }

  const { token, owner, repoName } = validated;
  const template = templateFn(repoName);

  try {
    const result = await createTemplateIssue({
      token, owner, repoName, template,
      logPrefix: `Product-dev (${actionId})`,
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.error, message: err.message });
  }
});

// ── POST /api/engineering-velocity/:actionId ────────────────────────────────
router.post('/engineering-velocity/:actionId', async (req, res) => {
  const { actionId } = req.params;
  const validated = validateIssueRequest(req, res);
  if (!validated) return;

  const templateFn = ENGINEERING_VELOCITY_TEMPLATES[actionId];
  if (!templateFn) {
    return res.status(400).json({ error: `Unknown engineering-velocity action: ${actionId}` });
  }

  const { token, owner, repoName } = validated;
  const template = templateFn(repoName);

  try {
    const result = await createTemplateIssue({
      token, owner, repoName, template,
      logPrefix: `Engineering-velocity (${actionId})`,
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.error, message: err.message });
  }
});

module.exports = router;

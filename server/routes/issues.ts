/**
 * Issue-creation routes — agent issues, guardrails, product-dev, engineering-velocity.
 *
 *   POST /api/create-agent-issue
 *   POST /api/guardrails/architecture-analysis
 *   POST /api/product-dev/:actionId
 *   POST /api/engineering-velocity/:actionId
 */
import { Router } from 'express';
import { getOctokit, assignCopilotToIssue } from '../github';
import {
  architectureAnalysisTemplate,
  PRODUCT_DEV_TEMPLATES,
  ENGINEERING_VELOCITY_TEMPLATES,
} from '../templates';
import { createTemplateIssue, validateIssueRequest } from '../services/issue-service';
import { requireAuth } from '../middleware';
import {
  validate,
  createAgentIssueSchema,
  templateIssueSchema,
  actionIdParamsSchema,
} from '../validation';

const router = Router();

// ── POST /api/create-agent-issue ────────────────────────────────────────────
router.post(
  '/create-agent-issue',
  requireAuth,
  validate({ body: createAgentIssueSchema }),
  async (req, res, next) => {
    try {
      const { owner, repo: repoName, recommendation } = req.body as {
        owner: string;
        repo: string;
        recommendation: {
          title: string;
          description: string;
          priority: string;
          type?: string;
          marketOpportunity?: string;
        };
      };
      const octokit = getOctokit(req.token);

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

      const labels: string[] = ['copilot:run'];
      if (recommendation.priority === 'high') labels.push('priority: high');
      if (recommendation.type) labels.push(recommendation.type);

      const { data: issue } = await octokit.issues.create({
        owner,
        repo: repoName,
        title: issueTitle,
        body: issueBody,
        labels,
      });

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
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /api/guardrails/architecture-analysis ──────────────────────────────
router.post(
  '/guardrails/architecture-analysis',
  requireAuth,
  validate({ body: templateIssueSchema }),
  async (req, res, next) => {
    const { owner, repo: repoName } = req.body as { owner: string; repo: string };
    const template = architectureAnalysisTemplate(repoName);

    try {
      const result = await createTemplateIssue({
        token: req.token,
        owner,
        repoName,
        template,
        logPrefix: 'Architecture analysis',
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/product-dev/:actionId ─────────────────────────────────────────
router.post(
  '/product-dev/:actionId',
  requireAuth,
  validate({ params: actionIdParamsSchema, body: templateIssueSchema }),
  async (req, res, next) => {
    const { actionId } = req.params as { actionId: string };

    const templateFn = PRODUCT_DEV_TEMPLATES[actionId];
    if (!templateFn || typeof templateFn !== 'function') {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Ukjent product-dev action: ${actionId}`,
        statusCode: 400,
      });
    }

    const { owner, repo: repoName } = req.body as { owner: string; repo: string };
    const template = templateFn(repoName);

    try {
      const result = await createTemplateIssue({
        token: req.token,
        owner,
        repoName,
        template,
        logPrefix: `Product-dev (${actionId})`,
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/engineering-velocity/:actionId ────────────────────────────────
router.post(
  '/engineering-velocity/:actionId',
  requireAuth,
  validate({ params: actionIdParamsSchema, body: templateIssueSchema }),
  async (req, res, next) => {
    const { actionId } = req.params as { actionId: string };

    const templateFn = ENGINEERING_VELOCITY_TEMPLATES[actionId];
    if (!templateFn || typeof templateFn !== 'function') {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Ukjent engineering-velocity action: ${actionId}`,
        statusCode: 400,
      });
    }

    const { owner, repo: repoName } = req.body as { owner: string; repo: string };
    const template = templateFn(repoName);

    try {
      const result = await createTemplateIssue({
        token: req.token,
        owner,
        repoName,
        template,
        logPrefix: `Engineering-velocity (${actionId})`,
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export = router;

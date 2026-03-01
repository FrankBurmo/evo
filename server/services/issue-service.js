'use strict';

/**
 * server/services/issue-service.js — Felles logikk for issue-opprettelse + Copilot-tildeling.
 *
 * Eliminerer duplikat mellom guardrails-, product-dev-, og engineering-velocity-ruter.
 */

const { getOctokit, extractToken, assignCopilotToIssue } = require('../github');

/**
 * Opprett et GitHub Issue fra en template og tildel Copilot-agenten.
 *
 * @param {object} opts
 * @param {string} opts.token   — GitHub PAT
 * @param {string} opts.owner   — Repo-eier
 * @param {string} opts.repoName — Repo-navn
 * @param {object} opts.template — { title, labels, body } fra template-funksjon
 * @param {string} opts.logPrefix — Prefiks for console.log (f.eks. 'Architecture analysis')
 * @returns {Promise<object>} — Standardisert respons-objekt for ruten
 */
async function createTemplateIssue({ token, owner, repoName, template, logPrefix }) {
  const octokit = getOctokit(token);
  const { title, labels, body } = template;

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
    console.error(`Error creating ${logPrefix} issue:`, error);
    throw { status: 500, error: 'Failed to create issue', message: error.message };
  }

  const { copilotAssigned, botLogin } = await assignCopilotToIssue(octokit, {
    owner,
    repoName,
    issueNumber: issue.number,
  });

  if (copilotAssigned) {
    console.log(`✓ ${logPrefix} issue #${issue.number} assigned to ${botLogin}`);
  }

  return {
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    copilotAssigned,
    note: copilotAssigned
      ? 'Issue opprettet og tildelt Copilot-agent!'
      : 'Issue opprettet, men Copilot-agent kunne ikke tildeles automatisk. Tildel manuelt om nødvendig.',
  };
}

/**
 * Express-middleware-hjelper: valider token, owner og repo fra request.
 * Returnerer { token, owner, repoName } eller sender feilrespons.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {{ token: string, owner: string, repoName: string } | null}
 */
function validateIssueRequest(req, res) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'GitHub token required' });
    return null;
  }

  const { owner, repo: repoName } = req.body;
  if (!owner || !repoName) {
    res.status(400).json({ error: 'Missing required fields: owner, repo' });
    return null;
  }

  return { token, owner, repoName };
}

module.exports = { createTemplateIssue, validateIssueRequest };

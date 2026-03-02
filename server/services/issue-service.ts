/**
 * server/services/issue-service.ts — Felles logikk for issue-opprettelse + Copilot-tildeling.
 *
 * Eliminerer duplikat mellom guardrails-, product-dev-, og engineering-velocity-ruter.
 */
import { getOctokit, extractToken, assignCopilotToIssue } from '../github';
import type { IssueTemplate } from '../types';
import type { Request, Response } from 'express';

interface CreateTemplateIssueParams {
  token: string;
  owner: string;
  repoName: string;
  template: IssueTemplate;
  logPrefix: string;
}

interface CreateTemplateIssueResult {
  success: boolean;
  issueUrl: string;
  issueNumber: number;
  copilotAssigned: boolean;
  note: string;
}

/**
 * Opprett et GitHub Issue fra en template og tildel Copilot-agenten.
 */
export async function createTemplateIssue({
  token,
  owner,
  repoName,
  template,
  logPrefix,
}: CreateTemplateIssueParams): Promise<CreateTemplateIssueResult> {
  const octokit = getOctokit(token);
  const { title, labels, body } = template;

  let issue: { html_url: string; number: number };
  try {
    const { data } = await octokit.issues.create({
      owner,
      repo: repoName,
      title,
      body,
      labels,
    });
    issue = data;
  } catch (error: unknown) {
    console.error(`Error creating ${logPrefix} issue:`, error);
    throw {
      status: 500,
      error: 'Failed to create issue',
      message: (error as Error).message,
    };
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

interface ValidatedIssueRequest {
  token: string;
  owner: string;
  repoName: string;
}

/**
 * Express-middleware-hjelper: valider token, owner og repo fra request.
 * Returnerer { token, owner, repoName } eller sender feilrespons.
 */
export function validateIssueRequest(
  req: Request,
  res: Response,
): ValidatedIssueRequest | null {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'GitHub token required' });
    return null;
  }

  const { owner, repo: repoName } = req.body as { owner?: string; repo?: string };
  if (!owner || !repoName) {
    res.status(400).json({ error: 'Missing required fields: owner, repo' });
    return null;
  }

  return { token, owner, repoName };
}

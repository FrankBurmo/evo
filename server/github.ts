/**
 * GitHub API helpers — Octokit instantiation and Copilot assignment.
 */
import { Octokit } from '@octokit/rest';
import type { Request } from 'express';

/**
 * Create an authenticated Octokit instance.
 */
export function getOctokit(token?: string): Octokit {
  return new Octokit({
    auth: token || process.env.GITHUB_TOKEN,
  });
}

/**
 * Extract a bearer token from the Authorization header (or fall back to env).
 * Returns null when no token is available.
 *
 * A7: Case-insensitiv — støtter 'Bearer', 'bearer', 'BEARER' etc.
 */
export function extractToken(req: Request): string | null {
  const authHeader = (req.headers.authorization as string) || '';
  const lower = authHeader.toLowerCase();
  if (lower.startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  return process.env.GITHUB_TOKEN || null;
}

interface AssignCopilotOptions {
  owner: string;
  repoName: string;
  issueNumber: number;
}

interface AssignCopilotResult {
  copilotAssigned: boolean;
  botLogin?: string;
}

/**
 * Assign the Copilot coding-agent to an existing issue via GraphQL.
 */
export async function assignCopilotToIssue(
  octokit: Octokit,
  { owner, repoName, issueNumber }: AssignCopilotOptions,
): Promise<AssignCopilotResult> {
  try {
    // 1. Get issue node ID
    const issueQuery = await octokit.graphql<{
      repository: { issue: { id: string } };
    }>(
      `query GetIssueNodeId($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) { id }
        }
      }`,
      { owner, repo: repoName, number: issueNumber },
    );
    const issueNodeId = issueQuery.repository.issue.id;

    // 2. Find assignable Copilot bot
    const actorsQuery = await octokit.graphql<{
      repository: {
        suggestedActors: {
          nodes: Array<{ id: string; login: string; __typename: string }>;
        };
      };
    }>(
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
      { owner, repo: repoName },
    );

    const copilotBot = actorsQuery.repository.suggestedActors.nodes.find(
      (actor) => actor.login === 'min-kode-agent' || actor.login === 'copilot-swe-agent',
    );

    if (!copilotBot) {
      return { copilotAssigned: false };
    }

    // 3. Assign via mutation
    await octokit.graphql(
      `mutation ReplaceActorsForAssignable($input: ReplaceActorsForAssignableInput!) {
        replaceActorsForAssignable(input: $input) { __typename }
      }`,
      { input: { assignableId: issueNodeId, actorIds: [copilotBot.id] } },
    );

    return { copilotAssigned: true, botLogin: copilotBot.login };
  } catch (err: unknown) {
    console.warn('Copilot assignment failed:', (err as Error).message);
    return { copilotAssigned: false };
  }
}

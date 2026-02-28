/**
 * GitHub API helpers — Octokit instantiation and Copilot assignment.
 */
const { Octokit } = require('@octokit/rest');

/**
 * Create an authenticated Octokit instance.
 * @param {string} [token] – GitHub PAT (falls back to GITHUB_TOKEN env var)
 * @returns {Octokit}
 */
function getOctokit(token) {
  return new Octokit({
    auth: token || process.env.GITHUB_TOKEN,
  });
}

/**
 * Extract a bearer token from the Authorization header (or fall back to env).
 * Returns null when no token is available.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  return req.headers.authorization?.replace('Bearer ', '') || process.env.GITHUB_TOKEN || null;
}

/**
 * Assign the Copilot coding-agent to an existing issue via GraphQL.
 *
 * @param {Octokit} octokit – authenticated Octokit instance
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repoName
 * @param {number} opts.issueNumber
 * @returns {Promise<{copilotAssigned: boolean, botLogin?: string}>}
 */
async function assignCopilotToIssue(octokit, { owner, repoName, issueNumber }) {
  try {
    // 1. Get issue node ID
    const issueQuery = await octokit.graphql(
      `query GetIssueNodeId($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) { id }
        }
      }`,
      { owner, repo: repoName, number: issueNumber },
    );
    const issueNodeId = issueQuery.repository.issue.id;

    // 2. Find assignable Copilot bot
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
  } catch (err) {
    console.warn('Copilot assignment failed:', err.message);
    return { copilotAssigned: false };
  }
}

module.exports = { getOctokit, extractToken, assignCopilotToIssue };

/**
 * packages/cli/src/issues.ts — GitHub Issue-opprettelse for CLI.
 */
import { Octokit } from '@octokit/rest';
import type { Recommendation } from '../../../packages/core';

/**
 * Sjekk om et lignende issue allerede eksisterer (dedup).
 */
async function issueAlreadyExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
): Promise<boolean> {
  try {
    const issues = await octokit.paginate(octokit.issues.listForRepo, {
      owner,
      repo,
      state: 'open',
      labels: 'evo-scan',
      per_page: 100,
    });
    const normalizedTitle = title.toLowerCase().trim();
    return issues.some((i) => i.title.toLowerCase().trim() === normalizedTitle);
  } catch {
    return false; // Ved feil: anta at det ikke finnes
  }
}

interface CreateIssueParams {
  token: string;
  owner: string;
  repo: string;
  recommendation: Recommendation & { marketOpportunity?: string };
  dryRun?: boolean;
}

/**
 * Opprett ett GitHub Issue for en anbefaling.
 * @returns URL til opprettet issue, eller null ved feil/tørrkjøring
 */
export async function createIssue({
  token,
  owner,
  repo,
  recommendation,
  dryRun = false,
}: CreateIssueParams): Promise<string | null> {
  const octokit = new Octokit({ auth: token });

  const title = `[Evo] ${recommendation.title}`;
  const body = buildIssueBody(recommendation, `${owner}/${repo}`);

  if (dryRun) {
    return `[dry-run] ${owner}/${repo}#? – "${title}"`;
  }

  const exists = await issueAlreadyExists(octokit, owner, repo, title);
  if (exists) {
    return null;
  }

  try {
    const labels: string[] = ['evo-scan'];
    if (recommendation.priority === 'high') labels.push('priority: high');
    if (recommendation.priority === 'medium') labels.push('priority: medium');
    if (recommendation.type) labels.push(recommendation.type);

    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });

    return data.html_url;
  } catch (err: unknown) {
    // Prøv uten labels hvis label-opprettelse feiler
    if ((err as { status?: number }).status === 422) {
      const { data } = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
        labels: ['evo-scan'],
      });
      return data.html_url;
    }
    throw err;
  }
}

function buildIssueBody(
  rec: Recommendation & { marketOpportunity?: string },
  repoFullName: string,
): string {
  const priorityEmoji =
    ({ high: '🔴', medium: '🟡', low: '🔵' } as Record<string, string>)[rec.priority] || '⚪';

  return `## ${priorityEmoji} ${rec.title}

> Automatisk opprettet av **[Evo](https://github.com/FrankBurmo/product-orchestrator)** – proaktiv repo-assistent.

---

### 📋 Beskrivelse

${rec.description}

${rec.marketOpportunity ? `### 💡 Forretningsverdi\n\n${rec.marketOpportunity}\n` : ''}

---

### ✅ Akseptansekriterier

- [ ] Problemet beskrevet over er løst
- [ ] Endringen er testet
- [ ] En pull request er opprettet med løsningen

---

*Opprettet av Evo • Prioritet: \`${rec.priority}\` • Type: \`${rec.type || 'generell'}\`*  
*Repo: \`${repoFullName}\`*
`;
}

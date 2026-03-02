'use strict';

const { Octokit } = require('@octokit/rest');

/**
 * Sjekk om et lignende issue allerede eksisterer (dedup).
 */
async function issueAlreadyExists(octokit, owner, repo, title) {
  try {
    const issues = await octokit.paginate(octokit.issues.listForRepo, {
      owner,
      repo,
      state: 'open',
      labels: 'evo-scan',
      per_page: 100,
    });
    const normalizedTitle = title.toLowerCase().trim();
    return issues.some(i => i.title.toLowerCase().trim() === normalizedTitle);
  } catch {
    return false; // Ved feil: anta at det ikke finnes
  }
}

/**
 * Opprett ett GitHub Issue for en anbefaling.
 * @returns {Promise<string|null>} URL til opprettet issue, eller null ved feil/tørrkjøring
 */
async function createIssue({ token, owner, repo, recommendation, dryRun = false }) {
  const octokit = new Octokit({ auth: token });

  const title = `[Evo] ${recommendation.title}`;
  const body = buildIssueBody(recommendation, `${owner}/${repo}`);

  if (dryRun) {
    return `[dry-run] ${owner}/${repo}#? – "${title}"`;
  }

  // Dedup-sjekk
  const exists = await issueAlreadyExists(octokit, owner, repo, title);
  if (exists) {
    return null; // Issue finnes allerede
  }

  try {
    const labels = ['evo-scan'];
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
  } catch (/** @type {any} */ err) {
    // Prøv uten labels hvis label-opprettelse feiler
    if (err.status === 422) {
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

function buildIssueBody(rec, repoFullName) {
  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🔵' }[rec.priority] || '⚪';

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

module.exports = { createIssue };

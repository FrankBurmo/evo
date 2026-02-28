'use strict';

const { Octokit } = require('@octokit/rest');
const { analyzeRepository } = require('./analyzer');
const { analyzeWithAI } = require('./copilot');
const { createIssue } = require('./issues');
const {
  printInfo,
  printSuccess,
  printError,
  printProgress,
  printRepoResult,
  printSummary,
} = require('./output');

const PRIORITY_RANK = { high: 3, medium: 2, low: 1, info: 0, success: 0 };

function meetsMinPriority(recPriority, minPriority) {
  return (PRIORITY_RANK[recPriority] || 0) >= (PRIORITY_RANK[minPriority] || 0);
}

/**
 * Hovedfunksjon: skann repos, analyser, opprett issues.
 */
async function runScan({
  token,
  owner,
  repo: singleRepo,
  model,
  minPriority,
  createIssues,
  dryRun,
  useAi,
  maxRepos,
  maxIssuesPerRepo,
  assignCopilot,
  jsonOutput,
  filters,
  categories,
}) {
  const octokit = new Octokit({ auth: token });
  const startTime = Date.now();

  // Config-drevne filtre
  const includeRepos = (filters && filters.includeRepos) || [];
  const excludeRepos = (filters && filters.excludeRepos) || [];
  const includeLanguages = (filters && filters.includeLanguages) || [];
  const excludeLanguages = (filters && filters.excludeLanguages) || [];
  const enabledCategories = categories || {};

  // ── Hent repos ────────────────────────────────────────────────
  let repos = [];

  if (singleRepo) {
    // Støtter format "owner/repo" eller bare "repo" (bruker da autentisert bruker)
    const [repoOwner, repoName] = singleRepo.includes('/')
      ? singleRepo.split('/')
      : [owner, singleRepo];

    if (!repoOwner) {
      throw new Error('Oppgi --owner eller bruk format "owner/repo" med --repo');
    }

    if (!jsonOutput) printInfo(`Henter repo: ${repoOwner}/${repoName}...`);
    const { data } = await octokit.repos.get({ owner: repoOwner, repo: repoName });
    repos = [data];
  } else {
    if (!jsonOutput) printInfo('Henter alle dine repos fra GitHub...');

    const fetchOpts = owner
      ? { type: 'owner', sort: 'updated', per_page: 100 }
      : { sort: 'updated', affiliation: 'owner', per_page: 100 };

    const allRepos = owner
      ? await octokit.paginate(octokit.repos.listForUser, { username: owner, ...fetchOpts })
      : await octokit.paginate(octokit.repos.listForAuthenticatedUser, fetchOpts);

    repos = allRepos
      .filter(r => !r.archived)
      .slice(0, maxRepos);
  }

  // Anvend config-filtre (include/exclude repos og språk)
  if (!singleRepo) {
    if (includeRepos.length > 0) {
      const includeSet = new Set(includeRepos.map(r => r.toLowerCase()));
      repos = repos.filter(r =>
        includeSet.has(r.full_name.toLowerCase()) || includeSet.has(r.name.toLowerCase())
      );
    }
    if (excludeRepos.length > 0) {
      const excludeSet = new Set(excludeRepos.map(r => r.toLowerCase()));
      repos = repos.filter(r =>
        !excludeSet.has(r.full_name.toLowerCase()) && !excludeSet.has(r.name.toLowerCase())
      );
    }
    if (includeLanguages.length > 0) {
      const langSet = new Set(includeLanguages.map(l => l.toLowerCase()));
      repos = repos.filter(r => r.language && langSet.has(r.language.toLowerCase()));
    }
    if (excludeLanguages.length > 0) {
      const langSet = new Set(excludeLanguages.map(l => l.toLowerCase()));
      repos = repos.filter(r => !r.language || !langSet.has(r.language.toLowerCase()));
    }
  }

  if (!jsonOutput) printInfo(`${repos.length} repo(s) klar til analyse.\n`);

  // ── Analyser hvert repo ───────────────────────────────────────
  const results = [];

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];

    if (!jsonOutput) {
      printProgress(i + 1, repos.length, repo.name);
    }

    // 1. Regelbasert analyse
    const { repo: repoData, recommendations: ruleRecs } = analyzeRepository(repo);

    // 2. AI-analyse (valgfritt)
    let aiSummary = null;
    let aiRecs = [];

    if (useAi) {
      try {
        const aiResult = await analyzeWithAI({
          token,
          model,
          repo: repoData,
          existingRecs: ruleRecs.map(r => r.title),
        });
        aiSummary = aiResult.summary || null;
        aiRecs = (aiResult.recommendations || []).map(r => ({
          ...r,
          source: 'ai',
        }));
      } catch (err) {
        // AI-feil er ikke kritisk – fall tilbake til regelbasert
        if (!jsonOutput) {
          process.stdout.write('\n');
          printError(`AI-analyse feilet for ${repo.name}: ${err.message} – bruker regelbasert.`);
        }
      }
    }

    // 3. Slå sammen anbefalinger, filtrer på min-prioritet og kategorier
    const allRecs = [...ruleRecs, ...aiRecs]
      .filter(r => meetsMinPriority(r.priority, minPriority))
      .filter(r => {
        // Filtrer på aktiverte kategorier (hvis konfigurert)
        if (!r.type || Object.keys(enabledCategories).length === 0) return true;
        return enabledCategories[r.type] !== false;
      });

    // 4. Opprett issues (hvis aktivert), respekter maxIssuesPerRepo
    let issuesCreatedForRepo = 0;
    for (const rec of allRecs) {
      if (createIssues || dryRun) {
        if (maxIssuesPerRepo > 0 && issuesCreatedForRepo >= maxIssuesPerRepo) break;
        try {
          const [rOwner, rName] = repoData.fullName.split('/');
          const issueUrl = await createIssue({
            token,
            owner: rOwner,
            repo: rName,
            recommendation: rec,
            dryRun,
          });
          if (issueUrl) {
            rec.issueUrl = issueUrl;
            issuesCreatedForRepo++;
          }
        } catch (err) {
          if (!jsonOutput) {
            process.stdout.write('\n');
            printError(`Kunne ikke opprette issue for "${rec.title}": ${err.message}`);
          }
        }
      }
    }

    results.push({ repo: repoData, recommendations: allRecs, aiSummary });
  }

  if (!jsonOutput) process.stdout.write('\n\n');

  // ── Output ────────────────────────────────────────────────────
  if (jsonOutput) {
    console.log(JSON.stringify({ results, scannedAt: new Date().toISOString() }, null, 2));
    return;
  }

  // Vis resultater per repo
  for (const result of results) {
    printRepoResult(result, { createIssues, dryRun });
  }

  // Sammendrag
  printSummary(results, {
    createIssues,
    dryRun,
    elapsed: Date.now() - startTime,
  });

  // Hint
  if (!createIssues && !dryRun && results.some(r => r.recommendations.length > 0)) {
    printInfo('Tips: Legg til --create-issues for å opprette GitHub Issues automatisk.');
    printInfo('      Legg til --dry-run for å forhåndsvise uten å opprette.\n');
  }
}

module.exports = { runScan };

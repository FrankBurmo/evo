'use strict';

// ANSI-farger uten eksterne avhengigheter
const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
};

const PRIORITY_COLOR = {
  high:    c.red,
  medium:  c.yellow,
  low:     c.cyan,
  info:    c.green,
  success: c.green,
};

const PRIORITY_LABEL = {
  high:    '🔴 HIGH  ',
  medium:  '🟡 MEDIUM',
  low:     '🔵 LOW   ',
  info:    '✅ INFO  ',
  success: '✅ OK    ',
};

function printBanner(version) {
  console.log('');
  console.log(`${c.bold}${c.green}  ███████╗██╗   ██╗ ██████╗${c.reset}`);
  console.log(`${c.bold}${c.green}  ██╔════╝██║   ██║██╔═══██╗${c.reset}`);
  console.log(`${c.bold}${c.green}  █████╗  ██║   ██║██║   ██║${c.reset}`);
  console.log(`${c.bold}${c.green}  ██╔══╝  ╚██╗ ██╔╝██║   ██║${c.reset}`);
  console.log(`${c.bold}${c.green}  ███████╗ ╚████╔╝ ╚██████╔╝${c.reset}`);
  console.log(`${c.bold}${c.green}  ╚══════╝  ╚═══╝   ╚═════╝ ${c.reset}  ${c.dim}v${version}${c.reset}`);
  console.log('');
  console.log(`  ${c.dim}Produktene dine vokser kontinuerlig – automatisk.${c.reset}`);
  console.log('');
}

function printError(msg) {
  console.error(`\n${c.red}${c.bold}✗ Feil:${c.reset} ${msg}\n`);
}

function printInfo(msg) {
  console.log(`${c.cyan}ℹ${c.reset} ${msg}`);
}

function printSuccess(msg) {
  console.log(`${c.green}✓${c.reset} ${msg}`);
}

function printProgress(current, total, repoName) {
  const pct = Math.round((current / total) * 100);
  const bar = buildProgressBar(pct, 20);
  process.stdout.write(
    `\r  ${c.dim}[${bar}]${c.reset} ${c.bold}${pct}%${c.reset} ${c.gray}(${current}/${total})${c.reset} ${repoName.slice(0, 30).padEnd(30)}`
  );
}

function buildProgressBar(pct, width) {
  const filled = Math.round((pct / 100) * width);
  return `${c.green}${'█'.repeat(filled)}${c.reset}${c.dim}${'░'.repeat(width - filled)}${c.reset}`;
}

function printRepoResult(result, opts = {}) {
  const { createIssues, dryRun } = opts;
  const { repo, recommendations, aiSummary } = result;

  const visibilityTag = repo.visibility === 'private'
    ? `${c.dim}[privat]${c.reset}`
    : `${c.green}[offentlig]${c.reset}`;

  console.log(`\n  ${c.bold}${c.blue}${repo.name}${c.reset} ${visibilityTag}`);
  if (repo.description) {
    console.log(`  ${c.dim}${repo.description}${c.reset}`);
  }
  console.log(
    `  ${c.dim}⭐ ${repo.stars}  🍴 ${repo.forks}  🐛 ${repo.openIssues}  ` +
    `${repo.language || 'ukjent språk'}${c.reset}`
  );

  if (aiSummary) {
    console.log(`\n  ${c.magenta}${c.bold}AI-analyse:${c.reset}`);
    const lines = aiSummary.split('\n').slice(0, 5);
    lines.forEach(l => l.trim() && console.log(`  ${c.magenta}${l}${c.reset}`));
  }

  if (recommendations.length === 0) {
    console.log(`  ${c.green}✓ Ingen anbefalinger – alt ser bra ut!${c.reset}`);
    return;
  }

  recommendations.forEach((rec, i) => {
    const pCol = PRIORITY_COLOR[rec.priority] || c.white;
    const pLbl = PRIORITY_LABEL[rec.priority] || rec.priority.toUpperCase();
    console.log(`\n  ${i + 1}. ${pCol}${pLbl}${c.reset} ${c.bold}${rec.title}${c.reset}`);
    console.log(`     ${rec.description}`);
    if (rec.marketOpportunity) {
      console.log(`     ${c.dim}💡 ${rec.marketOpportunity}${c.reset}`);
    }
    if (rec.issueUrl) {
      const action = dryRun ? '(dry-run)' : '';
      console.log(`     ${c.green}→ Issue opprettet:${c.reset} ${rec.issueUrl} ${c.dim}${action}${c.reset}`);
    }
  });
}

function printSummary(results, opts = {}) {
  const { createIssues, dryRun, elapsed } = opts;

  const total = results.length;
  const totalRecs = results.reduce((s, r) => s + r.recommendations.length, 0);
  const highCount = results.reduce(
    (s, r) => s + r.recommendations.filter(x => x.priority === 'high').length, 0
  );
  const issuesCreated = results.reduce(
    (s, r) => s + r.recommendations.filter(x => x.issueUrl).length, 0
  );

  console.log('\n');
  console.log(`  ${c.bold}${'─'.repeat(50)}${c.reset}`);
  console.log(`  ${c.bold}Sammendrag${c.reset}`);
  console.log(`  ${'─'.repeat(50)}`);
  console.log(`  Repos skannet:          ${c.bold}${total}${c.reset}`);
  console.log(`  Totale anbefalinger:    ${c.bold}${totalRecs}${c.reset}`);
  console.log(`  Høy prioritet:          ${c.bold}${c.red}${highCount}${c.reset}`);

  if (createIssues || dryRun) {
    const label = dryRun ? '(dry-run, ikke opprettet)' : 'opprettet';
    console.log(`  GitHub Issues ${label}:  ${c.bold}${c.green}${issuesCreated}${c.reset}`);
  }

  if (elapsed) {
    console.log(`  Kjøretid:               ${c.dim}${(elapsed / 1000).toFixed(1)}s${c.reset}`);
  }

  console.log(`  ${'─'.repeat(50)}`);
  console.log('');
}

module.exports = { printBanner, printError, printInfo, printSuccess, printProgress, printRepoResult, printSummary };

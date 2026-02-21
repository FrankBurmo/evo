#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { runScan } = require('../src/scanner');
const { printBanner, printError } = require('../src/output');
const { version } = require('../package.json');

program
  .name('evo-scan')
  .description('Proaktiv GitHub-repo-analyse drevet av GitHub Copilot AI')
  .version(version);

program
  .command('scan', { isDefault: true })
  .description('Skann GitHub-repos og generer anbefalinger')
  .option('-t, --token <token>', 'GitHub Personal Access Token (eller sett GITHUB_TOKEN env)')
  .option('-o, --owner <owner>', 'GitHub-bruker eller org å skanne (standard: autentisert bruker)')
  .option('-r, --repo <repo>', 'Skann kun ett spesifikt repo (format: owner/repo eller bare repo-navn)')
  .option('-m, --model <model>', 'AI-modell for analyse', 'openai/gpt-4.1')
  .option('-p, --min-priority <priority>', 'Minste prioritet for å vise/opprette (high|medium|low)', 'medium')
  .option('--create-issues', 'Opprett GitHub Issues for alle anbefalinger over min-priority', false)
  .option('--dry-run', 'Vis hva som ville blitt gjort uten å opprette issues', false)
  .option('--no-ai', 'Kjør kun regelbasert analyse uten AI (ingen Copilot Models API-kall)', false)
  .option('--max-repos <n>', 'Maksimalt antall repos å skanne', parseInt, 50)
  .option('--json', 'Skriv resultater som JSON til stdout', false)
  .action(async (options) => {
    const token = options.token || process.env.GITHUB_TOKEN;

    if (!token) {
      printError(
        'GitHub token mangler.\n' +
        'Bruk --token <token> eller sett GITHUB_TOKEN-miljøvariabelen.\n\n' +
        'Generer et token på: https://github.com/settings/tokens/new\n' +
        'Nødvendige scopes: repo, models:read (for AI-analyse)'
      );
      process.exit(1);
    }

    if (!options.json) {
      printBanner(version);
    }

    try {
      await runScan({
        token,
        owner: options.owner || null,
        repo: options.repo || null,
        model: options.model,
        minPriority: options.minPriority,
        createIssues: options.createIssues && !options.dryRun,
        dryRun: options.dryRun,
        useAi: options.ai !== false,
        maxRepos: options.maxRepos,
        jsonOutput: options.json,
      });
    } catch (err) {
      printError(err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

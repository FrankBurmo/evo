#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { runScan } = require('../src/scanner');
const { printBanner, printError, printInfo } = require('../src/output');
const { version } = require('../package.json');

/**
 * Les og merg scan-config.json med CLI-flagg.
 * CLI-flagg har alltid høyeste prioritet.
 */
function loadConfig(configPath) {
  const resolvedPath = path.resolve(configPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Konfigurasjonsfil ikke funnet: ${resolvedPath}`);
  }
  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  return JSON.parse(raw);
}

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
  .option('-c, --config <path>', 'Sti til scan-config.json konfigurasjonsfil')
  .option('-m, --model <model>', 'AI-modell for analyse')
  .option('-p, --min-priority <priority>', 'Minste prioritet for å vise/opprette (high|medium|low)')
  .option('--create-issues', 'Opprett GitHub Issues for alle anbefalinger over min-priority')
  .option('--dry-run', 'Vis hva som ville blitt gjort uten å opprette issues', false)
  .option('--no-ai', 'Kjør kun regelbasert analyse uten AI (ingen Copilot Models API-kall)')
  .option('--max-repos <n>', 'Maksimalt antall repos å skanne', parseInt)
  .option('--max-issues-per-repo <n>', 'Maks issues per repo per kjøring', parseInt)
  .option('--json', 'Skriv resultater som JSON til stdout', false)
  .action(async (options) => {
    // Load config file if provided (or auto-detect scan-config.json in cwd)
    let config = {};
    const configPath = options.config || null;
    const autoConfigPath = path.resolve(process.cwd(), 'scan-config.json');

    try {
      if (configPath) {
        config = loadConfig(configPath);
        if (!options.json) printInfo(`Konfigurasjon lastet fra: ${configPath}`);
      } else if (fs.existsSync(autoConfigPath)) {
        config = loadConfig(autoConfigPath);
        if (!options.json) printInfo('Konfigurasjon lastet fra: scan-config.json');
      }
    } catch (/** @type {any} */ err) {
      if (configPath) {
        // Eksplisitt --config: feil er kritisk
        printError(`Kunne ikke laste konfigurasjon: ${err.message}`);
        process.exit(1);
      }
      // Auto-detect: ignorer feil
    }

    const scanCfg = config.scan || {};
    const filtersCfg = config.filters || {};
    const categoriesCfg = config.categories || {};

    // Merge: CLI flags override config, config overrides defaults
    const token = options.token || process.env.GITHUB_TOKEN || undefined;
    const model = options.model || scanCfg.model || 'openai/gpt-4.1';
    const minPriority = options.minPriority || scanCfg.minPriority || 'medium';
    const maxRepos = options.maxRepos || scanCfg.maxRepos || 50;
    const maxIssuesPerRepo = options.maxIssuesPerRepo || scanCfg.maxIssuesPerRepo || 0;
    const createIssues = options.createIssues !== undefined ? options.createIssues : (scanCfg.createIssues || false);
    const useAi = options.ai !== false ? (scanCfg.useAI !== false) : false;
    const assignCopilot = scanCfg.assignCopilot || false;

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
        model,
        minPriority,
        createIssues: createIssues && !options.dryRun,
        dryRun: options.dryRun,
        useAi,
        maxRepos,
        maxIssuesPerRepo,
        assignCopilot,
        jsonOutput: options.json,
        filters: filtersCfg,
        categories: categoriesCfg,
      });
    } catch (/** @type {any} */ err) {
      printError(err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

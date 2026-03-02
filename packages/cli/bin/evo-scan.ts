#!/usr/bin/env node
/**
 * packages/cli/bin/evo-scan.ts — CLI entry point.
 * Kjøres via: tsx bin/evo-scan.ts
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { program } from 'commander';
import { runScan } from '../src/scanner';
import { printBanner, printError, printInfo } from '../src/output';

const pkgPath = join(__dirname, '..', 'package.json');
const { version } = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };

interface ScanConfig {
  scan?: {
    model?: string;
    minPriority?: string;
    maxRepos?: number;
    maxIssuesPerRepo?: number;
    createIssues?: boolean;
    useAI?: boolean;
    assignCopilot?: boolean;
  };
  filters?: {
    includeRepos?: string[];
    excludeRepos?: string[];
    includeLanguages?: string[];
    excludeLanguages?: string[];
  };
  categories?: Record<string, boolean>;
}

/**
 * Les og merg scan-config.json med CLI-flagg.
 * CLI-flagg har alltid høyeste prioritet.
 */
function loadConfig(configPath: string): ScanConfig {
  const resolvedPath = resolve(configPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Konfigurasjonsfil ikke funnet: ${resolvedPath}`);
  }
  const raw = readFileSync(resolvedPath, 'utf-8');
  return JSON.parse(raw) as ScanConfig;
}

program
  .name('evo-scan')
  .description('Proaktiv GitHub-repo-analyse drevet av GitHub Copilot AI')
  .version(version);

program
  .command('scan', { isDefault: true })
  .description('Skann GitHub-repos og generer anbefalinger')
  .option('-t, --token <token>', 'GitHub Personal Access Token (eller sett GITHUB_TOKEN env)')
  .option(
    '-o, --owner <owner>',
    'GitHub-bruker eller org å skanne (standard: autentisert bruker)',
  )
  .option(
    '-r, --repo <repo>',
    'Skann kun ett spesifikt repo (format: owner/repo eller bare repo-navn)',
  )
  .option('-c, --config <path>', 'Sti til scan-config.json konfigurasjonsfil')
  .option('-m, --model <model>', 'AI-modell for analyse')
  .option(
    '-p, --min-priority <priority>',
    'Minste prioritet for å vise/opprette (high|medium|low)',
  )
  .option('--create-issues', 'Opprett GitHub Issues for alle anbefalinger over min-priority')
  .option('--dry-run', 'Vis hva som ville blitt gjort uten å opprette issues', false)
  .option('--no-ai', 'Kjør kun regelbasert analyse uten AI (ingen Copilot Models API-kall)')
  .option('--max-repos <n>', 'Maksimalt antall repos å skanne', parseInt)
  .option('--max-issues-per-repo <n>', 'Maks issues per repo per kjøring', parseInt)
  .option('--json', 'Skriv resultater som JSON til stdout', false)
  .action(async (options: Record<string, unknown>) => {
    let config: ScanConfig = {};
    const configPath = (options.config as string | undefined) || null;
    const autoConfigPath = resolve(process.cwd(), 'scan-config.json');

    try {
      if (configPath) {
        config = loadConfig(configPath);
        if (!options.json) printInfo(`Konfigurasjon lastet fra: ${configPath}`);
      } else if (existsSync(autoConfigPath)) {
        config = loadConfig(autoConfigPath);
        if (!options.json) printInfo('Konfigurasjon lastet fra: scan-config.json');
      }
    } catch (err: unknown) {
      if (configPath) {
        printError(`Kunne ikke laste konfigurasjon: ${(err as Error).message}`);
        process.exit(1);
      }
      // Auto-detect: ignorer feil
    }

    const scanCfg = config.scan || {};
    const filtersCfg = config.filters || {};
    const categoriesCfg = config.categories || {};

    const token =
      (options.token as string | undefined) || process.env.GITHUB_TOKEN || undefined;
    const model = (options.model as string | undefined) || scanCfg.model || 'openai/gpt-4.1';
    const minPriority =
      (options.minPriority as string | undefined) || scanCfg.minPriority || 'medium';
    const maxRepos = (options.maxRepos as number | undefined) || scanCfg.maxRepos || 50;
    const maxIssuesPerRepo =
      (options.maxIssuesPerRepo as number | undefined) || scanCfg.maxIssuesPerRepo || 0;
    const createIssues =
      options.createIssues !== undefined
        ? Boolean(options.createIssues)
        : scanCfg.createIssues || false;
    const useAi = options.ai !== false ? scanCfg.useAI !== false : false;
    const assignCopilot = scanCfg.assignCopilot || false;

    if (!token) {
      printError(
        'GitHub token mangler.\n' +
          'Bruk --token <token> eller sett GITHUB_TOKEN-miljøvariabelen.\n\n' +
          'Generer et token på: https://github.com/settings/tokens/new\n' +
          'Nødvendige scopes: repo, models:read (for AI-analyse)',
      );
      process.exit(1);
    }

    if (!options.json) {
      printBanner(version);
    }

    try {
      await runScan({
        token,
        owner: (options.owner as string | undefined) || null,
        repo: (options.repo as string | undefined) || null,
        model,
        minPriority,
        createIssues: createIssues && !options.dryRun,
        dryRun: Boolean(options.dryRun),
        useAi,
        maxRepos,
        maxIssuesPerRepo,
        assignCopilot,
        jsonOutput: Boolean(options.json),
        filters: filtersCfg,
        categories: categoriesCfg,
      });
    } catch (err: unknown) {
      printError((err as Error).message);
      process.exit(1);
    }
  });

program.parse(process.argv);

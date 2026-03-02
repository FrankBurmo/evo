// server/types.d.ts — Globale TypeScript-utvidelser og domenetyper for Express-serveren.

import type { Recommendation, ProjectType, Priority } from '../packages/core';

// ─── Express Request-utvidelse ────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** GitHub PAT satt av requireAuth-middleware */
      token: string;
    }
  }
}

// ─── Scan-typer ───────────────────────────────────────────────────────────────

/** Status for en proaktiv skanning. */
export type ScanStatus = 'idle' | 'running' | 'completed' | 'error';

/** Resultat for ett opprettet eller forsøkt issue under skanning. */
export interface IssueCreatedEntry {
  title: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
  issueUrl?: string;
  issueNumber?: number;
  copilotAssigned?: boolean;
  error?: string;
}

/** Resultat for ett skannet repo. */
export interface ScanRepoResult {
  repo: {
    fullName: string;
    name: string;
    [key: string]: unknown;
  };
  deepInsights: object | null;
  recommendations: Recommendation[];
  issuesCreated: IssueCreatedEntry[];
}

/** In-memory skanningstilstand (single-tenant). */
export interface ScanState {
  status: ScanStatus;
  startedAt: string | null;
  completedAt: string | null;
  progress: {
    current: number;
    total: number;
    currentRepo: string | null;
  };
  results: ScanRepoResult[];
  error: string | null;
  options: ScanOptions;
}

/** Innstillinger for oppstart av skanning. */
export interface ScanOptions {
  createIssues?: boolean;
  assignCopilot?: boolean;
  minPriority?: Priority;
  maxRepos?: number;
  useAI?: boolean;
  model?: string;
}

// ─── Issue-typer ──────────────────────────────────────────────────────────────

/** Parametere for å opprette et GitHub Issue. */
export interface IssueCreateParams {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels?: string[];
}

/** Resultat av å opprette et GitHub Issue. */
export interface IssueCreateResult {
  id: number;
  number: number;
  html_url: string;
}

/** Template for et ferdigbygd issue (tittel, labels, body). */
export interface IssueTemplate {
  title: string;
  labels: string[];
  body: string;
}

// ─── Analyse-typer ────────────────────────────────────────────────────────────

/** Filtre-metrikker fra repo-scanning. */
export interface FileTreeMetrics {
  totalFiles: number;
  totalDirs: number;
  totalCodeSize: number;
  topLevelDirs: string[];
  sourceDirs: string[];
  byCategory: {
    code: number;
    docs: number;
    config: number;
    styles: number;
    images: number;
    other: number;
  };
  topExtensions: Array<{ ext: string; count: number }>;
  testFileCount: number;
  maxDepth: number;
}

/** Dyp innsikt fra filanalyse av et repo. */
export interface DeepInsights {
  projectType: ProjectType;
  hasReadme: boolean;
  hasCI: boolean;
  hasTests: boolean;
  hasContributing: boolean;
  hasSecurity: boolean;
  hasCodeOfConduct: boolean;
  hasTypeScript?: boolean;
  hasLinter?: boolean;
  hasFormatter?: boolean;
  hasDocker?: boolean;
  hasDependabot?: boolean;
  hasLockfile?: boolean;
  recentCommitsCount: number;
  rootFileCount: number;
  fileTreeMetrics: FileTreeMetrics | null;
  fileTreeSummary?: string[];
  readmeSummary?: string;
  packageJsonContent?: string;
  buildGradleContent?: string;
  configFiles?: Record<string, string>;
  workflowFiles?: Array<{ name: string; content: string }>;
}

/** Komplett analyseobjekt som returneres fra deepAnalyzeRepo / analyzeRepoFull. */
export interface FullAnalysisResult {
  repo: {
    fullName: string;
    name: string;
    [key: string]: unknown;
  };
  recommendations: Recommendation[];
  deepInsights: DeepInsights | null;
  aiSummary?: string;
  aiAnalyzed?: boolean;
  aiProjectType?: ProjectType;
  aiError?: string;
  ruleBasedCount?: number;
  aiCount?: number;
}

export {};

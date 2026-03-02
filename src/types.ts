/**
 * src/types.ts — Felles typedefinsjoner for frontend.
 *
 * Re-eksporterer domenetyper fra @evo/core og definerer
 * frontend-spesifikke strukturer brukt på tvers av komponenter.
 */

import type { Recommendation, ProjectType } from '../packages/core';

export type { Recommendation, ProjectType };

// ─── Repo-typer (fra /api/repos) ─────────────────────────────────────────────

export interface RepoInfo {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
  visibility: 'public' | 'private';
  size?: number;
  projectType?: ProjectType;
}

export interface InsightData {
  recentActivity: boolean;
  commitCount?: number;
  [key: string]: unknown;
}

export interface FileTreeMetrics {
  totalFiles: number;
  totalDirs: number;
  totalCodeSize: number;
  maxDepth: number;
  testFileCount: number;
  byCategory: Record<string, number>;
  topExtensions: { ext: string; count: number }[];
  topLevelDirs: string[];
}

export interface DeepInsightsData {
  hasTypeScript?: boolean;
  hasLinter?: boolean;
  hasFormatter?: boolean;
  hasDocker?: boolean;
  hasCI?: boolean;
  hasDependabot?: boolean;
  hasLockfile?: boolean;
  fileTreeMetrics?: FileTreeMetrics;
  [key: string]: unknown;
}

export interface RepoData {
  repo: RepoInfo;
  insights: InsightData;
  deepInsights: DeepInsightsData | null;
  recommendations: Recommendation[];
  aiAnalyzed?: boolean;
  aiSummary?: string;
}

// ─── Scan-typer ───────────────────────────────────────────────────────────────

export type ScanStatus = 'idle' | 'running' | 'completed' | 'error';

export interface IssueCreatedEntry {
  title: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
  issueUrl?: string;
  issueNumber?: number;
  copilotAssigned?: boolean;
  error?: string;
}

export interface ScanRepoResult {
  repo: {
    fullName: string;
    name: string;
    url?: string;
    projectType?: string;
    [key: string]: unknown;
  };
  recommendations: Recommendation[];
  issuesCreated?: IssueCreatedEntry[];
}

export interface ScanSummary {
  reposScanned: number;
  totalRecommendations: number;
  issuesCreated: number;
}

export interface ScanResults {
  summary: ScanSummary;
  results: ScanRepoResult[];
}

export interface ScanProgressState {
  current: number;
  total: number;
  currentRepo: string | null;
}

// ─── Panel-typer ─────────────────────────────────────────────────────────────

export interface PanelItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  canTrigger: boolean;
  defaultEnabled: boolean;
  enabled?: boolean;
}

export interface PanelColorScheme {
  cssPrefix: string;
}

export interface PanelConfig {
  title: string;
  description: string;
  storageKey: string;
  apiPrefix: string;
  triggerTitle: string;
  triggerDesc: string;
  triggerBtnLabel: string;
  hasActionSelect: boolean;
  colorScheme: PanelColorScheme;
  items: PanelItem[];
}

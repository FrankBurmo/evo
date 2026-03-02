/**
 * server/services/analysis-service.ts — Felles AI-analyse-logikk.
 *
 * Fjerner duplisering av «deep + AI-merge»-mønsteret som tidligere fantes
 * i routes/repos.js (deep, ai-analyze) og routes/scan.js (scan/start).
 */
import { deepAnalyzeRepo } from '../analyzer';
import { analyzeWithAI } from '../copilot-client';
import type { Octokit } from '@octokit/rest';
import type { FullAnalysisResult } from '../types';

interface AnalyzeRepoFullOptions {
  useAI?: boolean;
  model?: string;
}

interface AnalyzeRepoFullParams {
  octokit: Octokit;
  repo: Record<string, unknown>;
  token: string;
  options?: AnalyzeRepoFullOptions;
}

/**
 * Utfør dyp analyse + KI-analyse og merge resultatene.
 */
export async function analyzeRepoFull({
  octokit,
  repo,
  token,
  options = {},
}: AnalyzeRepoFullParams): Promise<FullAnalysisResult & { aiAnalyzed: boolean; aiError?: string; aiProjectType?: string; ruleBasedCount?: number; aiCount?: number }> {
  const { useAI = true, model } = options;

  const analysis = await deepAnalyzeRepo(octokit, repo);
  const result = analysis as FullAnalysisResult & {
    aiAnalyzed: boolean;
    aiError?: string;
    aiProjectType?: string;
    ruleBasedCount?: number;
    aiCount?: number;
  };

  if (!useAI || !token) {
    result.aiAnalyzed = false;
    return result;
  }

  try {
    const existingTitles = (result.recommendations || []).map((r) => r.title);
    const aiResult = await analyzeWithAI({
      token,
      model,
      repo: result.repo as Record<string, unknown>,
      deepInsights: result.deepInsights as Record<string, unknown> | null,
      existingRecs: existingTitles,
    });

    const existingSet = new Set(existingTitles.map((t) => t.toLowerCase()));
    const newAIRecs = (aiResult.recommendations || []).filter(
      (r) => !existingSet.has(r.title.toLowerCase()),
    );

    result.recommendations = [...result.recommendations, ...newAIRecs];
    result.aiSummary = aiResult.summary;
    result.aiAnalyzed = true;
    result.aiProjectType = aiResult.projectType;
    result.ruleBasedCount = result.recommendations.length - newAIRecs.length;
    result.aiCount = newAIRecs.length;
  } catch (aiError: unknown) {
    console.warn('KI-analyse feilet, bruker kun regelbasert analyse:', (aiError as Error).message);
    result.aiAnalyzed = false;
    result.aiError = (aiError as Error).message;
  }

  return result;
}

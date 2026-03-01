'use strict';

/**
 * server/services/analysis-service.js — Felles AI-analyse-logikk.
 *
 * Fjerner duplisering av «deep + AI-merge»-mønsteret som tidligere fantes
 * i routes/repos.js (deep, ai-analyze) og routes/scan.js (scan/start).
 */

const { deepAnalyzeRepo } = require('../analyzer');
const { analyzeWithAI } = require('../copilot-client');

/**
 * Utfør dyp analyse + KI-analyse og merge resultatene.
 *
 * @param {object} params
 * @param {import('@octokit/rest').Octokit} params.octokit
 * @param {object} params.repo     — rå repo-objekt fra GitHub API
 * @param {string} params.token    — GitHub PAT (for Copilot API)
 * @param {object} [params.options]
 * @param {boolean} [params.options.useAI=true]
 * @param {string}  [params.options.model]
 * @returns {Promise<object>} — beriket analyseobjekt med .aiSummary, .aiAnalyzed
 */
async function analyzeRepoFull({ octokit, repo, token, options = {} }) {
  const { useAI = true, model } = options;

  const analysis = await deepAnalyzeRepo(octokit, repo);

  if (!useAI || !token) {
    analysis.aiAnalyzed = false;
    return analysis;
  }

  try {
    const existingTitles = (analysis.recommendations || []).map((r) => r.title);
    const aiResult = await analyzeWithAI({
      token,
      model,
      repo: analysis.repo,
      deepInsights: analysis.deepInsights,
      existingRecs: existingTitles,
    });

    const existingSet = new Set(existingTitles.map((t) => t.toLowerCase()));
    const newAIRecs = (aiResult.recommendations || []).filter(
      (r) => !existingSet.has(r.title.toLowerCase()),
    );

    analysis.recommendations = [...analysis.recommendations, ...newAIRecs];
    analysis.aiSummary = aiResult.summary;
    analysis.aiAnalyzed = true;
    analysis.aiProjectType = aiResult.projectType;
    analysis.ruleBasedCount = analysis.recommendations.length - newAIRecs.length;
    analysis.aiCount = newAIRecs.length;
  } catch (aiError) {
    console.warn('KI-analyse feilet, bruker kun regelbasert analyse:', aiError.message);
    analysis.aiAnalyzed = false;
    analysis.aiError = aiError.message;
  }

  return analysis;
}

module.exports = { analyzeRepoFull };

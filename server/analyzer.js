'use strict';

/**
 * server/analyzer.js — Utvidet analysemotor for Evo backend (fasade-modul).
 *
 * Delegerer til:
 *   - @evo/core         — analyzeRepository, detectProjectTypeFromMetadata, PROJECT_TYPE_LABELS
 *   - ./project-detector — detectProjectType (filbasert)
 *   - ./file-analyzer    — fetchRepoTree, analyzeFileTree, fetchFileContent, etc.
 *   - ./recommendation-engine — generateDeepRecommendations, detectTestsFromTree
 *
 * Eksporterer:
 *   analyzeRepository(repo)        — rask, regelbasert analyse (kun metadata) — fra @evo/core
 *   deepAnalyzeRepo(octokit, repo) — async, dyp analyse med GitHub API-kall
 *   + alle sub-moduleksporter for bakoverkompatibilitet
 */

const {
  analyzeRepository,
  detectProjectTypeFromMetadata,
  PROJECT_TYPE_LABELS,
} = require('../packages/core');

const { detectProjectType } = require('./project-detector');

const {
  fetchRepoTree,
  analyzeFileTree,
  fetchRootContents,
  fetchFileContent,
  fetchConfigFiles,
  fetchWorkflowFiles,
  fetchRecentCommits,
} = require('./file-analyzer');

const {
  generateDeepRecommendations,
  detectTestsFromTree,
} = require('./recommendation-engine');

// ─── Dyp analyse (kaller GitHub API) ─────────────────────────────────────────

/**
 * Utfør dyp analyse av ett repo ved hjelp av GitHub API.
 * Returnerer et beriket analyse-objekt med prosjekttype, innhold og anbefalinger.
 *
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {object} repo – rå repo-objekt fra GitHub API
 * @returns {Promise<object>}
 */
async function deepAnalyzeRepo(octokit, repo) {
  const owner = repo.owner?.login || repo.full_name.split('/')[0];
  const repoName = repo.name;
  const isPublic = !repo.private;
  const defaultBranch = repo.default_branch || 'main';

  // ── 1. Parallell henting: fullt filtre + commits ──────────────
  const [repoTree, recentCommits] = await Promise.all([
    fetchRepoTree(octokit, owner, repoName, defaultBranch),
    fetchRecentCommits(octokit, owner, repoName),
  ]);

  // Utled rotnivå-filer fra treet (bakoverkompatibelt)
  const rootFiles = repoTree
    .filter(f => !f.path.includes('/') && f.type === 'blob')
    .map(f => f.path);

  // Filtre-metrikker
  const fileTreeMetrics = repoTree.length > 0 ? analyzeFileTree(repoTree) : null;

  // ── 2. Detekter nøkkelfiler fra treet ─────────────────────────
  const treePaths = new Set(repoTree.filter(f => f.type === 'blob').map(f => f.path));
  const hasPackageJson = treePaths.has('package.json');
  const hasBuildGradle = treePaths.has('build.gradle') || treePaths.has('build.gradle.kts');

  // ── 3. Hent nøkkelfiler + konfigurasjonsfiler parallelt ───────
  const readmePath = treePaths.has('README.md') ? 'README.md'
    : treePaths.has('readme.md') ? 'readme.md'
    : treePaths.has('Readme.md') ? 'Readme.md' : null;

  const [readmeContent, packageJsonContent, buildGradleContent, configFiles, workflowFiles] = await Promise.all([
    readmePath
      ? fetchFileContent(octokit, owner, repoName, readmePath)
      : Promise.resolve(null),
    hasPackageJson
      ? fetchFileContent(octokit, owner, repoName, 'package.json')
      : Promise.resolve(null),
    hasBuildGradle
      ? fetchFileContent(octokit, owner, repoName, treePaths.has('build.gradle') ? 'build.gradle' : 'build.gradle.kts')
      : Promise.resolve(null),
    repoTree.length > 0
      ? fetchConfigFiles(octokit, owner, repoName, repoTree)
      : Promise.resolve({}),
    repoTree.length > 0
      ? fetchWorkflowFiles(octokit, owner, repoName, repoTree)
      : Promise.resolve(/** @type {any[]} */ ([])),
  ]);

  // ── 4. Utled tilstedeværelse av community-filer fra treet ─────
  const hasWorkflows = repoTree.some(f => f.path.startsWith('.github/workflows/') && f.type === 'blob');
  const hasContributing = treePaths.has('CONTRIBUTING.md') || treePaths.has('contributing.md');
  const hasSecurity = treePaths.has('SECURITY.md') || treePaths.has('security.md');
  const hasCodeOfConduct = treePaths.has('CODE_OF_CONDUCT.md');

  // Test-deteksjon via treet (ingen ekstra API-kall)
  const hasTests = detectTestsFromTree(repoTree, packageJsonContent);

  // ── 5. Prosjekttype ───────────────────────────────────────────
  const projectType = detectProjectType({
    rootFiles,
    packageJsonContent,
    language: repo.language,
    repoName,
  });

  // ── 6. Generer anbefalinger (regelbasert + dyp + kodestruktur)
  const baseAnalysis = analyzeRepository(repo);
  const deepRecs = generateDeepRecommendations({
    repo,
    isPublic,
    rootFiles,
    readmeContent,
    packageJsonContent,
    buildGradleContent,
    hasWorkflows,
    hasTests,
    hasContributing,
    hasSecurity,
    hasCodeOfConduct,
    recentCommits,
    projectType,
    configFiles,
    fileTreeMetrics,
    workflowFiles,
  });

  // Slå sammen — fjern duplikater basert på tittel
  const existingTitles = new Set(baseAnalysis.recommendations.map(r => r.title));
  const newRecs = deepRecs.filter(r => !existingTitles.has(r.title));
  const allRecommendations = [...baseAnalysis.recommendations, ...newRecs];

  // Komprimert filtre-oversikt for AI-prompt (maks 60 stier)
  const fileTreeSummary = repoTree.length > 0
    ? repoTree
        .filter(f => f.type === 'blob')
        .slice(0, 60)
        .map(f => f.path)
    : null;

  return {
    repo: {
      ...baseAnalysis.repo,
      projectType,
      defaultBranch,
    },
    deepInsights: {
      projectType,
      hasReadme: Boolean(readmeContent),
      hasPackageJson,
      hasBuildGradle,
      hasCI: hasWorkflows,
      hasTests,
      hasContributing,
      hasSecurity,
      hasCodeOfConduct,
      recentCommitsCount: recentCommits.length,
      lastCommitAt: recentCommits[0]?.commit?.author?.date || null,
      rootFileCount: rootFiles.length,
      packageJsonContent: packageJsonContent || null,
      buildGradleContent: buildGradleContent || null,
      readmeSummary: readmeContent ? readmeContent.slice(0, 500) : null,
      fileTreeMetrics,
      fileTreeSummary,
      configFiles: Object.keys(configFiles).length > 0 ? configFiles : null,
      workflowFiles: workflowFiles.length > 0 ? workflowFiles : null,
      hasDocker: treePaths.has('Dockerfile') || treePaths.has('docker-compose.yml') || treePaths.has('docker-compose.yaml'),
      hasTypeScript: treePaths.has('tsconfig.json'),
      hasLinter: treePaths.has('.eslintrc.json') || treePaths.has('.eslintrc.js') || treePaths.has('eslint.config.js') || treePaths.has('eslint.config.mjs'),
      hasFormatter: treePaths.has('.prettierrc') || treePaths.has('.prettierrc.json') || treePaths.has('.editorconfig'),
      hasDependabot: treePaths.has('.github/dependabot.yml'),
      hasEnvExample: treePaths.has('.env.example'),
      hasChangelog: treePaths.has('CHANGELOG.md') || treePaths.has('changelog.md'),
      hasLockfile: treePaths.has('package-lock.json') || treePaths.has('yarn.lock') || treePaths.has('pnpm-lock.yaml'),
    },
    recommendations: allRecommendations,
  };
}

// ─── Eksporter (fasade — bakoverkompatibel) ──────────────────────────────────

module.exports = {
  analyzeRepository,
  deepAnalyzeRepo,
  detectProjectType,
  detectProjectTypeFromMetadata,
  analyzeFileTree,
  fetchRepoTree,
  fetchRootContents,
  fetchFileContent,
  fetchConfigFiles,
  fetchRecentCommits,
};

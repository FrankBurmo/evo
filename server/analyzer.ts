/**
 * server/analyzer.ts — Utvidet analysemotor for Evo backend (fasade-modul).
 *
 * Delegerer til:
 *   - @evo/core             — analyzeRepository, detectProjectTypeFromMetadata, PROJECT_TYPE_LABELS
 *   - ./project-detector    — detectProjectType (filbasert)
 *   - ./file-analyzer       — fetchRepoTree, analyzeFileTree, osv.
 *   - ./recommendation-engine — generateDeepRecommendations, detectTestsFromTree
 */
import { analyzeRepository, detectProjectTypeFromMetadata, PROJECT_TYPE_LABELS } from '../packages/core';
import { detectProjectType } from './project-detector';
import {
  fetchRepoTree,
  analyzeFileTree,
  fetchRootContents,
  fetchFileContent,
  fetchConfigFiles,
  fetchWorkflowFiles,
  fetchRecentCommits,
} from './file-analyzer';
import { generateDeepRecommendations, detectTestsFromTree } from './recommendation-engine';
import type { Octokit } from '@octokit/rest';
import type { FullAnalysisResult } from './types';

export {
  analyzeRepository,
  detectProjectTypeFromMetadata,
  PROJECT_TYPE_LABELS,
  detectProjectType,
  analyzeFileTree,
  fetchRepoTree,
  fetchRootContents,
  fetchFileContent,
  fetchConfigFiles,
  fetchRecentCommits,
};

// ─── Dyp analyse (kaller GitHub API) ─────────────────────────────────────────

/**
 * Utfør dyp analyse av ett repo ved hjelp av GitHub API.
 */
export async function deepAnalyzeRepo(octokit: Octokit, repo: Record<string, unknown>): Promise<FullAnalysisResult> {
  const owner = (repo.owner as { login?: string })?.login || (repo.full_name as string).split('/')[0];
  const repoName = repo.name as string;
  const isPublic = !(repo.private as boolean);
  const defaultBranch = (repo.default_branch as string) || 'main';

  // ── 1. Parallell henting: fullt filtre + commits ──────────────
  const [repoTree, recentCommits] = await Promise.all([
    fetchRepoTree(octokit, owner, repoName, defaultBranch),
    fetchRecentCommits(octokit, owner, repoName),
  ]);

  const rootFiles = repoTree
    .filter((f) => !f.path.includes('/') && f.type === 'blob')
    .map((f) => f.path);

  const fileTreeMetrics = repoTree.length > 0 ? analyzeFileTree(repoTree) : null;

  // ── 2. Detekter nøkkelfiler fra treet ─────────────────────────
  const treePaths = new Set(repoTree.filter((f) => f.type === 'blob').map((f) => f.path));
  const hasPackageJson = treePaths.has('package.json');
  const hasBuildGradle = treePaths.has('build.gradle') || treePaths.has('build.gradle.kts');

  // ── 3. Hent nøkkelfiler + konfigurasjonsfiler parallelt ───────
  const readmePath = treePaths.has('README.md')
    ? 'README.md'
    : treePaths.has('readme.md')
      ? 'readme.md'
      : treePaths.has('Readme.md')
        ? 'Readme.md'
        : null;

  const [readmeContent, packageJsonContent, buildGradleContent, configFiles, workflowFiles] =
    await Promise.all([
      readmePath ? fetchFileContent(octokit, owner, repoName, readmePath) : Promise.resolve(null),
      hasPackageJson
        ? fetchFileContent(octokit, owner, repoName, 'package.json')
        : Promise.resolve(null),
      hasBuildGradle
        ? fetchFileContent(
            octokit,
            owner,
            repoName,
            treePaths.has('build.gradle') ? 'build.gradle' : 'build.gradle.kts',
          )
        : Promise.resolve(null),
      repoTree.length > 0
        ? fetchConfigFiles(octokit, owner, repoName, repoTree)
        : Promise.resolve({}),
      repoTree.length > 0
        ? fetchWorkflowFiles(octokit, owner, repoName, repoTree)
        : Promise.resolve([] as Array<{ name: string; content: string }>),
    ]);

  // ── 4. Utled tilstedeværelse av community-filer fra treet ─────
  const hasWorkflows = repoTree.some(
    (f) => f.path.startsWith('.github/workflows/') && f.type === 'blob',
  );
  const hasContributing = treePaths.has('CONTRIBUTING.md') || treePaths.has('contributing.md');
  const hasSecurity = treePaths.has('SECURITY.md') || treePaths.has('security.md');
  const hasCodeOfConduct = treePaths.has('CODE_OF_CONDUCT.md');

  const hasTests = detectTestsFromTree(repoTree, packageJsonContent);

  // ── 5. Prosjekttype ───────────────────────────────────────────
  const projectType = detectProjectType({
    rootFiles,
    packageJsonContent,
    language: repo.language as string | null,
    repoName,
  });

  // ── 6. Generer anbefalinger ───────────────────────────────────
  const baseAnalysis = analyzeRepository(repo as unknown as Parameters<typeof analyzeRepository>[0]);
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

  const existingTitles = new Set(baseAnalysis.recommendations.map((r) => r.title));
  const newRecs = deepRecs.filter((r) => !existingTitles.has(r.title));
  const allRecommendations = [...baseAnalysis.recommendations, ...newRecs];

  const fileTreeSummary =
    repoTree.length > 0
      ? repoTree
          .filter((f) => f.type === 'blob')
          .slice(0, 60)
          .map((f) => f.path)
      : null;

  return {
    repo: {
      ...baseAnalysis.repo,
      fullName: baseAnalysis.repo.fullName ?? '',
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
      lastCommitAt:
        (recentCommits[0] as { commit?: { author?: { date?: string } } })?.commit?.author?.date ||
        null,
      rootFileCount: rootFiles.length,
      packageJsonContent: packageJsonContent ?? undefined,
      buildGradleContent: buildGradleContent ?? undefined,
      readmeSummary: readmeContent ? readmeContent.slice(0, 500) : undefined,
      fileTreeMetrics,
      fileTreeSummary: fileTreeSummary ?? undefined,
      configFiles: Object.keys(configFiles).length > 0 ? configFiles : undefined,
      workflowFiles: workflowFiles.length > 0 ? workflowFiles : undefined,
      hasDocker:
        treePaths.has('Dockerfile') ||
        treePaths.has('docker-compose.yml') ||
        treePaths.has('docker-compose.yaml'),
      hasTypeScript: treePaths.has('tsconfig.json'),
      hasLinter:
        treePaths.has('.eslintrc.json') ||
        treePaths.has('.eslintrc.js') ||
        treePaths.has('eslint.config.js') ||
        treePaths.has('eslint.config.mjs'),
      hasFormatter:
        treePaths.has('.prettierrc') ||
        treePaths.has('.prettierrc.json') ||
        treePaths.has('.editorconfig'),
      hasDependabot: treePaths.has('.github/dependabot.yml'),
      hasLockfile:
        treePaths.has('package-lock.json') ||
        treePaths.has('yarn.lock') ||
        treePaths.has('pnpm-lock.yaml'),
    } as FullAnalysisResult['deepInsights'],
    recommendations: allRecommendations,
  };
}

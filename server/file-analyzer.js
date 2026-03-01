'use strict';

/**
 * server/file-analyzer.js — Filtre-henting og -analyse via GitHub API.
 *
 * Eksporterer:
 *   fetchRepoTree(octokit, owner, repoName, defaultBranch)
 *   analyzeFileTree(tree)
 *   fetchRootContents(octokit, owner, repoName)
 *   fetchFileContent(octokit, owner, repoName, filePath)
 *   fetchConfigFiles(octokit, owner, repoName, tree)
 *   fetchWorkflowFiles(octokit, owner, repoName, tree)
 *   fetchRecentCommits(octokit, owner, repoName)
 *   pathExists(octokit, owner, repoName, filePath)
 *   listDir(octokit, owner, repoName, dirPath)
 */

// ─── Konstanter ──────────────────────────────────────────────────────────────

// Konfigurasjonsfiler som er viktige for prosjektanalyse
const CONFIG_FILES = [
  // JavaScript/TypeScript
  'tsconfig.json', 'jsconfig.json', '.eslintrc.json', '.eslintrc.js', '.eslintrc.yml',
  'eslint.config.js', 'eslint.config.mjs', '.prettierrc', '.prettierrc.json',
  'vitest.config.ts', 'vitest.config.js', 'jest.config.js', 'jest.config.ts',
  // Docker
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  // CI/CD
  '.github/dependabot.yml', '.github/CODEOWNERS',
  // Python
  'requirements.txt', 'pyproject.toml', 'setup.py', 'setup.cfg', 'Pipfile',
  // Go
  'go.mod', 'go.sum',
  // Rust
  'Cargo.toml',
  // Ruby
  'Gemfile',
  // Env/Config
  '.env.example', '.editorconfig', '.nvmrc', '.node-version',
  // Other
  'Makefile', 'justfile', 'turbo.json', 'nx.json', 'lerna.json',
  'renovate.json', '.changeset/config.json',
];

// Filtyper for metrikk-aggregering
const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.kts',
  '.cs', '.rb', '.php', '.swift', '.m', '.c', '.cpp', '.h',
  '.vue', '.svelte', '.astro',
]);
const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.txt', '.rst', '.adoc']);
const CONFIG_EXTENSIONS = new Set(['.json', '.yml', '.yaml', '.toml', '.xml', '.ini', '.cfg', '.env']);
const STYLE_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less', '.styl']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif']);

// ─── Hjelpefunksjoner for API-kall ──────────────────────────────────────────

/**
 * Hent rotnivå-filstruktur som flatt sett av filnavn.
 */
async function fetchRootContents(octokit, owner, repoName) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: '' });
    if (!Array.isArray(data)) return [];
    return data.map(f => f.name);
  } catch {
    return [];
  }
}

/**
 * Hent innholdet i en enkelt fil (base64-dekodes).
 * Returnerer null hvis filen ikke finnes eller er for stor.
 */
async function fetchFileContent(octokit, owner, repoName, filePath) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: filePath });
    if (data.type !== 'file' || !data.content) return null;
    return Buffer.from(data.content, 'base64').toString('utf-8').slice(0, 8000);
  } catch {
    return null;
  }
}

/**
 * Sjekk om en bane eksisterer i repositoryet.
 */
async function pathExists(octokit, owner, repoName, filePath) {
  try {
    await octokit.repos.getContent({ owner, repo: repoName, path: filePath });
    return true;
  } catch {
    return false;
  }
}

/**
 * List innholdet i en katalog. Returnerer tom liste ved feil.
 */
async function listDir(octokit, owner, repoName, dirPath) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: dirPath });
    if (!Array.isArray(data)) return [];
    return data.map(f => f.name);
  } catch {
    return [];
  }
}

// ─── Fullstendig filtre (Git Trees API) ──────────────────────────────────────

/**
 * Hent fullstendig filtre for et repo via Git Trees API (ett enkelt API-kall).
 * Returnerer et flatt array av { path, type, size } for alle filer og mapper.
 * Maks 100 000 oppføringer (GitHub-grense for recursive tree).
 *
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} owner
 * @param {string} repoName
 * @param {string} defaultBranch — Branch som skal skannes (fra repo.default_branch)
 * @returns {Promise<Array<{path: string, type: 'blob'|'tree', size: number}>>}
 */
async function fetchRepoTree(octokit, owner, repoName, defaultBranch) {
  try {
    const { data } = await octokit.git.getTree({
      owner,
      repo: repoName,
      tree_sha: defaultBranch,
      recursive: 'true',
    });
    if (data.truncated) {
      console.warn(`Filtre for ${owner}/${repoName} er avkuttet (>100k filer).`);
    }
    return (data.tree || []).map(item => ({
      path: item.path,
      type: item.type,   // 'blob' = fil, 'tree' = mappe
      size: item.size || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Hent filendelsen fra en sti.
 */
function getExtension(filePath) {
  const base = filePath.split('/').pop() || '';
  const dotIndex = base.lastIndexOf('.');
  return dotIndex > 0 ? base.slice(dotIndex).toLowerCase() : '';
}

/**
 * Analyser filtreet og generer metrikker om kodebasen.
 *
 * @param {Array<{path: string, type: string, size: number}>} tree
 * @returns {object} Filtre-metrikker
 */
function analyzeFileTree(tree) {
  const files = tree.filter(f => f.type === 'blob');
  const dirs = tree.filter(f => f.type === 'tree');

  // Toppnivå-mapper
  const topLevelDirs = [...new Set(
    tree
      .filter(f => f.path.includes('/'))
      .map(f => f.path.split('/')[0])
  )].filter(d => dirs.some(dir => dir.path === d));

  // Filtell per kategori
  const byCategory = { code: 0, docs: 0, config: 0, styles: 0, images: 0, other: 0 };
  const byExtension = {};
  let totalCodeSize = 0;

  for (const file of files) {
    const ext = getExtension(file.path);
    byExtension[ext] = (byExtension[ext] || 0) + 1;

    if (CODE_EXTENSIONS.has(ext)) {
      byCategory.code++;
      totalCodeSize += file.size;
    } else if (DOC_EXTENSIONS.has(ext)) {
      byCategory.docs++;
    } else if (CONFIG_EXTENSIONS.has(ext) || file.path.startsWith('.')) {
      byCategory.config++;
    } else if (STYLE_EXTENSIONS.has(ext)) {
      byCategory.styles++;
    } else if (IMAGE_EXTENSIONS.has(ext)) {
      byCategory.images++;
    } else {
      byCategory.other++;
    }
  }

  // Topp-utvidelser sortert
  const topExtensions = Object.entries(byExtension)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ext, count]) => ({ ext, count }));

  // Test-mapper og -filer (importert fra recommendation-engine)
  const TEST_DIRS = ['__tests__', 'test', 'tests', 'spec', 'specs', 'e2e', '__test__'];
  const TEST_FILE_PATTERNS = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /Test\.java$/, /Tests\.cs$/, /test_.*\.py$/];

  const testFiles = files.filter(f =>
    TEST_DIRS.some(d => f.path.startsWith(d + '/') || f.path.includes('/' + d + '/')) ||
    TEST_FILE_PATTERNS.some(p => p.test(f.path))
  );

  // Kilde-mapper (src, lib, app, packages)
  const sourceDirs = topLevelDirs.filter(d =>
    ['src', 'lib', 'app', 'packages', 'modules', 'components', 'pages', 'server', 'client', 'api'].includes(d.toLowerCase())
  );

  // Maks mappenivå
  const maxDepth = files.reduce((max, f) => {
    const depth = f.path.split('/').length;
    return Math.max(max, depth);
  }, 0);

  return {
    totalFiles: files.length,
    totalDirs: dirs.length,
    totalCodeSize,
    topLevelDirs,
    sourceDirs,
    byCategory,
    topExtensions,
    testFileCount: testFiles.length,
    maxDepth,
  };
}

/**
 * Hent innholdet av flere konfigurasjonsfiler som finnes i treet.
 * Returnerer et objekt: { filnavn: innhold }.
 *
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} owner
 * @param {string} repoName
 * @param {Array<{path: string, type: string}>} tree — Fullt filtre
 * @returns {Promise<Record<string, string>>}
 */
async function fetchConfigFiles(octokit, owner, repoName, tree) {
  const treePathSet = new Set(tree.filter(f => f.type === 'blob').map(f => f.path));
  const configsToFetch = CONFIG_FILES.filter(cf => treePathSet.has(cf));

  // Begrens til maks 8 konfigurasjonsfiler for å spare API-kall
  const limited = configsToFetch.slice(0, 8);

  const results = {};
  const fetches = limited.map(async (configPath) => {
    const content = await fetchFileContent(octokit, owner, repoName, configPath);
    if (content) {
      results[configPath] = content;
    }
  });

  await Promise.all(fetches);
  return results;
}

/**
 * Hent GitHub Actions workflow-filer fra treet.
 *
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} owner
 * @param {string} repoName
 * @param {Array<{path: string, type: string}>} tree
 * @returns {Promise<Array<{name: string, content: string}>>}
 */
async function fetchWorkflowFiles(octokit, owner, repoName, tree) {
  const workflowPaths = tree
    .filter(f => f.type === 'blob' && f.path.startsWith('.github/workflows/') && (f.path.endsWith('.yml') || f.path.endsWith('.yaml')))
    .slice(0, 5); // Maks 5 workflows

  const workflows = [];
  const fetches = workflowPaths.map(async (wf) => {
    const content = await fetchFileContent(octokit, owner, repoName, wf.path);
    if (content) {
      workflows.push({ name: wf.path.split('/').pop(), content: content.slice(0, 3000) });
    }
  });

  await Promise.all(fetches);
  return workflows;
}

/**
 * Hent commits fra siste 30 dager.
 */
async function fetchRecentCommits(octokit, owner, repoName) {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await octokit.repos.listCommits({
      owner,
      repo: repoName,
      since,
      per_page: 50,
    });
    return data;
  } catch {
    return [];
  }
}

module.exports = {
  fetchRepoTree,
  analyzeFileTree,
  fetchRootContents,
  fetchFileContent,
  pathExists,
  listDir,
  fetchConfigFiles,
  fetchWorkflowFiles,
  fetchRecentCommits,
  getExtension,
  CONFIG_FILES,
  CODE_EXTENSIONS,
  DOC_EXTENSIONS,
  CONFIG_EXTENSIONS,
  STYLE_EXTENSIONS,
  IMAGE_EXTENSIONS,
};

/**
 * server/file-analyzer.ts — Filtre-henting og -analyse via GitHub API.
 */
import type { Octokit } from '@octokit/rest';
import type { FileTreeMetrics } from './types';

// ─── Konstanter ──────────────────────────────────────────────────────────────

export const CONFIG_FILES = [
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

export const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.kts',
  '.cs', '.rb', '.php', '.swift', '.m', '.c', '.cpp', '.h',
  '.vue', '.svelte', '.astro',
]);
export const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.txt', '.rst', '.adoc']);
export const CONFIG_EXTENSIONS = new Set(['.json', '.yml', '.yaml', '.toml', '.xml', '.ini', '.cfg', '.env']);
export const STYLE_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less', '.styl']);
export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif']);

// ─── Hjelpefunksjoner for API-kall ──────────────────────────────────────────

export async function fetchRootContents(octokit: Octokit, owner: string, repoName: string): Promise<string[]> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: '' });
    if (!Array.isArray(data)) return [];
    return data.map((f: { name: string }) => f.name);
  } catch {
    return [];
  }
}

export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repoName: string,
  filePath: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: filePath });
    if (Array.isArray(data) || data.type !== 'file') return null;
    const fileData = data as { content?: string; type: string };
    if (!fileData.content) return null;
    return Buffer.from(fileData.content, 'base64').toString('utf-8').slice(0, 8000);
  } catch {
    return null;
  }
}

export async function pathExists(octokit: Octokit, owner: string, repoName: string, filePath: string): Promise<boolean> {
  try {
    await octokit.repos.getContent({ owner, repo: repoName, path: filePath });
    return true;
  } catch {
    return false;
  }
}

export async function listDir(octokit: Octokit, owner: string, repoName: string, dirPath: string): Promise<string[]> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: repoName, path: dirPath });
    if (!Array.isArray(data)) return [];
    return data.map((f: { name: string }) => f.name);
  } catch {
    return [];
  }
}

// ─── Fullstendig filtre (Git Trees API) ──────────────────────────────────────

export interface TreeItem {
  path: string;
  type: 'blob' | 'tree';
  size: number;
}

export async function fetchRepoTree(
  octokit: Octokit,
  owner: string,
  repoName: string,
  defaultBranch: string,
): Promise<TreeItem[]> {
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
    return (data.tree || []).map((item) => ({
      path: item.path ?? '',
      type: (item.type as 'blob' | 'tree'),
      size: item.size || 0,
    }));
  } catch {
    return [];
  }
}

export function getExtension(filePath: string): string {
  const base = filePath.split('/').pop() || '';
  const dotIndex = base.lastIndexOf('.');
  return dotIndex > 0 ? base.slice(dotIndex).toLowerCase() : '';
}

export function analyzeFileTree(tree: TreeItem[]): FileTreeMetrics {
  const files = tree.filter((f) => f.type === 'blob');
  const dirs = tree.filter((f) => f.type === 'tree');

  const topLevelDirs = [
    ...new Set(
      tree
        .filter((f) => f.path.includes('/'))
        .map((f) => f.path.split('/')[0]),
    ),
  ].filter((d) => dirs.some((dir) => dir.path === d));

  const byCategory = { code: 0, docs: 0, config: 0, styles: 0, images: 0, other: 0 };
  const byExtension: Record<string, number> = {};
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

  const topExtensions = Object.entries(byExtension)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ext, count]) => ({ ext, count }));

  const TEST_DIRS = ['__tests__', 'test', 'tests', 'spec', 'specs', 'e2e', '__test__'];
  const TEST_FILE_PATTERNS = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /Test\.java$/, /Tests\.cs$/, /test_.*\.py$/];

  const testFiles = files.filter(
    (f) =>
      TEST_DIRS.some((d) => f.path.startsWith(d + '/') || f.path.includes('/' + d + '/')) ||
      TEST_FILE_PATTERNS.some((p) => p.test(f.path)),
  );

  const sourceDirs = topLevelDirs.filter((d) =>
    ['src', 'lib', 'app', 'packages', 'modules', 'components', 'pages', 'server', 'client', 'api'].includes(
      d.toLowerCase(),
    ),
  );

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

export async function fetchConfigFiles(
  octokit: Octokit,
  owner: string,
  repoName: string,
  tree: TreeItem[],
): Promise<Record<string, string>> {
  const treePathSet = new Set(tree.filter((f) => f.type === 'blob').map((f) => f.path));
  const configsToFetch = CONFIG_FILES.filter((cf) => treePathSet.has(cf));
  const limited = configsToFetch.slice(0, 8);

  const results: Record<string, string> = {};
  const fetches = limited.map(async (configPath) => {
    const content = await fetchFileContent(octokit, owner, repoName, configPath);
    if (content) {
      results[configPath] = content;
    }
  });

  await Promise.all(fetches);
  return results;
}

export async function fetchWorkflowFiles(
  octokit: Octokit,
  owner: string,
  repoName: string,
  tree: TreeItem[],
): Promise<Array<{ name: string; content: string }>> {
  const workflowPaths = tree
    .filter(
      (f) =>
        f.type === 'blob' &&
        f.path.startsWith('.github/workflows/') &&
        (f.path.endsWith('.yml') || f.path.endsWith('.yaml')),
    )
    .slice(0, 5);

  const workflows: Array<{ name: string; content: string }> = [];
  const fetches = workflowPaths.map(async (wf) => {
    const content = await fetchFileContent(octokit, owner, repoName, wf.path);
    if (content) {
      workflows.push({ name: wf.path.split('/').pop() ?? wf.path, content: content.slice(0, 3000) });
    }
  });

  await Promise.all(fetches);
  return workflows;
}

export async function fetchRecentCommits(
  octokit: Octokit,
  owner: string,
  repoName: string,
): Promise<unknown[]> {
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

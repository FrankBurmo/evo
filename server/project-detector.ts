/**
 * server/project-detector.ts — Prosjekttypegjenkjenning basert på filstruktur og metadata.
 */
import type { ProjectType } from '../packages/core';

// ─── Indikator-konstanter ────────────────────────────────────────────────────

export const ANDROID_INDICATORS = [
  'AndroidManifest.xml',
  'build.gradle',
  'build.gradle.kts',
  'gradlew',
  'app/src/main/AndroidManifest.xml',
];

export const WEB_INDICATORS = [
  'index.html',
  'vite.config.js',
  'vite.config.ts',
  'next.config.js',
  'next.config.ts',
  'nuxt.config.js',
  'nuxt.config.ts',
  'angular.json',
  'svelte.config.js',
  'astro.config.mjs',
  'remix.config.js',
];

export const API_INDICATORS = [
  'server.js',
  'server.ts',
  'app.js',
  'app.ts',
  'main.go',
  'main.py',
  'manage.py',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'openapi.yaml',
  'openapi.json',
  'swagger.yaml',
  'swagger.json',
];

export const DOCS_INDICATORS = [
  'mkdocs.yml',
  'docusaurus.config.js',
  'docusaurus.config.ts',
  '_config.yml', // Jekyll
  'book.toml',   // mdBook
];

// ─── Prosjekttypedeteksjon ───────────────────────────────────────────────────

interface DetectProjectTypeParams {
  rootFiles: string[];
  packageJsonContent: string | null;
  language: string | null;
  repoName: string;
}

/**
 * Detekter prosjekttype basert på rotnivå-filer, README og package.json.
 */
export function detectProjectType({
  rootFiles,
  packageJsonContent,
  language,
  repoName,
}: DetectProjectTypeParams): ProjectType {
  const rootSet = new Set(rootFiles.map((f) => f.toLowerCase()));
  void repoName; // unused but kept for API compatibility

  // Android
  const androidMatch = ANDROID_INDICATORS.some((f) => rootSet.has(f.toLowerCase()));
  if (androidMatch || language === 'Kotlin' || language === 'Java') {
    if (rootSet.has('androidmanifest.xml') || rootSet.has('gradlew')) {
      return 'android-app';
    }
  }

  // Docs
  const docsMatch = DOCS_INDICATORS.some((f) => rootSet.has(f.toLowerCase()));
  if (docsMatch) return 'docs';

  // Web app
  const webFileMatch = WEB_INDICATORS.some((f) => rootSet.has(f.toLowerCase()));
  if (webFileMatch) return 'web-app';

  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
      const webFrameworks = ['react', 'vue', 'next', 'nuxt', 'angular', '@angular/core', 'svelte', 'astro', 'remix'];
      if (webFrameworks.some((fw) => deps[fw])) return 'web-app';

      const serverFrameworks = ['express', 'fastify', 'koa', 'hapi', 'nestjs', '@nestjs/core', 'hono'];
      if (serverFrameworks.some((fw) => deps[fw])) return 'api';
    } catch {
      // ignore JSON parse errors
    }
  }

  // API / Backend service
  const apiMatch = API_INDICATORS.some((f) => rootSet.has(f.toLowerCase()));
  if (apiMatch) return 'api';

  // Library (has package.json with main/exports but no web framework)
  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      if (pkg.main || pkg.exports || pkg.module) return 'library';
    } catch {
      // ignore
    }
  }

  // Fallback based on language
  if (language === 'Python') return 'api';
  if (language === 'Go') return 'api';
  if (language === 'Rust') return 'library';
  if (language === 'HTML') return 'web-app';

  return 'other';
}

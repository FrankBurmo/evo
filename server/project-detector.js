'use strict';

/**
 * server/project-detector.js — Prosjekttypegjenkjenning basert på filstruktur og metadata.
 *
 * Eksporterer:
 *   detectProjectType({ rootFiles, packageJsonContent, language, repoName })
 *   ANDROID_INDICATORS, WEB_INDICATORS, API_INDICATORS, DOCS_INDICATORS
 */

// ─── Indikator-konstanter ────────────────────────────────────────────────────

const ANDROID_INDICATORS = [
  'AndroidManifest.xml',
  'build.gradle',
  'build.gradle.kts',
  'gradlew',
  'app/src/main/AndroidManifest.xml',
];

const WEB_INDICATORS = [
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

const API_INDICATORS = [
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

const DOCS_INDICATORS = [
  'mkdocs.yml',
  'docusaurus.config.js',
  'docusaurus.config.ts',
  '_config.yml', // Jekyll
  'book.toml',   // mdBook
];

// ─── Prosjekttypedeteksjon ───────────────────────────────────────────────────

/**
 * Detekter prosjekttype basert på rotnivå-filer, README og package.json.
 * Returnerer: 'android-app' | 'web-app' | 'api' | 'library' | 'docs' | 'other'
 */
function detectProjectType({ rootFiles, packageJsonContent, language, repoName }) {
  const rootSet = new Set(rootFiles.map(f => f.toLowerCase()));

  // Android
  const androidMatch = ANDROID_INDICATORS.some(f => rootSet.has(f.toLowerCase()));
  if (androidMatch || language === 'Kotlin' || language === 'Java') {
    if (rootSet.has('androidmanifest.xml') || rootSet.has('gradlew')) {
      return 'android-app';
    }
  }

  // Docs
  const docsMatch = DOCS_INDICATORS.some(f => rootSet.has(f.toLowerCase()));
  if (docsMatch) return 'docs';

  // Web app (requires package.json or known web config)
  const webFileMatch = WEB_INDICATORS.some(f => rootSet.has(f.toLowerCase()));
  if (webFileMatch) return 'web-app';

  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const webFrameworks = ['react', 'vue', 'next', 'nuxt', 'angular', '@angular/core', 'svelte', 'astro', 'remix'];
      if (webFrameworks.some(fw => deps[fw])) return 'web-app';

      const serverFrameworks = ['express', 'fastify', 'koa', 'hapi', 'nestjs', '@nestjs/core', 'hono'];
      if (serverFrameworks.some(fw => deps[fw])) return 'api';
    } catch {
      // ignore JSON parse errors
    }
  }

  // API / Backend service
  const apiMatch = API_INDICATORS.some(f => rootSet.has(f.toLowerCase()));
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

module.exports = {
  detectProjectType,
  ANDROID_INDICATORS,
  WEB_INDICATORS,
  API_INDICATORS,
  DOCS_INDICATORS,
};

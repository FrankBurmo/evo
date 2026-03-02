'use strict';

/**
 * @evo/core — Delt kode mellom CLI og server
 *
 * Eksporterer:
 *   detectProjectTypeFromMetadata(repo) — prosjekttypegjenkjenning fra metadata
 *   analyzeRepository(repo)             — regelbasert analyse (kun metadata)
 *   PROJECT_TYPE_LABELS                 — visningsnavn per prosjekttype
 *   PRIORITY_RANK                       — numerisk prioritetsrangering
 *   meetsMinPriority(recPriority, min)  — sjekk om prioritet er høy nok
 *   mergeAIRecommendations(existing, ai) — dedup-merge av AI-recs
 */

// ─── Prosjekttypegjenkjenning fra metadata ───────────────────────────────────

/**
 * Detekter prosjekttype basert kun på repo-metadata (språk, navn, topics).
 * Brukes i rask analyse uten ekstra API-kall.
 *
 * @param {object} repo — rå repo-objekt fra GitHub API
 * @returns {'web-app'|'android-app'|'api'|'library'|'docs'|'other'}
 */
function detectProjectTypeFromMetadata(repo) {
  const lang = (repo.language || '').toLowerCase();
  const name = (repo.name || '').toLowerCase();
  const desc = (repo.description || '').toLowerCase();
  const topics = (repo.topics || []).map(t => t.toLowerCase());

  // Android-indikatorer
  if (
    lang === 'kotlin' || lang === 'java' ||
    topics.some(t => ['android', 'android-app', 'mobile'].includes(t)) ||
    name.includes('android')
  ) {
    if (
      topics.some(t => ['android', 'android-app'].includes(t)) ||
      name.includes('android') ||
      desc.includes('android')
    ) {
      return 'android-app';
    }
  }

  // Dokumentasjon
  if (
    topics.some(t => ['docs', 'documentation', 'docusaurus', 'mkdocs', 'jekyll'].includes(t)) ||
    name.includes('docs') || name.includes('documentation') ||
    desc.includes('dokumentasjon') || desc.includes('documentation')
  ) {
    return 'docs';
  }

  // Web-app
  const webTopics = ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'web-app', 'frontend', 'webapp', 'website'];
  if (
    topics.some(t => webTopics.includes(t)) ||
    lang === 'html' || lang === 'css' ||
    (lang === 'typescript' && (name.includes('app') || name.includes('web') || name.includes('site') || name.includes('dashboard'))) ||
    (lang === 'javascript' && (name.includes('app') || name.includes('web') || name.includes('site') || name.includes('dashboard')))
  ) {
    return 'web-app';
  }

  // API / Backend
  const apiTopics = ['api', 'backend', 'server', 'rest', 'graphql', 'microservice'];
  if (
    topics.some(t => apiTopics.includes(t)) ||
    name.includes('api') || name.includes('server') || name.includes('backend') ||
    lang === 'go' || lang === 'python' || lang === 'ruby' || lang === 'php'
  ) {
    return 'api';
  }

  // Bibliotek / npm-pakke
  const libTopics = ['library', 'npm', 'package', 'sdk', 'toolkit', 'cli'];
  if (
    topics.some(t => libTopics.includes(t)) ||
    name.includes('lib') || name.includes('sdk') || name.includes('toolkit')
  ) {
    return 'library';
  }

  // Rust er ofte biblioteker
  if (lang === 'rust') return 'library';

  return 'other';
}

// ─── Prosjekttypelabeler ─────────────────────────────────────────────────────

const PROJECT_TYPE_LABELS = {
  'web-app': '🌐 Web-app',
  'android-app': '📱 Android',
  'api': '⚙️ API',
  'library': '📦 Bibliotek',
  'docs': '📚 Dokumentasjon',
  'other': '📁 Annet',
};

// ─── Prioritetsrangering ─────────────────────────────────────────────────────

const PRIORITY_RANK = { high: 3, medium: 2, low: 1, info: 0, success: 0 };

/**
 * Sjekk om en anbefalings prioritet er ≥ minstekravet.
 */
function meetsMinPriority(recPriority, minPriority) {
  return (PRIORITY_RANK[recPriority] || 0) >= (PRIORITY_RANK[minPriority] || 0);
}

// ─── Regelbasert analyse ─────────────────────────────────────────────────────

/**
 * Rask regelbasert analyse basert kun på repo-metadata (ingen ekstra API-kall).
 * Brukes av /api/repos (server) og CLI bulk-skanning.
 */
function analyzeRepository(repo) {
  const recommendations = [];

  const daysSinceUpdate = repo.updated_at
    ? Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const openIssues = repo.open_issues_count || 0;
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  const isPublic = !repo.private;

  // Dokumentasjon
  if (!repo.description) {
    recommendations.push({
      type: 'documentation',
      priority: 'medium',
      title: 'Legg til beskrivelse',
      description: 'Legg til en tydelig beskrivelse av hva prosjektet gjør.',
      marketOpportunity: 'Tydelig beskrivelse bedrer synligheten i GitHub-søk.',
    });
  }

  if (!repo.homepage && isPublic) {
    recommendations.push({
      type: 'documentation',
      priority: 'low',
      title: 'Legg til nettside/dokumentasjonslenke',
      description: 'Sett en homepage-URL i repo-innstillingene.',
      marketOpportunity: 'Profesjonell nettside øker troverdighet og brukertillit.',
    });
  }

  // Aktivitet
  if (daysSinceUpdate > 180) {
    recommendations.push({
      type: 'activity',
      priority: 'high',
      title: 'Repositoryet er inaktivt',
      description: `Siste aktivitet var ${daysSinceUpdate} dager siden. Vurder oppdatering eller arkivering.`,
      marketOpportunity: 'Regelmessige oppdateringer signaliserer aktivt vedlikehold til potensielle brukere.',
    });
  } else if (daysSinceUpdate > 60) {
    recommendations.push({
      type: 'activity',
      priority: 'medium',
      title: 'Oppdater repositoryet',
      description: `Siste aktivitet var ${daysSinceUpdate} dager siden.`,
      marketOpportunity: 'Jevnlig aktivitet holder prosjektet relevant.',
    });
  }

  // Issues
  if (openIssues > 20) {
    recommendations.push({
      type: 'maintenance',
      priority: 'high',
      title: 'Mange åpne issues',
      description: `${openIssues} åpne issues. Vurder triagering og lukking av utdaterte issues.`,
      marketOpportunity: 'Aktivt issue-arbeid viser prosjekthelse og tiltrekker bidragsytere.',
    });
  } else if (openIssues > 10) {
    recommendations.push({
      type: 'maintenance',
      priority: 'medium',
      title: 'Håndter åpne issues',
      description: `${openIssues} åpne issues – se gjennom og prioriter.`,
      marketOpportunity: 'Ryddig backlog er et faresignal for aktive brukere.',
    });
  }

  // Synlighet og community
  if (isPublic && stars < 5 && daysSinceUpdate < 90) {
    recommendations.push({
      type: 'visibility',
      priority: 'low',
      title: 'Promoter prosjektet',
      description: 'Del prosjektet i relevante forum, communities og sosiale medier.',
      marketOpportunity: 'Økt synlighet gir flere brukere og potensielle bidragsytere.',
    });
  }

  if (isPublic && stars > 50 && forks < 10) {
    recommendations.push({
      type: 'community',
      priority: 'medium',
      title: 'Tilrettelegg for bidragsytere',
      description: 'Opprett CONTRIBUTING.md og merk enkle issues med "good first issue".',
      marketOpportunity: 'Voksende bidragsyterbas akselererer produktutviklingen.',
    });
  }

  // Lisens
  if (isPublic && !repo.license) {
    recommendations.push({
      type: 'documentation',
      priority: 'high',
      title: 'Legg til lisens',
      description: 'Offentlige repos uten lisens er implisitt "alle rettigheter forbeholdt" og hindrer adopsjon.',
      marketOpportunity: 'MIT/Apache 2.0-lisens er industristandarden for åpen kildekode og øker adopsjon markant.',
    });
  }

  // Prosjekttypegjenkjenning
  const projectType = detectProjectTypeFromMetadata(repo);

  return {
    repo: {
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars,
      forks,
      openIssues,
      updatedAt: repo.updated_at,
      visibility: repo.private ? 'private' : 'public',
      license: repo.license?.spdx_id || null,
      projectType,
      projectTypeLabel: PROJECT_TYPE_LABELS[projectType] || projectType,
    },
    recommendations,
  };
}

// ─── AI-anbefalings-merge ────────────────────────────────────────────────────

/**
 * Dedup-merge av AI-anbefalinger med eksisterende regelbaserte.
 * Fjerner AI-recs som har titler som overlapper med eksisterende (case-insensitive).
 *
 * @param {Array} existingRecs — regelbaserte anbefalinger
 * @param {Array} aiRecs — AI-genererte anbefalinger
 * @returns {Array} — sammensatt array uten duplikater
 */
function mergeAIRecommendations(existingRecs, aiRecs) {
  const existingSet = new Set(
    (existingRecs || []).map(r => (r.title || '').toLowerCase())
  );
  const newAIRecs = (aiRecs || []).filter(
    r => !existingSet.has((r.title || '').toLowerCase())
  );
  return [...(existingRecs || []), ...newAIRecs];
}

// ─── Rate Limiter (Token Bucket) ─────────────────────────────────────────────

/**
 * Enkel token-bucket rate limiter for å respektere Copilot Models API-kvoten.
 * Standard: maks 10 forespørsler per minutt, med burst opp til 3.
 *
 * Deles mellom server (copilot-client.js) og CLI (copilot.js).
 */
class RateLimiter {
  constructor({ maxPerMinute = 10, burstSize = 3 } = {}) {
    this.maxPerMinute = maxPerMinute;
    this.burstSize = burstSize;
    this.tokens = burstSize;
    this.maxTokens = burstSize;
    this.lastRefill = Date.now();
    this.refillRate = (60 * 1000) / maxPerMinute; // ms per token
  }

  _refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillRate);
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  /** @returns {Promise<void>} */
  async acquire() {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        this._refill();
        if (this.tokens > 0) {
          this.tokens -= 1;
          resolve();
        } else {
          // Vent til neste token er tilgjengelig
          const waitTime = this.refillRate - (Date.now() - this.lastRefill);
          setTimeout(tryAcquire, Math.max(waitTime, 100));
        }
      };
      tryAcquire();
    });
  }
}

module.exports = {
  detectProjectTypeFromMetadata,
  analyzeRepository,
  PROJECT_TYPE_LABELS,
  PRIORITY_RANK,
  meetsMinPriority,
  mergeAIRecommendations,
  RateLimiter,
};

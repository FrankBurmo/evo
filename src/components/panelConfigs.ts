/**
 * Panel-konfigurasjoner for de tre analysepanelene.
 * Sentralisert data som brukes av ConfigurablePanel.
 */

import type { PanelConfig } from '../types';

export const GUARDRAILS_CONFIG: PanelConfig = {
  title: '🛡️ Guardrails',
  description:
    'Guardrails er automatiserte sjekker og handlinger som hjelper deg med å holde repoene dine i god form. Slå dem av eller på etter behov.',
  storageKey: 'guardrails_config',
  apiPrefix: '/api/guardrails',
  triggerTitle: '🏗️ Trigger Arkitekturanalyse',
  triggerDesc:
    'Velg et repository og la en AI-agent analysere kodebasen som en erfaren software-arkitekt. Det opprettes et GitHub-issue med detaljerte forbedringsforslag.',
  triggerBtnLabel: '🚀 Kjør analyse',
  hasActionSelect: false,
  colorScheme: { cssPrefix: 'guardrails' },
  items: [
    {
      id: 'documentation-check',
      name: 'Dokumentasjonssjekk',
      description: 'Sjekker om repoet har README, CONTRIBUTING.md og god dokumentasjon',
      icon: '📝',
      category: 'quality',
      canTrigger: false,
      defaultEnabled: true,
    },
    {
      id: 'activity-monitor',
      name: 'Aktivitetsovervåking',
      description: 'Varsler når et repo har vært inaktivt i over 30 dager',
      icon: '📊',
      category: 'monitoring',
      canTrigger: false,
      defaultEnabled: true,
    },
    {
      id: 'issue-triage',
      name: 'Issue-triagering',
      description: 'Flagger repos med mange åpne issues som trenger oppmerksomhet',
      icon: '🐛',
      category: 'maintenance',
      canTrigger: false,
      defaultEnabled: true,
    },
    {
      id: 'security-check',
      name: 'Sikkerhetssjekk',
      description: 'Kontrollerer at repoet har sikkerhetspolicyer og Dependabot aktivert',
      icon: '🔒',
      category: 'security',
      canTrigger: false,
      defaultEnabled: false,
    },
    {
      id: 'architecture-analysis',
      name: 'Arkitekturanalyse',
      description:
        'Oppretter et GitHub-issue som ber en AI-agent analysere repoet dypt teknisk og foreslå forbedringer — som en erfaren software-arkitekt',
      icon: '🏗️',
      category: 'analysis',
      canTrigger: true,
      defaultEnabled: true,
    },
  ],
};

export const PRODUCT_DEV_CONFIG: PanelConfig = {
  title: '🚀 Produktutvikling',
  description:
    'Produktutviklingsverktøy som hjelper deg å forstå brukerbehov, identifisere markedsmuligheter og gjøre produktene dine mer verdifulle. Trigger en AI-agent som oppretter et GitHub-issue med detaljert analyse og konkrete forbedringsforslag.',
  storageKey: 'productdev_config',
  apiPrefix: '/api/product-dev',
  triggerTitle: '🚀 Trigger Produktutviklingsanalyse',
  triggerDesc:
    'Velg en analyse og et repository. En AI-agent vil opprette et GitHub-issue med en grundig analyse og konkrete, handlingsbare forbedringsforslag.',
  triggerBtnLabel: '🚀 Kjør analyse',
  hasActionSelect: true,
  colorScheme: { cssPrefix: 'productdev' },
  items: [
    {
      id: 'ux-audit',
      name: 'Brukeropplevelse (UX-audit)',
      description:
        'Ber en AI-agent gjennomgå repoet fra et brukerperspektiv — tilgjengelighet, feilhåndtering, navigasjon, onboarding og UI-konsistens',
      icon: '🎨',
      category: 'ux',
      canTrigger: true,
      defaultEnabled: true,
    },
    {
      id: 'market-opportunity',
      name: 'Markedsmuligheter & Vekst',
      description:
        'Analyser repoet for å identifisere markedsgap, vekstpotensial, mulige nye brukergrupper og strategisk posisjonering mot konkurrenter',
      icon: '📈',
      category: 'market',
      canTrigger: true,
      defaultEnabled: true,
    },
    {
      id: 'feature-discovery',
      name: 'Feature Discovery & Prioritering',
      description:
        'Gjennomgå eksisterende funksjonalitet og foreslå nye features, forbedringer og optimaliseringer — prioritert etter brukerverdi og innsats',
      icon: '💡',
      category: 'features',
      canTrigger: true,
      defaultEnabled: true,
    },
    {
      id: 'developer-experience',
      name: 'Utvikleropplevelse (DX)',
      description:
        'Vurder hvor enkelt det er for nye utviklere å bidra — API-design, dokumentasjon, onboarding, tooling og SDK-kvalitet',
      icon: '🛠️',
      category: 'dx',
      canTrigger: true,
      defaultEnabled: true,
    },
    {
      id: 'product-market-fit',
      name: 'Produkt-Markedstilpasning',
      description:
        'Evaluer om produktet effektivt løser reelle brukerproblemer og foreslå justeringer for bedre produkt-markedstilpasning',
      icon: '🎯',
      category: 'pmf',
      canTrigger: true,
      defaultEnabled: false,
    },
  ],
};

export const ENGINEERING_VELOCITY_CONFIG: PanelConfig = {
  title: '⚡ Leveransekvalitet',
  description:
    'Leveransekvalitet handler om ingeniørteamets evne til å levere programvare raskt, pålitelig og bærekraftig. Basert på DORA-forskning og CHAOSS-rammeverket — trigger en AI-agent som oppretter et GitHub-issue med konkrete anbefalinger.',
  storageKey: 'engvelocity_config',
  apiPrefix: '/api/engineering-velocity',
  triggerTitle: '⚡ Trigger Leveransekvalitet-analyse',
  triggerDesc:
    'Velg en analyse og et repository. En AI-agent oppretter et GitHub-issue med en DORA/CHAOSS-basert gjennomgang og handlingsbare forbedringstiltak.',
  triggerBtnLabel: '⚡ Kjør analyse',
  hasActionSelect: true,
  colorScheme: { cssPrefix: 'engvelocity' },
  items: [
    {
      id: 'cicd-maturity',
      name: 'CI/CD-modenhet',
      description:
        'Analyser pipeline-oppsett, automatiseringsgrad, testgater, deploy-strategi og identifiser flaskehalser i leveranseprosessen',
      icon: '⚙️',
      category: 'cicd',
      canTrigger: true,
      defaultEnabled: true,
    },
    {
      id: 'dora-assessment',
      name: 'DORA-metrikker & Leveransehastighet',
      description:
        'Vurder deployment frequency, lead time for changes, change failure rate og MTTR — og foreslå tiltak for å nå elite-nivå',
      icon: '📊',
      category: 'dora',
      canTrigger: true,
      defaultEnabled: true,
    },
    {
      id: 'observability',
      name: 'Observability & Monitorering',
      description:
        'Evaluer logging, metrikker, alerting og tracing — basert på OpenTelemetry-standarder og SRE best practices',
      icon: '🔭',
      category: 'observability',
      canTrigger: true,
      defaultEnabled: true,
    },
    {
      id: 'release-hygiene',
      name: 'Release-hygiene & Versjonering',
      description:
        'Gjennomgå branching-strategi, versjonering (semver), changelog-praksis, feature flags og release-prosess',
      icon: '🏷️',
      category: 'release',
      canTrigger: true,
      defaultEnabled: true,
    },
    {
      id: 'community-health',
      name: 'Community-helse & Bærekraft',
      description:
        'Mål bus factor, contributor diversity, responsivitet på issues/PRer og langsiktig bærekraft basert på CHAOSS-rammeverket',
      icon: '🌱',
      category: 'community',
      canTrigger: true,
      defaultEnabled: false,
    },
  ],
};

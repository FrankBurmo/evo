'use strict';

/**
 * CLI analyzer — re-eksporterer delt logikk fra @evo/core.
 * Beholder `detectProjectType` som alias for `detectProjectTypeFromMetadata`
 * for bakoverkompatibilitet med CLI-tester og scanner.
 */

const {
  detectProjectTypeFromMetadata,
  analyzeRepository,
  PROJECT_TYPE_LABELS,
} = require('../../core');

// CLI bruker navnet `detectProjectType` — alias for kjernefunksjonen
const detectProjectType = detectProjectTypeFromMetadata;

module.exports = { analyzeRepository, detectProjectType, PROJECT_TYPE_LABELS };


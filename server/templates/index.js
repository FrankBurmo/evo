'use strict';

/**
 * server/templates — Re-exports all issue-body templates.
 *
 * Modules:
 *   guardrails.js           — architectureAnalysisTemplate
 *   product-dev.js          — PRODUCT_DEV_TEMPLATES
 *   engineering-velocity.js — ENGINEERING_VELOCITY_TEMPLATES
 *   scan.js                 — buildScanIssueBody
 */

const { architectureAnalysisTemplate } = require('./guardrails');
const { PRODUCT_DEV_TEMPLATES } = require('./product-dev');
const { ENGINEERING_VELOCITY_TEMPLATES } = require('./engineering-velocity');
const { buildScanIssueBody } = require('./scan');

module.exports = {
  architectureAnalysisTemplate,
  PRODUCT_DEV_TEMPLATES,
  ENGINEERING_VELOCITY_TEMPLATES,
  buildScanIssueBody,
};

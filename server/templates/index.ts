/**
 * server/templates — Re-exports all issue-body templates.
 *
 * Modules:
 *   guardrails.ts           — architectureAnalysisTemplate
 *   product-dev.ts          — PRODUCT_DEV_TEMPLATES
 *   engineering-velocity.ts — ENGINEERING_VELOCITY_TEMPLATES
 *   scan.ts                 — buildScanIssueBody
 */

export { architectureAnalysisTemplate } from './guardrails';
export { PRODUCT_DEV_TEMPLATES } from './product-dev';
export { ENGINEERING_VELOCITY_TEMPLATES } from './engineering-velocity';
export { buildScanIssueBody } from './scan';

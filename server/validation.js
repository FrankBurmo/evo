'use strict';

/**
 * server/validation.js — Zod-skjemaer for input-validering av alle POST-ruter.
 *
 * Eksporterer validate()-middleware-factory og ferdigdefinerte skjemaer.
 */

const { z } = require('zod');

// ─── Gjenbrukbare felter ─────────────────────────────────────────────────────

const ownerField = z.string().min(1, 'owner er påkrevd').max(100);
const repoField = z.string().min(1, 'repo er påkrevd').max(100);

// ─── Skjemaer ────────────────────────────────────────────────────────────────

/** POST /api/create-agent-issue */
const createAgentIssueSchema = z.object({
  owner: ownerField,
  repo: repoField,
  recommendation: z.object({
    title: z.string().min(1, 'recommendation.title er påkrevd').max(200),
    description: z.string().optional().default(''),
    priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
    type: z.string().optional(),
    marketOpportunity: z.string().optional(),
  }),
});

/** POST /api/guardrails/architecture-analysis, product-dev/:actionId, engineering-velocity/:actionId */
const templateIssueSchema = z.object({
  owner: ownerField,
  repo: repoField,
});

/** POST /api/scan/start */
const scanStartSchema = z.object({
  createIssues: z.boolean().optional().default(false),
  assignCopilot: z.boolean().optional().default(false),
  minPriority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  maxRepos: z.number().int().min(1).max(200).optional().default(50),
  useAI: z.boolean().optional().default(true),
  model: z.string().max(100).optional(),
});

/** POST /api/scan/create-issues */
const scanCreateIssuesSchema = z.object({
  assignCopilot: z.boolean().optional().default(false),
  selected: z.array(z.object({
    repoFullName: z.string().min(1),
    recommendationTitle: z.string().min(1),
  })).optional(),
});

/** POST /api/repo/:owner/:name/ai-analyze */
const aiAnalyzeSchema = z.object({
  model: z.string().max(100).optional(),
}).optional().default({});

// ─── Route params ────────────────────────────────────────────────────────────

/** Params: :owner, :name */
const repoParamsSchema = z.object({
  owner: ownerField,
  name: z.string().min(1, 'name er påkrevd').max(100),
});

/** Params: :actionId */
const actionIdParamsSchema = z.object({
  actionId: z.string().min(1, 'actionId er påkrevd').max(100),
});

// ─── Validation middleware factory ───────────────────────────────────────────

/**
 * Opprett Express-middleware som validerer request body/params med et Zod-skjema.
 *
 * @param {object} schemas
 * @param {z.ZodSchema} [schemas.body] - Skjema for req.body
 * @param {z.ZodSchema} [schemas.params] - Skjema for req.params
 * @returns {import('express').RequestHandler}
 */
function validate(schemas) {
  return (req, res, next) => {
    // Validér params
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Ugyldige URL-parametere',
          statusCode: 400,
          details: result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        });
      }
      req.params = result.data;
    }

    // Validér body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Ugyldig request body',
          statusCode: 400,
          details: result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        });
      }
      req.body = result.data;
    }

    next();
  };
}

module.exports = {
  validate,
  createAgentIssueSchema,
  templateIssueSchema,
  scanStartSchema,
  scanCreateIssuesSchema,
  aiAnalyzeSchema,
  repoParamsSchema,
  actionIdParamsSchema,
};

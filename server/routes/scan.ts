/**
 * Proactive scan routes — thin HTTP layer.
 *
 * All business logic lives in services/scan-service.ts.
 *
 *   POST /api/scan/start
 *   GET  /api/scan/status
 *   GET  /api/scan/results
 *   POST /api/scan/create-issues
 */
import { Router } from 'express';
import { getOctokit } from '../github';
import {
  scanState,
  getScanStatus,
  getScanResults,
  startScan,
  createIssuesFromResults,
} from '../services/scan-service';
import { requireAuth } from '../middleware';
import { validate, scanStartSchema, scanCreateIssuesSchema } from '../validation';

const router = Router();

router.use('/scan', requireAuth);

// ── POST /api/scan/start ────────────────────────────────────────────────────
router.post('/scan/start', validate({ body: scanStartSchema }), async (req, res) => {
  if (scanState.status === 'running') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'En skanning kjører allerede. Vent til den er ferdig.',
      statusCode: 409,
    });
  }

  const options = (req.body || {}) as Record<string, unknown>;

  res.json({
    status: 'started',
    message: 'Proaktiv skanning startet.',
    startedAt: new Date().toISOString(),
  });

  // Fire-and-forget
  const octokit = getOctokit(req.token);
  startScan({ octokit, token: req.token, options: options as Parameters<typeof startScan>[0]['options'] });
});

// ── GET /api/scan/status ────────────────────────────────────────────────────
router.get('/scan/status', (_req, res) => {
  res.json(getScanStatus());
});

// ── GET /api/scan/results ───────────────────────────────────────────────────
router.get('/scan/results', (req, res) => {
  const { minPriority } = req.query as { minPriority?: string };
  res.json(getScanResults(minPriority));
});

// ── POST /api/scan/create-issues ────────────────────────────────────────────
router.post(
  '/scan/create-issues',
  validate({ body: scanCreateIssuesSchema }),
  async (req, res, next) => {
    try {
      if (scanState.status !== 'completed' || scanState.results.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Ingen skanningsresultater tilgjengelig. Kjør en skanning først.',
          statusCode: 400,
        });
      }

      const { assignCopilot = false, selected } = (req.body || {}) as {
        assignCopilot?: boolean;
        selected?: Array<{ repoFullName: string; recIndex: number }> | null;
      };
      const octokit = getOctokit(req.token);

      const { created, skipped, errors } = await createIssuesFromResults({
        octokit,
        assignCopilot,
        selected: selected ?? null,
      });

      res.json({
        success: true,
        summary: { created: created.length, skipped: skipped.length, errors: errors.length },
        created,
        skipped,
        errors,
      });
    } catch (error) {
      next(error);
    }
  },
);

export = router;

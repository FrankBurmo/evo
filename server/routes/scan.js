/**
 * Proactive scan routes — thin HTTP layer.
 *
 * All business logic lives in services/scan-service.js.
 *
 *   POST /api/scan/start
 *   GET  /api/scan/status
 *   GET  /api/scan/results
 *   POST /api/scan/create-issues
 */
const express = require('express');
const { getOctokit } = require('../github');
const {
  scanState,
  getScanStatus,
  getScanResults,
  startScan,
  createIssuesFromResults,
} = require('../services/scan-service');
const { requireAuth } = require('../middleware');
const { validate, scanStartSchema, scanCreateIssuesSchema } = require('../validation');

const router = express.Router();

// A6: Alle scan-ruter krever nå autentisering
router.use('/scan', requireAuth);

// ── POST /api/scan/start ────────────────────────────────────────────────────
router.post('/scan/start', validate({ body: scanStartSchema }), async (req, res) => {
  if (scanState.status === 'running') {
    return res.status(409).json({ error: 'Conflict', message: 'En skanning kjører allerede. Vent til den er ferdig.', statusCode: 409 });
  }

  const options = req.body || {};

  // Respond immediately — scan runs in background
  res.json({
    status: 'started',
    message: 'Proaktiv skanning startet.',
    startedAt: new Date().toISOString(),
  });

  // Fire-and-forget
  const octokit = getOctokit(req.token);
  startScan({ octokit, token: req.token, options });
});

// ── GET /api/scan/status ────────────────────────────────────────────────────
router.get('/scan/status', (req, res) => {
  res.json(getScanStatus());
});

// ── GET /api/scan/results ───────────────────────────────────────────────────
router.get('/scan/results', (req, res) => {
  const { minPriority } = req.query;
  res.json(getScanResults(minPriority));
});

// ── POST /api/scan/create-issues ────────────────────────────────────────────
router.post('/scan/create-issues', validate({ body: scanCreateIssuesSchema }), async (req, res, next) => {
  try {
    if (scanState.status !== 'completed' || scanState.results.length === 0) {
      return res
        .status(400)
        .json({ error: 'Bad Request', message: 'Ingen skanningsresultater tilgjengelig. Kjør en skanning først.', statusCode: 400 });
    }

    const { assignCopilot = false, selected } = req.body || {};
    const octokit = getOctokit(req.token);

    const { created, skipped, errors } = await createIssuesFromResults({
      octokit,
      assignCopilot,
      selected,
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
});

module.exports = router;

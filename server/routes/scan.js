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
const { getOctokit, extractToken } = require('../github');
const {
  scanState,
  getScanStatus,
  getScanResults,
  startScan,
  createIssuesFromResults,
} = require('../services/scan-service');

const router = express.Router();

// ── POST /api/scan/start ────────────────────────────────────────────────────
router.post('/scan/start', async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (scanState.status === 'running') {
    return res.status(409).json({ error: 'En skanning kjører allerede. Vent til den er ferdig.' });
  }

  const options = req.body || {};

  // Respond immediately — scan runs in background
  res.json({
    status: 'started',
    message: 'Proaktiv skanning startet.',
    startedAt: new Date().toISOString(),
  });

  // Fire-and-forget
  const octokit = getOctokit(token);
  startScan({ octokit, token, options });
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
router.post('/scan/create-issues', async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'GitHub token required' });
  }

  if (scanState.status !== 'completed' || scanState.results.length === 0) {
    return res
      .status(400)
      .json({ error: 'Ingen skanningsresultater tilgjengelig. Kjør en skanning først.' });
  }

  const { assignCopilot = false, selected } = req.body || {};
  const octokit = getOctokit(token);

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
});

module.exports = router;

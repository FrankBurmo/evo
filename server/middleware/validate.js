'use strict';

/**
 * server/middleware/validate.js — Input-validering for API-ruter.
 *
 * Eksporterer:
 *   validateOwnerRepo(req, res, next) — validerer owner og repo i req.body
 */

// GitHub brukernavn / org-navn: 1–39 tegn, alfanumerisk eller bindestrek,
// kan ikke starte eller slutte med bindestrek.
const GITHUB_OWNER_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

// GitHub repo-navn: 1–100 tegn, alfanumerisk, bindestrek, understrek, punktum.
const GITHUB_REPO_RE = /^[a-zA-Z0-9._-]{1,100}$/;

/**
 * Middleware: validerer at `owner` og `repo` i req.body er gyldige GitHub-navn.
 * Returnerer 400 ved ugyldig innhold.
 */
function validateOwnerRepo(req, res, next) {
  const { owner, repo } = req.body;
  if (!owner || !GITHUB_OWNER_RE.test(owner)) {
    return res.status(400).json({ error: 'Ugyldig eller manglende owner-parameter' });
  }
  if (!repo || !GITHUB_REPO_RE.test(repo)) {
    return res.status(400).json({ error: 'Ugyldig eller manglende repo-parameter' });
  }
  next();
}

module.exports = { validateOwnerRepo };

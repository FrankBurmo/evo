/**
 * server/middleware.ts — Express-middleware for sikkerhet, autentisering og feilhåndtering.
 *
 * Inneholder:
 *   - requireAuth      — autentiseringsmiddleware (krever gyldig GitHub-token)
 *   - errorHandler     — global error-handler med konsistent JSON-format
 *   - notFoundHandler  — 404-handler for ukjente ruter
 */
import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import { extractToken } from './github';

// ─── Autentiserings-middleware ────────────────────────────────────────────────

/**
 * Krever at en gyldig GitHub-token er tilgjengelig via Authorization-header
 * eller GITHUB_TOKEN-miljøvariabel.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'GitHub token required. Send token via Authorization: Bearer <token> header.',
      statusCode: 401,
    });
    return;
  }
  req.token = token;
  next();
};

// ─── Global error-handler ─────────────────────────────────────────────────────

interface AppError extends Error {
  status?: number;
  statusCode?: number;
  error?: string;
}

/**
 * Global error-handler middleware.
 * Fanger opp uventede feil og returnerer konsistent JSON-respons.
 *
 * MÅ registreres ETTER alle ruter (4 argumenter kreves av Express).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err: AppError, req, res, _next) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'En intern serverfeil oppstod';

  console.error('[ERROR] %s %s:', req.method, req.path, err);

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.error || 'Request Error',
    message:
      statusCode >= 500 && process.env.NODE_ENV === 'production'
        ? 'En intern serverfeil oppstod'
        : message,
    statusCode,
  });
};

// ─── 404-handler ──────────────────────────────────────────────────────────────

/**
 * 404-handler for ukjente API-ruter.
 * Registreres etter alle ruter men FØR errorHandler.
 */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Ruten ${req.method} ${req.path} finnes ikke.`,
    statusCode: 404,
  });
};

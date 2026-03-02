import 'dotenv/config';
import express from 'express';
import cors from 'cors';
// @ts-ignore — helmet CJS/ESM interop
import helmet from 'helmet';
// @ts-ignore — express-rate-limit CJS/ESM interop
import rateLimit from 'express-rate-limit';

// Route modules
import reposRoutes = require('./routes/repos');
import issuesRoutes = require('./routes/issues');
import scanRoutes = require('./routes/scan');

// Middleware
import { errorHandler, notFoundHandler } from './middleware';

const app = express();
const port = process.env.PORT || 3001;

// ── A10: Trust proxy — nødvendig for korrekt rate limiting bak reverse proxy ─
app.set('trust proxy', 1);

// ── A1: Helmet — sikre HTTP-headers (CSP, X-Frame-Options, etc.) ─────────────
app.use(helmet());

// ── A2: CORS — begrens til kjente origins ────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
  'http://127.0.0.1:5173',
  'https://frankburmo.github.io', // GitHub Pages
];

app.use(
  cors({
    origin(origin, callback) {
      // Tillat requests uten origin (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: Origin ${origin} er ikke tillatt`));
    },
    credentials: true,
  }),
);

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too Many Requests',
    message: 'For mange forespørsler fra denne IP-en. Prøv igjen senere.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check (uautentisert)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Evo API is running' });
});

// Mount route modules
app.use('/api', reposRoutes);
app.use('/api', issuesRoutes);
app.use('/api', scanRoutes);

// ── A3: 404 + Global error-handler (MÅ komme etter alle ruter) ──────────────
app.use('/api', notFoundHandler);
app.use(errorHandler);

// ── A9: Graceful shutdown ────────────────────────────────────────────────────
const server = app.listen(port, () => {
  console.log(`Evo API running on port ${port}`);
  console.log(`Visit http://localhost:${port}/api/health to check status`);
});

function gracefulShutdown(signal: string): void {
  console.log(`\n${signal} mottatt — avslutter gracefully...`);
  server.close(() => {
    console.log('HTTP-server stengt. Pågående tilkoblinger er avsluttet.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Tvungen avslutning etter timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;

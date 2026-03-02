// server/types.d.ts — Globale TypeScript-utvidelser for Express-serveren.
// Løser TS2339: Property 'token' does not exist on type 'Request'.

declare global {
  namespace Express {
    interface Request {
      /** GitHub PAT satt av requireAuth-middleware */
      token: string;
    }
  }
}

export {};

/**
 * Minimal test Express application used by Cucumber step definitions.
 * Uses the real routes and middleware but with a mock Socket.IO server
 * so no real WebSocket or MongoDB bootstrapping is needed at startup.
 */
import 'reflect-metadata';
import express from 'express';
import passport from 'passport';
import routes from '../../../src/routes/index.js';
import { ensurePassportAuthInitialized } from '../../../src/auth/passport.js';
import { errorHandler } from '../../../src/middleware/error.middleware.js';

// Must be set before ensurePassportAuthInitialized is called
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-for-cucumber';

const mockIo = {
  to: () => ({ emit: () => {} }),
  in: () => ({ emit: () => {} }),
  emit: () => {},
};

export function buildTestApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  ensurePassportAuthInitialized();
  app.use(passport.initialize());
  app.set('io', mockIo);

  app.use(routes);
  app.use(errorHandler);

  return app;
}

// Shared singleton – recreated for each test run but not per scenario
export const testApp = buildTestApp();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import pkg from '../package.json';
import { InMemoryRepos } from './repositories';
import { PgRepos } from './repos.pg';
import { PgChoresRepo } from './repos.chores.pg';
import { PgBankRepo } from './repos.bank.pg';
import { bankRoutes } from './routes/bank';
import { InMemoryBankRepo } from './bank.memory';
import { choresRoutes } from './routes/chores';
import { Pool } from 'pg';
import { DevAuthProvider, JwtService } from './auth';
import { withJwt, authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { familyRoutes } from './routes/families';
import { childrenRoutes } from './routes/children';
import { meRoutes } from './routes/me';
import { configureGoogleAuth } from './auth.google';
import { configRoutes } from './routes/config';

export function createApp(deps?: { useDb?: boolean }) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  const useDb = deps?.useDb || process.env.USE_DB === 'true';
  const repos = useDb ? new PgRepos() : new InMemoryRepos();
  const jwt = new JwtService({ jwtSecret: process.env.JWT_SECRET || 'dev-secret', tokenExpiry: '7d' });
  withJwt(jwt);
  const authProvider = new DevAuthProvider();

  // attach auth middleware (optional bearer)
  app.use(authMiddleware);

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/version', (_req, res) => {
    res.status(200).json({ name: pkg.name, version: pkg.version });
  });

  // API routes
  app.use(authRoutes({ authProvider, jwt, users: repos, families: repos }));
  // Google OAuth routes (enabled if env has client creds)
  configureGoogleAuth(app, { users: repos, families: repos, jwt });
  app.use(meRoutes({ users: repos }));
  app.use(configRoutes());
  app.use(familyRoutes({ families: repos, users: repos }));
  app.use(childrenRoutes({ users: repos, families: repos }));
  if (useDb) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const choresRepo = new PgChoresRepo(pool);
    const bankRepo = new PgBankRepo(pool);
    // fire and forget init
    choresRepo.init().catch(() => {});
    bankRepo.init().catch(() => {});
    app.use(choresRoutes({ chores: choresRepo, families: repos, users: repos }));
    app.use(bankRoutes({ bank: bankRepo, users: repos, families: repos, chores: choresRepo }));
  } else {
    app.use(choresRoutes({ chores: repos as any, families: repos, users: repos }));
    app.use(bankRoutes({ bank: repos as any, users: repos, families: repos, chores: repos as any }));
  }

  // Serve built web app statically if present (single-container runtime)
  const webDist = process.env.WEB_DIST || path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    // SPA fallback (after API routes)
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  return app;
}

export default createApp;

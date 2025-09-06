import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import pkg from '../package.json';
import { InMemoryRepos } from './repositories';
import { PgRepos } from './repos.pg';
import { PgChoresRepo } from './repos.chores.pg';
import { PgBankRepo } from './repos.bank.pg';
import { PgSaversRepo } from './repos.savers.pg';
import { bankRoutes } from './routes/bank';
import { InMemoryBankRepo } from './bank.memory';
import { saversRoutes } from './routes/savers';
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
import { uploadRoutes } from './routes/uploads';
import { PgUploadsRepo } from './repos.uploads.pg';
import { requestLogger } from './middleware/logger';

export function createApp(deps?: { useDb?: boolean }) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  // Global request logging (respects LOG_LEVEL)
  app.use(requestLogger());
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
  // Uploads (S3 presign + records) – enabled when S3 env configured
  if (useDb) {
    const pool2 = new (require('pg').Pool)({ connectionString: process.env.DATABASE_URL });
    const uploadsRepo = new (require('./repos.uploads.pg').PgUploadsRepo)(pool2);
    uploadsRepo.init().catch(() => {});
    app.use(uploadRoutes({ uploads: uploadsRepo }));
  } else {
    app.use(uploadRoutes({ uploads: repos as any }));
  }
  if (useDb) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const choresRepo = new PgChoresRepo(pool);
    const bankRepo = new PgBankRepo(pool);
    const saversRepo = new PgSaversRepo(pool);
    // fire and forget init
    choresRepo.init().catch(() => {});
    bankRepo.init().catch(() => {});
    saversRepo.init().catch(() => {});
    app.use(choresRoutes({ chores: choresRepo, families: repos, users: repos }));
    app.use(bankRoutes({ bank: bankRepo, users: repos, families: repos, chores: choresRepo, savers: saversRepo }));
    app.use(saversRoutes({ savers: saversRepo, users: repos, families: repos, bank: bankRepo }));
    const uploadsRepo = new (require('./repos.uploads.pg').PgUploadsRepo)(pool);
    uploadsRepo.init().catch(() => {});
    app.use(childrenRoutes({ users: repos, families: repos, uploads: uploadsRepo }));
    app.use(uploadRoutes({ uploads: uploadsRepo }));
  } else {
    app.use(choresRoutes({ chores: repos as any, families: repos, users: repos }));
    app.use(bankRoutes({ bank: repos as any, users: repos, families: repos, chores: repos as any, savers: repos as any }));
    app.use(saversRoutes({ savers: repos as any, users: repos, families: repos, bank: repos as any }));
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

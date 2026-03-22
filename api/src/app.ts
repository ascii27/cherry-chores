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
import { withJwt, authMiddleware, withTokensRepo } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { familyRoutes } from './routes/families';
import { childrenRoutes } from './routes/children';
import { meRoutes } from './routes/me';
import { configureGoogleAuth } from './auth.google';
import { configRoutes } from './routes/config';
import { uploadRoutes } from './routes/uploads';
import { PgUploadsRepo } from './repos.uploads.pg';
import { requestLogger } from './middleware/logger';
import { tokenRoutes } from './routes/tokens';
import { PgTokensRepo } from './repos.tokens.pg';
import { bonusRoutes } from './routes/bonuses';
import { InMemoryBonusRepo, InMemoryActivityRepo } from './repositories';
import { PgBonusRepo } from './repos.bonus.pg';
import { PgActivityRepo } from './repos.activity.pg';
import { activityRoutes } from './routes/activity';
import { approvalsRoutes } from './routes/approvals';
import { PgCatalogRepo } from './repos.catalog.pg';
import { catalogRoutes } from './routes/catalog';

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
  // Tokens routes and repo wiring
  if (useDb) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const tokensRepo = new PgTokensRepo(pool);
    (tokensRepo as any).init?.().catch(() => {});
    withTokensRepo(tokensRepo);
    app.use(tokenRoutes({ tokens: tokensRepo, users: repos }));
  } else {
    withTokensRepo(repos as any);
    app.use(tokenRoutes({ tokens: repos as any, users: repos }));
  }
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
    const activityRepo = new PgActivityRepo(pool);
    // fire and forget init
    choresRepo.init().catch(() => {});
    bankRepo.init().catch(() => {});
    saversRepo.init().catch(() => {});
    activityRepo.init().catch(() => {});
    const bonusRepo = new PgBonusRepo(pool);
    bonusRepo.init().catch(() => {});
    const catalogRepo = new PgCatalogRepo(pool);
    catalogRepo.init().catch(() => {});
    app.use(choresRoutes({ chores: choresRepo, families: repos, users: repos, bank: bankRepo, savers: saversRepo, activity: activityRepo }));
    app.use(bankRoutes({ bank: bankRepo, users: repos, families: repos, chores: choresRepo, savers: saversRepo, activity: activityRepo }));
    app.use(saversRoutes({ savers: saversRepo, users: repos, families: repos, bank: bankRepo }));
    app.use('/api', bonusRoutes({ bonus: bonusRepo, users: repos, families: repos, bank: bankRepo, savers: saversRepo }));
    app.use('/api', activityRoutes({ activity: activityRepo, families: repos }));
    app.use('/api', approvalsRoutes({ chores: choresRepo, bonus: bonusRepo, bank: bankRepo, users: repos, families: repos, savers: saversRepo, activity: activityRepo }));
    app.use('/api', catalogRoutes({ catalog: catalogRepo, users: repos, families: repos, bank: bankRepo, activity: activityRepo }));
    const uploadsRepo = new (require('./repos.uploads.pg').PgUploadsRepo)(pool);
    uploadsRepo.init().catch(() => {});
    app.use(childrenRoutes({ users: repos, families: repos, uploads: uploadsRepo }));
    app.use(uploadRoutes({ uploads: uploadsRepo }));
  } else {
    const bonusRepo = new InMemoryBonusRepo();
    const activityRepo = new InMemoryActivityRepo();
    app.use(choresRoutes({ chores: repos as any, families: repos, users: repos, bank: repos as any, savers: repos as any, activity: activityRepo }));
    app.use(bankRoutes({ bank: repos as any, users: repos, families: repos, chores: repos as any, savers: repos as any, activity: activityRepo }));
    app.use(saversRoutes({ savers: repos as any, users: repos, families: repos, bank: repos as any }));
    app.use('/api', bonusRoutes({ bonus: bonusRepo, users: repos, families: repos, bank: repos as any, savers: repos as any }));
    app.use('/api', activityRoutes({ activity: activityRepo, families: repos }));
    app.use('/api', approvalsRoutes({ chores: repos as any, bonus: bonusRepo, bank: repos as any, users: repos, families: repos, savers: repos as any, activity: activityRepo }));
    app.use(childrenRoutes({ users: repos, families: repos }));
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

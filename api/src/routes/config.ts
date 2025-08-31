import { Router } from 'express';

export function configRoutes() {
  const router = Router();
  router.get('/config/public', (_req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || null
    });
  });
  return router;
}


import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import pkg from '../package.json';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/version', (_req, res) => {
    res.status(200).json({ name: pkg.name, version: pkg.version });
  });

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

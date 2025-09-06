import { Router, Request } from 'express';
import { AuthedRequest } from '../middleware/auth';
import crypto from 'crypto';
import { S3Storage } from '../storage.s3';
import { logDebug, logInfo, logError } from '../log';

function sanitizeFilename(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return n.replace(/-+/g, '-');
}

export function uploadRoutes() {
  const router = Router();
  const enabled = !!(process.env.S3_BUCKET && (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION));

  router.post('/uploads/presign', async (req: Request, res) => {
    let u = (req as AuthedRequest).user;
    if (!u && (req.query as any).token && (global as any).__jwtService) {
      try { const p = (global as any).__jwtService.verify(String((req.query as any).token)); u = { id: p.sub, role: p.role, familyId: p.familyId }; } catch {}
    }
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (!enabled) return res.status(501).json({ error: 'uploads not configured' });
    const { filename, contentType, scope } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: 'missing fields' });
    const safe = sanitizeFilename(String(filename));
    const id = crypto.randomUUID();
    const key = `uploads/${scope || 'misc'}/${u.role}-${u.id}/${id}-${safe}`;
    try {
      logDebug('uploads', 'Presign request', { user: u, filename, contentType, key });
      const s3 = new S3Storage();
      const post = await s3.presignPost({ key, contentType });
      logInfo('uploads', 'Presign POST success', { key });
      return res.json({ method: 'POST', post, key });
    } catch (e: any) {
      logError('uploads', 'Presign error', { error: String(e && e.message || e) });
      return res.status(500).json({ error: 'presign failed' });
    }
  });

  // Secure fetch: stream object through API after ownership check
  router.get('/uploads/serve', async (req: Request, res) => {
    let u = (req as AuthedRequest).user;
    if (!u && (req.query as any).token && (global as any).__jwtService) {
      try { const p = (global as any).__jwtService.verify(String((req.query as any).token)); u = { id: p.sub, role: p.role, familyId: p.familyId }; } catch {}
    }
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (!enabled) return res.status(501).json({ error: 'uploads not configured' });
    const key = String((req.query as any).key || '');
    if (!key || !key.startsWith('uploads/')) return res.status(400).json({ error: 'invalid key' });
    const ownerSeg = `${u.role}-${u.id}`;
    if (!key.includes(`/${ownerSeg}/`)) return res.status(403).json({ error: 'forbidden' });
    try {
      const s3 = new S3Storage();
      const obj = await s3.getObject(key);
      logInfo('uploads', 'Serve success', { key, user: u });
      if (obj.contentType) res.setHeader('Content-Type', obj.contentType);
      if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength));
      res.setHeader('Cache-Control', 'private, max-age=300');
      (obj.body as any).pipe(res);
    } catch (e) {
      logError('uploads', 'Serve error', { key, error: String((e as any)?.message || e) });
      return res.status(404).json({ error: 'not found' });
    }
  });

  return router;
}

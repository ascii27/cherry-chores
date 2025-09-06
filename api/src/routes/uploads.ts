import { Router, Request } from 'express';
import { AuthedRequest } from '../middleware/auth';
import crypto from 'crypto';
import { S3Storage } from '../storage.s3';

function sanitizeFilename(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return n.replace(/-+/g, '-');
}

export function uploadRoutes() {
  const router = Router();
  const enabled = !!(process.env.S3_BUCKET && (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION));

  router.post('/uploads/presign', async (req: Request, res) => {
    const u = (req as AuthedRequest).user;
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (!enabled) return res.status(501).json({ error: 'uploads not configured' });
    const { filename, contentType, scope } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: 'missing fields' });
    const safe = sanitizeFilename(String(filename));
    const id = crypto.randomUUID();
    const key = `uploads/${scope || 'misc'}/${u.role}-${u.id}/${id}-${safe}`;
    try {
      const s3 = new S3Storage();
      const { uploadUrl, publicUrl } = await s3.presignPut({ key, contentType });
      return res.json({ uploadUrl, publicUrl, key });
    } catch (e: any) {
      return res.status(500).json({ error: 'presign failed' });
    }
  });

  // Secure fetch: stream object through API after ownership check
  router.get('/uploads/serve', async (req: Request, res) => {
    const u = (req as AuthedRequest).user;
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (!enabled) return res.status(501).json({ error: 'uploads not configured' });
    const key = String((req.query as any).key || '');
    if (!key || !key.startsWith('uploads/')) return res.status(400).json({ error: 'invalid key' });
    const ownerSeg = `${u.role}-${u.id}`;
    if (!key.includes(`/${ownerSeg}/`)) return res.status(403).json({ error: 'forbidden' });
    try {
      const s3 = new S3Storage();
      const obj = await s3.getObject(key);
      if (obj.contentType) res.setHeader('Content-Type', obj.contentType);
      if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength));
      res.setHeader('Cache-Control', 'private, max-age=300');
      (obj.body as any).pipe(res);
    } catch (e) {
      return res.status(404).json({ error: 'not found' });
    }
  });

  return router;
}


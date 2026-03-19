import { Router, Request } from 'express';
import { AuthedRequest } from '../middleware/auth';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import busboy from 'busboy';
import { createStorageProvider } from '../storage.factory';
import { LocalStorage } from '../storage.local';
import { logDebug, logInfo, logError } from '../log';

function sanitizeFilename(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return n.replace(/-+/g, '-');
}

function isStorageEnabled(): boolean {
  try {
    createStorageProvider();
    return true;
  } catch {
    return false;
  }
}

export function uploadRoutes(opts: { uploads: any }) {
  const router = Router();
  const enabled = isStorageEnabled();
  const uploads = opts.uploads;

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
      const storage = createStorageProvider();
      const post = await storage.presignPost({ key, contentType });
      logInfo('uploads', 'Presign POST success', { key });
      return res.json({ method: 'POST', post, key });
    } catch (e: any) {
      logError('uploads', 'Presign error', { error: String(e && e.message || e) });
      return res.status(500).json({ error: 'presign failed' });
    }
  });

  // Local upload endpoint: receives multipart/form-data with `key` field and `file` part
  router.post('/uploads/local', async (req: Request, res) => {
    let u = (req as AuthedRequest).user;
    if (!u && (req.query as any).token && (global as any).__jwtService) {
      try { const p = (global as any).__jwtService.verify(String((req.query as any).token)); u = { id: p.sub, role: p.role, familyId: p.familyId }; } catch {}
    }
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (!enabled) return res.status(501).json({ error: 'uploads not configured' });

    // Determine upload dir from LocalStorage instance
    let uploadDir: string;
    try {
      const storage = createStorageProvider();
      if (storage instanceof LocalStorage) {
        uploadDir = (storage as LocalStorage).getUploadDir();
      } else {
        return res.status(400).json({ error: 'local uploads not available with current storage driver' });
      }
    } catch (e: any) {
      return res.status(500).json({ error: 'storage not configured' });
    }

    try {
      const bb = busboy({ headers: req.headers });
      let key = '';
      let fileWritePromise: Promise<void> | null = null;

      bb.on('field', (name: string, val: string) => {
        if (name === 'key') key = val;
      });

      bb.on('file', (_fieldname: string, stream: NodeJS.ReadableStream, _info: any) => {
        fileWritePromise = new Promise<void>((resolve, reject) => {
          // We defer validation until we have the key (fields come before files in S3-style POST)
          // But busboy may emit file before all fields — so we buffer key from fields above
          // Since fields are emitted before files in the standard multipart order this is fine.
          const doWrite = () => {
            if (!key || !key.startsWith('uploads/')) {
              stream.resume(); // drain
              return reject(new Error('invalid key'));
            }
            const ownerSeg = `${u!.role}-${u!.id}`;
            if (!key.includes(`/${ownerSeg}/`)) {
              stream.resume();
              return reject(new Error('forbidden'));
            }
            const fullPath = path.resolve(uploadDir, key);
            // Security: ensure resolved path is within uploadDir
            const resolvedDir = path.resolve(uploadDir);
            if (!fullPath.startsWith(resolvedDir + path.sep)) {
              stream.resume();
              return reject(new Error('invalid key path'));
            }
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            const writeStream = fs.createWriteStream(fullPath);
            stream.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            stream.on('error', reject);
          };
          // slight defer so field events can fire first
          setImmediate(doWrite);
        });
      });

      bb.on('finish', async () => {
        try {
          if (fileWritePromise) {
            await fileWritePromise;
          }
          if (!key) {
            return res.status(400).json({ error: 'missing key' });
          }
          logInfo('uploads', 'Local upload saved', { key, user: u });
          return res.json({ ok: true, key });
        } catch (e: any) {
          const msg = String(e?.message || e);
          if (msg === 'forbidden') return res.status(403).json({ error: 'forbidden' });
          if (msg === 'invalid key' || msg === 'invalid key path') return res.status(400).json({ error: 'invalid key' });
          logError('uploads', 'Local upload finish error', { error: msg });
          return res.status(500).json({ error: 'upload failed' });
        }
      });

      bb.on('error', (e: any) => {
        logError('uploads', 'Busboy error', { error: String(e?.message || e) });
        if (!res.headersSent) res.status(500).json({ error: 'upload parse error' });
      });

      req.pipe(bb);
    } catch (e: any) {
      logError('uploads', 'Local upload error', { error: String(e?.message || e) });
      return res.status(500).json({ error: 'upload failed' });
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
      const storage = createStorageProvider();
      const obj = await storage.getObject(key);
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

  // List uploads for current user
  router.get('/uploads', async (req: Request, res) => {
    const u = (req as AuthedRequest).user;
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    const scope = String((req.query as any).scope || '');
    const list = await uploads.listUploads(u.role, u.id, scope || undefined);
    return res.json(list.map((r: any) => ({ id: r.id, scope: r.scope, url: r.url, key: r.key, createdAt: r.createdAt })));
  });

  // Delete an upload by ID (owner only)
  router.delete('/uploads/:id', async (req: Request, res) => {
    const u = (req as AuthedRequest).user;
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    const { id } = req.params;
    const rec = await uploads.deleteUpload(id, u.role, u.id);
    if (!rec) return res.status(404).json({ error: 'not found' });
    if (enabled) {
      try {
        const storage = createStorageProvider();
        await storage.deleteObject(rec.key);
      } catch (e: any) {
        logError('uploads', 'Storage delete error (continuing)', { key: rec.key, error: String(e?.message || e) });
      }
    }
    logInfo('uploads', 'Upload deleted', { id, key: rec.key, user: u });
    return res.status(204).send();
  });

  // Record completion of an upload (client calls after successful S3/local write)
  router.post('/uploads/complete', async (req: Request, res) => {
    const u = (req as AuthedRequest).user;
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (!enabled) return res.status(501).json({ error: 'uploads not configured' });
    const { key, scope } = (req.body || {}) as any;
    if (!key || typeof key !== 'string' || !scope) return res.status(400).json({ error: 'missing fields' });
    const ownerSeg = `${u.role}-${u.id}`;
    if (!key.startsWith('uploads/') || key.indexOf(`/${ownerSeg}/`) === -1) {
      return res.status(400).json({ error: 'invalid key' });
    }
    const url = `/uploads/serve?key=${encodeURIComponent(key)}`;
    const rec = { id: `upl_${Date.now()}`, ownerRole: u.role, ownerId: u.id, scope, key, url, createdAt: new Date().toISOString() };
    const saved = await uploads.createUpload(rec);
    return res.status(201).json({ id: saved.id, url: saved.url, key: saved.key, scope: saved.scope, createdAt: saved.createdAt });
  });


  return router;
}

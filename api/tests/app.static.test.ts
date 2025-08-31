import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../src/app';

describe('static web fallback', () => {
  const tmpDir = path.resolve(__dirname, '../__tmp_web__');
  const indexPath = path.join(tmpDir, 'index.html');
  const prev = process.env.WEB_DIST;

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(indexPath, '<!doctype html><html><body>ok</body></html>');
    process.env.WEB_DIST = tmpDir;
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    if (prev === undefined) delete process.env.WEB_DIST; else process.env.WEB_DIST = prev;
  });

  it('serves index.html for SPA routes', async () => {
    const app = createApp();
    const res = await request(app).get('/some/spa/route');
    expect(res.status).toBe(200);
    expect(res.text).toContain('ok');
  });
});


import './test.env';
import path from 'path';
import fs from 'fs';
import os from 'os';
import request from 'supertest';
import { createApp } from '../src/app';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-chores-uploads-test-'));
  process.env.STORAGE_DRIVER = 'local';
  process.env.LOCAL_UPLOAD_DIR = tmpDir;
  // Clear S3 env vars to ensure local driver is used
  delete process.env.S3_BUCKET;
  delete process.env.AWS_REGION;
  delete process.env.AWS_DEFAULT_REGION;
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.STORAGE_DRIVER;
  delete process.env.LOCAL_UPLOAD_DIR;
});

describe('LocalStorage unit tests', () => {
  let LocalStorage: any;

  beforeAll(() => {
    LocalStorage = require('../src/storage.local').LocalStorage;
  });

  it('presignPost returns correct driver and fields', async () => {
    const storage = new LocalStorage();
    const result = await storage.presignPost({ key: 'uploads/misc/parent-1/test.png', contentType: 'image/png' });
    expect(result.driver).toBe('local');
    expect(result.url).toBe('/api/uploads/local');
    expect(result.fields).toEqual({ key: 'uploads/misc/parent-1/test.png' });
    expect(result.key).toBe('uploads/misc/parent-1/test.png');
  });

  it('publicUrl returns a serve URL', () => {
    const storage = new LocalStorage();
    const url = storage.publicUrl('uploads/misc/parent-1/test.png');
    expect(url).toContain('/api/uploads/serve');
    expect(url).toContain(encodeURIComponent('uploads/misc/parent-1/test.png'));
  });

  it('getObject reads a file from disk and returns correct content type', async () => {
    const storage = new LocalStorage();
    // Write a test file
    const key = 'uploads/misc/parent-1/test.png';
    const filePath = path.join(tmpDir, key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG magic bytes

    const result = await storage.getObject(key);
    expect(result.contentType).toBe('image/png');
    expect(result.contentLength).toBe(4);

    // Read the stream
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      result.body.on('data', (chunk: Buffer) => chunks.push(chunk));
      result.body.on('end', resolve);
      result.body.on('error', reject);
    });
    expect(Buffer.concat(chunks).length).toBe(4);
  });
});

describe('POST /uploads/local endpoint', () => {
  let app: any;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    app = createApp();
    // Authenticate using the mock Google callback (idToken = email in dev mode)
    const regRes = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'uploadtestparent@example.com', familyName: 'Upload Test Family', timezone: 'UTC' });
    expect(regRes.status).toBe(200);
    token = regRes.body.token;
    userId = regRes.body.user?.id;
  });

  it('POST /uploads/local saves file to disk', async () => {
    // First presign to get a key
    const presignRes = await request(app)
      .post('/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'avatar.png', contentType: 'image/png', scope: 'avatars' });
    expect(presignRes.status).toBe(200);
    expect(presignRes.body.post.driver).toBe('local');

    const key = presignRes.body.key;
    const fileContent = Buffer.from('fake-png-content');

    // Upload the file via multipart form
    const uploadRes = await request(app)
      .post('/uploads/local')
      .set('Authorization', `Bearer ${token}`)
      .field('key', key)
      .attach('file', fileContent, { filename: 'avatar.png', contentType: 'image/png' });
    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.ok).toBe(true);
    expect(uploadRes.body.key).toBe(key);

    // Verify file is on disk
    const filePath = path.join(tmpDir, key);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath)).toEqual(fileContent);
  });

  it('GET /uploads/serve streams local file', async () => {
    // First presign to get a key
    const presignRes = await request(app)
      .post('/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'serve-test.png', contentType: 'image/png', scope: 'avatars' });
    expect(presignRes.status).toBe(200);

    const key = presignRes.body.key;
    const fileContent = Buffer.from('serve-test-content');

    // Write the file directly to disk
    const filePath = path.join(tmpDir, key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, fileContent);

    // Serve the file
    const serveRes = await request(app)
      .get('/uploads/serve')
      .set('Authorization', `Bearer ${token}`)
      .query({ key });
    expect(serveRes.status).toBe(200);
    expect(serveRes.headers['content-type']).toContain('image/png');
    expect(Buffer.from(serveRes.body)).toEqual(fileContent);
  });
});

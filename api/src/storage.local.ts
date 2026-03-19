import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { StorageProvider, PresignPostResult, GetObjectResult } from './storage';

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function mimeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export class LocalStorage implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.LOCAL_UPLOAD_DIR || './data/uploads';
  }

  async presignPost(opts: { key: string; contentType: string; expiresIn?: number }): Promise<PresignPostResult> {
    return {
      url: '/uploads/local',
      fields: { key: opts.key },
      key: opts.key,
      driver: 'local',
    };
  }

  async getObject(key: string): Promise<GetObjectResult> {
    const fullPath = path.join(this.uploadDir, key);
    const stat = fs.statSync(fullPath);
    const body = fs.createReadStream(fullPath) as unknown as Readable;
    const contentType = mimeFromExt(fullPath);
    return {
      body,
      contentType,
      contentLength: stat.size,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, key);
    const resolvedDir = path.resolve(this.uploadDir);
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) throw new Error('invalid key path');
    fs.rmSync(resolvedPath, { force: true });
  }

  publicUrl(key: string): string {
    return `/uploads/serve?key=${encodeURIComponent(key)}`;
  }

  /** Expose uploadDir for use by the upload endpoint */
  getUploadDir(): string {
    return this.uploadDir;
  }
}

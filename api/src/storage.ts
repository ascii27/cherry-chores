import { Readable } from 'stream';

export interface PresignPostResult {
  url: string;
  fields: Record<string, string>;
  key: string;
  /** Tells the client which upload method to use */
  driver: 'local' | 's3';
}

export interface GetObjectResult {
  body: Readable;
  contentType?: string;
  contentLength?: number;
}

export interface StorageProvider {
  presignPost(opts: { key: string; contentType: string; expiresIn?: number }): Promise<PresignPostResult>;
  getObject(key: string): Promise<GetObjectResult>;
  deleteObject(key: string): Promise<void>;
  publicUrl(key: string): string;
}

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignOptions {
  key: string;
  contentType: string;
  expiresIn?: number; // seconds
}

export class S3Storage {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private publicBase?: string;

  constructor() {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    const bucket = process.env.S3_BUCKET;
    if (!region || !bucket) throw new Error('S3 not configured');
    this.bucket = bucket;
    this.region = region;
    const endpoint = process.env.S3_ENDPOINT;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: forcePathStyle || undefined,
    });
    this.publicBase = process.env.S3_PUBLIC_BASE_URL || undefined;
  }

  publicUrl(key: string): string {
    if (this.publicBase) return `${this.publicBase.replace(/\/$/, '')}/${key}`;
    // default AWS URL
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async presignPut(opts: PresignOptions): Promise<{ uploadUrl: string; publicUrl: string; key: string }>{
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: opts.key,
      ContentType: opts.contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: opts.expiresIn ?? 300 });
    return { uploadUrl, publicUrl: this.publicUrl(opts.key), key: opts.key };
  }


  async getObject(key: string): Promise<{ body: any; contentType?: string; contentLength?: number; etag?: string }>{
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res = await this.client.send(cmd);
    return {
      body: res.Body as any,
      contentType: res.ContentType,
      contentLength: typeof res.ContentLength === "number" ? res.ContentLength : undefined,
      etag: (res.ETag as any) || undefined,
    };
  }
}

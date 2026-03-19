import { StorageProvider } from './storage';

export function createStorageProvider(): StorageProvider {
  const driver = process.env.STORAGE_DRIVER;
  const hasS3 = !!(process.env.S3_BUCKET && (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION));

  if (driver === 'local' || (!driver && !hasS3)) {
    const { LocalStorage } = require('./storage.local');
    return new LocalStorage();
  }
  if (driver === 's3' || hasS3) {
    const { S3Storage } = require('./storage.s3');
    return new S3Storage();
  }
  throw new Error('No storage driver configured. Set STORAGE_DRIVER=local or configure S3_BUCKET + AWS_REGION.');
}

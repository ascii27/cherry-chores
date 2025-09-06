export type UploadScope = 'avatars' | 'patterns';

export interface UploadRecord {
  id: string;
  ownerRole: 'child' | 'parent';
  ownerId: string;
  scope: UploadScope;
  key: string; // S3 key
  url: string; // preferred fetch URL (proxy)
  createdAt: string;
}

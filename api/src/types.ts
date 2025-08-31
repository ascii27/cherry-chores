export type Role = 'parent' | 'child';

export interface ParentUser {
  id: string;
  email: string;
  name: string;
  families: string[]; // family IDs
}

export interface ChildUser {
  id: string;
  familyId: string;
  username: string;
  passwordHash: string; // plain for MVP dev, but hashed later
  displayName: string;
  avatarUrl?: string;
  themeColor?: string;
}

export interface Family {
  id: string;
  name: string;
  timezone: string;
  parentIds: string[];
  childIds: string[];
}

export interface AuthTokenPayload {
  sub: string; // user id
  role: Role;
  familyId?: string; // required for child
}

export interface AuthProvider {
  verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email: string; name: string }>;
}

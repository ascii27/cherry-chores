import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { AuthProvider, AuthTokenPayload } from './types';

export interface AuthConfig {
  jwtSecret: string;
  tokenExpiry: string | number; // e.g., '7d' or 604800
}

export class JwtService {
  constructor(private cfg: AuthConfig) {}
  sign(payload: AuthTokenPayload) {
    const options: SignOptions = { expiresIn: this.cfg.tokenExpiry as any };
    return jwt.sign(payload as object, this.cfg.jwtSecret as Secret, options);
  }
  verify(token: string): AuthTokenPayload {
    return jwt.verify(token, this.cfg.jwtSecret) as AuthTokenPayload;
  }
}

export class DevAuthProvider implements AuthProvider {
  async verifyGoogleIdToken(idToken: string) {
    // For dev/testing, accept any token and treat it as an email
    const email = idToken.includes('@') ? idToken : `${idToken}@example.com`;
    return { sub: `google-${email}`, email, name: email.split('@')[0] };
  }
}

import { NextFunction, Request, Response, RequestHandler } from 'express';
import { JwtService } from '../auth';
import { Role } from '../types';

declare global {
  // eslint-disable-next-line no-var
  var __jwtService: JwtService | undefined;
}

export function withJwt(service: JwtService) {
  global.__jwtService = service;
}

export interface AuthedRequest extends Request {
  user?: { id: string; role: Role; familyId?: string };
}

export const authMiddleware: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header('Authorization');
  let token: string | undefined;
  if (header && header.startsWith('Bearer ')) {
    token = header.substring('Bearer '.length);
  } else if (req.headers.cookie) {
    try {
      const cookies = Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((p) => {
        const i = p.indexOf('=');
        if (i === -1) return [p.trim(), ''];
        const k = decodeURIComponent(p.slice(0, i).trim());
        const v = decodeURIComponent(p.slice(i + 1).trim());
        return [k, v];
      }));
      token = (cookies as any)['auth'] || (cookies as any)['token'] || undefined;
    } catch {}
  }
  if (token) {
    try {
      const payload = global.__jwtService!.verify(token);
      (req as AuthedRequest).user = { id: payload.sub, role: payload.role, familyId: payload.familyId };
    } catch {
      // ignore invalid tokens; routes can enforce requirements
    }
  }
  next();
}

export function requireRole(role: Role): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as AuthedRequest).user;
    if (!u || u.role !== role) return res.status(401).json({ error: 'unauthorized' });
    next();
  };
}

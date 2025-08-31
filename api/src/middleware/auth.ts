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
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.substring('Bearer '.length);
  try {
    const payload = global.__jwtService!.verify(token);
    (req as AuthedRequest).user = { id: payload.sub, role: payload.role, familyId: payload.familyId };
  } catch {
    // ignore invalid tokens; routes can enforce requirements
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

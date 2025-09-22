import { NextFunction, Request, Response, RequestHandler } from 'express';
import { JwtService } from '../auth';
import { TokensRepository } from '../repositories';
import { Role } from '../types';

declare global {
  // eslint-disable-next-line no-var
  var __jwtService: JwtService | undefined;
  // eslint-disable-next-line no-var
  var __tokensRepo: TokensRepository | undefined;
}

export function withJwt(service: JwtService) {
  global.__jwtService = service;
}

export function withTokensRepo(repo: TokensRepository) {
  global.__tokensRepo = repo;
}

export interface AuthedRequest extends Request {
  user?: { id: string; role: Role; familyId?: string };
}

export const authMiddleware: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
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
  if (token && global.__jwtService) {
    try {
      const payload = global.__jwtService.verify(token);
      (req as AuthedRequest).user = { id: payload.sub, role: payload.role, familyId: payload.familyId };
    } catch {
      // ignore invalid tokens; routes can enforce requirements
    }
  }

  // Fallback: API key auth for long-lived tokens (parent role)
  if (!(req as AuthedRequest).user && global.__tokensRepo) {
    const apiKey = (req.header('x-api-key') || req.header('X-Api-Key')) as string | undefined;
    if (apiKey) {
      try {
        const result = await global.__tokensRepo.verify(apiKey);
        if (result) {
          (req as AuthedRequest).user = { id: result.parentId, role: 'parent' };
        }
      } catch {
        // ignore
      }
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

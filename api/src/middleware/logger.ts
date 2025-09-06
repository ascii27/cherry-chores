import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logDebug, logInfo } from '../log';
import { AuthedRequest } from './auth';

function sanitizeHeaders(headers: Record<string, any>) {
  const h: Record<string, any> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'authorization') continue;
    h[k] = v;
  }
  return h;
}

export function requestLogger(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, originalUrl } = req;
    const user = (req as AuthedRequest).user || null;
    logDebug('http', 'request start', {
      method,
      url: originalUrl,
      query: req.query,
      headers: sanitizeHeaders(req.headers as any),
      user,
    });

    res.on('finish', () => {
      const ms = Date.now() - start;
      const payload = {
        method,
        url: originalUrl,
        status: res.statusCode,
        duration_ms: ms,
        user,
      };
      if (res.statusCode >= 500) {
        // server errors would typically be logged elsewhere too
        logInfo('http', 'request end (error)', payload);
      } else {
        logInfo('http', 'request end', payload);
      }
    });

    next();
  };
}


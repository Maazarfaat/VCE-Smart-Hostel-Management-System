import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

interface AttemptRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limiting map for login attempts by client IP
const loginAttempts = new Map<string, AttemptRecord>();

const MAX_LOGIN_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export const loginRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
    next();
    return;
  }

  const clientIp = req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();

  const record = loginAttempts.get(clientIp);

  if (!record || now > record.resetAt) {
    loginAttempts.set(clientIp, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const remainingSeconds = Math.ceil((record.resetAt - now) / 1000);
    sendError(
      res,
      `Too many failed login attempts. Please wait ${remainingSeconds} seconds before trying again.`,
      429
    );
    return;
  }

  record.count += 1;
  next();
};

export const resetLoginAttempts = (clientIp: string): void => {
  loginAttempts.delete(clientIp);
};

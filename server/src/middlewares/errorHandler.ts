import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('[Error Occurred]:', err);

  // Zod validation errors (handles both instanceof and cross-realm/dual-package errors)
  if (err instanceof ZodError || err?.name === 'ZodError' || Array.isArray(err?.issues)) {
    const issues = err.errors || err.issues || [];
    const formattedErrors = issues.map((e: any) => ({
      field: e.path ? e.path.join('.') : 'field',
      message: e.message,
    }));
    const primaryMessage = formattedErrors[0]?.message || 'Validation failed for one or more fields';
    sendError(res, primaryMessage, 422, formattedErrors);
    return;
  }

  // Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'field';
      sendError(res, `A record with this ${target} already exists.`, 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Requested resource was not found or has been deleted.', 404);
      return;
    }
    if (err.code === 'P2003') {
      sendError(res, 'Foreign key constraint failed. Related record does not exist or cannot be removed.', 400);
      return;
    }
  }

  // Custom HTTP status or default 500
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = err.message || 'Internal server error occurred';

  sendError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
};

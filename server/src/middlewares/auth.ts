import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authorization token missing or invalid format', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    sendError(res, 'Session expired or token is invalid. Please login again.', 401);
    return;
  }

  req.user = decoded;
  next();
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized access', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access denied. Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`,
        403
      );
      return;
    }

    next();
  };
};

export const authorizeStudentOwnerOrStaff = (
  paramKey = 'studentId'
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized access', 401);
      return;
    }

    // Admins and Wardens can view/edit any student
    if (['ADMIN', 'WARDEN'].includes(req.user.role)) {
      next();
      return;
    }

    // Security and Maintenance have specific roles checked elsewhere
    if (req.user.role === 'STUDENT') {
      const targetStudentId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey];
      if (req.user.studentId && req.user.studentId === targetStudentId) {
        next();
        return;
      }
      sendError(res, 'Forbidden: You cannot access or modify another student\'s records', 403);
      return;
    }

    sendError(res, 'Insufficient privileges', 403);
  };
};

import { Router } from 'express';
import {
  login,
  studentSetup,
  getMe,
  changePassword,
  getUsers,
  createUser,
  toggleUserStatus,
} from '../controllers/authController';
import { authenticate, authorizeRoles } from '../middlewares/auth';
import { loginRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Public authentication routes with rate limiting
router.post('/login', loginRateLimiter, login);
router.post('/student-setup', loginRateLimiter, studentSetup);

// Authenticated session routes
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

// Admin-only user management routes
router.get('/users', authenticate, authorizeRoles('ADMIN'), getUsers);
router.post('/users', authenticate, authorizeRoles('ADMIN'), createUser);
router.patch('/users/:id/toggle-status', authenticate, authorizeRoles('ADMIN'), toggleUserStatus);

export default router;

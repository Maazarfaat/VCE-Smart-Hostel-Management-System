import { Router } from 'express';
import {
  getVisitors,
  registerVisitor,
  checkOutVisitor,
} from '../controllers/visitorController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router = Router();

// List visitors (Staff: SECURITY, ADMIN, WARDEN)
router.get('/', authenticate, authorizeRoles('ADMIN', 'SECURITY', 'WARDEN'), getVisitors);

// Register incoming visitor (SECURITY, ADMIN)
router.post('/', authenticate, authorizeRoles('ADMIN', 'SECURITY'), registerVisitor);

// Record departure (SECURITY, ADMIN)
router.patch('/:id/checkout', authenticate, authorizeRoles('ADMIN', 'SECURITY'), checkOutVisitor);

export default router;

import { Router } from 'express';
import {
  getOutings,
  requestOuting,
  cancelOuting,
  reviewOuting,
  verifyGatePass,
} from '../controllers/outingController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router = Router();

// List outings (Role-scoped)
router.get('/', authenticate, getOutings);

// Student requests outing
router.post('/request', authenticate, requestOuting);

// Student cancels own pending outing
router.delete('/:id/cancel', authenticate, cancelOuting);

// Warden / Admin reviews request (Approve/Reject)
router.patch('/:id/review', authenticate, authorizeRoles('ADMIN', 'WARDEN'), reviewOuting);

// Security Guard verifies exit or return at gate
router.post('/gate-verify', authenticate, authorizeRoles('ADMIN', 'SECURITY', 'WARDEN'), verifyGatePass);

export default router;

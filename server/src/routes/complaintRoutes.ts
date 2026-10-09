import { Router } from 'express';
import {
  getComplaints,
  createComplaint,
  assignComplaint,
  updateComplaintStatus,
  addComment,
} from '../controllers/complaintController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router = Router();

// List complaints (filtered according to role in controller)
router.get('/', authenticate, getComplaints);

// Raise new complaint (Students, Warden, Admin)
router.post('/', authenticate, createComplaint);

// Assign complaint to maintenance staff (ADMIN, WARDEN)
router.patch('/:id/assign', authenticate, authorizeRoles('ADMIN', 'WARDEN'), assignComplaint);

// Update status (Maintenance staff, Warden, Admin, or Student to reopen)
router.patch('/:id/status', authenticate, updateComplaintStatus);

// Add comment (Any authenticated user involved)
router.post('/:id/comments', authenticate, addComment);

export default router;

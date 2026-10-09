import { Router } from 'express';
import {
  getFeeStructures,
  createFeeStructure,
  getStudentFees,
  recordPayment,
  getReceiptDetails,
} from '../controllers/feeController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router = Router();

// Fee structures (ADMIN, WARDEN)
router.get('/structures', authenticate, getFeeStructures);
router.post('/structures', authenticate, authorizeRoles('ADMIN'), createFeeStructure);

// Student fees (Student sees own, ADMIN/WARDEN sees all)
router.get('/', authenticate, getStudentFees);

// Record payment (ADMIN only)
router.post('/payments', authenticate, authorizeRoles('ADMIN'), recordPayment);

// Printable receipt details
router.get('/receipts/:receiptNumber', authenticate, getReceiptDetails);

export default router;

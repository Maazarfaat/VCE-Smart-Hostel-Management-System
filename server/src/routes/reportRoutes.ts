import { Router } from 'express';
import {
  getOccupancyReport,
  getFeeReport,
  getComplaintReport,
  getGateReport,
} from '../controllers/reportController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router = Router();

// Reports are accessible to ADMIN and WARDEN
router.get('/occupancy', authenticate, authorizeRoles('ADMIN', 'WARDEN'), getOccupancyReport);
router.get('/fees', authenticate, authorizeRoles('ADMIN', 'WARDEN'), getFeeReport);
router.get('/complaints', authenticate, authorizeRoles('ADMIN', 'WARDEN', 'MAINTENANCE'), getComplaintReport);
router.get('/gate', authenticate, authorizeRoles('ADMIN', 'WARDEN', 'SECURITY'), getGateReport);

export default router;

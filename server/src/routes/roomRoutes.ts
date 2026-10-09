import { Router } from 'express';
import {
  getRooms,
  getBlocks,
  allocateBed,
  transferBed,
  vacateBed,
  createRoom,
  updateRoomCapacity,
} from '../controllers/roomController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router = Router();

// View blocks and rooms (all authenticated staff & students)
router.get('/', authenticate, getRooms);
router.get('/blocks', authenticate, getBlocks);

// Room and Bed Allocations, Transfers, and Vacates (ADMIN, WARDEN only)
router.patch('/:id/capacity', authenticate, authorizeRoles('ADMIN', 'WARDEN'), updateRoomCapacity);
router.post('/allocate', authenticate, authorizeRoles('ADMIN', 'WARDEN'), allocateBed);
router.post('/transfer', authenticate, authorizeRoles('ADMIN', 'WARDEN'), transferBed);
router.post('/vacate', authenticate, authorizeRoles('ADMIN', 'WARDEN'), vacateBed);
router.post('/', authenticate, authorizeRoles('ADMIN', 'WARDEN'), createRoom);

export default router;

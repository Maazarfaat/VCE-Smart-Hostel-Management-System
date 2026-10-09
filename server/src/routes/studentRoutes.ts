import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  getFilterMetadata,
} from '../controllers/studentController';
import { authenticate, authorizeRoles, authorizeStudentOwnerOrStaff } from '../middlewares/auth';

const router = Router();

// Metadata for search & dropdowns
router.get('/metadata', authenticate, getFilterMetadata);

// Student list (Staff only: ADMIN, WARDEN, SECURITY)
router.get('/', authenticate, authorizeRoles('ADMIN', 'WARDEN', 'SECURITY'), getStudents);

// Student detail (Students can view themselves; Staff can view anyone)
router.get('/:id', authenticate, authorizeStudentOwnerOrStaff('id'), getStudentById);

// Student create & update (ADMIN, WARDEN only)
router.post('/', authenticate, authorizeRoles('ADMIN', 'WARDEN'), createStudent);
router.put('/:id', authenticate, authorizeRoles('ADMIN', 'WARDEN'), updateStudent);

export default router;

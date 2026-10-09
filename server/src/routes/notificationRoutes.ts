import { Router } from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  getNotifications,
  markNotificationRead,
} from '../controllers/notificationController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router = Router();

// Announcements
router.get('/announcements', authenticate, getAnnouncements);
router.post('/announcements', authenticate, authorizeRoles('ADMIN', 'WARDEN'), createAnnouncement);

// In-app notifications
router.get('/', authenticate, getNotifications);
router.patch('/:id/read', authenticate, markNotificationRead);

export default router;

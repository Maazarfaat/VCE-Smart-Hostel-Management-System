import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  content: z.string().min(5, 'Content is required'),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL'),
  targetRole: z.enum(['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE', 'SECURITY']).optional().nullable(),
});

export const getAnnouncements = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRole = req.user?.role;

    const announcements = await prisma.announcement.findMany({
      where: userRole
        ? {
            OR: [{ targetRole: null }, { targetRole: userRole }],
          }
        : {},
      include: {
        author: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    sendSuccess(res, 'Announcements retrieved', announcements);
  } catch (err) {
    next(err);
  }
};

export const createAnnouncement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createAnnouncementSchema.parse(req.body);

    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        priority: data.priority,
        targetRole: data.targetRole || null,
        authorId: req.user?.id || null,
      },
      include: {
        author: { select: { name: true, role: true } },
      },
    });

    sendSuccess(res, 'Announcement published successfully', announcement, 201);
  } catch (err) {
    next(err);
  }
};

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    sendSuccess(res, 'Notifications retrieved', notifications);
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    sendSuccess(res, 'Notification marked as read', notification);
  } catch (err) {
    next(err);
  }
};

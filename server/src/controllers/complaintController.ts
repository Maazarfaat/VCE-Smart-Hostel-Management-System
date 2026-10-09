import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const createComplaintSchema = z.object({
  title: z.string().min(3, 'Title is required (min 3 characters)'),
  category: z.enum([
    'ELECTRICAL',
    'PLUMBING',
    'CARPENTRY',
    'CLEANING',
    'MASONRY',
    'INTERNET',
    'OTHER',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  description: z.string().min(5, 'Description is required (min 5 characters)'),
  studentId: z.string().optional(), // if raised by staff on student behalf
});

const assignComplaintSchema = z.object({
  assignedToId: z.string().min(1, 'Maintenance staff user ID is required'),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']),
  resolutionNotes: z.string().optional(),
});

const addCommentSchema = z.object({
  comment: z.string().min(1, 'Comment text is required'),
});

export const getComplaints = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { status, category, priority, page = '1', limit = '20', search } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Role-based visibility
    if (user.role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { OR: [{ userId: user.id }, { rollNumber: user.username }] },
      });
      if (!student) {
        sendSuccess(res, 'No complaints found', [], 200, { total: 0 });
        return;
      }
      where.studentId = student.id;
    } else if (user.role === 'MAINTENANCE') {
      // Maintenance staff sees tickets assigned to them OR unassigned open tickets
      where.OR = [{ assignedToId: user.id }, { status: 'OPEN' }];
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              rollNumber: true,
              branch: true,
              allocations: {
                where: { status: 'ACTIVE' },
                include: { room: true, bed: true },
              },
            },
          },
          assignedTo: {
            select: { id: true, name: true, phone: true },
          },
          comments: {
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        skip,
        take: limitNum,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.complaint.count({ where }),
    ]);

    sendSuccess(res, 'Complaints retrieved successfully', complaints, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
};

export const createComplaint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const data = createComplaintSchema.parse(req.body);

    let studentId = data.studentId;

    if (user.role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { OR: [{ userId: user.id }, { rollNumber: user.username }] },
      });
      if (!student) {
        sendError(res, 'Student profile not associated with this account', 400);
        return;
      }
      studentId = student.id;
    }

    if (!studentId) {
      sendError(res, 'Student ID is required', 400);
      return;
    }

    const complaint = await prisma.complaint.create({
      data: {
        studentId,
        title: data.title,
        category: data.category,
        priority: data.priority,
        description: data.description,
        status: 'OPEN',
      },
      include: {
        student: { select: { fullName: true, rollNumber: true } },
      },
    });

    sendSuccess(res, 'Complaint registered successfully', complaint, 201);
  } catch (err) {
    next(err);
  }
};

export const assignComplaint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignedToId } = assignComplaintSchema.parse(req.body);

    const staff = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!staff || (staff.role !== 'MAINTENANCE' && staff.role !== 'ADMIN')) {
      sendError(res, 'Assigned user must be a maintenance staff member', 400);
      return;
    }

    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        assignedToId,
        status: 'IN_PROGRESS',
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    sendSuccess(res, `Complaint assigned to ${staff.name}`, complaint);
  } catch (err) {
    next(err);
  }
};

export const updateComplaintStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = updateStatusSchema.parse(req.body);

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      sendError(res, 'Complaint not found', 404);
      return;
    }

    const updateData: any = { status };
    if (resolutionNotes) {
      updateData.resolutionNotes = resolutionNotes;
    }

    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    } else if (status === 'CLOSED') {
      updateData.closedAt = new Date();
    } else if (status === 'REOPENED') {
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, `Complaint status updated to ${status}`, updated);
  } catch (err) {
    next(err);
  }
};

export const addComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { comment } = addCommentSchema.parse(req.body);
    const user = req.user;

    if (!user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const newComment = await prisma.complaintComment.create({
      data: {
        complaintId: id,
        userId: user.id,
        comment,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    sendSuccess(res, 'Comment posted', newComment, 201);
  } catch (err) {
    next(err);
  }
};

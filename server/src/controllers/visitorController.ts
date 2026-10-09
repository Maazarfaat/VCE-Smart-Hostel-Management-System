import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const registerVisitorSchema = z.object({
  studentRollNumber: z.string().min(1, 'Student Roll Number is required'),
  visitorName: z.string().min(1, 'Visitor Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  relationship: z.string().min(1, 'Relationship is required (e.g. Father, Guardian)'),
  purpose: z.string().min(1, 'Purpose of visit is required'),
  idProofType: z.string().optional(),
  idProofNumber: z.string().optional(),
  remarks: z.string().optional(),
});

export const getVisitors = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, date, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) where.status = status;

    if (date) {
      const d = new Date(String(date));
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      where.visitDate = { gte: d, lt: nextD };
    }

    if (search) {
      where.OR = [
        { visitorName: { contains: String(search) } },
        { phone: { contains: String(search) } },
        { student: { rollNumber: { contains: String(search) } } },
        { student: { fullName: { contains: String(search) } } },
      ];
    }

    const [visitors, total] = await Promise.all([
      prisma.visitor.findMany({
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
                include: { room: true },
              },
            },
          },
          securityGuard: { select: { name: true } },
        },
        skip,
        take: limitNum,
        orderBy: { inTime: 'desc' },
      }),
      prisma.visitor.count({ where }),
    ]);

    sendSuccess(res, 'Visitors retrieved successfully', visitors, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
};

export const registerVisitor = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = registerVisitorSchema.parse(req.body);

    const student = await prisma.student.findUnique({
      where: { rollNumber: data.studentRollNumber.trim() },
    });

    if (!student) {
      sendError(res, `Host student with Roll Number '${data.studentRollNumber}' not found`, 404);
      return;
    }

    // Visiting hours check (09:00 - 18:30)
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const isOutsideVisitingHours = currentHour < 9 || currentHour > 18.5;

    let remarks = data.remarks || '';
    if (isOutsideVisitingHours) {
      remarks = `[SPECIAL PERMISSION: Outside standard visiting hours (9:00 AM - 6:30 PM)] ${remarks}`;
    }

    const visitor = await prisma.visitor.create({
      data: {
        studentId: student.id,
        visitorName: data.visitorName,
        phone: data.phone,
        relationship: data.relationship,
        purpose: data.purpose,
        idProofType: data.idProofType || null,
        idProofNumber: data.idProofNumber || null,
        visitDate: now,
        inTime: now,
        status: 'INSIDE',
        securityGuardId: req.user?.id || null,
        remarks: remarks || null,
      },
      include: {
        student: { select: { fullName: true, rollNumber: true } },
      },
    });

    sendSuccess(
      res,
      `Visitor ${visitor.visitorName} registered successfully${isOutsideVisitingHours ? ' (Warning: outside normal visiting hours)' : ''}`,
      visitor,
      201
    );
  } catch (err) {
    next(err);
  }
};

export const checkOutVisitor = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const visitor = await prisma.visitor.findUnique({ where: { id } });
    if (!visitor) {
      sendError(res, 'Visitor record not found', 404);
      return;
    }

    if (visitor.status === 'CHECKED_OUT') {
      sendError(res, 'Visitor has already checked out', 400);
      return;
    }

    const updated = await prisma.visitor.update({
      where: { id },
      data: {
        outTime: new Date(),
        status: 'CHECKED_OUT',
      },
      include: {
        student: { select: { fullName: true, rollNumber: true } },
      },
    });

    sendSuccess(res, `Visitor ${updated.visitorName} marked as departed`, updated);
  } catch (err) {
    next(err);
  }
};

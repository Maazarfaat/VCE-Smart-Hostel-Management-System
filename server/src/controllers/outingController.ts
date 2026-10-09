import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const isValidDateString = (val: string) => {
  const d = new Date(val);
  return !isNaN(d.getTime());
};

const createOutingSchema = z.object({
  outingType: z.enum(['LOCAL_OUTING', 'HOME_LEAVE', 'EMERGENCY'], {
    errorMap: () => ({ message: 'Outing category must be Local Outing, Home Leave, or Emergency' }),
  }),
  reason: z
    .string({ required_error: 'Reason / purpose is required' })
    .trim()
    .min(5, 'Please provide a detailed reason (at least 5 characters)'),
  destination: z
    .string({ required_error: 'Destination is required' })
    .trim()
    .min(3, 'Please specify a destination (at least 3 characters)'),
  departureTime: z
    .string({ required_error: 'Departure date and time is required' })
    .min(1, 'Departure date and time is required')
    .refine(isValidDateString, { message: 'Invalid departure date and time format' }),
  expectedReturnTime: z
    .string({ required_error: 'Expected return date and time is required' })
    .min(1, 'Expected return date and time is required')
    .refine(isValidDateString, { message: 'Invalid expected return date and time format' }),
  studentId: z.string().optional(),
});

const approveOutingSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

const gateVerificationSchema = z.object({
  passCode: z.string().min(1, 'Gate Pass Code or Roll Number is required'),
  action: z.enum(['EXIT', 'RETURN']),
});

export const getOutings = async (
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

    const { status, type, page = '1', limit = '20', search } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (user.role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { OR: [{ userId: user.id }, { rollNumber: user.username }] },
      });
      if (!student) {
        sendSuccess(res, 'No outing records found', [], 200, { total: 0 });
        return;
      }
      where.studentId = student.id;
    }

    if (status) where.status = status;
    if (type) where.outingType = type;

    if (search) {
      where.OR = [
        { passCode: { contains: String(search) } },
        { student: { rollNumber: { contains: String(search) } } },
        { student: { fullName: { contains: String(search) } } },
        { destination: { contains: String(search) } },
      ];
    }

    const [outings, total] = await Promise.all([
      prisma.outingRequest.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              rollNumber: true,
              branch: true,
              phone: true,
              guardianPhone: true,
              allocations: {
                where: { status: 'ACTIVE' },
                include: { room: true },
              },
            },
          },
          approvedBy: { select: { name: true, role: true } },
          gateExitGuard: { select: { name: true } },
          gateEntryGuard: { select: { name: true } },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.outingRequest.count({ where }),
    ]);

    sendSuccess(res, 'Outing requests retrieved', outings, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
};

export const requestOuting = async (
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

    const data = createOutingSchema.parse(req.body);

    let studentId = data.studentId;

    if (user.role === 'STUDENT') {
      if (user.studentId) {
        studentId = user.studentId;
      } else {
        const student = await prisma.student.findFirst({
          where: { OR: [{ userId: user.id }, { rollNumber: user.username }] },
        });
        if (!student) {
          sendError(res, 'Student profile not found for this account', 400);
          return;
        }
        studentId = student.id;
      }
    } else if (!['ADMIN', 'WARDEN'].includes(user.role)) {
      sendError(res, 'Only students or hostel authority can submit gate pass applications', 403);
      return;
    }

    if (!studentId) {
      sendError(res, 'Student ID is required', 400);
      return;
    }

    const dep = new Date(data.departureTime);
    const ret = new Date(data.expectedReturnTime);

    if (isNaN(dep.getTime())) {
      sendError(res, 'Invalid departure date and time format', 400);
      return;
    }

    if (isNaN(ret.getTime())) {
      sendError(res, 'Invalid expected return date and time format', 400);
      return;
    }

    if (ret.getTime() <= dep.getTime()) {
      sendError(res, 'Expected return date and time must be strictly after departure date and time', 400);
      return;
    }

    const durationMs = ret.getTime() - dep.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const durationDays = durationMs / (1000 * 60 * 60 * 24);

    if (durationMs < 15 * 60 * 1000) {
      sendError(res, 'Gate pass duration must be at least 15 minutes', 400);
      return;
    }

    // Policy rules by outing category
    if (data.outingType === 'LOCAL_OUTING') {
      if (durationHours > 24) {
        sendError(
          res,
          `Local city outings are restricted to same-day visits (maximum 24 hours). Your requested duration is ${Math.round(durationDays)} days. For multi-day absence or vacation, please select 'Home Leave / Weekend Vacation'.`,
          400
        );
        return;
      }
    } else if (data.outingType === 'HOME_LEAVE') {
      if (durationDays > 30) {
        sendError(
          res,
          `Home leave duration cannot exceed 30 days (requested ${Math.round(durationDays)} days). For extended absence, please obtain written permission from the Chief Warden.`,
          400
        );
        return;
      }
    } else if (data.outingType === 'EMERGENCY') {
      if (durationDays > 30) {
        sendError(
          res,
          `Emergency leave duration cannot exceed 30 days. Please contact the Warden office directly for extended medical leave.`,
          400
        );
        return;
      }
    }

    // Check if student already has a pending or currently active checkout outing
    const activeOuting = await prisma.outingRequest.findFirst({
      where: {
        studentId,
        status: { in: ['PENDING', 'APPROVED', 'CHECKED_OUT'] },
      },
    });

    if (activeOuting) {
      sendError(
        res,
        `Cannot create new request. You already have an active pass in '${activeOuting.status}' status (Pass Code: ${activeOuting.passCode}). Please complete or cancel your existing pass before applying for a new one.`,
        400
      );
      return;
    }

    // Generate unique random 6-digit secure pass code
    let passCode = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      passCode = `OUT-${randomDigits}`;
      const existing = await prisma.outingRequest.findUnique({ where: { passCode } });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    const outing = await prisma.outingRequest.create({
      data: {
        studentId,
        outingType: data.outingType,
        reason: data.reason.trim(),
        destination: data.destination.trim(),
        departureTime: dep,
        expectedReturnTime: ret,
        status: 'PENDING',
        passCode,
      },
      include: {
        student: { select: { fullName: true, rollNumber: true } },
      },
    });

    sendSuccess(res, 'Outing request submitted successfully', outing, 201);
  } catch (err) {
    next(err);
  }
};

export const cancelOuting = async (
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
    const { id } = req.params;

    const outing = await prisma.outingRequest.findUnique({
      where: { id },
    });

    if (!outing) {
      sendError(res, 'Outing request not found', 404);
      return;
    }

    if (user.role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { OR: [{ userId: user.id }, { rollNumber: user.username }] },
      });
      if (!student || student.id !== outing.studentId) {
        sendError(res, 'You can only cancel your own outing requests', 403);
        return;
      }
    }

    if (outing.status !== 'PENDING') {
      sendError(res, `Cannot cancel an outing that is already ${outing.status}`, 400);
      return;
    }

    await prisma.outingRequest.delete({
      where: { id },
    });

    sendSuccess(res, 'Outing application cancelled successfully');
  } catch (err) {
    next(err);
  }
};

export const reviewOuting = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = approveOutingSchema.parse(req.body);

    const outing = await prisma.outingRequest.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!outing) {
      sendError(res, 'Outing request not found', 404);
      return;
    }

    if (outing.status !== 'PENDING') {
      sendError(res, `Cannot review request that is already ${outing.status}`, 400);
      return;
    }

    const updated = await prisma.outingRequest.update({
      where: { id },
      data: {
        status,
        approvedById: req.user?.id,
        rejectionReason: status === 'REJECTED' ? rejectionReason || 'Rejected by Warden' : null,
      },
      include: {
        student: { select: { fullName: true, rollNumber: true } },
        approvedBy: { select: { name: true } },
      },
    });

    sendSuccess(
      res,
      `Outing request ${status.toLowerCase()} successfully`,
      updated
    );
  } catch (err) {
    next(err);
  }
};

export const verifyGatePass = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { passCode, action } = gateVerificationSchema.parse(req.body);
    const trimmed = passCode.trim().toUpperCase();

    // Search by passCode OR student roll number
    const outing = await prisma.outingRequest.findFirst({
      where: {
        OR: [
          { passCode: trimmed },
          { student: { rollNumber: trimmed }, status: { in: ['APPROVED', 'CHECKED_OUT'] } },
        ],
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            rollNumber: true,
            branch: true,
            phone: true,
            guardianPhone: true,
            allocations: {
              where: { status: 'ACTIVE' },
              include: { room: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!outing) {
      sendError(res, `No active approved outing pass found for code/roll '${trimmed}'`, 404);
      return;
    }

    const now = new Date();

    if (action === 'EXIT') {
      if (outing.status !== 'APPROVED') {
        sendError(
          res,
          `Cannot check out: Pass status is '${outing.status}'. Only APPROVED passes can exit the gate.`,
          400
        );
        return;
      }

      const updated = await prisma.outingRequest.update({
        where: { id: outing.id },
        data: {
          status: 'CHECKED_OUT',
          actualDepartureTime: now,
          gateExitGuardId: req.user?.id,
        },
        include: {
          student: true,
          gateExitGuard: { select: { name: true } },
        },
      });

      sendSuccess(
        res,
        `Exit approved: Student ${outing.student.fullName} (${outing.student.rollNumber}) checked out of gate.`,
        updated
      );
      return;
    }

    if (action === 'RETURN') {
      if (outing.status !== 'CHECKED_OUT') {
        sendError(
          res,
          `Cannot record return: Pass status is '${outing.status}'. Student must be CHECKED_OUT first.`,
          400
        );
        return;
      }

      // Check late return
      const isLate = now.getTime() > new Date(outing.expectedReturnTime).getTime();
      let lateMinutes = 0;
      if (isLate) {
        lateMinutes = Math.round((now.getTime() - new Date(outing.expectedReturnTime).getTime()) / 60000);
      }

      const updated = await prisma.outingRequest.update({
        where: { id: outing.id },
        data: {
          status: 'COMPLETED',
          actualReturnTime: now,
          gateEntryGuardId: req.user?.id,
          isLateReturn: isLate,
          lateMinutes,
        },
        include: {
          student: true,
          gateEntryGuard: { select: { name: true } },
        },
      });

      const message = isLate
        ? `LATE RETURN RECORDED: Student returned ${lateMinutes} minutes late (Expected: ${new Date(outing.expectedReturnTime).toLocaleTimeString()}).`
        : `Student ${outing.student.fullName} checked in safely on time.`;

      sendSuccess(res, message, updated);
      return;
    }

    sendError(res, 'Invalid action', 400);
  } catch (err) {
    next(err);
  }
};

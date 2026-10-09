import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const createFeeStructureSchema = z.object({
  academicYear: z.string().min(4, 'Academic year is required (e.g. 2026-27)'),
  name: z.string().min(3, 'Name is required'),
  totalAmount: z.number().positive('Amount must be positive'),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  yearOfStudy: z.string().optional().nullable(),
});

const recordPaymentSchema = z.object({
  studentFeeId: z.string().min(1, 'Student fee ID is required'),
  amount: z.number().positive('Payment amount must be positive'),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'DD']).default('CASH'),
  transactionRef: z.string().optional(),
  remarks: z.string().optional(),
});

export const getFeeStructures = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const feeStructures = await prisma.feeStructure.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { studentFees: true },
        },
      },
    });

    sendSuccess(res, 'Fee structures retrieved', feeStructures);
  } catch (err) {
    next(err);
  }
};

export const createFeeStructure = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createFeeStructureSchema.parse(req.body);

    const feeStructure = await prisma.feeStructure.create({
      data: {
        academicYear: data.academicYear,
        name: data.name,
        totalAmount: data.totalAmount,
        dueDate: new Date(data.dueDate),
        yearOfStudy: data.yearOfStudy || null,
      },
    });

    sendSuccess(res, 'Fee structure created', feeStructure, 201);
  } catch (err) {
    next(err);
  }
};

export const getStudentFees = async (
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

    const { status, yearOfStudy, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (user.role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { OR: [{ userId: user.id }, { rollNumber: user.username }] },
      });
      if (!student) {
        sendSuccess(res, 'No fee records found', [], 200, { total: 0 });
        return;
      }
      where.studentId = student.id;
    }

    if (status) {
      where.status = status;
    }

    if (yearOfStudy) {
      where.student = { yearOfStudy: String(yearOfStudy) };
    }

    if (search) {
      where.student = {
        ...where.student,
        OR: [
          { rollNumber: { contains: String(search) } },
          { fullName: { contains: String(search) } },
        ],
      };
    }

    const [fees, total] = await Promise.all([
      prisma.studentFee.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              rollNumber: true,
              branch: true,
              yearOfStudy: true,
            },
          },
          feeStructure: true,
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
        skip,
        take: limitNum,
        orderBy: { balanceAmount: 'desc' },
      }),
      prisma.studentFee.count({ where }),
    ]);

    // Check and update overdue status dynamically
    const now = new Date();
    const formatted = fees.map((f) => {
      let currentStatus = f.status;
      if (f.balanceAmount > 0 && f.dueDate < now) {
        currentStatus = 'OVERDUE';
      }
      return {
        ...f,
        status: currentStatus,
      };
    });

    sendSuccess(res, 'Student fees retrieved', formatted, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
};

export const recordPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentFeeId, amount, paymentMode, transactionRef, remarks } =
      recordPaymentSchema.parse(req.body);

    const studentFee = await prisma.studentFee.findUnique({
      where: { id: studentFeeId },
      include: { student: true },
    });

    if (!studentFee) {
      sendError(res, 'Student fee record not found', 404);
      return;
    }

    // 1. Critical Requirement: Prevent payment exceeding remaining balance
    if (amount > studentFee.balanceAmount) {
      sendError(
        res,
        `Payment amount (₹${amount.toLocaleString('en-IN')}) exceeds outstanding balance (₹${studentFee.balanceAmount.toLocaleString('en-IN')}). Maximum payable is ₹${studentFee.balanceAmount.toLocaleString('en-IN')}.`,
        400,
        { currentBalance: studentFee.balanceAmount, attemptedAmount: amount }
      );
      return;
    }

    // 2. Generate sequential unique receipt number (REC-YYYY-XXXXX)
    const year = new Date().getFullYear();
    const paymentCount = await prisma.payment.count();
    const receiptNumber = `REC-${year}-${String(paymentCount + 1).padStart(5, '0')}`;

    // 3. Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          studentFeeId,
          studentId: studentFee.studentId,
          receiptNumber,
          amount,
          paymentDate: new Date(),
          paymentMode,
          transactionRef: transactionRef || null,
          remarks: remarks || null,
          receivedById: req.user?.id || null,
        },
      });

      const updatedPaid = studentFee.paidAmount + amount;
      const updatedBalance = studentFee.totalAmount - updatedPaid;
      const updatedStatus = updatedBalance <= 0 ? 'PAID' : 'PARTIAL';

      const updatedFee = await tx.studentFee.update({
        where: { id: studentFeeId },
        data: {
          paidAmount: updatedPaid,
          balanceAmount: updatedBalance,
          status: updatedStatus,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'FEE_PAYMENT_COLLECTED',
          entity: 'Payment',
          entityId: payment.id,
          details: `Recorded payment of ₹${amount} for student ${studentFee.student.rollNumber}. Receipt: ${receiptNumber}. Remaining balance: ₹${updatedBalance}`,
        },
      });

      return { payment, updatedFee };
    });

    sendSuccess(res, 'Payment recorded successfully', result, 201);
  } catch (err) {
    next(err);
  }
};

export const getReceiptDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { receiptNumber } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { receiptNumber },
      include: {
        student: {
          include: {
            allocations: {
              where: { status: 'ACTIVE' },
              include: { room: true, bed: true },
            },
          },
        },
        studentFee: {
          include: { feeStructure: true },
        },
        receivedBy: {
          select: { name: true, role: true },
        },
      },
    });

    if (!payment) {
      sendError(res, 'Receipt not found', 404);
      return;
    }

    sendSuccess(res, 'Receipt details retrieved', payment);
  } catch (err) {
    next(err);
  }
};

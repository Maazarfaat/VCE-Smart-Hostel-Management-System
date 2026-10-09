import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const createStudentSchema = z.object({
  rollNumber: z.string().min(3, 'Roll number is required'),
  fullName: z.string().min(1, 'Full name is required'),
  branch: z.string().min(1, 'Branch is required'),
  yearOfStudy: z.string().min(1, 'Year of study is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
});

const updateStudentSchema = createStudentSchema.partial();

export const getStudents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      branch,
      yearOfStudy,
      status,
      roomNumber,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (branch) where.branch = branch;
    if (yearOfStudy) where.yearOfStudy = yearOfStudy;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { rollNumber: { contains: String(search) } },
        { fullName: { contains: String(search) } },
        { branch: { contains: String(search) } },
      ];
    }

    if (roomNumber) {
      where.allocations = {
        some: {
          status: 'ACTIVE',
          room: { roomNumber: String(roomNumber) },
        },
      };
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          allocations: {
            where: { status: 'ACTIVE' },
            include: {
              room: { include: { block: true } },
              bed: true,
            },
          },
          studentFees: {
            select: {
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              status: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { rollNumber: 'asc' },
      }),
      prisma.student.count({ where }),
    ]);

    // Format response
    const formatted = students.map((s) => {
      const activeAlloc = s.allocations[0] || null;
      const totalBalance = s.studentFees.reduce((acc, f) => acc + f.balanceAmount, 0);
      const totalPaid = s.studentFees.reduce((acc, f) => acc + f.paidAmount, 0);

      return {
        id: s.id,
        rollNumber: s.rollNumber,
        fullName: s.fullName,
        branch: s.branch,
        yearOfStudy: s.yearOfStudy,
        phone: s.phone,
        email: s.email,
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
        address: s.address,
        status: s.status,
        roomAllocation: activeAlloc
          ? {
              blockName: activeAlloc.room?.block?.name || 'Boys Hostel',
              roomNumber: activeAlloc.room?.roomNumber || 'N/A',
              floor: activeAlloc.room?.floor ?? 0,
              bedNumber: activeAlloc.bed?.bedNumber ?? null,
              allocationDate: activeAlloc.allocationDate,
            }
          : null,
        feeSummary: {
          paid: totalPaid,
          balance: totalBalance,
          status: totalBalance === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING',
        },
      };
    });

    sendSuccess(res, 'Students retrieved successfully', formatted, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        allocations: {
          include: {
            room: { include: { block: true } },
            bed: true,
          },
          orderBy: { allocationDate: 'desc' },
        },
        studentFees: {
          include: {
            feeStructure: true,
            payments: { orderBy: { paymentDate: 'desc' } },
          },
        },
        complaints: {
          orderBy: { createdAt: 'desc' },
        },
        outingRequests: {
          orderBy: { createdAt: 'desc' },
        },
        visitors: {
          orderBy: { visitDate: 'desc' },
        },
      },
    });

    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    sendSuccess(res, 'Student details retrieved', student);
  } catch (err) {
    next(err);
  }
};

export const createStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createStudentSchema.parse(req.body);

    const existing = await prisma.student.findUnique({
      where: { rollNumber: data.rollNumber },
    });

    if (existing) {
      sendError(res, `Student with Roll Number ${data.rollNumber} already exists`, 409);
      return;
    }

    const student = await prisma.student.create({
      data: {
        ...data,
        status: 'ACTIVE',
      },
    });

    sendSuccess(res, 'Student created successfully', student, 201);
  } catch (err) {
    next(err);
  }
};

export const updateStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const data = updateStudentSchema.parse(req.body);

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    const updated = await prisma.student.update({
      where: { id },
      data,
    });

    sendSuccess(res, 'Student updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

export const getFilterMetadata = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [branches, years] = await Promise.all([
      prisma.student.findMany({
        distinct: ['branch'],
        select: { branch: true },
        orderBy: { branch: 'asc' },
      }),
      prisma.student.findMany({
        distinct: ['yearOfStudy'],
        select: { yearOfStudy: true },
        orderBy: { yearOfStudy: 'asc' },
      }),
    ]);

    sendSuccess(res, 'Metadata retrieved', {
      branches: branches.map((b) => b.branch),
      years: years.map((y) => y.yearOfStudy),
    });
  } catch (err) {
    next(err);
  }
};

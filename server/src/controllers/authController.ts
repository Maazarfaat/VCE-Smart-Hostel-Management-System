import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { comparePassword, hashPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { sendError, sendSuccess } from '../utils/response';
import { resetLoginAttempts } from '../middlewares/rateLimiter';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or Roll Number is required'),
  password: z.string().min(1, 'Password is required'),
});

const studentSetupSchema = z.object({
  rollNumber: z.string().min(3, 'Valid Roll Number is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE', 'SECURITY']),
});

export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const trimmedIdentifier = username.trim();

    // 1. Look for user by direct username OR email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ username: trimmedIdentifier }, { email: trimmedIdentifier.toLowerCase() }],
      },
      include: {
        studentProfile: {
          include: {
            allocations: {
              where: { status: 'ACTIVE' },
              include: { room: true, bed: true },
            },
          },
        },
      },
    });

    // 2. If not found by username, check if it matches a genuine student roll number
    if (!user) {
      const student = await prisma.student.findUnique({
        where: { rollNumber: trimmedIdentifier },
        include: { user: true },
      });

      if (student) {
        if (student.user) {
          // Student already has a user account
          user = await prisma.user.findUnique({
            where: { id: student.user.id },
            include: {
              studentProfile: {
                include: {
                  allocations: {
                    where: { status: 'ACTIVE' },
                    include: { room: true, bed: true },
                  },
                },
              },
            },
          });
        } else {
          // Student exists in MySQL registry from Excel, but user account has not yet been initialized
          // Allow first-login initialization with standard development password 'student123'
          if (password === 'student123') {
            const initialHash = await hashPassword('student123');
            const newUser = await prisma.user.create({
              data: {
                username: student.rollNumber,
                name: student.fullName,
                email: student.email || `${student.rollNumber}@vardhaman.org`,
                passwordHash: initialHash,
                role: 'STUDENT',
                isActive: true,
              },
            });

            await prisma.student.update({
              where: { id: student.id },
              data: { userId: newUser.id },
            });

            user = await prisma.user.findUnique({
              where: { id: newUser.id },
              include: {
                studentProfile: {
                  include: {
                    allocations: {
                      where: { status: 'ACTIVE' },
                      include: { room: true, bed: true },
                    },
                  },
                },
              },
            });
          }
        }
      }
    }

    if (!user) {
      sendError(res, 'Invalid credentials. User or Roll Number not found in institutional registry.', 401);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'This account has been deactivated. Please contact the administrator.', 403);
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      sendError(res, 'Invalid credentials. Incorrect password.', 401);
      return;
    }

    // Reset failed login attempt counter on successful authentication
    resetLoginAttempts(req.ip || '');

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
      studentId: user.studentProfile?.id || null,
      rollNumber: user.studentProfile?.rollNumber || null,
    });

    sendSuccess(res, 'Login successful', {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        rollNumber: user.studentProfile?.rollNumber || (user.role === 'STUDENT' ? user.username : null),
        studentProfile: user.studentProfile
          ? {
              id: user.studentProfile.id,
              rollNumber: user.studentProfile.rollNumber,
              fullName: user.studentProfile.fullName,
              branch: user.studentProfile.branch,
              yearOfStudy: user.studentProfile.yearOfStudy,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Student First-Login / Password Setup
 * Allows imported students to set up or change their login password using their official Roll Number
 */
export const studentSetup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rollNumber, newPassword } = studentSetupSchema.parse(req.body);
    const trimmedRoll = rollNumber.trim();

    const student = await prisma.student.findUnique({
      where: { rollNumber: trimmedRoll },
      include: { user: true },
    });

    if (!student) {
      sendError(res, `No student record found with Roll Number '${trimmedRoll}' in college registry.`, 404);
      return;
    }

    const passwordHash = await hashPassword(newPassword);

    if (student.user) {
      await prisma.user.update({
        where: { id: student.user.id },
        data: { passwordHash, isActive: true },
      });
    } else {
      const newUser = await prisma.user.create({
        data: {
          username: student.rollNumber,
          name: student.fullName,
          email: student.email || `${student.rollNumber}@vardhaman.org`,
          passwordHash,
          role: 'STUDENT',
          isActive: true,
        },
      });

      await prisma.student.update({
        where: { id: student.id },
        data: { userId: newUser.id },
      });
    }

    sendSuccess(
      res,
      `Password established successfully for student ${student.fullName} (${student.rollNumber}). You may now log in.`,
      {
        rollNumber: student.rollNumber,
        fullName: student.fullName,
      }
    );
  } catch (err) {
    next(err);
  }
};

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        studentProfile: {
          include: {
            allocations: {
              where: { status: 'ACTIVE' },
              include: { room: { include: { block: true } }, bed: true },
            },
          },
        },
      },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, 'User profile retrieved', {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      lastLoginAt: user.lastLoginAt,
      studentProfile: user.studentProfile,
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      sendError(res, 'Current password is incorrect', 400);
      return;
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    sendSuccess(res, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { username: { contains: String(search) } },
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(
      res,
      'Users retrieved successfully',
      users,
      200,
      { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    );
  } catch (err) {
    next(err);
  }
};

export const createUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { username: validated.username },
    });

    if (existing) {
      sendError(res, 'Username already taken', 409);
      return;
    }

    const passwordHash = await hashPassword(validated.password);

    const user = await prisma.user.create({
      data: {
        username: validated.username,
        passwordHash,
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        role: validated.role,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    sendSuccess(res, 'User created successfully', user, 201);
  } catch (err) {
    next(err);
  }
};

export const toggleUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (user.id === req.user?.id) {
      sendError(res, 'Cannot deactivate your own account', 400);
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, username: true, isActive: true },
    });

    sendSuccess(res, `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`, updated);
  } catch (err) {
    next(err);
  }
};

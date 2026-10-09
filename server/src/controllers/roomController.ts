import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const allocateSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  roomId: z.string().min(1, 'Room ID is required'),
  remarks: z.string().optional(),
});

const transferSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  targetRoomId: z.string().min(1, 'Target Room ID is required'),
  remarks: z.string().optional(),
});

const vacateSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  forceVacate: z.boolean().optional().default(false), // only admin override
  remarks: z.string().optional(),
});

const updateRoomCapacitySchema = z.object({
  capacity: z.number().int().min(1).max(12).nullable(),
});

const createRoomSchema = z.object({
  blockId: z.string().min(1, 'Block ID is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  floor: z.number().int().min(0),
  capacity: z.number().int().min(1).max(12).optional().nullable(),
});

export const getRooms = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { blockId, floor, status, search } = req.query;

    const where: any = {};
    if (blockId) where.blockId = String(blockId);
    if (floor) where.floor = parseInt(floor as string, 10);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { roomNumber: { contains: String(search) } },
        {
          allocations: {
            some: {
              status: 'ACTIVE',
              student: {
                OR: [
                  { rollNumber: { contains: String(search) } },
                  { fullName: { contains: String(search) } },
                ],
              },
            },
          },
        },
      ];
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        block: { select: { id: true, name: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              select: {
                id: true,
                rollNumber: true,
                fullName: true,
                branch: true,
                yearOfStudy: true,
                phone: true,
              },
            },
          },
          orderBy: { student: { rollNumber: 'asc' } },
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    // Format room items with precise real occupancy and honest capacity
    const formatted = rooms.map((r) => {
      const activeResidents = r.allocations.map((a) => a.student);
      const occupancy = activeResidents.length;
      const isCapacityKnown = r.capacity !== null && r.capacity !== undefined;
      const availableBeds = isCapacityKnown ? Math.max(0, r.capacity! - occupancy) : null;

      return {
        id: r.id,
        blockId: r.blockId,
        blockName: r.block.name,
        roomNumber: r.roomNumber,
        floor: r.floor,
        capacity: r.capacity, // null if unspecified
        capacityLabel: isCapacityKnown ? `${r.capacity} Beds` : 'Capacity not specified',
        currentOccupancy: occupancy,
        availableBeds,
        status: occupancy > 0 ? 'OCCUPIED' : 'AVAILABLE',
        residents: activeResidents,
      };
    });

    sendSuccess(res, 'Rooms retrieved successfully', formatted);
  } catch (err) {
    next(err);
  }
};

export const getBlocks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const blocks = await prisma.block.findMany({
      include: {
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, 'Blocks retrieved successfully', blocks);
  } catch (err) {
    next(err);
  }
};

export const updateRoomCapacity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { capacity } = updateRoomCapacitySchema.parse(req.body);

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      sendError(res, 'Room not found', 404);
      return;
    }

    const updated = await prisma.room.update({
      where: { id },
      data: { capacity },
    });

    sendSuccess(res, `Room ${room.roomNumber} capacity updated`, updated);
  } catch (err) {
    next(err);
  }
};

export const allocateBed = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId, roomId, remarks } = allocateSchema.parse(req.body);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    // 1. Check if student already has active allocation
    const existingAllocation = await prisma.allocation.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: { room: true },
    });

    if (existingAllocation) {
      sendError(
        res,
        `Student ${student.fullName} (${student.rollNumber}) already has an active allocation in Room ${existingAllocation.room.roomNumber}. Use Room Transfer instead.`,
        400
      );
      return;
    }

    // 2. Validate room
    const targetRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: { allocations: { where: { status: 'ACTIVE' } } },
    });

    if (!targetRoom) {
      sendError(res, 'Target room not found', 404);
      return;
    }

    // If room has an explicit capacity, verify capacity is not exceeded
    if (targetRoom.capacity !== null && targetRoom.allocations.length >= targetRoom.capacity) {
      sendError(
        res,
        `Room ${targetRoom.roomNumber} has reached its documented maximum capacity of ${targetRoom.capacity} residents.`,
        400
      );
      return;
    }

    // 3. Execute atomic allocation transaction
    const result = await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.create({
        data: {
          studentId,
          roomId: targetRoom.id,
          status: 'ACTIVE',
          remarks: remarks || 'Allocated by Chief Warden',
          allocatedBy: req.user?.name || req.user?.username || 'Chief Warden',
        },
      });

      const activeInRoom = await tx.allocation.count({
        where: { roomId: targetRoom.id, status: 'ACTIVE' },
      });

      await tx.room.update({
        where: { id: targetRoom.id },
        data: {
          currentOccupancy: activeInRoom,
          status: 'OCCUPIED',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'ROOM_ALLOCATION',
          entity: 'Allocation',
          entityId: allocation.id,
          details: `Allocated Room ${targetRoom.roomNumber} to student ${student.fullName} (${student.rollNumber})`,
        },
      });

      return allocation;
    });

    sendSuccess(res, 'Student allocated to room successfully', result, 201);
  } catch (err) {
    next(err);
  }
};

export const transferBed = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId, targetRoomId, remarks } = transferSchema.parse(req.body);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    // 1. Get current active allocation
    const currentAllocation = await prisma.allocation.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: { room: true },
    });

    if (!currentAllocation) {
      sendError(res, 'Student does not have any active room allocation to transfer from', 400);
      return;
    }

    if (currentAllocation.roomId === targetRoomId) {
      sendError(res, 'Target room is the same as the student\'s current room', 400);
      return;
    }

    // 2. Validate target room
    const targetRoom = await prisma.room.findUnique({
      where: { id: targetRoomId },
      include: { allocations: { where: { status: 'ACTIVE' } } },
    });

    if (!targetRoom) {
      sendError(res, 'Target room not found', 404);
      return;
    }

    if (targetRoom.capacity !== null && targetRoom.allocations.length >= targetRoom.capacity) {
      sendError(
        res,
        `Target Room ${targetRoom.roomNumber} is at maximum capacity (${targetRoom.capacity} residents).`,
        400
      );
      return;
    }

    // 3. Execute atomic transfer transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark current allocation transferred
      await tx.allocation.update({
        where: { id: currentAllocation.id },
        data: {
          status: 'TRANSFERRED',
          vacateDate: new Date(),
          remarks: `Transferred to Room ${targetRoom.roomNumber}. Reason: ${remarks || 'Approved transfer'}`,
        },
      });

      // Create new allocation
      const newAllocation = await tx.allocation.create({
        data: {
          studentId,
          roomId: targetRoom.id,
          status: 'ACTIVE',
          remarks: `Transferred from Room ${currentAllocation.room.roomNumber}`,
          allocatedBy: req.user?.name || req.user?.username || 'Chief Warden',
        },
      });

      // Update occupancy for old room
      const oldRoomActive = await tx.allocation.count({
        where: { roomId: currentAllocation.roomId, status: 'ACTIVE' },
      });
      await tx.room.update({
        where: { id: currentAllocation.roomId },
        data: {
          currentOccupancy: oldRoomActive,
          status: oldRoomActive > 0 ? 'OCCUPIED' : 'AVAILABLE',
        },
      });

      // Update occupancy for new room
      const newRoomActive = await tx.allocation.count({
        where: { roomId: targetRoom.id, status: 'ACTIVE' },
      });
      await tx.room.update({
        where: { id: targetRoom.id },
        data: {
          currentOccupancy: newRoomActive,
          status: 'OCCUPIED',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'ROOM_TRANSFER',
          entity: 'Allocation',
          entityId: newAllocation.id,
          details: `Transferred student ${student.rollNumber} from Room ${currentAllocation.room.roomNumber} to Room ${targetRoom.roomNumber}`,
        },
      });

      return newAllocation;
    });

    sendSuccess(res, 'Student room transfer completed successfully', result);
  } catch (err) {
    next(err);
  }
};

export const vacateBed = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId, forceVacate, remarks } = vacateSchema.parse(req.body);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        studentFees: true,
      },
    });

    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    // 1. Critical Requirement: Check outstanding fee dues before permitting vacation
    const totalOutstandingDues = student.studentFees.reduce(
      (sum, fee) => sum + fee.balanceAmount,
      0
    );

    if (totalOutstandingDues > 0 && !forceVacate) {
      sendError(
        res,
        `Cannot vacate room: Student ${student.fullName} (${student.rollNumber}) has outstanding fee dues of ₹${totalOutstandingDues.toLocaleString('en-IN')}. All dues must be cleared before vacating.`,
        400,
        { outstandingBalance: totalOutstandingDues }
      );
      return;
    }

    // 2. Find active allocation
    const activeAllocation = await prisma.allocation.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: { room: true },
    });

    if (!activeAllocation) {
      sendError(res, 'Student does not have an active room allocation to vacate', 400);
      return;
    }

    // 3. Vacate transaction
    await prisma.$transaction(async (tx) => {
      await tx.allocation.update({
        where: { id: activeAllocation.id },
        data: {
          status: 'VACATED',
          vacateDate: new Date(),
          remarks: remarks || 'Vacated by student/administration',
        },
      });

      const activeRemaining = await tx.allocation.count({
        where: { roomId: activeAllocation.roomId, status: 'ACTIVE' },
      });

      await tx.room.update({
        where: { id: activeAllocation.roomId },
        data: {
          currentOccupancy: activeRemaining,
          status: activeRemaining > 0 ? 'OCCUPIED' : 'AVAILABLE',
        },
      });

      await tx.student.update({
        where: { id: studentId },
        data: { status: 'VACATED' },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'ROOM_VACATE',
          entity: 'Allocation',
          entityId: activeAllocation.id,
          details: `Vacated student ${student.rollNumber} from Room ${activeAllocation.room.roomNumber}. Outstanding dues: ₹${totalOutstandingDues}`,
        },
      });
    });

    sendSuccess(res, `Student ${student.fullName} vacated successfully`);
  } catch (err) {
    next(err);
  }
};

export const createRoom = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createRoomSchema.parse(req.body);

    const existing = await prisma.room.findUnique({
      where: {
        blockId_roomNumber: {
          blockId: data.blockId,
          roomNumber: data.roomNumber,
        },
      },
    });

    if (existing) {
      sendError(res, `Room ${data.roomNumber} already exists in this block`, 409);
      return;
    }

    const room = await prisma.room.create({
      data: {
        blockId: data.blockId,
        roomNumber: data.roomNumber,
        floor: data.floor,
        capacity: data.capacity || null,
        currentOccupancy: 0,
        status: 'AVAILABLE',
      },
    });

    sendSuccess(res, 'Room created successfully', room, 201);
  } catch (err) {
    next(err);
  }
};

import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/response';

export const getOccupancyReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [rooms, studentsByYear, studentsByBranch] = await Promise.all([
      prisma.room.findMany({
        include: {
          block: true,
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
                },
              },
            },
          },
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      }),
      prisma.student.groupBy({
        by: ['yearOfStudy'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      }),
      prisma.student.groupBy({
        by: ['branch'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      }),
    ]);

    const totalRooms = rooms.length;
    const totalAssignedStudents = rooms.reduce((sum, r) => sum + r.allocations.length, 0);
    const occupiedRooms = rooms.filter((r) => r.allocations.length > 0).length;
    const roomsWithConfiguredCapacity = rooms.filter((r) => r.capacity !== null && r.capacity !== undefined);
    const hasConfiguredCapacity = roomsWithConfiguredCapacity.length > 0;
    const totalCapacity = hasConfiguredCapacity
      ? roomsWithConfiguredCapacity.reduce((sum, r) => sum + (r.capacity || 0), 0)
      : null;

    // Floor-wise statistics
    const floorMap = new Map<number, { floor: number; totalRooms: number; occupiedRooms: number; assignedStudents: number }>();
    rooms.forEach((r) => {
      const current = floorMap.get(r.floor) || {
        floor: r.floor,
        totalRooms: 0,
        occupiedRooms: 0,
        assignedStudents: 0,
      };
      current.totalRooms += 1;
      if (r.allocations.length > 0) current.occupiedRooms += 1;
      current.assignedStudents += r.allocations.length;
      floorMap.set(r.floor, current);
    });

    const roomSummaries = rooms.map((r) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      floor: r.floor,
      blockName: r.block?.name || 'Boys Hostel',
      occupantsCount: r.allocations.length,
      capacity: r.capacity ?? null,
      capacityLabel: r.capacity ? `${r.allocations.length} / ${r.capacity}` : 'Capacity not specified',
      occupants: r.allocations.map((a) => a.student),
    }));

    sendSuccess(res, 'Occupancy report generated', {
      summary: {
        totalRooms,
        occupiedRooms,
        totalAssignedStudents,
        capacitySpecified: hasConfiguredCapacity,
        totalCapacity,
        totalBeds: hasConfiguredCapacity ? totalCapacity : totalAssignedStudents,
        occupiedBeds: totalAssignedStudents,
        availableBeds: hasConfiguredCapacity ? Math.max(0, (totalCapacity || 0) - totalAssignedStudents) : 0,
        occupancyRate: hasConfiguredCapacity && (totalCapacity || 0) > 0
          ? Math.round((totalAssignedStudents / (totalCapacity || 1)) * 100)
          : 100,
      },
      byFloor: Array.from(floorMap.values()).sort((a, b) => a.floor - b.floor),
      byYear: studentsByYear.map((y) => ({ year: y.yearOfStudy, count: y._count.id })),
      byBranch: studentsByBranch.map((b) => ({ branch: b.branch, count: b._count.id })),
      rooms: roomSummaries,
      vacantBeds: [],
    });
  } catch (err) {
    next(err);
  }
};

export const getFeeReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [aggregate, feesByStatus, recentPayments, students] = await Promise.all([
      prisma.studentFee.aggregate({
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),
      prisma.studentFee.groupBy({
        by: ['status'],
        _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
        _count: { id: true },
      }),
      prisma.payment.findMany({
        take: 15,
        orderBy: { paymentDate: 'desc' },
        include: {
          student: { select: { fullName: true, rollNumber: true, branch: true } },
          receivedBy: { select: { name: true } },
        },
      }),
      prisma.student.findMany({
        where: {
          studentFees: { some: { balanceAmount: { gt: 0 } } },
        },
        include: {
          studentFees: true,
          allocations: {
            where: { status: 'ACTIVE' },
            include: { room: true },
          },
        },
        orderBy: { rollNumber: 'asc' },
      }),
    ]);

    const totalExpected = aggregate._sum.totalAmount || 0;
    const totalCollected = aggregate._sum.paidAmount || 0;
    const totalOutstanding = aggregate._sum.balanceAmount || 0;
    const collectionPercentage = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    // Defaulters / Students with dues
    const defaulters = students.map((s) => ({
      studentId: s.id,
      rollNumber: s.rollNumber,
      fullName: s.fullName,
      branch: s.branch,
      yearOfStudy: s.yearOfStudy,
      roomNumber: s.allocations[0]?.room.roomNumber || 'Not Allocated',
      totalBalance: s.studentFees.reduce((acc, f) => acc + f.balanceAmount, 0),
    }));

    sendSuccess(res, 'Fee report generated', {
      summary: {
        totalExpected,
        totalCollected,
        totalOutstanding,
        collectionPercentage,
      },
      byStatus: feesByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        totalAmount: s._sum.totalAmount || 0,
        paidAmount: s._sum.paidAmount || 0,
        balanceAmount: s._sum.balanceAmount || 0,
      })),
      recentPayments,
      defaultersList: defaulters,
    });
  } catch (err) {
    next(err);
  }
};

export const getComplaintReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [byCategory, byStatus, byPriority, resolvedComplaints] = await Promise.all([
      prisma.complaint.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      prisma.complaint.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.complaint.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),
      prisma.complaint.findMany({
        where: { status: { in: ['RESOLVED', 'CLOSED'] }, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    // Calculate average resolution time in hours
    let avgResolutionHours = 0;
    if (resolvedComplaints.length > 0) {
      const totalHours = resolvedComplaints.reduce((sum, c) => {
        if (!c.resolvedAt) return sum;
        const diffMs = new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diffMs / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedComplaints.length) * 10) / 10;
    }

    sendSuccess(res, 'Complaints report generated', {
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
      averageResolutionHours: avgResolutionHours,
      totalResolved: resolvedComplaints.length,
    });
  } catch (err) {
    next(err);
  }
};

export const getGateReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalOutings,
      lateReturnsCount,
      outingsByType,
      recentLateReturns,
      visitorSummary,
    ] = await Promise.all([
      prisma.outingRequest.count(),
      prisma.outingRequest.count({ where: { isLateReturn: true } }),
      prisma.outingRequest.groupBy({
        by: ['outingType'],
        _count: { id: true },
      }),
      prisma.outingRequest.findMany({
        where: { isLateReturn: true },
        take: 10,
        orderBy: { actualReturnTime: 'desc' },
        include: {
          student: { select: { fullName: true, rollNumber: true, branch: true } },
        },
      }),
      prisma.visitor.count(),
    ]);

    sendSuccess(res, 'Gate movement report generated', {
      outings: {
        total: totalOutings,
        lateReturnsCount,
        lateReturnPercentage: totalOutings > 0 ? Math.round((lateReturnsCount / totalOutings) * 100) : 0,
        byType: outingsByType.map((t) => ({ type: t.outingType, count: t._count.id })),
        recentLateReturns,
      },
      visitors: {
        totalVisitorsLogged: visitorSummary,
      },
    });
  } catch (err) {
    next(err);
  }
};

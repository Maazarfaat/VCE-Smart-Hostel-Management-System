import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export const getDashboardStats = async (
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ==========================================
    // 1. ADMINISTRATOR DASHBOARD
    // ==========================================
    if (user.role === 'ADMIN') {
      const [
        totalStudents,
        activeStudents,
        totalRooms,
        activeAllocationsCount,
        roomsWithAllocationsCount,
        roomsWithCapacity,
        pendingComplaints,
        inProgressComplaints,
        urgentComplaints,
        pendingOutings,
        currentlyOutOutings,
        visitorsInside,
        recentComplaints,
        recentAnnouncements,
      ] = await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { status: 'ACTIVE' } }),
        prisma.room.count(),
        prisma.allocation.count({ where: { status: 'ACTIVE' } }),
        prisma.room.count({ where: { allocations: { some: { status: 'ACTIVE' } } } }),
        prisma.room.findMany({ where: { capacity: { not: null } }, select: { capacity: true } }),
        prisma.complaint.count({ where: { status: 'OPEN' } }),
        prisma.complaint.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.complaint.count({ where: { priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.outingRequest.count({ where: { status: 'PENDING' } }),
        prisma.outingRequest.count({ where: { status: 'CHECKED_OUT' } }),
        prisma.visitor.count({ where: { status: 'INSIDE' } }),
        prisma.complaint.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { student: { select: { fullName: true, rollNumber: true } } },
        }),
        prisma.announcement.findMany({
          take: 4,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const yearStats = await prisma.student.groupBy({
        by: ['yearOfStudy'],
        _count: { id: true },
      });

      const branchStats = await prisma.student.groupBy({
        by: ['branch'],
        _count: { id: true },
      });

      const totalKnownCapacity = roomsWithCapacity.reduce((sum, r) => sum + (r.capacity || 0), 0);
      const isCapacityConfigured = roomsWithCapacity.length > 0;

      sendSuccess(res, 'Administrator dashboard telemetry retrieved', {
        role: 'ADMIN',
        occupancy: {
          totalRooms,
          occupiedRooms: roomsWithAllocationsCount,
          assignedStudents: activeAllocationsCount,
          capacitySpecified: isCapacityConfigured,
          totalCapacity: isCapacityConfigured ? totalKnownCapacity : null,
          totalBeds: isCapacityConfigured ? totalKnownCapacity : activeAllocationsCount,
          occupiedBeds: activeAllocationsCount,
          availableBeds: isCapacityConfigured ? Math.max(0, totalKnownCapacity - activeAllocationsCount) : 0,
          occupancyRate: isCapacityConfigured && totalKnownCapacity > 0
            ? Math.round((activeAllocationsCount / totalKnownCapacity) * 100)
            : 100,
        },
        students: {
          total: totalStudents,
          active: activeStudents,
          byYear: yearStats.map((y) => ({ year: y.yearOfStudy, count: y._count.id })),
          byBranch: branchStats.map((b) => ({ branch: b.branch, count: b._count.id })),
        },
        operations: {
          pendingComplaints,
          inProgressComplaints,
          urgentComplaints,
          totalActiveComplaints: pendingComplaints + inProgressComplaints,
          pendingOutings,
          currentlyOutOutings,
          visitorsInside,
        },
        recentComplaints,
        recentAnnouncements,
      });
      return;
    }

    // ==========================================
    // 2. CHIEF WARDEN DASHBOARD
    // ==========================================
    if (user.role === 'WARDEN') {
      const [
        totalStudents,
        activeStudents,
        totalRooms,
        activeAllocationsCount,
        roomsWithAllocationsCount,
        roomsList,
        pendingComplaints,
        inProgressComplaints,
        urgentComplaints,
        pendingOutings,
        currentlyOutOutings,
        visitorsInside,
        recentPendingOutings,
        recentComplaints,
        recentAnnouncements,
      ] = await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { status: 'ACTIVE' } }),
        prisma.room.count(),
        prisma.allocation.count({ where: { status: 'ACTIVE' } }),
        prisma.room.count({ where: { allocations: { some: { status: 'ACTIVE' } } } }),
        prisma.room.findMany({
          take: 12, // sample preview on dashboard, full 100 in Rooms tab
          orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
          include: {
            allocations: {
              where: { status: 'ACTIVE' },
              include: {
                student: { select: { id: true, rollNumber: true, fullName: true, branch: true } },
              },
            },
          },
        }),
        prisma.complaint.count({ where: { status: 'OPEN' } }),
        prisma.complaint.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.complaint.count({ where: { priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.outingRequest.count({ where: { status: 'PENDING' } }),
        prisma.outingRequest.count({ where: { status: 'CHECKED_OUT' } }),
        prisma.visitor.count({ where: { status: 'INSIDE' } }),
        prisma.outingRequest.findMany({
          where: { status: 'PENDING' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { student: { select: { fullName: true, rollNumber: true, branch: true } } },
        }),
        prisma.complaint.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { student: { select: { fullName: true, rollNumber: true } } },
        }),
        prisma.announcement.findMany({
          take: 4,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const yearStats = await prisma.student.groupBy({
        by: ['yearOfStudy'],
        _count: { id: true },
      });

      const branchStats = await prisma.student.groupBy({
        by: ['branch'],
        _count: { id: true },
      });

      const roomRosterSummary = roomsList.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        floor: r.floor,
        capacity: r.capacity,
        occupancyCount: r.allocations.length,
        residents: r.allocations.map((a) => a.student),
      }));

      sendSuccess(res, 'Chief Warden operations dashboard retrieved', {
        role: 'WARDEN',
        occupancy: {
          totalRooms,
          occupiedRooms: roomsWithAllocationsCount,
          assignedStudents: activeAllocationsCount,
        },
        students: {
          total: totalStudents,
          active: activeStudents,
          byYear: yearStats.map((y) => ({ year: y.yearOfStudy, count: y._count.id })),
          byBranch: branchStats.map((b) => ({ branch: b.branch, count: b._count.id })),
        },
        roomRosterPreview: roomRosterSummary,
        outings: {
          pendingApprovals: pendingOutings,
          currentlyOut: currentlyOutOutings,
          recentPending: recentPendingOutings,
        },
        complaints: {
          pending: pendingComplaints,
          inProgress: inProgressComplaints,
          urgent: urgentComplaints,
          totalActive: pendingComplaints + inProgressComplaints,
          recentComplaints,
        },
        visitors: {
          currentlyInside: visitorsInside,
        },
        recentAnnouncements,
      });
      return;
    }

    // ==========================================
    // 3. STUDENT PERSONAL DASHBOARD
    // ==========================================
    if (user.role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { rollNumber: user.username },
          ],
        },
        include: {
          allocations: {
            where: { status: 'ACTIVE' },
            include: {
              room: {
                include: {
                  block: true,
                  allocations: {
                    where: { status: 'ACTIVE' },
                    include: { student: { select: { id: true, fullName: true, rollNumber: true, branch: true } } },
                  },
                },
              },
              bed: true,
            },
          },
          outingRequests: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          complaints: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const announcements = await prisma.announcement.findMany({
        where: {
          OR: [{ targetRole: null }, { targetRole: 'STUDENT' }],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      const activeAllocation = student?.allocations[0] || null;
      const roommates = activeAllocation?.room.allocations
        .filter((a) => a.studentId !== student?.id)
        .map((a) => a.student) || [];

      sendSuccess(res, 'Student personal dashboard retrieved', {
        role: 'STUDENT',
        studentProfile: student
          ? {
              id: student.id,
              rollNumber: student.rollNumber,
              fullName: student.fullName,
              branch: student.branch,
              yearOfStudy: student.yearOfStudy,
            }
          : null,
        roomAllocation: activeAllocation
          ? {
              blockName: activeAllocation.room?.block?.name || 'Boys Hostel',
              roomNumber: activeAllocation.room?.roomNumber || 'N/A',
              floor: activeAllocation.room?.floor ?? 0,
              bedNumber: activeAllocation.bed?.bedNumber ?? null,
              capacity: activeAllocation.room?.capacity || null,
              occupantsCount: activeAllocation.room?.allocations?.length || (roommates.length + 1),
              roommates,
            }
          : null,
        feePolicy: {
          standardFee: 180000,
          description: 'Official Annual Hostel Fee Policy (₹1,80,000 payable upon joining hostel admission)',
          status: 'Institutional Fee Policy Standard',
        },
        recentOutings: student?.outingRequests || [],
        recentComplaints: student?.complaints || [],
        announcements,
      });
      return;
    }

    // ==========================================
    // 4. MAINTENANCE SPECIALIST DASHBOARD
    // ==========================================
    if (user.role === 'MAINTENANCE') {
      const [
        assignedToMe,
        inProgressMe,
        resolvedMe,
        allOpenTickets,
        urgentTickets,
        recentAssigned,
      ] = await Promise.all([
        prisma.complaint.count({ where: { assignedToId: user.id } }),
        prisma.complaint.count({ where: { assignedToId: user.id, status: 'IN_PROGRESS' } }),
        prisma.complaint.count({ where: { assignedToId: user.id, status: 'RESOLVED' } }),
        prisma.complaint.count({ where: { status: 'OPEN' } }),
        prisma.complaint.count({ where: { priority: 'URGENT', status: { not: 'CLOSED' } } }),
        prisma.complaint.findMany({
          where: { OR: [{ assignedToId: user.id }, { status: 'OPEN' }] },
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              select: {
                fullName: true,
                rollNumber: true,
                allocations: {
                  where: { status: 'ACTIVE' },
                  include: { room: true },
                },
              },
            },
          },
        }),
      ]);

      const categoryStats = await prisma.complaint.groupBy({
        by: ['category'],
        _count: { id: true },
      });

      sendSuccess(res, 'Maintenance dashboard telemetry retrieved', {
        role: 'MAINTENANCE',
        assignedToMe,
        inProgressMe,
        resolvedMe,
        allOpenTickets,
        urgentTickets,
        byCategory: categoryStats.map((c) => ({ category: c.category, count: c._count.id })),
        recentTickets: recentAssigned,
      });
      return;
    }

    // ==========================================
    // 5. SECURITY GUARD DASHBOARD
    // ==========================================
    if (user.role === 'SECURITY') {
      const [
        currentlyOut,
        overdueOutings,
        visitorsInside,
        totalVisitorsToday,
        recentGateMovements,
      ] = await Promise.all([
        prisma.outingRequest.count({ where: { status: 'CHECKED_OUT' } }),
        prisma.outingRequest.count({
          where: {
            status: 'CHECKED_OUT',
            expectedReturnTime: { lt: new Date() },
          },
        }),
        prisma.visitor.count({ where: { status: 'INSIDE' } }),
        prisma.visitor.count({ where: { inTime: { gte: today } } }),
        prisma.outingRequest.findMany({
          where: { status: { in: ['CHECKED_OUT', 'COMPLETED', 'APPROVED'] } },
          take: 8,
          orderBy: { updatedAt: 'desc' },
          include: { student: { select: { fullName: true, rollNumber: true, branch: true } } },
        }),
      ]);

      const activeVisitorsList = await prisma.visitor.findMany({
        where: { status: 'INSIDE' },
        take: 5,
        orderBy: { inTime: 'desc' },
        include: { student: { select: { fullName: true, rollNumber: true } } },
      });

      sendSuccess(res, 'Security dashboard telemetry retrieved', {
        role: 'SECURITY',
        currentlyOut,
        overdueOutings,
        visitorsInside,
        totalVisitorsToday,
        recentGateMovements,
        activeVisitorsList,
      });
      return;
    }

    sendError(res, 'Invalid user role', 400);
  } catch (err) {
    next(err);
  }
};

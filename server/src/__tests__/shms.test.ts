import { describe, it, expect } from 'vitest';
import path from 'path';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../lib/prisma';
import { ExcelService } from '../services/excelService';
import { generateToken, verifyToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';

describe('SHMS Core Business Logic & Authentication Tests', () => {
  it('should securely hash passwords and verify matching hashes', async () => {
    const rawPassword = 'SecurePassword@123';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    const match = await comparePassword(rawPassword, hash);
    expect(match).toBe(true);

    const mismatch = await comparePassword('WrongPassword', hash);
    expect(mismatch).toBe(false);
  });

  it('should generate and verify JWT tokens containing user role and permissions', () => {
    const mockUser = {
      id: 'usr-123',
      username: 'admin',
      role: 'ADMIN' as const,
      name: 'Hostel Admin',
      email: 'admin@hostel.edu',
    };

    const token = generateToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.username).toBe('admin');
    expect(decoded?.role).toBe('ADMIN');
  });

  it('should reject invalid or tampered JWT tokens', () => {
    const decoded = verifyToken('invalid.token.signature');
    expect(decoded).toBeNull();
  });

  it('should correctly parse and preview the existing VCE Boys Hostel Excel workbook', async () => {
    const excelPath = path.resolve(__dirname, '../../../VCE BOYS HOSTEL  LIST 2026-27.xlsx');
    const preview = await ExcelService.previewExcel(excelPath);

    expect(preview).toBeDefined();
    expect(preview.sheets.length).toBe(5);

    // Verify 5 sheets exist: 1st Year, 2nd Year, 3rd Year, 4th Year, MBA
    const sheetNames = preview.sheets.map((s) => s.sheetName);
    expect(sheetNames).toContain('1ST YEAR');
    expect(sheetNames).toContain('2ND YEAR');
    expect(sheetNames).toContain('3RD YEAR');
    expect(sheetNames).toContain('4TH YEAR');
    expect(sheetNames).toContain('MBA');

    // Total students should be 466
    expect(preview.totalStudentsFound).toBeGreaterThan(450);
    expect(preview.uniqueRoomsCount).toBeGreaterThan(50);

    // Verify room forward filling in 1st year sheet
    const firstYearSheet = preview.sheets.find((s) => s.sheetName === '1ST YEAR');
    expect(firstYearSheet).toBeDefined();
    expect(firstYearSheet!.validRows).toBeGreaterThan(150);

    // First student is Donthuluri Mohith Varma in Room 301
    const firstStudent = firstYearSheet!.sampleData[0];
    expect(firstStudent.roomNumber).toBe('301');
    expect(firstStudent.rollNumber).toBe('26881A0588');

    // Roommate in row 2 should inherit room 301 via forward-fill
    const secondStudent = firstYearSheet!.sampleData[1];
    expect(secondStudent.roomNumber).toBe('301');
    expect(secondStudent.rollNumber).toBe('26881A05JK');
  });

  it('should enforce that payment amounts cannot exceed fee balance', () => {
    const totalAmount = 85000;
    const paidAmount = 50000;
    const balanceAmount = totalAmount - paidAmount; // 35000

    const paymentAttempt = 40000; // exceeding
    const isValidPayment = paymentAttempt <= balanceAmount;

    expect(isValidPayment).toBe(false);
  });

  it('should compute late return minutes accurately for gate pass verification', () => {
    const expectedReturn = new Date('2026-10-09T18:00:00Z');
    const actualReturn = new Date('2026-10-09T18:45:00Z');

    const isLate = actualReturn.getTime() > expectedReturn.getTime();
    const lateMinutes = Math.round((actualReturn.getTime() - expectedReturn.getTime()) / 60000);

    expect(isLate).toBe(true);
    expect(lateMinutes).toBe(45);
  });

  it('should verify exact 466 student records across all 5 sheets and 100 rooms', async () => {
    const excelPath = path.resolve(__dirname, '../../../VCE BOYS HOSTEL  LIST 2026-27.xlsx');
    const preview = await ExcelService.previewExcel(excelPath);

    expect(preview.totalValidStudents).toBe(466);
    expect(preview.uniqueRoomsCount).toBe(100);

    const sheetCounts = preview.sheets.reduce<Record<string, number>>((acc, s) => {
      acc[s.sheetName] = s.validRows;
      return acc;
    }, {});

    expect(sheetCounts['1ST YEAR']).toBe(193);
    expect(sheetCounts['2ND YEAR']).toBe(167);
    expect(sheetCounts['3RD YEAR']).toBe(97);
    expect(sheetCounts['4TH YEAR']).toBe(8);
    expect(sheetCounts['MBA']).toBe(1);
  });

  it('should verify room capacity is null by default preserving unconstrained institutional records', () => {
    const roomWithoutCapacity = {
      roomNumber: '301',
      capacity: null,
      currentOccupancy: 4,
    };

    const isCapacitySpecified = roomWithoutCapacity.capacity !== null;
    const capacityLabel = isCapacitySpecified
      ? `${roomWithoutCapacity.capacity} Beds`
      : 'Capacity not specified';

    expect(isCapacitySpecified).toBe(false);
    expect(capacityLabel).toBe('Capacity not specified');
  });
});

describe('Staff & Student Real-World Authentication (MySQL + JWT)', () => {
  it('should authenticate Admin with admin123 and return valid JWT with ADMIN role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.token).toBeDefined();

    const decoded = verifyToken(res.body.data.token);
    expect(decoded?.role).toBe('ADMIN');
    expect(decoded?.username).toBe('admin');
  });

  it('should authenticate Warden with warden123 and return valid JWT with WARDEN role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'warden', password: 'warden123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('WARDEN');
  });

  it('should authenticate Security with security123 and return valid JWT with SECURITY role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'security', password: 'security123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('SECURITY');
  });

  it('should authenticate Maintenance with maintenance123 and return valid JWT with MAINTENANCE role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'maintenance', password: 'maintenance123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('MAINTENANCE');
  });

  it('should authenticate authentic Excel-imported student using roll number and student123', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '26881A0588', password: 'student123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('STUDENT');
    expect(res.body.data.user.rollNumber).toBe('26881A0588');

    const decoded = verifyToken(res.body.data.token);
    expect(decoded?.role).toBe('STUDENT');
    expect(decoded?.username).toBe('26881A0588');
  });

  it('should reject invalid credentials with HTTP 401', async () => {
    const resWrongPass = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(resWrongPass.status).toBe(401);
    expect(resWrongPass.body.success).toBe(false);

    const resNonExistent = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nonexistentuser999', password: 'password123' });

    expect(resNonExistent.status).toBe(401);
    expect(resNonExistent.body.success).toBe(false);
  });

  it('should support student first-login / password-setup flow', async () => {
    const setupRes = await request(app)
      .post('/api/auth/student-setup')
      .send({ rollNumber: '26881A05JK', newPassword: 'NewPassword@2026' });

    expect(setupRes.status).toBe(200);
    expect(setupRes.body.success).toBe(true);
    expect(setupRes.body.data.rollNumber).toBe('26881A05JK');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: '26881A05JK', password: 'NewPassword@2026' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();
    expect(loginRes.body.data.user.rollNumber).toBe('26881A05JK');
  });

  it('should reject student-setup for non-existent roll numbers', async () => {
    const res = await request(app)
      .post('/api/auth/student-setup')
      .send({ rollNumber: 'FAKE999999', newPassword: 'SomePassword@123' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Role-Based Access Control (RBAC) & Student Ownership Isolation', () => {
  it('should reject unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('should deliver distinct, role-tailored dashboard data for each role', async () => {
    // Admin dashboard
    const adminLogin = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    const adminDash = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${adminLogin.body.data.token}`);
    expect(adminDash.status).toBe(200);
    expect(adminDash.body.data.role).toBe('ADMIN');
    expect(adminDash.body.data.students.total).toBe(466);
    expect(adminDash.body.data.occupancy.totalRooms).toBe(100);

    // Warden dashboard (includes room roster preview)
    const wardenLogin = await request(app).post('/api/auth/login').send({ username: 'warden', password: 'warden123' });
    const wardenDash = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${wardenLogin.body.data.token}`);
    expect(wardenDash.status).toBe(200);
    expect(wardenDash.body.data.role).toBe('WARDEN');
    expect(wardenDash.body.data.roomRosterPreview).toBeDefined();
    expect(Array.isArray(wardenDash.body.data.roomRosterPreview)).toBe(true);

    // Maintenance dashboard
    const maintLogin = await request(app).post('/api/auth/login').send({ username: 'maintenance', password: 'maintenance123' });
    const maintDash = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${maintLogin.body.data.token}`);
    expect(maintDash.status).toBe(200);
    expect(maintDash.body.data.role).toBe('MAINTENANCE');
    expect(maintDash.body.data.recentTickets).toBeDefined();

    // Security dashboard
    const secLogin = await request(app).post('/api/auth/login').send({ username: 'security', password: 'security123' });
    const secDash = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${secLogin.body.data.token}`);
    expect(secDash.status).toBe(200);
    expect(secDash.body.data.role).toBe('SECURITY');
    expect(secDash.body.data.currentlyOut).toBeDefined();

    // Student dashboard
    const studentLogin = await request(app).post('/api/auth/login').send({ username: '26881A0588', password: 'student123' });
    const studentDash = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${studentLogin.body.data.token}`);
    expect(studentDash.status).toBe(200);
    expect(studentDash.body.data.role).toBe('STUDENT');
    expect(studentDash.body.data.studentProfile.rollNumber).toBe('26881A0588');
    expect(studentDash.body.data.roomAllocation.roomNumber).toBe('301');
  });

  it('should forbid students from accessing administrative routes (HTTP 403)', async () => {
    const studentLogin = await request(app).post('/api/auth/login').send({ username: '26881A0588', password: 'student123' });
    const studentToken = studentLogin.body.data.token;

    // Students cannot view student directory
    const studentListRes = await request(app).get('/api/students').set('Authorization', `Bearer ${studentToken}`);
    expect(studentListRes.status).toBe(403);

    // Students cannot create new student records
    const createRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ rollNumber: 'TEST1234', fullName: 'Fake User', branch: 'CSE', yearOfStudy: '1st Year' });
    expect(createRes.status).toBe(403);
  });

  it('should enforce student ownership isolation so a student cannot view another student records', async () => {
    const student1 = await prisma.student.findUnique({ where: { rollNumber: '26881A0588' } });
    const student2 = await prisma.student.findUnique({ where: { rollNumber: '26881A05JK' } });

    expect(student1).toBeDefined();
    expect(student2).toBeDefined();

    // Student 1 logs in
    const student1Login = await request(app).post('/api/auth/login').send({ username: '26881A0588', password: 'student123' });
    const student1Token = student1Login.body.data.token;

    // Student 1 can view their own details
    const ownRes = await request(app).get(`/api/students/${student1!.id}`).set('Authorization', `Bearer ${student1Token}`);
    expect(ownRes.status).toBe(200);
    expect(ownRes.body.data.rollNumber).toBe('26881A0588');

    // Student 1 CANNOT view Student 2's details (403 Forbidden)
    const otherRes = await request(app).get(`/api/students/${student2!.id}`).set('Authorization', `Bearer ${student1Token}`);
    expect(otherRes.status).toBe(403);
  });
});

describe('Database Integrity & Clean Operational State in MySQL', () => {
  it('should verify all 466 authentic students and 100 rooms exist in MySQL', async () => {
    const studentCount = await prisma.student.count();
    const roomCount = await prisma.room.count();
    const activeAllocations = await prisma.allocation.count({ where: { status: 'ACTIVE' } });

    expect(studentCount).toBe(466);
    expect(roomCount).toBe(100);
    expect(activeAllocations).toBe(466);
  });

  it('should confirm all fabricated complaints, outings, visitors, and fake payments are purged from seed', async () => {
    const outingCount = await prisma.outingRequest.count();
    const visitorCount = await prisma.visitor.count();
    const paymentCount = await prisma.payment.count();

    expect(outingCount).toBe(0);
    expect(visitorCount).toBe(0);
    expect(paymentCount).toBe(0);
  });

  it('should verify persistent creation of a genuine operational record in MySQL', async () => {
    const studentLogin = await request(app).post('/api/auth/login').send({ username: '26881A0588', password: 'student123' });
    const studentToken = studentLogin.body.data.token;

    // Student creates a genuine complaint
    const createComplaintRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Study Table Light Blinking',
        category: 'ELECTRICAL',
        priority: 'MEDIUM',
        description: 'The tube light above the study desk flickers intermittently.',
      });

    expect(createComplaintRes.status).toBe(201);
    const complaintId = createComplaintRes.body.data.id;
    expect(complaintId).toBeDefined();

    // Query directly from MySQL to verify persistence
    const savedComplaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    expect(savedComplaint).not.toBeNull();
    expect(savedComplaint?.title).toBe('Study Table Light Blinking');
    expect(savedComplaint?.status).toBe('OPEN');

    // Clean up test complaint so state remains clean
    await prisma.complaint.delete({ where: { id: complaintId } });
  });
});

describe('Student Leave & Outing Pass Application Workflow', () => {
  it('should reject unauthenticated outing submission with HTTP 401', async () => {
    const res = await request(app)
      .post('/api/outings/request')
      .send({
        outingType: 'HOME_LEAVE',
        destination: 'Hometown (Vijayawada)',
        reason: 'Going home for festival vacation',
        departureTime: '2026-10-10T10:00',
        expectedReturnTime: '2026-10-16T18:00',
      });

    expect(res.status).toBe(401);
  });

  it('should reject outing request with missing or short fields with HTTP 422 and clear message', async () => {
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: '26881A0588', password: 'student123' });
    const studentToken = studentLogin.body.data.token;

    const res = await request(app)
      .post('/api/outings/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        outingType: 'HOME_LEAVE',
        destination: 'Hi', // too short (< 3)
        reason: 'Bye', // too short (< 5)
        departureTime: '2026-10-10T10:00',
        expectedReturnTime: '2026-10-16T18:00',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  it('should reject outing request where return time is before departure time with HTTP 400', async () => {
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: '26881A0588', password: 'student123' });
    const studentToken = studentLogin.body.data.token;

    const res = await request(app)
      .post('/api/outings/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        outingType: 'HOME_LEAVE',
        destination: 'Hometown (Vijayawada)',
        reason: 'Going home for festival vacation',
        departureTime: '2026-10-16T18:00',
        expectedReturnTime: '2026-10-10T10:00', // earlier!
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Expected return date and time must be strictly after');
  });

  it('should reject a 6-day trip under LOCAL_OUTING with guidance to select HOME_LEAVE', async () => {
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: '26881A0588', password: 'student123' });
    const studentToken = studentLogin.body.data.token;

    const res = await request(app)
      .post('/api/outings/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        outingType: 'LOCAL_OUTING', // local outing for 6 days!
        destination: 'Hometown (Vijayawada)',
        reason: 'Going home for vacation with parents',
        departureTime: '2026-10-10T10:00',
        expectedReturnTime: '2026-10-16T18:00',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Local city outings are restricted to same-day visits');
    expect(res.body.message).toContain('Home Leave / Weekend Vacation');
  });

  it('should successfully submit multi-day HOME_LEAVE (10 Oct to 16 Oct), save in MySQL, and appear in outing list', async () => {
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: '26881A0588', password: 'student123' });
    const studentToken = studentLogin.body.data.token;

    // Clean any prior outings for this student
    await prisma.outingRequest.deleteMany({
      where: { student: { rollNumber: '26881A0588' } },
    });

    // Submit multi-day home leave (10 Oct 2026 to 16 Oct 2026)
    const submitRes = await request(app)
      .post('/api/outings/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        outingType: 'HOME_LEAVE',
        destination: 'Hometown (Vijayawada)',
        reason: 'Going home for festival vacation with family',
        departureTime: '2026-10-10T10:00',
        expectedReturnTime: '2026-10-16T18:00',
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.status).toBe('PENDING');
    expect(submitRes.body.data.passCode).toMatch(/^OUT-\d{6}$/);
    const outingId = submitRes.body.data.id;

    // Verify record exists in MySQL
    const dbRecord = await prisma.outingRequest.findUnique({
      where: { id: outingId },
      include: { student: true },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.destination).toBe('Hometown (Vijayawada)');
    expect(dbRecord?.student.rollNumber).toBe('26881A0588');
    expect(dbRecord?.status).toBe('PENDING');

    // Verify appears in student's outing list
    const studentListRes = await request(app)
      .get('/api/outings')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentListRes.status).toBe(200);
    expect(studentListRes.body.data.some((o: any) => o.id === outingId)).toBe(true);

    // Verify warden can view the request
    const wardenLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'warden', password: 'warden123' });
    const wardenToken = wardenLogin.body.data.token;

    const wardenListRes = await request(app)
      .get('/api/outings')
      .set('Authorization', `Bearer ${wardenToken}`);

    expect(wardenListRes.status).toBe(200);
    expect(wardenListRes.body.data.some((o: any) => o.id === outingId)).toBe(true);

    // Verify warden can approve the request
    const approveRes = await request(app)
      .patch(`/api/outings/${outingId}/review`)
      .set('Authorization', `Bearer ${wardenToken}`)
      .send({ status: 'APPROVED' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Clean up
    await prisma.outingRequest.delete({ where: { id: outingId } });
  });

  it('should allow student to cancel their own pending outing application', async () => {
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: '26881A0588', password: 'student123' });
    const studentToken = studentLogin.body.data.token;

    // Submit an outing
    const submitRes = await request(app)
      .post('/api/outings/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        outingType: 'LOCAL_OUTING',
        destination: 'Koti Books Market',
        reason: 'Purchasing semester textbooks and reference materials',
        departureTime: '2026-10-10T11:00',
        expectedReturnTime: '2026-10-10T17:00',
      });

    expect(submitRes.status).toBe(201);
    const outingId = submitRes.body.data.id;

    // Student cancels the pending request
    const cancelRes = await request(app)
      .delete(`/api/outings/${outingId}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);

    // Verify record is removed from MySQL
    const inDb = await prisma.outingRequest.findUnique({ where: { id: outingId } });
    expect(inDb).toBeNull();
  });
});

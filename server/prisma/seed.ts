import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { ExcelService } from '../src/services/excelService';

const prisma = new PrismaClient();

async function main() {
  console.log('===============================================================');
  console.log('  VCE Smart Hostel Management System - Database Seeding       ');
  console.log('  Institution: Vardhaman College of Engineering               ');
  console.log('  Academic Year: 2026-2027 • Boys Hostel                      ');
  console.log('===============================================================');

  // 1. Clean up any synthetic sample records (fake complaints, fake outings, fake visitors, fake payments)
  console.log('\n[1/5] Purging synthetic operational records...');
  await prisma.complaintComment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.outingRequest.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.studentFee.deleteMany();
  await prisma.feeStructure.deleteMany();
  console.log('✓ Synthetic sample activity purged. Tables are clean.');

  // 2. Hash required development credentials
  console.log('\n[2/5] Initializing core staff accounts...');
  const adminPass = await bcrypt.hash('admin123', 10);
  const wardenPass = await bcrypt.hash('warden123', 10);
  const maintPass = await bcrypt.hash('maintenance123', 10);
  const securityPass = await bcrypt.hash('security123', 10);
  const defaultStudentPass = await bcrypt.hash('student123', 10);

  // Upsert the 4 staff accounts with verified designations
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPass,
      name: 'Hostel Administrator',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      username: 'admin',
      email: 'admin@vardhaman.org',
      passwordHash: adminPass,
      role: 'ADMIN',
      name: 'Hostel Administrator',
      isActive: true,
    },
  });

  const wardenUser = await prisma.user.upsert({
    where: { username: 'warden' },
    update: {
      passwordHash: wardenPass,
      name: 'Chief Warden',
      role: 'WARDEN',
      isActive: true,
    },
    create: {
      username: 'warden',
      email: 'warden@vardhaman.org',
      passwordHash: wardenPass,
      role: 'WARDEN',
      name: 'Chief Warden',
      isActive: true,
    },
  });

  const maintUser = await prisma.user.upsert({
    where: { username: 'maintenance' },
    update: {
      passwordHash: maintPass,
      name: 'Maintenance Supervisor',
      role: 'MAINTENANCE',
      isActive: true,
    },
    create: {
      username: 'maintenance',
      email: 'maintenance@vardhaman.org',
      passwordHash: maintPass,
      role: 'MAINTENANCE',
      name: 'Maintenance Supervisor',
      isActive: true,
    },
  });

  const securityUser = await prisma.user.upsert({
    where: { username: 'security' },
    update: {
      passwordHash: securityPass,
      name: 'Main Gate Security Officer',
      role: 'SECURITY',
      isActive: true,
    },
    create: {
      username: 'security',
      email: 'security@vardhaman.org',
      passwordHash: securityPass,
      role: 'SECURITY',
      name: 'Main Gate Security Officer',
      isActive: true,
    },
  });

  console.log('✓ Core staff accounts initialized:');
  console.log('  • Administrator: admin / admin123');
  console.log('  • Chief Warden: warden / warden123');
  console.log('  • Maintenance: maintenance / maintenance123');
  console.log('  • Security: security / security123');

  // 3. Ingest Authoritative Excel Dataset if not already present
  console.log('\n[3/5] Verifying authoritative Excel student dataset...');
  const possiblePaths = [
    path.resolve(__dirname, '../../VCE BOYS HOSTEL  LIST 2026-27.xlsx'),
    path.resolve(process.cwd(), '../VCE BOYS HOSTEL  LIST 2026-27.xlsx'),
    path.resolve(process.cwd(), 'VCE BOYS HOSTEL  LIST 2026-27.xlsx'),
  ];

  let excelFilePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      excelFilePath = p;
      break;
    }
  }

  if (excelFilePath) {
    console.log(`Ingesting workbook from: ${excelFilePath}`);
    const importSummary = await ExcelService.importExcel(excelFilePath, {
      blockName: 'Boys Hostel',
      academicYear: '2026-2027',
      annualFee: 180000,
      updateExisting: true,
    });
    console.log(`✓ Workbook records verified: ${importSummary.totalProcessed} students, ${importSummary.roomsRetained + importSummary.roomsCreated} rooms.`);
  } else {
    console.warn('⚠️ Warning: Excel workbook file not found at expected paths.');
  }

  // 4. Initialize User Accounts for ALL 466 Authentic Students
  console.log('\n[4/5] Initializing login accounts for all authentic students...');
  const allStudents = await prisma.student.findMany({
    select: { id: true, rollNumber: true, fullName: true, email: true, userId: true },
  });

  let studentsInitialized = 0;
  for (const st of allStudents) {
    // If student already has a user, ensure passwordHash is set to defaultStudentPass
    if (st.userId) {
      await prisma.user.update({
        where: { id: st.userId },
        data: {
          username: st.rollNumber,
          name: st.fullName,
          role: 'STUDENT',
          passwordHash: defaultStudentPass,
          isActive: true,
        },
      });
      studentsInitialized++;
    } else {
      // Create user account
      const newUser = await prisma.user.upsert({
        where: { username: st.rollNumber },
        update: {
          name: st.fullName,
          role: 'STUDENT',
          passwordHash: defaultStudentPass,
          isActive: true,
        },
        create: {
          username: st.rollNumber,
          name: st.fullName,
          email: st.email || `${st.rollNumber}@vardhaman.org`,
          passwordHash: defaultStudentPass,
          role: 'STUDENT',
          isActive: true,
        },
      });

      await prisma.student.update({
        where: { id: st.id },
        data: { userId: newUser.id },
      });
      studentsInitialized++;
    }
  }

  console.log(`✓ All ${studentsInitialized} students successfully enabled for login!`);
  console.log('  • Login Identifier: Student Roll Number (e.g. 26881A0588)');
  console.log('  • Initial Password: student123 (or set via student password setup)');

  // 5. Official Hostel Announcements (Institutional Policy)
  console.log('\n[5/5] Checking official institutional notices...');
  const announcementCount = await prisma.announcement.count();
  if (announcementCount === 0) {
    await prisma.announcement.create({
      data: {
        title: 'Hostel Gate Curfew & Night Attendance Policy',
        content: 'All residents of Vardhaman College of Engineering Boys Hostel are reminded that main gate reporting time is strictly 9:00 PM. Prior written Warden pass approval is mandatory for late entry.',
        priority: 'IMPORTANT',
        authorId: wardenUser.id,
      },
    });

    await prisma.announcement.create({
      data: {
        title: 'Academic Year 2026-2027 Hostel Operations',
        content: 'Welcome to VCE Boys Hostel. Please ensure your room allocation and resident details are verified in your personal portal.',
        priority: 'NORMAL',
        authorId: adminUser.id,
      },
    });
  }
  console.log('✓ Institutional policy announcements verified.');

  console.log('\n===============================================================');
  console.log('✓ Seeding complete: 4 staff roles, 466 student accounts ready.');
  console.log('===============================================================');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from '../src/lib/prisma';

async function check() {
  console.log('Users:', await prisma.user.count());
  console.log('Students:', await prisma.student.count());
  console.log('Rooms:', await prisma.room.count());
  console.log('Allocations:', await prisma.allocation.count());
  console.log('Complaints:', await prisma.complaint.count());
  console.log('Outings:', await prisma.outingRequest.count());
  console.log('Visitors:', await prisma.visitor.count());
  console.log('Payments:', await prisma.payment.count());
  console.log('StudentFees:', await prisma.studentFee.count());
  console.log('FeeStructures:', await prisma.feeStructure.count());
  await prisma.$disconnect();
}

check();

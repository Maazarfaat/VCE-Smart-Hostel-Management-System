export type Role = 'ADMIN' | 'WARDEN' | 'STUDENT' | 'MAINTENANCE' | 'SECURITY';

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: Role;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  studentProfile?: Student | null;
}

export interface Student {
  id: string;
  userId?: string | null;
  rollNumber: string;
  fullName: string;
  branch: string;
  yearOfStudy: string;
  phone?: string | null;
  email?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  address?: string | null;
  status: 'ACTIVE' | 'VACATED' | 'SUSPENDED';
  roomAllocation?: {
    blockName: string;
    roomNumber: string;
    bedNumber: string;
    allocationDate?: string;
  } | null;
  feeSummary?: {
    paid: number;
    balance: number;
    status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  };
  allocations?: Allocation[];
  studentFees?: StudentFee[];
  complaints?: Complaint[];
  outingRequests?: OutingRequest[];
  visitors?: Visitor[];
}

export interface Block {
  id: string;
  name: string;
  description?: string;
  totalFloors: number;
  rooms?: Room[];
  _count?: { rooms: number };
}

export interface RoomResident {
  id: string;
  rollNumber: string;
  fullName: string;
  branch: string;
  yearOfStudy: string;
  phone?: string | null;
}

export interface Room {
  id: string;
  blockId: string;
  blockName?: string;
  roomNumber: string;
  floor: number;
  roomType?: string | null;
  capacity?: number | null;
  capacityLabel?: string;
  currentOccupancy: number;
  availableBeds?: number | null;
  status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE' | 'OCCUPIED';
  block?: { id: string; name: string };
  residents?: RoomResident[];
  beds?: Bed[];
}

export interface Bed {
  id: string;
  roomId: string;
  bedNumber: string;
  isOccupied: boolean;
  status: 'AVAILABLE' | 'OCCUPIED' | 'UNDER_MAINTENANCE';
  allocations?: Allocation[];
}

export interface Allocation {
  id: string;
  studentId: string;
  roomId: string;
  bedId: string;
  allocationDate: string;
  vacateDate?: string | null;
  status: 'ACTIVE' | 'VACATED' | 'TRANSFERRED';
  remarks?: string | null;
  allocatedBy?: string | null;
  room?: Room;
  bed?: Bed;
  student?: Student;
}

export interface Complaint {
  id: string;
  studentId: string;
  title: string;
  category: 'ELECTRICAL' | 'PLUMBING' | 'CARPENTRY' | 'CLEANING' | 'MASONRY' | 'INTERNET' | 'OTHER';
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; phone?: string } | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    fullName: string;
    rollNumber: string;
    branch?: string;
    allocations?: { room: { roomNumber: string }; bed: { bedNumber: string } }[];
  };
  comments?: ComplaintComment[];
}

export interface ComplaintComment {
  id: string;
  complaintId: string;
  userId: string;
  comment: string;
  createdAt: string;
  user: { id: string; name: string; role: Role };
}

export interface FeeStructure {
  id: string;
  academicYear: string;
  name: string;
  totalAmount: number;
  dueDate: string;
  yearOfStudy?: string | null;
  _count?: { studentFees: number };
}

export interface StudentFee {
  id: string;
  studentId: string;
  feeStructureId: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  dueDate: string;
  student?: Student;
  feeStructure?: FeeStructure;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  studentFeeId: string;
  studentId: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'DD';
  transactionRef?: string | null;
  remarks?: string | null;
  receivedById?: string | null;
  receivedBy?: { name: string; role: Role } | null;
  student?: Student;
  studentFee?: StudentFee;
}

export interface OutingRequest {
  id: string;
  studentId: string;
  outingType: 'LOCAL_OUTING' | 'HOME_LEAVE' | 'EMERGENCY';
  reason: string;
  destination: string;
  departureTime: string;
  expectedReturnTime: string;
  actualDepartureTime?: string | null;
  actualReturnTime?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKED_OUT' | 'COMPLETED' | 'OVERDUE';
  passCode: string;
  rejectionReason?: string | null;
  isLateReturn: boolean;
  lateMinutes: number;
  createdAt: string;
  student: {
    id: string;
    fullName: string;
    rollNumber: string;
    branch: string;
    phone?: string;
    guardianPhone?: string;
    allocations?: { room: { roomNumber: string } }[];
  };
  approvedBy?: { name: string; role: Role } | null;
  gateExitGuard?: { name: string } | null;
  gateEntryGuard?: { name: string } | null;
}

export interface Visitor {
  id: string;
  studentId: string;
  visitorName: string;
  phone: string;
  relationship: string;
  purpose: string;
  idProofType?: string | null;
  idProofNumber?: string | null;
  visitDate: string;
  inTime: string;
  outTime?: string | null;
  status: 'INSIDE' | 'CHECKED_OUT';
  remarks?: string | null;
  student: {
    id: string;
    fullName: string;
    rollNumber: string;
    branch?: string;
    allocations?: { room: { roomNumber: string } }[];
  };
  securityGuard?: { name: string } | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  targetRole?: Role | null;
  createdAt: string;
  author?: { name: string; role: Role } | null;
}

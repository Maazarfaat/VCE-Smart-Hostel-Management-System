import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Student } from '../types';
import { Badge, getStatusBadgeVariant } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Building,
  CreditCard,
  DoorOpen,
  Wrench,
  X,
  Phone,
  Mail,
  Home,
  CheckCircle,
} from 'lucide-react';

export const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Dropdown options
  const [branches, setBranches] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);

  // Modals
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Student Form
  const [newStudent, setNewStudent] = useState({
    rollNumber: '',
    fullName: '',
    branch: 'CSE',
    yearOfStudy: '1st Year',
    phone: '',
    email: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
  });

  const fetchMetadata = async () => {
    try {
      const res = await api.get('/students/metadata');
      if (res.data.success) {
        setBranches(res.data.data.branches);
        setYears(res.data.data.years);
      }
    } catch (err) {
      console.warn('Metadata fetch error', err);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (branchFilter) params.branch = branchFilter;
      if (yearFilter) params.yearOfStudy = yearFilter;

      const res = await api.get('/students', { params });
      if (res.data.success) {
        setStudents(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [page, branchFilter, yearFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleViewDetails = async (studentId: string) => {
    try {
      setStudentDetailsLoading(true);
      setIsDetailsOpen(true);
      const res = await api.get(`/students/${studentId}`);
      if (res.data.success) {
        setSelectedStudent(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching student details', err);
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/students', newStudent);
      if (res.data.success) {
        setIsAddOpen(false);
        setNewStudent({
          rollNumber: '',
          fullName: '',
          branch: 'CSE',
          yearOfStudy: '1st Year',
          phone: '',
          email: '',
          guardianName: '',
          guardianPhone: '',
          address: '',
        });
        fetchStudents();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create student');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Student Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total of {total} registered hostel residents across all academic branches and years.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Student Record
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Roll No, Name..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden"
          >
            <option value="">All Academic Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {(search || yearFilter || branchFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setYearFilter('');
                setBranchFilter('');
                setPage(1);
              }}
              className="text-xs px-2.5 py-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Branch & Cohort</th>
                <th className="py-3 px-4">Assigned Room</th>
                <th className="py-3 px-4">Residential Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {student.rollNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">
                      {student.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-semibold text-slate-800">{student.branch}</span> •{' '}
                      {student.yearOfStudy}
                    </td>
                    <td className="py-3 px-4">
                      {student.roomAllocation ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                          Room {student.roomAllocation.roomNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not Allocated</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusBadgeVariant(student.status)} size="sm">
                        {student.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewDetails(student.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing page {page} of {Math.max(1, Math.ceil(total / 15))} ({total} total students)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / 15)}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Student Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Student Profile & Hostel Dossier"
        maxWidth="2xl"
      >
        {studentDetailsLoading ? (
          <div className="py-12 text-center text-slate-400">Loading student dossier...</div>
        ) : selectedStudent ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{selectedStudent.fullName}</h4>
                <p className="text-xs text-slate-500 font-mono">
                  Roll: {selectedStudent.rollNumber} • {selectedStudent.branch} •{' '}
                  {selectedStudent.yearOfStudy}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(selectedStudent.status)}>
                {selectedStudent.status}
              </Badge>
            </div>

            {/* Room Allocation */}
            <div className="p-4 border border-slate-200 rounded-xl">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <Building className="w-4 h-4 text-indigo-600" />
                Current Room & Bed Allocation
              </h5>
              {selectedStudent.allocations?.find((a: any) => a.status === 'ACTIVE') ? (
                (() => {
                  const alloc = selectedStudent.allocations.find((a: any) => a.status === 'ACTIVE');
                  return (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400">Hostel Block:</span>
                        <p className="font-semibold text-slate-800">{alloc.room?.block?.name}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Room Allocation:</span>
                        <p className="font-semibold text-indigo-700">
                          Room {alloc.room?.roomNumber} {alloc.bed?.bedNumber ? `• Bed ${alloc.bed.bedNumber}` : ''}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Allocation Date:</span>
                        <p className="text-slate-700">
                          {new Date(alloc.allocationDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Allocated By:</span>
                        <p className="text-slate-700">{alloc.allocatedBy || 'Staff'}</p>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs text-slate-400">No active room allocated.</p>
              )}
            </div>

            {/* Fee Status */}
            <div className="p-4 border border-slate-200 rounded-xl">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Hostel Fee Record
              </h5>
              {selectedStudent.studentFees && selectedStudent.studentFees.length > 0 ? (
                <div className="space-y-2">
                  {selectedStudent.studentFees.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{f.feeStructure?.name || 'Annual Hostel Fee'}</span>
                        <p className="text-[11px] text-slate-500">
                          Total Fee: ₹{f.totalAmount.toLocaleString('en-IN')} • Paid: ₹{f.paidAmount.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(f.status)} size="sm">
                          {f.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Policy: Annual hostel fee of ₹1,80,000 paid upon joining.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No separate unverified fee dues or arrears recorded.</p>
                </div>
              )}
            </div>

            {/* Contact Details */}
            <div className="p-4 border border-slate-200 rounded-xl text-xs space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Contact & Guardian Info
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400">Phone:</span>
                  <p className="font-semibold text-slate-800">{selectedStudent.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Guardian Name:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedStudent.guardianName || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Guardian Phone:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedStudent.guardianPhone || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Address:</span>
                  <p className="text-slate-800">{selectedStudent.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add Student Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Student">
        <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Roll Number *
              </label>
              <input
                type="text"
                required
                value={newStudent.rollNumber}
                onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                placeholder="e.g. 26881A0588"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={newStudent.fullName}
                onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                placeholder="Student Name"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Branch *</label>
              <select
                value={newStudent.branch}
                onChange={(e) => setNewStudent({ ...newStudent, branch: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="CSE">CSE</option>
                <option value="CSM">CSM</option>
                <option value="CSD">CSD</option>
                <option value="IT">IT</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="CIVIL">CIVIL</option>
                <option value="MECH">MECH</option>
                <option value="MBA">MBA</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Year of Study *
              </label>
              <select
                value={newStudent.yearOfStudy}
                onChange={(e) => setNewStudent({ ...newStudent, yearOfStudy: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="MBA">MBA</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Phone</label>
              <input
                type="text"
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Guardian Phone
              </label>
              <input
                type="text"
                value={newStudent.guardianPhone}
                onChange={(e) => setNewStudent({ ...newStudent, guardianPhone: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
            >
              Save Student
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

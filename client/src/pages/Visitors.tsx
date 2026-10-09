import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Visitor } from '../types';
import { Badge, getStatusBadgeVariant } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  UserCheck,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  LogOut,
  Calendar,
} from 'lucide-react';

export const Visitors: React.FC = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Register Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newVisitor, setNewVisitor] = useState({
    studentRollNumber: '',
    visitorName: '',
    phone: '',
    relationship: 'Father',
    purpose: '',
    idProofType: 'Aadhaar Card',
    idProofNumber: '',
    remarks: '',
  });

  const [registerError, setRegisterError] = useState<string | null>(null);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/visitors', { params });
      if (res.data.success) {
        setVisitors(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching visitors', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [statusFilter]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRegisterError(null);
      const res = await api.post('/visitors', newVisitor);
      if (res.data.success) {
        setIsRegisterOpen(false);
        setNewVisitor({
          studentRollNumber: '',
          visitorName: '',
          phone: '',
          relationship: 'Father',
          purpose: '',
          idProofType: 'Aadhaar Card',
          idProofNumber: '',
          remarks: '',
        });
        fetchVisitors();
      }
    } catch (err: any) {
      setRegisterError(err.response?.data?.message || 'Failed to register visitor');
    }
  };

  const handleCheckOut = async (visitorId: string) => {
    try {
      const res = await api.patch(`/visitors/${visitorId}/checkout`);
      if (res.data.success) {
        fetchVisitors();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to check out visitor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            Visitor & Campus Guest Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log incoming parent and guardian visits, enforce visiting hours (9:00 AM - 6:30 PM), and track lounge departures.
          </p>
        </div>

        <button
          onClick={() => {
            setRegisterError(null);
            setIsRegisterOpen(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Register Guest
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchVisitors();
          }}
          className="relative w-full md:w-80"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitor or student name/roll..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:bg-white"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="">All Guests</option>
            <option value="INSIDE">Currently Inside Lounge</option>
            <option value="CHECKED_OUT">Departed</option>
          </select>
        </div>
      </div>

      {/* Visitors Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Visitor Name</th>
                <th className="py-3 px-4">Visiting Student</th>
                <th className="py-3 px-4">Relationship & Purpose</th>
                <th className="py-3 px-4">Entry Time</th>
                <th className="py-3 px-4">Departure Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading visitor records...
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No visitor logs found.
                  </td>
                </tr>
              ) : (
                visitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{v.visitorName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Phone: {v.phone}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{v.student?.fullName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {v.student?.rollNumber} • Room{' '}
                        {v.student?.allocations?.[0]?.room?.roomNumber || 'Hostel'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {v.relationship}
                      </span>
                      <span className="text-[11px] text-slate-500">{v.purpose}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {new Date(v.inTime).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {v.outTime ? (
                        new Date(v.outTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-amber-600 italic">In Lounge</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={v.status === 'INSIDE' ? 'warning' : 'success'} size="sm">
                        {v.status === 'INSIDE' ? 'Inside Lounge' : 'Departed'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {v.status === 'INSIDE' && (
                        <button
                          onClick={() => handleCheckOut(v.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Mark Departure
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Guest Modal */}
      <Modal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Register Hostel Guest / Visitor">
        {registerError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {registerError}
          </div>
        )}

        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 text-xs flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Standard visiting hours: 09:00 AM to 06:30 PM. Visits outside require special clearance.</span>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Host Student Roll Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 26881A0588"
                value={newVisitor.studentRollNumber}
                onChange={(e) =>
                  setNewVisitor({ ...newVisitor, studentRollNumber: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Visitor Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="Parent or Visitor Name"
                value={newVisitor.visitorName}
                onChange={(e) => setNewVisitor({ ...newVisitor, visitorName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Contact Phone *
              </label>
              <input
                type="text"
                required
                placeholder="10-digit mobile"
                value={newVisitor.phone}
                onChange={(e) => setNewVisitor({ ...newVisitor, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Relationship *
              </label>
              <select
                value={newVisitor.relationship}
                onChange={(e) => setNewVisitor({ ...newVisitor, relationship: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Guardian">Local Guardian</option>
                <option value="Friend">Friend / Relative</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Purpose of Visit *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Delivering study material or family visit"
              value={newVisitor.purpose}
              onChange={(e) => setNewVisitor({ ...newVisitor, purpose: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Government ID Type
              </label>
              <select
                value={newVisitor.idProofType}
                onChange={(e) => setNewVisitor({ ...newVisitor, idProofType: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="Driving License">Driving License</option>
                <option value="Voter ID">Voter ID</option>
                <option value="PAN Card">PAN Card</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                ID Proof Number
              </label>
              <input
                type="text"
                placeholder="ID document number"
                value={newVisitor.idProofNumber}
                onChange={(e) => setNewVisitor({ ...newVisitor, idProofNumber: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
            >
              Register & Check-In
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

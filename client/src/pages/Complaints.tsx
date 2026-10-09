import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Complaint, User } from '../types';
import { Badge, getStatusBadgeVariant } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  Wrench,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  UserCheck,
  Send,
} from 'lucide-react';

export const Complaints: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Maintenance staff list (for assignment)
  const [staffList, setStaffList] = useState<User[]>([]);

  // Modals
  const [isRaiseOpen, setIsRaiseOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Forms
  const [newComplaint, setNewComplaint] = useState({
    title: '',
    category: 'PLUMBING',
    priority: 'MEDIUM',
    description: '',
  });

  const [assignStaffId, setAssignStaffId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newComment, setNewComment] = useState('');

  const fetchStaff = async () => {
    if (user?.role === 'ADMIN' || user?.role === 'WARDEN') {
      try {
        const res = await api.get('/auth/users', { params: { role: 'MAINTENANCE' } });
        if (res.data.success) {
          setStaffList(res.data.data);
        }
      } catch (e) {
        console.warn('Staff fetch notice', e);
      }
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await api.get('/complaints', { params });
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchStaff();
  }, [statusFilter, categoryFilter]);

  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/complaints', newComplaint);
      if (res.data.success) {
        setIsRaiseOpen(false);
        setNewComplaint({
          title: '',
          category: 'PLUMBING',
          priority: 'MEDIUM',
          description: '',
        });
        fetchComplaints();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to raise complaint');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      const res = await api.patch(`/complaints/${selectedComplaint.id}/assign`, {
        assignedToId: assignStaffId,
      });
      if (res.data.success) {
        setIsAssignOpen(false);
        setSelectedComplaint(null);
        fetchComplaints();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign complaint');
    }
  };

  const handleUpdateStatus = async (status: string, notes?: string) => {
    if (!selectedComplaint) return;
    try {
      const res = await api.patch(`/complaints/${selectedComplaint.id}/status`, {
        status,
        resolutionNotes: notes || resolutionNotes,
      });
      if (res.data.success) {
        setIsResolveOpen(false);
        setSelectedComplaint(null);
        setResolutionNotes('');
        fetchComplaints();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAddComment = async (complaintId: string) => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/complaints/${complaintId}/comments`, {
        comment: newComment,
      });
      if (res.data.success) {
        setNewComment('');
        fetchComplaints();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post comment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            Complaints & Maintenance Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full lifecycle ticketing: raise issues, assign maintenance specialists, log repair notes, resolve, and close.
          </p>
        </div>

        <button
          onClick={() => setIsRaiseOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Raise Complaint
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="">All Categories</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="CARPENTRY">Carpentry</option>
            <option value="CLEANING">Cleaning</option>
            <option value="MASONRY">Masonry</option>
            <option value="INTERNET">Internet / Wi-Fi</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {complaints.length} tickets matching filters
        </span>
      </div>

      {/* Complaints List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Loading tickets...
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No complaints found. All facilities are operating smoothly!
          </div>
        ) : (
          complaints.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(c.status)} size="md">
                    {c.status}
                  </Badge>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {c.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      c.priority === 'URGENT'
                        ? 'bg-rose-100 text-rose-700'
                        : c.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.priority} Priority
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Raised on {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{c.description}</p>
                <div className="mt-2 text-xs text-slate-500 flex flex-wrap items-center gap-3">
                  <span>
                    Resident:{' '}
                    <strong className="text-slate-800">
                      {c.student?.fullName} ({c.student?.rollNumber})
                    </strong>
                  </span>
                  <span>
                    Room:{' '}
                    <strong className="text-indigo-600">
                      {c.student?.allocations?.[0]?.room?.roomNumber
                        ? `Room ${c.student.allocations[0].room.roomNumber}`
                        : 'Hostel Resident'}
                    </strong>
                  </span>
                  {c.assignedTo && (
                    <span>
                      Assigned To:{' '}
                      <strong className="text-slate-800 font-semibold">{c.assignedTo.name}</strong>
                    </span>
                  )}
                </div>

                {c.resolutionNotes && (
                  <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-900">
                    <strong className="text-emerald-800">Resolution Notes:</strong> {c.resolutionNotes}
                  </div>
                )}
              </div>

              {/* Action Buttons & Comments */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {/* Admin / Warden assignment */}
                  {(user?.role === 'ADMIN' || user?.role === 'WARDEN') && (
                    <button
                      onClick={() => {
                        setSelectedComplaint(c);
                        setIsAssignOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {c.assignedTo ? 'Reassign Staff' : 'Assign Staff'}
                    </button>
                  )}

                  {/* Maintenance staff or admin resolve */}
                  {(user?.role === 'MAINTENANCE' || user?.role === 'ADMIN') &&
                    c.status !== 'RESOLVED' &&
                    c.status !== 'CLOSED' && (
                      <button
                        onClick={() => {
                          setSelectedComplaint(c);
                          setIsResolveOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Mark Resolved
                      </button>
                    )}

                  {/* Student Reopen option if unsatisfied */}
                  {user?.role === 'STUDENT' && c.status === 'RESOLVED' && (
                    <button
                      onClick={() => {
                        setSelectedComplaint(c);
                        handleUpdateStatus('REOPENED', 'Reopened by student - issue persists');
                      }}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen Ticket
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{c.comments?.length || 0} comments</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Raise Complaint Modal */}
      <Modal isOpen={isRaiseOpen} onClose={() => setIsRaiseOpen(false)} title="Register Hostel Maintenance Complaint">
        <form onSubmit={handleRaiseComplaint} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Issue Summary *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Water leakage in washroom or broken switchboard"
              value={newComplaint.title}
              onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Category *</label>
              <select
                value={newComplaint.category}
                onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="CARPENTRY">Carpentry</option>
                <option value="CLEANING">Cleaning</option>
                <option value="MASONRY">Masonry</option>
                <option value="INTERNET">Internet / Wi-Fi</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Urgency *</label>
              <select
                value={newComplaint.priority}
                onChange={(e) => setNewComplaint({ ...newComplaint, priority: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Detailed Description *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Please provide specific location, symptoms, or details to assist the repair team."
              value={newComplaint.description}
              onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsRaiseOpen(false)}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
            >
              Submit Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Staff Modal */}
      <Modal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title="Assign to Maintenance Staff">
        <form onSubmit={handleAssign} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Assigning ticket: <strong>{selectedComplaint?.title}</strong>
          </p>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Select Maintenance Staff *
            </label>
            <select
              required
              value={assignStaffId}
              onChange={(e) => setAssignStaffId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">-- Choose Staff Member --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.username})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAssignOpen(false)}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
            >
              Assign Work Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Resolve Modal */}
      <Modal isOpen={isResolveOpen} onClose={() => setIsResolveOpen(false)} title="Complete Maintenance Ticket">
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Resolving ticket: <strong>{selectedComplaint?.title}</strong>
          </p>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Resolution Notes *
            </label>
            <textarea
              rows={3}
              required
              placeholder="State what repairs were performed, parts replaced, or tests executed."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsResolveOpen(false)}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus('RESOLVED')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
            >
              Confirm Resolution
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

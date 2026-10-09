import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { OutingRequest } from '../types';
import { Badge, getStatusBadgeVariant } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  DoorOpen,
  Plus,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Scan,
  Calendar,
  LogOut,
  LogIn,
  Loader2,
  X,
  Trash2,
} from 'lucide-react';

export const Outings: React.FC = () => {
  const { user } = useAuth();
  const [outings, setOutings] = useState<OutingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedOuting, setSelectedOuting] = useState<OutingRequest | null>(null);

  // Student Outing Form
  const [requestData, setRequestData] = useState({
    outingType: 'LOCAL_OUTING',
    reason: '',
    destination: '',
    departureTime: '',
    expectedReturnTime: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Warden Review Form
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Security Gate Terminal Form
  const [gatePassInput, setGatePassInput] = useState('');
  const [gateAction, setGateAction] = useState<'EXIT' | 'RETURN'>('EXIT');
  const [gateResult, setGateResult] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  const fetchOutings = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/outings', { params });
      if (res.data.success) {
        setOutings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching outings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutings();
  }, [statusFilter]);

  const handleApplyOuting = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client-side validation checks
    if (!requestData.destination.trim()) {
      setFormError('Please enter a destination.');
      return;
    }
    if (requestData.destination.trim().length < 3) {
      setFormError('Destination must be at least 3 characters.');
      return;
    }
    if (!requestData.reason.trim()) {
      setFormError('Please state the purpose / reason for your gate pass.');
      return;
    }
    if (requestData.reason.trim().length < 5) {
      setFormError('Reason must be at least 5 characters.');
      return;
    }
    if (!requestData.departureTime) {
      setFormError('Please specify your departure date and time.');
      return;
    }
    if (!requestData.expectedReturnTime) {
      setFormError('Please specify your expected return date and time.');
      return;
    }

    const dep = new Date(requestData.departureTime);
    const ret = new Date(requestData.expectedReturnTime);

    if (isNaN(dep.getTime()) || isNaN(ret.getTime())) {
      setFormError('Invalid date or time format. Please select valid dates.');
      return;
    }

    if (ret.getTime() <= dep.getTime()) {
      setFormError('Expected return date and time must be after your departure date and time.');
      return;
    }

    const durationHours = (ret.getTime() - dep.getTime()) / (1000 * 60 * 60);

    // Auto-adjust outing category if duration exceeds 24h
    let submissionData = { ...requestData };
    if (submissionData.outingType === 'LOCAL_OUTING' && durationHours > 24) {
      submissionData.outingType = 'HOME_LEAVE';
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/outings/request', submissionData);
      if (res.data.success) {
        setIsRequestOpen(false);
        setRequestData({
          outingType: 'LOCAL_OUTING',
          reason: '',
          destination: '',
          departureTime: '',
          expectedReturnTime: '',
        });
        setToast({
          type: 'success',
          message: `Gate pass request submitted successfully! Pass Code: ${res.data.data.passCode}. Awaiting warden approval.`,
        });
        fetchOutings();
      }
    } catch (err: any) {
      console.error('Outing submission error:', err);
      const errorMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to submit outing request. Please check your connection and try again.';
      setFormError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOuting = async (outingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this pending gate pass application?')) {
      return;
    }
    try {
      const res = await api.delete(`/outings/${outingId}/cancel`);
      if (res.data.success) {
        setToast({ type: 'success', message: 'Gate pass application cancelled successfully.' });
        fetchOutings();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to cancel outing request.';
      setToast({ type: 'error', message: msg });
    }
  };

  const handleReviewOuting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOuting) return;
    try {
      setIsReviewing(true);
      const res = await api.patch(`/outings/${selectedOuting.id}/review`, {
        status: reviewAction,
        rejectionReason: reviewAction === 'REJECTED' ? rejectionReason : undefined,
      });
      if (res.data.success) {
        setIsReviewOpen(false);
        setSelectedOuting(null);
        setRejectionReason('');
        setToast({
          type: 'success',
          message: `Outing request for ${selectedOuting.student?.fullName} has been ${reviewAction.toLowerCase()}.`,
        });
        fetchOutings();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to review request';
      setToast({ type: 'error', message: msg });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleGateVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatePassInput.trim()) return;
    try {
      setGateError(null);
      setGateResult(null);

      const res = await api.post('/outings/gate-verify', {
        passCode: gatePassInput.trim(),
        action: gateAction,
      });

      if (res.data.success) {
        setGateResult(res.data.message);
        setGatePassInput('');
        fetchOutings();
      }
    } catch (err: any) {
      setGateError(err.response?.data?.message || 'Gate verification failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-indigo-600" />
            Leave & Outing Gate Pass Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full gate pass protocol: student submission, warden approvals with secure pass codes, and gate exit/return verification.
          </p>
        </div>

        {user?.role === 'STUDENT' && (
          <button
            onClick={() => {
              setFormError(null);
              setIsRequestOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Apply Outing / Leave Pass
          </button>
        )}
      </div>

      {/* Global Toast Alert Banner */}
      {toast && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Security Gate Verification Terminal (Always accessible to Security & Admin) */}
      {(user?.role === 'SECURITY' || user?.role === 'ADMIN' || user?.role === 'WARDEN') && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-white">
              <Scan className="w-5 h-5 text-indigo-400" />
              Main Gate Check-In / Check-Out Terminal
            </div>
            <span className="text-xs text-slate-400 font-mono">Status: ACTIVE SCANNER</span>
          </div>

          {gateResult && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-600/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{gateResult}</span>
            </div>
          )}

          {gateError && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{gateError}</span>
            </div>
          )}

          <form onSubmit={handleGateVerify} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={gatePassInput}
                onChange={(e) => setGatePassInput(e.target.value)}
                placeholder="Enter 6-Digit Pass Code (e.g. OUT-749215) or Student Roll Number..."
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGateAction('EXIT')}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors ${
                  gateAction === 'EXIT'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LogOut className="w-4 h-4" />
                Gate Exit
              </button>
              <button
                type="button"
                onClick={() => setGateAction('RETURN')}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors ${
                  gateAction === 'RETURN'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Gate Return
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
              >
                Verify & Stamp
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved (Valid Pass)</option>
            <option value="CHECKED_OUT">Currently Outside</option>
            <option value="COMPLETED">Completed Safely</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {outings.length} pass records listed
        </span>
      </div>

      {/* Outings Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Pass Code</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Destination & Reason</th>
                <th className="py-3 px-4">Departure Time</th>
                <th className="py-3 px-4">Expected Return</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading outing records...
                  </td>
                </tr>
              ) : outings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No outing requests found.
                  </td>
                </tr>
              ) : (
                outings.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                        {o.passCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{o.student?.fullName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {o.student?.rollNumber} • {o.student?.branch}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{o.destination}</span>
                      <span className="text-[11px] text-slate-500">{o.reason}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {new Date(o.departureTime).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {new Date(o.expectedReturnTime).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {o.isLateReturn && (
                        <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                          Late by {o.lateMinutes} mins
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusBadgeVariant(o.status)} size="sm">
                        {o.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(user?.role === 'ADMIN' || user?.role === 'WARDEN') &&
                        o.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedOuting(o);
                              setReviewAction('APPROVED');
                              setIsReviewOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Review
                          </button>
                        )}
                      {user?.role === 'STUDENT' && o.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelOuting(o.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold transition-colors"
                          title="Cancel pending application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Cancel Pass
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

      {/* Apply Outing Modal */}
      <Modal
        isOpen={isRequestOpen}
        onClose={() => {
          if (!isSubmitting) {
            setFormError(null);
            setIsRequestOpen(false);
          }
        }}
        title="Apply for Leave / Outing Pass"
      >
        <form onSubmit={handleApplyOuting} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <span className="font-bold block">Application Validation Notice</span>
                <span>{formError}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Outing Category *
            </label>
            <select
              value={requestData.outingType}
              onChange={(e) => setRequestData({ ...requestData, outingType: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="LOCAL_OUTING">Local City Outing (Market / Books / Bank - Max 24h)</option>
              <option value="HOME_LEAVE">Home Leave / Weekend Vacation (Multi-day Leave)</option>
              <option value="EMERGENCY">Medical / Emergency</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">Destination *</label>
            <input
              type="text"
              required
              placeholder="e.g. Koti Books Market or Hometown (Vijayawada)"
              value={requestData.destination}
              onChange={(e) => setRequestData({ ...requestData, destination: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Purpose & Reason *
            </label>
            <textarea
              required
              rows={2}
              placeholder="State the detailed reason for your leave/outing (min 5 characters)"
              value={requestData.reason}
              onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Departure Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={requestData.departureTime}
                onChange={(e) => setRequestData({ ...requestData, departureTime: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Expected Return Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={requestData.expectedReturnTime}
                onChange={(e) =>
                  setRequestData({ ...requestData, expectedReturnTime: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Real-time Multi-day hint */}
          {requestData.departureTime && requestData.expectedReturnTime && (() => {
            const dep = new Date(requestData.departureTime);
            const ret = new Date(requestData.expectedReturnTime);
            if (!isNaN(dep.getTime()) && !isNaN(ret.getTime()) && ret > dep) {
              const hours = (ret.getTime() - dep.getTime()) / (1000 * 60 * 60);
              const days = Math.round(hours / 24);
              if (hours > 24) {
                return (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-[11px] flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0 text-indigo-600" />
                    <span>
                      Multi-day absence detected ({days > 1 ? `${days} days` : 'Overnight'}).
                      {requestData.outingType === 'LOCAL_OUTING' ? ' Will be automatically submitted as Home Leave / Vacation.' : ''}
                    </span>
                  </div>
                );
              }
            }
            return null;
          })()}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setFormError(null);
                setIsRequestOpen(false);
              }}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                'Submit Gate Pass Application'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Outing Modal (Warden) */}
      <Modal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} title="Warden Pass Approval Decision">
        <form onSubmit={handleReviewOuting} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="font-bold text-slate-900">{selectedOuting?.student?.fullName}</p>
            <p className="text-[11px] text-slate-500">
              Destination: {selectedOuting?.destination} • Reason: "{selectedOuting?.reason}"
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">Decision</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  checked={reviewAction === 'APPROVED'}
                  onChange={() => setReviewAction('APPROVED')}
                />
                <span className="font-bold text-emerald-700">Approve Pass</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  checked={reviewAction === 'REJECTED'}
                  onChange={() => setReviewAction('REJECTED')}
                />
                <span className="font-bold text-rose-700">Reject Request</span>
              </label>
            </div>
          </div>

          {reviewAction === 'REJECTED' && (
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Rejection Reason *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Curfew restrictions or pending disciplinary warning"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsReviewOpen(false)}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
            >
              Confirm Review
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

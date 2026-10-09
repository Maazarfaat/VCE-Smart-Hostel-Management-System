import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StudentFee, Payment, FeeStructure } from '../types';
import { Badge, getStatusBadgeVariant } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  Receipt,
  CreditCard,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Printer,
  DollarSign,
  Plus,
  ArrowRight,
} from 'lucide-react';

export const Fees: React.FC = () => {
  const { user } = useAuth();
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<Payment | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'DD'>('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/fees', { params });
      if (res.data.success) {
        setStudentFees(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching fees', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStructures = async () => {
    try {
      const res = await api.get('/fees/structures');
      if (res.data.success) {
        setFeeStructures(res.data.data);
      }
    } catch (err) {
      console.warn('Fee structures notice', err);
    }
  };

  useEffect(() => {
    fetchFees();
    fetchStructures();
  }, [statusFilter]);

  const handleOpenPayment = (fee: StudentFee) => {
    setSelectedFee(fee);
    setPaymentAmount(fee.balanceAmount); // default to remaining balance
    setPaymentMode('CASH');
    setTransactionRef('');
    setRemarks('');
    setPaymentError(null);
    setIsPaymentOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;

    if (paymentAmount > selectedFee.balanceAmount) {
      setPaymentError(
        `Payment amount (₹${paymentAmount.toLocaleString('en-IN')}) cannot exceed remaining balance (₹${selectedFee.balanceAmount.toLocaleString('en-IN')})`
      );
      return;
    }

    try {
      setPaymentError(null);
      const res = await api.post('/fees/payments', {
        studentFeeId: selectedFee.id,
        amount: Number(paymentAmount),
        paymentMode,
        transactionRef,
        remarks,
      });

      if (res.data.success) {
        setIsPaymentOpen(false);
        // Show receipt
        setPaymentReceipt(res.data.data.payment);
        setIsReceiptOpen(true);
        fetchFees();
      }
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || 'Payment recording failed');
    }
  };

  const handleViewReceipt = async (receiptNumber: string) => {
    try {
      const res = await api.get(`/fees/receipts/${receiptNumber}`);
      if (res.data.success) {
        setPaymentReceipt(res.data.data);
        setIsReceiptOpen(true);
      }
    } catch (err) {
      alert('Unable to load receipt details');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-600" />
            Hostel Fee Management & Receipts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track annual hostel dues, record partial or full payments, enforce zero-overpay balance rules, and issue receipts.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchFees();
          }}
          className="relative w-full md:w-80"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student roll or name..."
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
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid in Full</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="PENDING">Pending (No payment)</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Fees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Fee Structure</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid So Far</th>
                <th className="py-3 px-4">Outstanding Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading fee ledgers...
                  </td>
                </tr>
              ) : studentFees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No fee records found.
                  </td>
                </tr>
              ) : (
                studentFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">
                        {fee.student?.fullName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {fee.student?.rollNumber} • {fee.student?.branch}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <span className="font-semibold block">{fee.feeStructure?.name}</span>
                      <span className="text-[10px] text-slate-400">
                        Academic Year: {fee.feeStructure?.academicYear}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      ₹{fee.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">
                      ₹{fee.paidAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-black ${
                          fee.balanceAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        ₹{fee.balanceAmount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusBadgeVariant(fee.status)} size="sm">
                        {fee.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {user?.role === 'ADMIN' && fee.balanceAmount > 0 && (
                        <button
                          onClick={() => handleOpenPayment(fee)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Record Payment
                        </button>
                      )}

                      {fee.payments && fee.payments.length > 0 && (
                        <button
                          onClick={() => handleViewReceipt(fee.payments![0].receiptNumber)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Latest Receipt
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

      {/* Record Payment Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Record Fee Payment">
        {paymentError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {paymentError}
          </div>
        )}

        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-slate-500">Student:</p>
            <p className="font-bold text-slate-900 text-sm">{selectedFee?.student?.fullName}</p>
            <p className="text-[11px] text-slate-500 font-mono">
              Roll: {selectedFee?.student?.rollNumber} • Balance Due: ₹
              {(selectedFee?.balanceAmount ?? 0).toLocaleString('en-IN')}
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              required
              min={1}
              max={selectedFee?.balanceAmount}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              * Maximum payable: ₹{(selectedFee?.balanceAmount ?? 0).toLocaleString('en-IN')} (Cannot exceed balance)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e: any) => setPaymentMode(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="CASH">Cash Deposit</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DD">Demand Draft (DD)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Transaction / Cheque Ref
              </label>
              <input
                type="text"
                placeholder="UTR or Cheque No"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">Remarks</label>
            <input
              type="text"
              placeholder="e.g. 1st installment paid at office counter"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPaymentOpen(false)}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
            >
              Record Payment & Generate Receipt
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Printable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        payment={paymentReceipt}
      />
    </div>
  );
};

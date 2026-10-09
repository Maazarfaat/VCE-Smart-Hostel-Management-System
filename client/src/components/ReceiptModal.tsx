import React from 'react';
import { Modal } from './Modal';
import { Printer, Download, CheckCircle, Building } from 'lucide-react';
import { Payment } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
}) => {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(payment.paymentDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hostel Fee Payment Receipt" maxWidth="2xl">
      <div className="space-y-6">
        {/* Printable Receipt Container */}
        <div
          id="printable-receipt"
          className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm text-slate-800 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  VCE Boys Hostel
                </h2>
                <p className="text-xs text-slate-500">
                  Vardhaman College of Engineering Campus • Shamshabad, Hyderabad - 501218
                </p>
                <p className="text-xs text-indigo-600 font-medium">
                  Official Hostel Fee Payment Receipt
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Payment Received
              </div>
              <p className="mt-1 text-sm font-bold text-slate-800">
                Receipt #{payment.receiptNumber}
              </p>
              <p className="text-xs text-slate-500">Date: {formattedDate}</p>
            </div>
          </div>

          {/* Student Info Grid */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Student Name</p>
              <p className="font-semibold text-slate-900">{payment.student?.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Roll Number</p>
              <p className="font-semibold text-slate-900 font-mono">{payment.student?.rollNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Branch & Year</p>
              <p className="text-slate-800">
                {payment.student?.branch} • {payment.student?.yearOfStudy}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Allocated Room</p>
              <p className="text-slate-800">
                {payment.student?.allocations && payment.student.allocations.length > 0 && payment.student.allocations[0]?.room
                  ? `Room ${payment.student.allocations[0].room.roomNumber} (${payment.student.allocations[0].bed?.bedNumber || 'Bed'})`
                  : 'Hostel Resident'}
              </p>
            </div>
          </div>

          {/* Fee Itemized Breakdown */}
          <div className="py-4 border-b border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-100 pb-2">
                  <th className="text-left font-medium pb-2">Particulars</th>
                  <th className="text-left font-medium pb-2">Payment Mode</th>
                  <th className="text-right font-medium pb-2">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr>
                  <td className="py-3 font-medium text-slate-900">
                    {payment.studentFee?.feeStructure?.name || 'Annual Hostel & Mess Fee 2026-27'}
                  </td>
                  <td className="py-3 text-slate-600 font-medium">
                    {payment.paymentMode.replace('_', ' ')}
                    {payment.transactionRef && (
                      <span className="block text-xs text-slate-400 font-mono">
                        Ref: {payment.transactionRef}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right font-bold text-slate-900">
                    ₹{payment.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Balances and Signature */}
          <div className="mt-4 flex items-end justify-between">
            <div className="text-xs text-slate-500 space-y-1">
              <p>
                <strong>Outstanding Balance:</strong>{' '}
                ₹{(payment.studentFee?.balanceAmount ?? 0).toLocaleString('en-IN')}
              </p>
              {payment.remarks && (
                <p>
                  <strong>Remarks:</strong> {payment.remarks}
                </p>
              )}
              <p className="text-[10px] text-slate-400 italic">
                * This is a computer-generated receipt issued by VCE SHMS.
              </p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-slate-400 w-36 ml-auto"></div>
              <p className="mt-1 text-xs font-semibold text-slate-700">Authorized Signature</p>
              <p className="text-[11px] text-slate-500">
                {payment.receivedBy?.name || 'Chief Administrator'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </Modal>
  );
};

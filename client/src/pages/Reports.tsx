import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  BarChart3,
  BedDouble,
  Receipt,
  Wrench,
  DoorOpen,
  Printer,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Badge, getStatusBadgeVariant } from '../components/Badge';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'occupancy' | 'fees' | 'complaints' | 'gate'>('occupancy');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/${activeTab}`);
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load report data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Operational Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time hostel occupancy, fee collections, maintenance turnaround times, and gate activity.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          Print / Export Report
        </button>
      </div>

      {/* Report Category Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('occupancy')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'occupancy'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          Hostel Occupancy Report
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'fees'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Fee Collection & Dues Report
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'complaints'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Maintenance Turnaround Report
        </button>

        <button
          onClick={() => setActiveTab('gate')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'gate'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          Gate & Late Returns Report
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          Aggregating telemetry dataset...
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: OCCUPANCY REPORT */}
          {activeTab === 'occupancy' && reportData && (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Rooms</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {reportData.summary?.totalRooms || 100} Rooms
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Assigned Residents</p>
                  <p className="text-2xl font-black text-indigo-700 mt-1">
                    {reportData.summary?.totalAssignedStudents || reportData.summary?.occupiedBeds || 466}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Occupied Rooms</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    {reportData.summary?.occupiedRooms || 100} / {reportData.summary?.totalRooms || 100}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Capacity Policy</p>
                  <p className="text-sm font-bold text-slate-800 mt-2">
                    {reportData.summary?.capacitySpecified ? `${reportData.summary?.totalCapacity} Beds Configured` : 'Unconstrained per Excel'}
                  </p>
                </div>
              </div>

              {/* Floor Breakdown & Year Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-sm text-slate-800 mb-3">Floor-wise Resident Distribution</h3>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="p-2.5">Floor</th>
                        <th className="p-2.5">Rooms</th>
                        <th className="p-2.5">Occupied Rooms</th>
                        <th className="p-2.5">Assigned Residents</th>
                        <th className="p-2.5">Avg Density</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {reportData.byFloor?.map((f: any) => (
                        <tr key={f.floor}>
                          <td className="p-2.5 font-bold text-slate-800">Floor {f.floor}</td>
                          <td className="p-2.5">{f.totalRooms}</td>
                          <td className="p-2.5 text-slate-700">{f.occupiedRooms ?? f.totalRooms}</td>
                          <td className="p-2.5 text-indigo-700 font-bold">{f.assignedStudents ?? f.occupied}</td>
                          <td className="p-2.5 text-slate-600 font-mono">
                            {f.totalRooms > 0 ? ((f.assignedStudents ?? f.occupied ?? 0) / f.totalRooms).toFixed(1) : '0'} / room
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-sm text-slate-800 mb-3">
                    Academic Cohort Distribution (VCE 2026-27)
                  </h3>
                  <div className="space-y-2">
                    {reportData.byYear?.map((y: any) => (
                      <div
                        key={y.year}
                        className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
                      >
                        <span className="font-bold text-slate-800">{y.year}</span>
                        <span className="font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded border border-slate-200">
                          {y.count} Residents
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Room Breakdown Sample / Overview */}
              {reportData.rooms && reportData.rooms.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-sm text-slate-800 mb-3">
                    Hostel Rooms Roster Overview ({reportData.rooms.length} Rooms Ingested)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-80 overflow-y-auto p-1">
                    {reportData.rooms.map((r: any) => (
                      <div
                        key={r.id}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Room {r.roomNumber}</span>
                          <span className="text-[10px] text-slate-400">Fl {r.floor}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                            {r.occupantsCount} Assigned
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {r.capacity ? `${r.capacity} Beds` : 'Uncapped'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: FEE REPORT */}
          {activeTab === 'fees' && reportData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Expected</p>
                  <p className="text-xl font-black text-slate-900 mt-1">
                    ₹{(reportData.summary?.totalExpected || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Collected</p>
                  <p className="text-xl font-black text-emerald-700 mt-1">
                    ₹{(reportData.summary?.totalCollected || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Outstanding Dues</p>
                  <p className="text-xl font-black text-rose-600 mt-1">
                    ₹{(reportData.summary?.totalOutstanding || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Collection Rate</p>
                  <p className="text-xl font-black text-indigo-700 mt-1">
                    {reportData.summary?.collectionPercentage}%
                  </p>
                </div>
              </div>

              {/* Fee Dues Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-sm text-slate-800 mb-3">
                  Outstanding Dues Register ({reportData.defaultersList?.length || 0} Students with Balances)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="p-2.5">Roll Number</th>
                        <th className="p-2.5">Student Name</th>
                        <th className="p-2.5">Branch & Year</th>
                        <th className="p-2.5">Room</th>
                        <th className="p-2.5 text-right">Outstanding Due Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {reportData.defaultersList?.map((d: any) => (
                        <tr key={d.studentId}>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{d.rollNumber}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{d.fullName}</td>
                          <td className="p-2.5 text-slate-600">
                            {d.branch} • {d.yearOfStudy}
                          </td>
                          <td className="p-2.5 font-semibold text-indigo-600">Room {d.roomNumber}</td>
                          <td className="p-2.5 text-right font-black text-rose-600">
                            ₹{d.totalBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 3: COMPLAINTS REPORT */}
          {activeTab === 'complaints' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Resolved Issues</p>
                  <p className="text-3xl font-black text-emerald-700 mt-1">
                    {reportData.totalResolved || 0}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">
                    Average Resolution Turnaround
                  </p>
                  <p className="text-3xl font-black text-indigo-700 mt-1">
                    {reportData.averageResolutionHours || 0} Hours
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-sm text-slate-800 mb-3">Breakdown by Category</h3>
                  <div className="space-y-2">
                    {reportData.byCategory?.map((c: any) => (
                      <div
                        key={c.category}
                        className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
                      >
                        <span className="font-bold text-slate-800">{c.category}</span>
                        <span className="font-mono text-indigo-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                          {c.count} Tickets
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-sm text-slate-800 mb-3">Status Breakdown</h3>
                  <div className="space-y-2">
                    {reportData.byStatus?.map((s: any) => (
                      <div
                        key={s.status}
                        className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
                      >
                        <Badge variant={getStatusBadgeVariant(s.status)}>{s.status}</Badge>
                        <span className="font-mono text-slate-800 font-bold">{s.count} Tickets</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GATE & OUTINGS REPORT */}
          {activeTab === 'gate' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Gate Movements</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {reportData.outings?.total || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Late Returns Flagged</p>
                  <p className="text-2xl font-black text-rose-600 mt-1">
                    {reportData.outings?.lateReturnsCount || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Guests Checked In</p>
                  <p className="text-2xl font-black text-indigo-700 mt-1">
                    {reportData.visitors?.totalVisitorsLogged || 0}
                  </p>
                </div>
              </div>

              {/* Late Returns Log */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-sm text-slate-800 mb-3">
                  Late Return Disciplinary Infraction Log
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="p-2.5">Pass Code</th>
                        <th className="p-2.5">Student</th>
                        <th className="p-2.5">Destination</th>
                        <th className="p-2.5">Expected Return</th>
                        <th className="p-2.5">Actual Return</th>
                        <th className="p-2.5 text-right">Late Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {reportData.outings?.recentLateReturns?.map((lr: any) => (
                        <tr key={lr.id}>
                          <td className="p-2.5 font-mono font-bold text-slate-700">{lr.passCode}</td>
                          <td className="p-2.5 font-semibold text-slate-900">
                            {lr.student?.fullName} ({lr.student?.rollNumber})
                          </td>
                          <td className="p-2.5 text-slate-600">{lr.destination}</td>
                          <td className="p-2.5">
                            {new Date(lr.expectedReturnTime).toLocaleTimeString()}
                          </td>
                          <td className="p-2.5 text-rose-700 font-semibold">
                            {new Date(lr.actualReturnTime).toLocaleTimeString()}
                          </td>
                          <td className="p-2.5 text-right font-black text-rose-600">
                            +{lr.lateMinutes} mins late
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

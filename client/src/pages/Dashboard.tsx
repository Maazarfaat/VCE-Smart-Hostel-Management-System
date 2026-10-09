import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { StatCard } from '../components/StatCard';
import { Badge, getStatusBadgeVariant } from '../components/Badge';
import {
  BedDouble,
  Users,
  Wrench,
  LogOut,
  UserCheck,
  AlertTriangle,
  Building,
  CheckCircle,
  Clock,
  Megaphone,
  CreditCard,
  DoorOpen,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';

interface DashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard statistics', err);
      setError(err.response?.data?.message || 'Unable to connect to database. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-xs font-semibold text-slate-600">Loading verified hostel telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          Dashboard Sync Notice
        </h3>
        <p className="mt-1 text-xs">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700"
        >
          Retry Telemetry
        </button>
      </div>
    );
  }

  const role = user?.role || 'STUDENT';

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
            {role} Operational Dashboard
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Welcome, {user?.name}
          </h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            Vardhaman College of Engineering • Boys Hostel 2026–2027
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onNavigateTab && role === 'ADMIN' && (
            <button
              onClick={() => onNavigateTab('rooms')}
              className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <BedDouble className="w-4 h-4" />
              Manage Rooms
            </button>
          )}
          {onNavigateTab && role === 'WARDEN' && (
            <button
              onClick={() => onNavigateTab('rooms')}
              className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <BedDouble className="w-4 h-4" />
              Room Roster
            </button>
          )}
          {onNavigateTab && role === 'STUDENT' && (
            <button
              onClick={() => onNavigateTab('outings')}
              className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <DoorOpen className="w-4 h-4" />
              Apply Gate Pass
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. ADMINISTRATOR DASHBOARD                                      */}
      {/* ============================================================== */}
      {role === 'ADMIN' && stats && (
        <>
          {/* Data-backed Admin Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Registered Students"
              value={stats.students?.total || 0}
              subtitle={`${stats.students?.active || 0} Active Residents`}
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Hostel Rooms"
              value={`${stats.occupancy?.totalRooms || 100} Rooms`}
              subtitle={`${stats.occupancy?.assignedStudents || 0} Assigned Residents`}
              icon={BedDouble}
              color="emerald"
            />
            <StatCard
              title="Active Complaints"
              value={stats.operations?.totalActiveComplaints || 0}
              subtitle={`${stats.operations?.urgentComplaints || 0} Urgent • ${stats.operations?.inProgressComplaints || 0} In Progress`}
              icon={Wrench}
              color="amber"
            />
            <StatCard
              title="Students on Outing"
              value={stats.operations?.currentlyOutOutings || 0}
              subtitle={`${stats.operations?.pendingOutings || 0} Pending Approvals`}
              icon={DoorOpen}
              color="sky"
            />
          </div>

          {/* Student Breakdown by Year & Branch */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-indigo-600" />
                Student Cohort Distribution (466 Total Records)
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-2">By Academic Cohort</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.students?.byYear?.map((y: any) => (
                      <div
                        key={y.year}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2"
                      >
                        <span className="font-semibold text-slate-700">{y.year}:</span>
                        <span className="font-bold text-indigo-600 font-mono">{y.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-2">By Engineering Branch</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.students?.byBranch?.map((b: any) => (
                      <div
                        key={b.branch}
                        className="px-2.5 py-1 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs flex items-center gap-1.5"
                      >
                        <span className="font-bold text-slate-800">{b.branch}</span>
                        <span className="font-mono text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200 text-[11px]">
                          {b.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Maintenance & Announcements */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  Recent Maintenance Workorders
                </h3>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('complaints')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View All →
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {stats.recentComplaints?.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No complaints recorded in the system.
                  </div>
                ) : (
                  stats.recentComplaints?.map((c: any) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="truncate pr-3">
                        <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                        <p className="text-slate-400 text-[11px]">
                          {c.student?.fullName} ({c.student?.rollNumber}) • {c.category}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(c.status)} size="sm">
                        {c.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* 2. CHIEF WARDEN DASHBOARD                                       */}
      {/* ============================================================== */}
      {role === 'WARDEN' && stats && (
        <>
          {/* Warden Operational Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Assigned Residents"
              value={stats.occupancy?.assignedStudents || 0}
              subtitle={`${stats.occupancy?.totalRooms || 100} Rooms Allocated`}
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Room Occupancy"
              value={`${stats.occupancy?.occupiedRooms || 100} / ${stats.occupancy?.totalRooms || 100}`}
              subtitle="100% active room occupancy"
              icon={BedDouble}
              color="emerald"
            />
            <StatCard
              title="Pending Outings"
              value={stats.outings?.pendingApprovals || 0}
              subtitle="Awaiting Warden Review"
              icon={DoorOpen}
              color="amber"
            />
            <StatCard
              title="Hostel Complaints"
              value={stats.complaints?.totalActive || 0}
              subtitle={`${stats.complaints?.urgent || 0} Urgent • ${stats.complaints?.inProgress || 0} In Progress`}
              icon={Wrench}
              color="rose"
            />
          </div>

          {/* Room-Wise Occupancy Roster Preview (Dedicated Warden View) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-indigo-600" />
                  Room-Wise Resident Roster Preview
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct resident breakdown by room number. Inspect who lives in each room.
                </p>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('rooms')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  View All 100 Rooms <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {stats.roomRosterPreview?.map((r: any) => (
                <div
                  key={r.id}
                  className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                    <span className="font-bold text-slate-900">Room {r.roomNumber}</span>
                    <span className="text-[10px] text-slate-500">Floor {r.floor}</span>
                  </div>
                  <div className="text-[11px] text-indigo-700 font-semibold">
                    {r.occupancyCount} Residents Assigned
                  </div>
                  <div className="space-y-1 pt-1">
                    {r.residents?.map((resItem: any) => (
                      <div key={resItem.id} className="truncate text-[11px] text-slate-700 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] bg-white px-1 py-0.2 rounded border border-slate-200 text-slate-500">
                          {resItem.rollNumber}
                        </span>
                        <span className="truncate">{resItem.fullName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Outing Approvals & Complaints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-indigo-600" />
                  Pending Leave / Outing Requests
                </h3>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('outings')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Manage Passes →
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {stats.outings?.recentPending?.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No pending outing requests awaiting approval.
                  </div>
                ) : (
                  stats.outings?.recentPending?.map((o: any) => (
                    <div
                      key={o.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{o.student?.fullName}</span>
                        <p className="text-[11px] text-slate-500">
                          {o.student?.rollNumber} • {o.destination}
                        </p>
                      </div>
                      <Badge variant="warning" size="sm">
                        PENDING
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  Recent Hostel Maintenance Complaints
                </h3>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('complaints')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View All →
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {stats.complaints?.recentComplaints?.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No complaints recorded in the hostel.
                  </div>
                ) : (
                  stats.complaints?.recentComplaints?.map((c: any) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="truncate pr-3">
                        <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                        <p className="text-slate-400 text-[11px]">
                          {c.student?.fullName} ({c.student?.rollNumber}) • {c.category}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(c.status)} size="sm">
                        {c.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* 3. STUDENT PERSONAL DASHBOARD                                   */}
      {/* ============================================================== */}
      {role === 'STUDENT' && stats && (
        <div className="space-y-6">
          {/* Room Allocation Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Building className="w-4 h-4 text-indigo-600" />
              My Room & Residential Assignment
            </h3>

            {stats.roomAllocation ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <div>
                  <p className="text-[11px] text-slate-500 uppercase font-semibold">Assigned Room</p>
                  <p className="text-2xl font-black text-indigo-900 mt-1">
                    Room {stats.roomAllocation.roomNumber}
                  </p>
                  <p className="text-xs text-slate-500">Floor {stats.roomAllocation.floor}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase font-semibold">Room Density</p>
                  <p className="text-2xl font-black text-slate-800 mt-1 font-mono">
                    {stats.roomAllocation.occupantsCount} Residents
                  </p>
                  <p className="text-xs text-slate-500">
                    {stats.roomAllocation.capacity ? `Capacity: ${stats.roomAllocation.capacity} Beds` : 'Capacity unconstrained'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase font-semibold">Hostel Block</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {stats.roomAllocation.blockName}
                  </p>
                  <p className="text-xs text-slate-500">VCE Campus</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 uppercase font-semibold">Roommates Roster</p>
                  <div className="mt-1 space-y-1">
                    {stats.roomAllocation.roommates?.length === 0 ? (
                      <p className="text-xs text-slate-400">Single occupancy</p>
                    ) : (
                      stats.roomAllocation.roommates?.map((rm: any) => (
                        <p key={rm.id} className="text-xs font-medium text-slate-700 truncate">
                          • {rm.fullName} ({rm.branch})
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                No active room allocation assigned. Please consult the Chief Warden office.
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Hostel Fee Policy</span>
                <CreditCard className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">₹1,80,000 <span className="text-xs font-normal text-slate-500">/ year</span></div>
              <p className="text-[11px] text-slate-500 mt-0.5">Payable upon hostel admission</p>
            </div>

            <StatCard
              title="My Complaints"
              value={stats.recentComplaints?.length || 0}
              subtitle="Registered repair requests"
              icon={Wrench}
              color="indigo"
            />
            <StatCard
              title="My Gate Passes"
              value={stats.recentOutings?.length || 0}
              subtitle="Pass applications submitted"
              icon={DoorOpen}
              color="sky"
            />
          </div>

          {/* My Passes & Complaints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-indigo-600" />
                  My Recent Gate Passes
                </h3>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('outings')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View Passes →
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {stats.recentOutings?.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No outing passes requested yet.
                  </div>
                ) : (
                  stats.recentOutings?.map((o: any) => (
                    <div
                      key={o.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{o.destination}</span>
                          <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {o.passCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{o.reason}</p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(o.status)} size="sm">
                        {o.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  My Maintenance Complaints
                </h3>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('complaints')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Raise Ticket →
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {stats.recentComplaints?.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No complaints registered. Everything in order!
                  </div>
                ) : (
                  stats.recentComplaints?.map((c: any) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{c.title}</p>
                        <p className="text-[11px] text-slate-400">{c.category}</p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(c.status)} size="sm">
                        {c.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MAINTENANCE SPECIALIST DASHBOARD                             */}
      {/* ============================================================== */}
      {role === 'MAINTENANCE' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Assigned to Me"
              value={stats.assignedToMe || 0}
              subtitle="Active repair tickets"
              icon={Wrench}
              color="indigo"
            />
            <StatCard
              title="In Progress"
              value={stats.inProgressMe || 0}
              subtitle="Under active repair"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Resolved by Me"
              value={stats.resolvedMe || 0}
              subtitle="Completed repairs"
              icon={CheckCircle}
              color="emerald"
            />
            <StatCard
              title="Urgent Pool"
              value={stats.urgentTickets || 0}
              subtitle="High priority issues"
              icon={AlertTriangle}
              color="rose"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Wrench className="w-4 h-4 text-indigo-600" />
              Assigned Maintenance Workorders
            </h3>
            <div className="divide-y divide-slate-100">
              {stats.recentTickets?.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs italic">
                  No repair tickets assigned. Maintenance queue is clear.
                </div>
              ) : (
                stats.recentTickets?.map((t: any) => (
                  <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{t.title}</span>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {t.student?.fullName} ({t.student?.rollNumber}) • Room{' '}
                        {t.student?.allocations?.[0]?.room?.roomNumber || 'N/A'} • {t.category}
                      </p>
                      <p className="text-slate-600 text-xs mt-1 italic">"{t.description}"</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge variant={getStatusBadgeVariant(t.status)} size="sm">{t.status}</Badge>
                      <span className="text-[10px] font-bold text-rose-600 uppercase">
                        {t.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SECURITY GUARD DASHBOARD                                     */}
      {/* ============================================================== */}
      {role === 'SECURITY' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Students Outside"
              value={stats.currentlyOut || 0}
              subtitle="Out on approved pass"
              icon={LogOut}
              color="indigo"
            />
            <StatCard
              title="Overdue / Late"
              value={stats.overdueOutings || 0}
              subtitle="Past curfew hour"
              icon={AlertTriangle}
              color="rose"
            />
            <StatCard
              title="Visitors Inside"
              value={stats.visitorsInside || 0}
              subtitle="Guests currently in lounge"
              icon={UserCheck}
              color="amber"
            />
            <StatCard
              title="Total Today"
              value={stats.totalVisitorsToday || 0}
              subtitle="Guest entries logged today"
              icon={Users}
              color="emerald"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <DoorOpen className="w-4 h-4 text-indigo-600" />
                Active Student Gate Movements
              </h3>
              <div className="space-y-2">
                {stats.recentGateMovements?.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No student gate movements recorded today.
                  </div>
                ) : (
                  stats.recentGateMovements?.map((m: any) => (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{m.student?.fullName}</span>
                          <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                            {m.passCode}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {m.destination} • Roll: {m.student?.rollNumber}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(m.status)} size="sm">
                        {m.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Active Visitors in Hostel Lounge
              </h3>
              <div className="space-y-2">
                {stats.activeVisitorsList?.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No visitors currently logged in hostel lounge.
                  </div>
                ) : (
                  stats.activeVisitorsList?.map((v: any) => (
                    <div
                      key={v.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{v.visitorName}</span>
                        <p className="text-slate-500 text-[11px]">
                          Visiting: {v.student?.fullName} ({v.student?.rollNumber}) • {v.relationship}
                        </p>
                      </div>
                      <Badge variant="warning" size="sm">
                        INSIDE
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

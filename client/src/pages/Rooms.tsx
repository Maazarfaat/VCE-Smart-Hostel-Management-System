import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { Room, RoomResident } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  BedDouble,
  UserCheck,
  ArrowRightLeft,
  DoorClosed,
  AlertTriangle,
  Search,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  Info,
  CheckCircle,
  Users,
  Settings,
  RefreshCw,
  Phone,
  GraduationCap
} from 'lucide-react';

export const Rooms: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'WARDEN';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Filters
  const [floorFilter, setFloorFilter] = useState<string>('');
  const [densityFilter, setDensityFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isVacateOpen, setIsVacateOpen] = useState(false);
  const [isCapacityOpen, setIsCapacityOpen] = useState(false);
  const [selectedRoomForCapacity, setSelectedRoomForCapacity] = useState<Room | null>(null);

  // Forms
  const [allocateData, setAllocateData] = useState({ studentRoll: '', roomId: '', remarks: '' });
  const [transferData, setTransferData] = useState({ studentRoll: '', targetRoomId: '', remarks: '' });
  const [vacateData, setVacateData] = useState({ studentRoll: '', forceVacate: false, remarks: '' });
  const [capacityInput, setCapacityInput] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (floorFilter) params.floor = floorFilter;
      if (search) params.search = search;

      const res = await api.get('/rooms', { params });
      if (res.data.success) {
        setRooms(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching rooms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [floorFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRooms();
  };

  // Find student ID by Roll Number helper
  const getStudentByRoll = async (roll: string) => {
    const res = await api.get('/students', { params: { search: roll.trim(), limit: 1 } });
    if (res.data.success && res.data.data.length > 0) {
      return res.data.data[0];
    }
    throw new Error(`Student with Roll Number '${roll}' was not found`);
  };

  // 1. Allocate Room
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      setFormError(null);
      const student = await getStudentByRoll(allocateData.studentRoll);

      const res = await api.post('/rooms/allocate', {
        studentId: student.id,
        roomId: allocateData.roomId,
        remarks: allocateData.remarks || undefined,
      });

      if (res.data.success) {
        setFormSuccess(`Resident ${student.fullName} (${student.rollNumber}) assigned to room successfully.`);
        setIsAllocateOpen(false);
        setAllocateData({ studentRoll: '', roomId: '', remarks: '' });
        await fetchRooms();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Room allocation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Transfer Room
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      setFormError(null);
      const student = await getStudentByRoll(transferData.studentRoll);

      const res = await api.post('/rooms/transfer', {
        studentId: student.id,
        targetRoomId: transferData.targetRoomId,
        remarks: transferData.remarks || undefined,
      });

      if (res.data.success) {
        setFormSuccess(`Resident ${student.fullName} transferred to target room.`);
        setIsTransferOpen(false);
        setTransferData({ studentRoll: '', targetRoomId: '', remarks: '' });
        await fetchRooms();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Room transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Vacate Resident
  const handleVacate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      setFormError(null);
      const student = await getStudentByRoll(vacateData.studentRoll);

      const res = await api.post('/rooms/vacate', {
        studentId: student.id,
        forceVacate: vacateData.forceVacate,
        remarks: vacateData.remarks || undefined,
      });

      if (res.data.success) {
        setFormSuccess(`Resident ${student.fullName} vacated successfully.`);
        setIsVacateOpen(false);
        setVacateData({ studentRoll: '', forceVacate: false, remarks: '' });
        await fetchRooms();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Vacate operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Update Capacity
  const handleCapacitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForCapacity) return;
    setIsSubmitting(true);
    try {
      setFormError(null);
      const capacityVal = capacityInput.trim() === '' ? null : parseInt(capacityInput, 10);
      const res = await api.patch(`/rooms/${selectedRoomForCapacity.id}/capacity`, {
        capacity: capacityVal,
      });

      if (res.data.success) {
        setFormSuccess(`Capacity for Room ${selectedRoomForCapacity.roomNumber} updated.`);
        setIsCapacityOpen(false);
        setSelectedRoomForCapacity(null);
        await fetchRooms();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to update capacity');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick initiate actions from resident chips
  const initiateTransferForStudent = (roll: string) => {
    setTransferData({ studentRoll: roll, targetRoomId: '', remarks: '' });
    setFormError(null);
    setIsTransferOpen(true);
  };

  const initiateVacateForStudent = (roll: string) => {
    setVacateData({ studentRoll: roll, forceVacate: false, remarks: '' });
    setFormError(null);
    setIsVacateOpen(true);
  };

  const openCapacityModal = (room: Room) => {
    setSelectedRoomForCapacity(room);
    setCapacityInput(room.capacity ? String(room.capacity) : '');
    setFormError(null);
    setIsCapacityOpen(true);
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (densityFilter === 'all') return true;
      const count = room.residents?.length || room.currentOccupancy || 0;
      if (densityFilter === 'small') return count <= 3;
      if (densityFilter === 'four') return count === 4;
      if (densityFilter === 'large') return count >= 5;
      return true;
    });
  }, [rooms, densityFilter]);

  // Telemetry aggregates
  const totalRoomsCount = rooms.length;
  const totalResidentsCount = useMemo(() => {
    return rooms.reduce((acc, r) => acc + (r.residents?.length || r.currentOccupancy || 0), 0);
  }, [rooms]);

  const avgDensity = totalRoomsCount > 0 ? (totalResidentsCount / totalRoomsCount).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Hostel Room Management
              </h1>
              <p className="text-xs text-slate-500">
                Authoritative room allocations for VCE Boys Hostel • 2026–2027
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setFormError(null);
                setIsAllocateOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              Allocate Resident
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setIsTransferOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transfer Room
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setIsVacateOpen(true);
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <DoorClosed className="w-4 h-4" />
              Vacate Resident
            </button>
          </div>
        )}
      </div>

      {/* Banner / Notice */}
      {formSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{formSuccess}</span>
          </div>
          <button
            onClick={() => setFormSuccess(null)}
            className="text-emerald-700 font-bold hover:text-emerald-900 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* High-Level Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Rooms</span>
            <BedDouble className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalRoomsCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Across all 4 floors</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Assigned Residents</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalResidentsCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Active resident allocations</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Density</span>
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{avgDensity} <span className="text-xs font-normal text-slate-500">/ room</span></div>
          <p className="text-[11px] text-slate-500 mt-0.5">Range: 2 to 7 residents</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Capacity Policy</span>
            <Info className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">Authoritative Data</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Excel defines assigned occupants</p>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room #, student name, roll #..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-500 transition-colors"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        </form>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden"
          >
            <option value="">All Floors</option>
            <option value="1">1st Floor</option>
            <option value="2">2nd Floor</option>
            <option value="3">3rd Floor</option>
            <option value="4">4th Floor</option>
          </select>

          <select
            value={densityFilter}
            onChange={(e) => setDensityFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Room Sizes</option>
            <option value="small">2–3 Occupants</option>
            <option value="four">4 Occupants (Standard)</option>
            <option value="large">5–7 Occupants</option>
          </select>

          <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Dense Table View"
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => fetchRooms()}
            title="Refresh Room List"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          Loading hostel rooms and active resident records...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 text-xs">
          No rooms found matching your current filter criteria.
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const residents = room.residents || [];
            const occupancyCount = residents.length;
            const hasCapacity = room.capacity !== null && room.capacity !== undefined;

            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Floor {room.floor} • {room.blockName || 'Boys Hostel'}
                      </span>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        Room {room.roomNumber}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant="primary" size="sm">
                        {occupancyCount} {occupancyCount === 1 ? 'Resident' : 'Residents'}
                      </Badge>
                      {canManage && (
                        <button
                          onClick={() => openCapacityModal(room)}
                          title="Configure Capacity"
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Residents List */}
                  <div className="mt-3 space-y-2">
                    {residents.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-400 text-xs italic">
                        No active residents assigned to this room
                      </div>
                    ) : (
                      residents.map((resItem) => (
                        <div
                          key={resItem.id}
                          className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 text-xs flex items-center justify-between transition-colors group"
                        >
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 truncate">
                                {resItem.fullName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100">
                                {resItem.rollNumber}
                              </span>
                              <span>• {resItem.branch}</span>
                              {resItem.yearOfStudy && <span>• {resItem.yearOfStudy}</span>}
                            </div>
                          </div>

                          {canManage && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => initiateTransferForStudent(resItem.rollNumber)}
                                title="Transfer to another room"
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => initiateVacateForStudent(resItem.rollNumber)}
                                title="Vacate resident"
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                              >
                                <DoorClosed className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer status */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Capacity:{' '}
                    <strong className="text-slate-700">
                      {hasCapacity ? `${room.capacity} Beds` : 'Capacity not specified'}
                    </strong>
                  </span>
                  <span className="font-medium text-slate-400">
                    {occupancyCount} Assigned
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Room #</th>
                  <th className="py-3 px-4">Floor</th>
                  <th className="py-3 px-4">Occupants Count</th>
                  <th className="py-3 px-4">Official Capacity</th>
                  <th className="py-3 px-4">Resident Roster (Roll & Name)</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRooms.map((room) => {
                  const residents = room.residents || [];
                  const occupancyCount = residents.length;
                  const hasCapacity = room.capacity !== null && room.capacity !== undefined;

                  return (
                    <tr key={room.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        Room {room.roomNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        Floor {room.floor}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="primary" size="sm">
                          {occupancyCount} Students
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {hasCapacity ? `${room.capacity} Beds` : (
                          <span className="text-slate-400 italic">Capacity not specified</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {residents.map((r) => (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono text-[11px] border border-slate-200/60"
                              title={`${r.fullName} • ${r.branch}`}
                            >
                              <strong>{r.rollNumber}</strong>: {r.fullName.split(' ')[0]} ({r.branch})
                            </span>
                          ))}
                        </div>
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => openCapacityModal(room)}
                            className="px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors"
                          >
                            Set Capacity
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. ALLOCATE MODAL */}
      <Modal
        isOpen={isAllocateOpen}
        onClose={() => setIsAllocateOpen(false)}
        title="Allocate Student to Room"
      >
        {formError && (
          <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleAllocate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Student Roll Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 26881A0588"
              value={allocateData.studentRoll}
              onChange={(e) => setAllocateData({ ...allocateData, studentRoll: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Must match an authentic student roll number in the college registry.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Select Target Room *
            </label>
            <select
              required
              value={allocateData.roomId}
              onChange={(e) => setAllocateData({ ...allocateData, roomId: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">-- Choose Room --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} (Floor {r.floor} • Current: {r.residents?.length || 0} residents)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Regular academic year 2026-27 allocation"
              value={allocateData.remarks}
              onChange={(e) => setAllocateData({ ...allocateData, remarks: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAllocateOpen(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? 'Allocating...' : 'Confirm Allocation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. TRANSFER MODAL */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Resident to Another Room"
      >
        {formError && (
          <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleTransfer} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Resident Roll Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 26881A0588"
              value={transferData.studentRoll}
              onChange={(e) => setTransferData({ ...transferData, studentRoll: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Select Destination Room *
            </label>
            <select
              required
              value={transferData.targetRoomId}
              onChange={(e) => setTransferData({ ...transferData, targetRoomId: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">-- Choose New Destination Room --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} (Floor {r.floor} • Current: {r.residents?.length || 0} residents)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Reason for Room Transfer
            </label>
            <input
              type="text"
              placeholder="e.g. Mutual swap / Year realignment request"
              value={transferData.remarks}
              onChange={(e) => setTransferData({ ...transferData, remarks: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransferOpen(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? 'Transferring...' : 'Execute Room Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. VACATE MODAL */}
      <Modal
        isOpen={isVacateOpen}
        onClose={() => setIsVacateOpen(false)}
        title="Vacate Resident"
      >
        {formError && (
          <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleVacate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Resident Roll Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 26881A0588"
              value={vacateData.studentRoll}
              onChange={(e) => setVacateData({ ...vacateData, studentRoll: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The system automatically audits pending dues and active keys prior to checkout.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Checkout / Vacate Reason
            </label>
            <input
              type="text"
              placeholder="e.g. End of semester / Day scholar withdrawal"
              value={vacateData.remarks}
              onChange={(e) => setVacateData({ ...vacateData, remarks: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">Fee Clearance Guard</p>
              <p className="mt-0.5">
                Students with pending fee balances cannot be vacated without explicit administrator override.
              </p>
              {user?.role === 'ADMIN' && (
                <label className="flex items-center gap-2 mt-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vacateData.forceVacate}
                    onChange={(e) => setVacateData({ ...vacateData, forceVacate: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Administrator Override (Force Vacate with Pending Balance)</span>
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsVacateOpen(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Vacate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. SET CAPACITY MODAL */}
      <Modal
        isOpen={isCapacityOpen}
        onClose={() => {
          setIsCapacityOpen(false);
          setSelectedRoomForCapacity(null);
        }}
        title={`Set Capacity for Room ${selectedRoomForCapacity?.roomNumber || ''}`}
      >
        {formError && (
          <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleCapacitySubmit} className="space-y-4 text-xs">
          <div>
            <p className="text-slate-600 mb-3">
              Per college institutional records, room capacity is unconstrained unless officially defined.
              Leave empty to preserve <em>"Capacity not specified"</em>.
            </p>
            <label className="block font-semibold text-slate-700 uppercase mb-1">
              Official Bed Capacity (1 to 12)
            </label>
            <input
              type="number"
              min="1"
              max="12"
              placeholder="Leave blank for unspecified"
              value={capacityInput}
              onChange={(e) => setCapacityInput(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsCapacityOpen(false);
                setSelectedRoomForCapacity(null);
              }}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save Capacity'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

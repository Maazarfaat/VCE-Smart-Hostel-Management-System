import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { User, Role } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ShieldCheck, Plus, CheckCircle, XCircle, Search, UserX, UserCheck } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'WARDEN' as Role,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/auth/users', { params });
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleToggleStatus = async (userId: string) => {
    try {
      const res = await api.patch(`/auth/users/${userId}/toggle-status`);
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await api.post('/auth/users', newUser);
      if (res.data.success) {
        setIsAddOpen(false);
        setNewUser({
          username: '',
          name: '',
          email: '',
          phone: '',
          password: '',
          role: 'WARDEN',
        });
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            User & Staff Administration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer system access roles: Hostel Administrators, Wardens, Maintenance Crew, and Gate Security Guards.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create User Account
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Hostel Administrator</option>
          <option value="WARDEN">Chief Warden</option>
          <option value="MAINTENANCE">Maintenance Staff</option>
          <option value="SECURITY">Security Guard</option>
          <option value="STUDENT">Student Resident</option>
        </select>

        <span className="text-xs text-slate-500 font-medium">{users.length} accounts listed</span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Email / Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{u.username}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{u.name}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.email || u.phone ? `${u.email || ''} ${u.phone || ''}` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.isActive ? 'success' : 'danger'} size="sm">
                        {u.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          u.isActive
                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create System User Account">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. warden_hostel"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Initial Password *
              </label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="Staff Member Name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Role *</label>
              <select
                value={newUser.role}
                onChange={(e: any) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="WARDEN">Chief Warden</option>
                <option value="MAINTENANCE">Maintenance Staff</option>
                <option value="SECURITY">Security Guard</option>
                <option value="ADMIN">Hostel Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Email</label>
              <input
                type="email"
                placeholder="staff@vce.edu"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase mb-1">Phone</label>
              <input
                type="text"
                placeholder="10-digit mobile"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
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
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

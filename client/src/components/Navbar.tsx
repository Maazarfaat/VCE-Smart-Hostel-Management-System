import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Building2 } from 'lucide-react';
import { Role } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const roleColors: Record<Role, string> = {
    ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    WARDEN: 'bg-purple-50 text-purple-700 border-purple-200',
    STUDENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
    SECURITY: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-6 shadow-xs">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            VCE Smart Hostel <span className="text-indigo-600 font-extrabold">SHMS</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            Vardhaman College of Engineering • Boys Hostel 2026-27
          </p>
        </div>
      </div>

      {/* Authenticated User Actions */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    roleColors[user.role]
                  }`}
                >
                  {user.role}
                </span>
                {user.studentProfile?.rollNumber && (
                  <span className="text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                    {user.studentProfile.rollNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
              {user.name.charAt(0)}
            </div>

            <button
              onClick={logout}
              title="Logout session"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

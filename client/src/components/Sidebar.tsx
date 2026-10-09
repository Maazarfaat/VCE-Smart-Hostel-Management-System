import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  BedDouble,
  Wrench,
  Receipt,
  LogOut as OutingIcon,
  UserCheck,
  BarChart3,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { user } = useAuth();
  const userRole = user?.role || 'STUDENT';

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE', 'SECURITY'],
    },
    {
      id: 'students',
      label: 'Student Directory',
      icon: Users,
      roles: ['ADMIN', 'WARDEN', 'SECURITY'],
    },
    {
      id: 'excel',
      label: 'Excel Data Import',
      icon: FileSpreadsheet,
      roles: ['ADMIN'],
    },
    {
      id: 'rooms',
      label: 'Hostel Rooms & Allocations',
      icon: BedDouble,
      roles: ['ADMIN', 'WARDEN'],
    },
    {
      id: 'complaints',
      label: 'Complaints & Maintenance',
      icon: Wrench,
      roles: ['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE'],
    },
    {
      id: 'fees',
      label: 'Hostel Fee Records',
      icon: Receipt,
      roles: ['ADMIN'],
    },
    {
      id: 'outings',
      label: userRole === 'SECURITY' ? 'Gate Pass Terminal' : 'Leave & Outings',
      icon: OutingIcon,
      roles: ['ADMIN', 'WARDEN', 'STUDENT', 'SECURITY'],
    },
    {
      id: 'visitors',
      label: 'Visitor Management',
      icon: UserCheck,
      roles: ['ADMIN', 'WARDEN', 'SECURITY'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['ADMIN', 'WARDEN'],
    },
    {
      id: 'users',
      label: 'User Administration',
      icon: ShieldAlert,
      roles: ['ADMIN'],
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Main Navigation
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Role specific quick badge info */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>Active Role:</span>
          <span className="font-semibold text-indigo-400">{userRole}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
          {userRole === 'ADMIN' && 'Full system control & Excel data ingestion.'}
          {userRole === 'WARDEN' && 'Hostel oversight, outing approvals, & allocations.'}
          {userRole === 'STUDENT' && 'Hostel resident profile, gate passes, & fees.'}
          {userRole === 'MAINTENANCE' && 'Hostel repair workorders & ticket resolution.'}
          {userRole === 'SECURITY' && 'Main gate check-in/out & visitor registers.'}
        </p>
      </div>
    </aside>
  );
};

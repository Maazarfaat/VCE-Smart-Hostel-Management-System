import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { ExcelImport } from './pages/ExcelImport';
import { Rooms } from './pages/Rooms';
import { Complaints } from './pages/Complaints';
import { Fees } from './pages/Fees';
import { Outings } from './pages/Outings';
import { Visitors } from './pages/Visitors';
import { Reports } from './pages/Reports';
import { UsersPage } from './pages/Users';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Reset to dashboard on user change / login
  useEffect(() => {
    setCurrentTab('dashboard');
  }, [user?.id, user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-semibold tracking-wider uppercase text-indigo-300">
          Initializing Smart Hostel Management System...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Strict role permissions mapping
  const rolePermissions: Record<string, string[]> = {
    ADMIN: ['dashboard', 'students', 'excel', 'rooms', 'complaints', 'fees', 'outings', 'visitors', 'reports', 'users'],
    WARDEN: ['dashboard', 'rooms', 'students', 'complaints', 'outings', 'visitors', 'reports'],
    STUDENT: ['dashboard', 'complaints', 'outings'],
    MAINTENANCE: ['dashboard', 'complaints'],
    SECURITY: ['dashboard', 'outings', 'visitors', 'students'],
  };

  const allowedTabs = rolePermissions[user.role] || ['dashboard'];
  const activeTab = allowedTabs.includes(currentTab) ? currentTab : 'dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar currentTab={activeTab} onTabChange={setCurrentTab} />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === 'dashboard' && <Dashboard onNavigateTab={setCurrentTab} />}
          {activeTab === 'students' && <Students />}
          {activeTab === 'excel' && <ExcelImport onNavigateTab={setCurrentTab} />}
          {activeTab === 'rooms' && <Rooms />}
          {activeTab === 'complaints' && <Complaints />}
          {activeTab === 'fees' && <Fees />}
          {activeTab === 'outings' && <Outings />}
          {activeTab === 'visitors' && <Visitors />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'users' && <UsersPage />}
        </main>
      </div>
    </div>
  );
};

export default App;

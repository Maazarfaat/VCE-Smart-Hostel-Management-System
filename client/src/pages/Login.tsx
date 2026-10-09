import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Building2,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // First-time Student Password Setup Modal State
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupRoll, setSetupRoll] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  // Development notes collapsible
  const [showDevNotes, setShowDevNotes] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both your username or roll number and password.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSetupSuccess(null);

    if (!setupRoll.trim()) {
      setSetupError('Please enter your official student roll number.');
      return;
    }

    if (setupPassword.length < 6) {
      setSetupError('New password must be at least 6 characters in length.');
      return;
    }

    if (setupPassword !== setupConfirm) {
      setSetupError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setSetupLoading(true);
      const res = await api.post('/auth/student-setup', {
        rollNumber: setupRoll.trim(),
        newPassword: setupPassword,
      });

      if (res.data.success) {
        setSetupSuccess(res.data.message || 'Password established successfully. You can now log in.');
        setUsername(setupRoll.trim());
        setPassword('');
        setTimeout(() => {
          setIsSetupOpen(false);
          setSetupRoll('');
          setSetupPassword('');
          setSetupConfirm('');
          setSetupSuccess(null);
        }, 2000);
      }
    } catch (err: any) {
      setSetupError(err.response?.data?.message || err.message || 'Failed to establish password.');
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      {/* Institutional Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Vardhaman College of Engineering
        </h1>
        <h2 className="text-lg font-bold text-indigo-300 mt-0.5">
          Smart Hostel Management System (SHMS)
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Official Resident & Operations Portal • Boys Hostel 2026–2027
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Username or Roll Number
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, warden, or 26881A0588"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsSetupOpen(true)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                >
                  Student First-Time Login?
                </button>
              </div>
              <div className="mt-1.5 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Development Credentials Reference */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDevNotes(!showDevNotes)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              <span>Development Login Reference</span>
              <span>{showDevNotes ? '▲' : '▼'}</span>
            </button>

            {showDevNotes && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5 font-mono">
                <p className="font-sans font-semibold text-slate-700 mb-1">
                  Required Local Development Credentials:
                </p>
                <div className="flex justify-between">
                  <span className="text-slate-500">Administrator:</span>
                  <span className="font-bold text-indigo-700">admin / admin123</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chief Warden:</span>
                  <span className="font-bold text-indigo-700">warden / warden123</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Maintenance:</span>
                  <span className="font-bold text-indigo-700">maintenance / maintenance123</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Security Gate:</span>
                  <span className="font-bold text-indigo-700">security / security123</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Student Residents (466):</span>
                  <span className="font-bold text-emerald-700">[Roll No] / student123</span>
                </div>
                <p className="font-sans text-[10px] text-amber-700 mt-1">
                  * For local development only. Change credentials before production deployment.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student First-Time Setup Modal */}
      {isSetupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Password Setup</h3>
                <p className="text-xs text-slate-500">Establish your resident portal password</p>
              </div>
            </div>

            {setupError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{setupError}</span>
              </div>
            )}

            {setupSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{setupSuccess}</span>
              </div>
            )}

            <form onSubmit={handleStudentSetupSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Official Student Roll Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 26881A0588"
                  value={setupRoll}
                  onChange={(e) => setSetupRoll(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Must match your roll number in the Excel college registry.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter your password"
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSetupOpen(false);
                    setSetupError(null);
                    setSetupSuccess(null);
                  }}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={setupLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs disabled:opacity-60"
                >
                  {setupLoading ? 'Saving...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

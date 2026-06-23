
import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { changePassword } from '../lib/firebase';

const AccountSettings: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error("Password change failed:", err);
      if (err.code === 'auth/requires-recent-login') {
        setError("For security reasons, you must log in again to change your password.");
      } else {
        setError(err.message || "Failed to update password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <KeyRound className="text-sky-600" />
          Account Security
        </h1>
        <p className="text-slate-500 mt-2">Manage your login credentials and password</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-semibold text-slate-700">Change Password</h2>
        </div>
        
        <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
              <ShieldAlert size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>Password successfully updated!</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 text-sm">
        <p className="font-semibold mb-1">Security Reminder:</p>
        <p>Changing your password will update your credentials for this @kfupm.edu.sa account. Make sure to use a strong, unique password.</p>
      </div>
    </div>
  );
};

export default AccountSettings;

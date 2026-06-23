
import React, { useState } from 'react';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCog, User } from 'lucide-react';
import { loginAnonymously, loginWithEmail } from '../lib/firebase';

interface LoginProps {
  onLogin: (role: UserRole, studentId?: string, username?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');
      await sendPasswordResetEmail(auth, resetEmail.toLowerCase().trim());
      setResetSent(true);
    } catch (err: any) {
      console.error("Reset failed:", err);
      if (err.code === 'auth/admin-restricted-operation') {
        setError("Configuration Error: Password reset is currently disabled because Email/Password login is not enabled in your Firebase console. \n\nPlease enable 'Email/Password' in the Firebase Console > Authentication > Sign-in method.");
      } else {
        setError(`Could not send reset email: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setError(null);
    if (role === UserRole.STUDENT) {
      handleStudentLogin();
    } else {
      setStaffRole(role);
    }
  };

  const handleStudentLogin = async () => {
    setError(null);
    if (!studentId) {
      setError('Please enter a Student ID (e.g., 20231001)');
      return;
    }
    
    setLoading(true);
    try {
      // For frictionless student access, we attempt anonymous login in background
      // but we proceed even if it's slow. If it fails, they might see limited data
      // based on Firestore rules, but we respect the "no login" request.
      try {
        await loginAnonymously();
      } catch (e) {
        console.warn("Anonymous login failed, proceeding with local access:", e);
      }
      
      onLogin(UserRole.STUDENT, studentId, studentId);
      navigate('/student');
    } catch (err) {
      console.error("Login failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate credentials against KFUPM requirements provided by user
    const isRegistrar = staffRole === UserRole.REGISTRAR;
    const registrarEmails = ["asma.hajri@kfupm.edu.sa", "faisal.rustom@kfupm.edu.sa", "snoman@kfupm.edu.sa", "alqahtani@kfupm.edu.sa"];
    const prepEmails = ["maha.qathan@kfupm.edu.sa", "faisal.rustom@kfupm.edu.sa", "asma.hajri@kfupm.edu.sa","alqahtani@kfupm.edu.sa"];
    const allowedEmails = isRegistrar ? registrarEmails : prepEmails;

    const rawUser = username.toLowerCase().trim();
    // Support typing either the username 'asma.hajri' or the full email
    const loginEmail = rawUser.includes('@') ? rawUser : `${rawUser}@kfupm.edu.sa`;

    if (!allowedEmails.includes(loginEmail)) {
      setError("Incorrect password or email, please try again");
      return;
    }

    setLoading(true);
    try {
      // Attempt Firebase Authentication using Email/Password
      await loginWithEmail(loginEmail, password);
      
      // Determine display name for logs
      let displayName = username;
      if (loginEmail === "asma.hajri@kfupm.edu.sa") displayName = "Asma Alhajri";
      else if (loginEmail === "faisal.rustom@kfupm.edu.sa") displayName = "Faisal Rustom";
      else if (loginEmail === "maha.qathan@kfupm.edu.sa") displayName = "Maha Qathan";
      else if (loginEmail === "snoman@kfupm.edu.sa") displayName = "Syed Mubasher Noman";
      else if (loginEmail === "alqahtani@kfupm.edu.sa") displayName = "Khaled Al-Qahtani";

      onLogin(staffRole!, undefined, displayName);
      navigate(isRegistrar ? '/registrar' : '/prep');
    } catch (err: any) {
      const isExpectedError = 
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/weak-password' ||
        err.code === 'auth/too-many-requests';
      
      if (!isExpectedError) {
        console.error("Login failed:", err);
      } else {
        console.warn("Expected login failure, user provided incorrect credentials:", err.code);
      }
      
      if (err.code === 'auth/admin-restricted-operation') {
        setError("Configuration Error: Email/Password login is currently disabled in your Firebase console. \n\nPlease go to the Firebase Console > Authentication > Sign-in method and enable 'Email/Password' to allow staff login.");
      } else if (err.code === 'auth/weak-password') {
        setError("Incorrect password or email, please try again");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Incorrect password or email, please try again");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please wait a few minutes before trying again.");
      } else {
        setError(`Authentication error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-200">
            <span className="text-2xl font-bold text-white">PYP</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Registration Management</h1>
          <p className="text-slate-500 mt-2">Centralized portal for students and staff</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200 p-8 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}
          {!staffRole ? (
            <>
              <div className="space-y-4">
                <button
                  onClick={() => handleRoleSelect(UserRole.REGISTRAR)}
                  className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white text-sky-600 transition-colors">
                    <ShieldCheck />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900">Registrar Office</div>
                    <div className="text-sm text-slate-500">Login as Registrar</div>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect(UserRole.PREP_DEPT)}
                  className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white text-amber-600 transition-colors">
                    <UserCog />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900">Prep Department</div>
                    <div className="text-sm text-slate-500">Login as Prep Dept</div>
                  </div>
                </button>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-400">Student Access</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="20231001"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleStudentLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <User size={20} />
                  )}
                  {loading ? 'Processing...' : 'View My Status'}
                </button>
              </div>
            </>
          ) : !forgotPassword ? (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setStaffRole(null);
                    setError(null);
                  }}
                  className="text-xs text-sky-600 font-medium hover:underline"
                >
                  ← Back to role selection
                </button>
              </div>
              
              <h2 className="text-lg font-bold text-slate-900 mb-4 capitalize">
                {staffRole === UserRole.REGISTRAR ? 'Registrar' : 'Prep Dept'} Login
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setForgotPassword(true);
                      setResetEmail(username);
                    }}
                    className="text-xs text-sky-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 p-4 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors font-semibold disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Login'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Reset Password</h2>
              {resetSent ? (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm border border-emerald-100">
                  <p className="mb-2 font-medium">Reset link sent!</p>
                  A password reset link has been sent to <strong>{resetEmail}</strong>. Please check your inbox and follow the instructions.
                  <button 
                    onClick={() => {
                      setForgotPassword(false);
                      setResetSent(false);
                    }}
                    className="block mt-4 text-sky-600 font-bold hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <p className="text-sm text-slate-500">Enter your KFUPM email address and we'll send you a link to reset your password.</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@kfupm.edu.sa"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full p-4 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors font-semibold disabled:opacity-50"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotPassword(false)}
                      className="w-full p-3 text-slate-500 text-sm hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-8">
          Protected by KFUPM Authentication System • v1.0.2
        </p>
      </div>
    </div>
  );
};

export default Login;

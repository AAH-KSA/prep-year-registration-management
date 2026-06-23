
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, Student, ScheduleRequest, AuthState, ActivityLog } from './types';
import { MOCK_INITIAL_STUDENTS } from './constants';
import Login from './pages/Login';
import RegistrarDashboard from './pages/RegistrarDashboard';
import PrepDashboard from './pages/PrepDashboard';
import StudentPortal from './pages/StudentPortal';
import AccountSettings from './pages/AccountSettings';
import { Layout } from './components/Layout';
import { auth as firebaseAuth, dbConnectionPromise } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  subscribeToStudents, 
  subscribeToRequests, 
  subscribeToLogs, 
  saveStudent, 
  saveRequest, 
  saveLog,
  bulkSaveStudents,
  bulkSaveLogs,
  deleteAllStudents,
  deleteAllRequests,
  deleteAllLogs,
  migrateInitialData 
} from './services/firebaseService';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('pyp_auth');
    return saved ? JSON.parse(saved) : { role: null };
  });

  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    dbConnectionPromise.then(() => {
      setDbReady(true);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      setAuthInitialized(true);
      
      if (!user && auth.role && auth.role !== UserRole.STUDENT) {
        setAuth({ role: null });
      }
    });
    return () => unsubscribe();
  }, [auth.role]);

  useEffect(() => {
    localStorage.setItem('pyp_auth', JSON.stringify(auth));
  }, [auth]);

  // Firebase Real-time Subscriptions - Only run when authenticated (or for students if rules allow) and DB is ready
  useEffect(() => {
    if (!dbReady) return;
    // If it's a student, we try to subscribe even without firebaseUser (in case they are anonymous or rules are relaxed)
    // If it's a staff member, we definitely need firebaseUser
    if (!firebaseUser && auth.role !== UserRole.STUDENT) return;
    if (auth.role === null) return;

    const unsubStudents = subscribeToStudents(setStudents);
    const unsubRequests = subscribeToRequests(setRequests);
    const unsubLogs = subscribeToLogs(setLogs);

    // Initial migration (one-time if DB is empty) - only as staff
    if (firebaseUser && (auth.role === UserRole.REGISTRAR || auth.role === UserRole.PREP_DEPT)) {
      migrateInitialData(MOCK_INITIAL_STUDENTS);
    }

    return () => {
      unsubStudents();
      unsubRequests();
      unsubLogs();
    };
  }, [dbReady, firebaseUser, auth.role]);

  const handleLogout = () => {
    setAuth({ role: null });
  };

  const addLog = async (type: ActivityLog['type'], description: string, actor: string, studentId?: string, studentName?: string) => {
    const displayName = auth.username ? `${auth.username} (${actor})` : actor;
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      description,
      studentId,
      studentName,
      timestamp: new Date().toISOString(),
      actor: displayName
    };
    await saveLog(newLog);
  };

  const addLogs = async (logEntries: { type: ActivityLog['type'], description: string, studentId?: string, studentName?: string }[], actor: string) => {
    const displayName = auth.username ? `${auth.username} (${actor})` : actor;
    const newLogs: ActivityLog[] = logEntries.map(entry => ({
      id: Math.random().toString(36).substr(2, 9),
      ...entry,
      timestamp: new Date().toISOString(),
      actor: displayName
    }));
    await bulkSaveLogs(newLogs);
  };

  const handleUpdateStudents = async (newStudents: Student[]) => {
    const toUpdate: Student[] = [];
    const studentMap = new Map(students.map(s => [s.id, s]));
    
    for (const s of newStudents) {
      const old = studentMap.get(s.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(s)) {
        toUpdate.push(s);
      }
    }
    
    if (toUpdate.length > 0) {
      await bulkSaveStudents(toUpdate);
    }
  };

  const handleResetData = async () => {
    await deleteAllStudents();
    await deleteAllRequests();
    await deleteAllLogs();
    // After clearing logs, we might want to add a fresh log entry about the reset
    // but note that deleteAllLogs cleared everything including this one if we are not careful.
    // So we add it AFTER deleting logs.
    await addLog('System', 'All application data was cleared by administrator.', 'Admin');
  };

  const handleUpdateRequests = async (newRequests: ScheduleRequest[]) => {
    const toUpdate: ScheduleRequest[] = [];
    const requestMap = new Map(requests.map(r => [r.id, r]));

    for (const r of newRequests) {
      const old = requestMap.get(r.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(r)) {
        toUpdate.push(r);
      }
    }

    if (toUpdate.length > 0) {
      // Add bulkSaveRequests if needed, or just save them individually if usually small
      // For now, these are usually fewer than students, but let's be safe.
      for (const r of toUpdate) {
        await saveRequest(r);
      }
    }
  };

  if ((!authInitialized || !dbReady) && auth.role !== null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500">Connecting to Firebase...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={(role, id, username) => setAuth({ role, studentId: id, username })} />} />
        
        <Route element={<Layout role={auth.role} username={auth.username} onLogout={handleLogout} />}>
          <Route 
            path="/registrar" 
            element={auth.role === UserRole.REGISTRAR ? 
              <RegistrarDashboard 
                students={students} 
                setStudents={handleUpdateStudents} 
                requests={requests} 
                setRequests={handleUpdateRequests}
                logs={logs}
                addLog={addLog}
                addLogs={addLogs}
                onResetData={handleResetData}
                currentUserName={auth.username}
              /> : 
              <Navigate to="/login" />} 
          />
          <Route 
            path="/prep" 
            element={auth.role === UserRole.PREP_DEPT ? 
              <PrepDashboard 
                students={students} 
                setStudents={handleUpdateStudents} 
                requests={requests} 
                setRequests={handleUpdateRequests}
                addLog={addLog}
                addLogs={addLogs}
              /> : 
              <Navigate to="/login" />} 
          />
          <Route 
            path="/student" 
            element={auth.role === UserRole.STUDENT ? 
              <StudentPortal student={students.find(s => s.id === auth.studentId)} /> : 
              <Navigate to="/login" />} 
          />
          <Route 
            path="/account" 
            element={auth.role ? <AccountSettings /> : <Navigate to="/login" />} 
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;

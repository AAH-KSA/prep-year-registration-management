
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
import { LogOut, LayoutDashboard, Users, FileText, Settings, BookOpen } from 'lucide-react';

interface LayoutProps {
  role: UserRole | null;
  username?: string;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ role, username, onLogout }) => {
  const location = useLocation();

  if (!role) return <Outlet />;

  const menuItems = {
    [UserRole.REGISTRAR]: [
      { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/registrar' },
      { label: 'Account', icon: <Settings size={20} />, path: '/account' },
    ],
    [UserRole.PREP_DEPT]: [
      { label: 'Placement Panel', icon: <Users size={20} />, path: '/prep' },
      { label: 'Account', icon: <Settings size={20} />, path: '/account' },
    ],
    [UserRole.STUDENT]: [
      { label: 'My Status', icon: <BookOpen size={20} />, path: '/student' },
      { label: 'Account', icon: <Settings size={20} />, path: '/account' },
    ]
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded flex items-center justify-center text-sm">PYP</div>
            Prep-Year Portal
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems[role]?.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
             <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-xs font-bold uppercase">
               {(username || role).charAt(0)}
             </div>
             <div className="flex flex-col overflow-hidden">
               <span className="text-sm font-semibold truncate text-white">
                 {username || (role === UserRole.STUDENT ? 'Student' : role.replace('_', ' '))}
               </span>
               <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                 {role.replace('_', ' ')} • Active
               </span>
             </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {location.pathname === '/registrar' && 'Registrar Dashboard'}
            {location.pathname === '/prep' && 'Preparatory Year Management'}
            {location.pathname === '/student' && 'Student Academic Portal'}
            {location.pathname === '/account' && 'Account Settings'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">KFUPM • Portal Integrated</span>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

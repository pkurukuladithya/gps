import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navigation, Clock, LogOut, Activity, History, BarChart3 } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-surface border-b border-borderline sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <img
              src="/app_icon.jpg"
              alt="KARP Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-sm border border-navy/20"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-wider text-navy">KARP</span>
                <span className="bg-primary text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                  v1.0 ADAS
                </span>
              </div>
              <p className="text-[11px] text-muted hidden sm:block">Smart ADAS • Cruise System • Fleet Telemetry</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex space-x-1 sm:space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-bold transition ${
                isActive('/')
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-navy hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Live Telemetry</span>
            </Link>

            <Link
              to="/history"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-bold transition ${
                isActive('/history')
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-navy hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Cruise Logs</span>
            </Link>

            <Link
              to="/analytics"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-bold transition ${
                isActive('/analytics')
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-navy hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </Link>
          </nav>

          {/* User & Live Clock */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center text-xs font-medium text-muted bg-canvas px-3 py-1.5 rounded-md border border-borderline">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-charcoal" />
              <span>{time}</span>
            </div>

            <div className="hidden lg:block text-right">
              <p className="text-xs font-bold text-charcoal leading-tight truncate max-w-[160px]">
                {user?.email || 'Logged In'}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                Active Session
              </span>
            </div>

            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

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
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md">
              <div className="w-4 h-4 rounded-full bg-charcoal flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-wider text-charcoal">STELLA</span>
                <span className="bg-charcoal text-primary text-xs font-bold px-2 py-0.5 rounded">LIVE GPS</span>
              </div>
              <p className="text-[11px] text-muted hidden sm:block">Smart Tracking, Exploration & Location Live Analytics</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex space-x-1 sm:space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                isActive('/')
                  ? 'bg-primary text-charcoal shadow-sm'
                  : 'text-muted hover:text-charcoal hover:bg-canvas'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Live Map</span>
            </Link>

            <Link
              to="/history"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                isActive('/history')
                  ? 'bg-primary text-charcoal shadow-sm'
                  : 'text-muted hover:text-charcoal hover:bg-canvas'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Trip History</span>
            </Link>

            <Link
              to="/analytics"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                isActive('/analytics')
                  ? 'bg-primary text-charcoal shadow-sm'
                  : 'text-muted hover:text-charcoal hover:bg-canvas'
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

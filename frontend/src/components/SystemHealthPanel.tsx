import React, { useEffect, useState } from 'react';
import { checkDatabaseHealth } from '../services/supabase';
import { Wifi, Database, Radio, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface HealthPanelProps {
  realtimeStatus: 'connected' | 'connecting' | 'disconnected';
  lastFixTime: string | null;
  activeTripName: string | null;
}

export const SystemHealthPanel: React.FC<HealthPanelProps> = ({
  realtimeStatus,
  lastFixTime,
  activeTripName,
}) => {
  const [browserOnline, setBrowserOnline] = useState<boolean>(navigator.onLine);
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [checking, setChecking] = useState<boolean>(false);

  const runHealthCheck = async () => {
    setChecking(true);
    setBrowserOnline(navigator.onLine);
    const db = await checkDatabaseHealth();
    setDbStatus(db.ok ? 'online' : 'error');
    setChecking(false);
  };

  useEffect(() => {
    runHealthCheck();
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(runHealthCheck, 30000); // 30s heartbeat

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-surface rounded-xl p-4 border border-borderline shadow-sm mb-6">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-borderline">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-primary-dark" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">System Health & Live Feeds</h3>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={checking}
          className="text-xs font-semibold text-muted hover:text-charcoal flex items-center space-x-1"
        >
          <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Browser Network */}
        <div className="bg-canvas p-2.5 rounded-lg border border-borderline">
          <div className="flex items-center space-x-1.5 text-muted text-[11px] font-semibold mb-1">
            <Wifi className="w-3.5 h-3.5" />
            <span>Browser Net</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                browserOnline ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs font-bold text-charcoal">
              {browserOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Database */}
        <div className="bg-canvas p-2.5 rounded-lg border border-borderline">
          <div className="flex items-center space-x-1.5 text-muted text-[11px] font-semibold mb-1">
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                dbStatus === 'online'
                  ? 'bg-emerald-500'
                  : dbStatus === 'checking'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-xs font-bold text-charcoal">
              {dbStatus === 'online' ? 'Connected' : dbStatus === 'checking' ? 'Checking' : 'Error'}
            </span>
          </div>
        </div>

        {/* Realtime Subscription */}
        <div className="bg-canvas p-2.5 rounded-lg border border-borderline">
          <div className="flex items-center space-x-1.5 text-muted text-[11px] font-semibold mb-1">
            <Radio className="w-3.5 h-3.5" />
            <span>Realtime WS</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected'
                  ? 'bg-emerald-500'
                  : realtimeStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-zinc-400'
              }`}
            />
            <span className="text-xs font-bold text-charcoal capitalize">
              {realtimeStatus}
            </span>
          </div>
        </div>

        {/* Last GPS Point Received */}
        <div className="bg-canvas p-2.5 rounded-lg border border-borderline">
          <div className="text-muted text-[11px] font-semibold mb-1">Last Fix Recv</div>
          <div className="text-xs font-bold text-charcoal truncate">
            {lastFixTime || 'Awaiting fixes...'}
          </div>
        </div>

        {/* Active Journey Status */}
        <div className="bg-canvas p-2.5 rounded-lg border border-borderline col-span-2 md:col-span-1">
          <div className="text-muted text-[11px] font-semibold mb-1">Active Tracker</div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                activeTripName ? 'bg-primary animate-ping' : 'bg-zinc-400'
              }`}
            />
            <span className="text-xs font-bold text-charcoal truncate">
              {activeTripName || 'No Active Trip'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

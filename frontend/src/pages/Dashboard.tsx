import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { SystemHealthPanel } from '../components/SystemHealthPanel';
import { AnalyticsCards } from '../components/AnalyticsCards';
import { LiveMap, LocationPoint } from '../components/LiveMap';
import { calculateHaversineDistance, speedMpsToKmh } from '../utils/geo';
import { RealtimeChannel } from '@supabase/supabase-js';
import { PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface Trip {
  id: string;
  trip_name: string;
  status: 'active' | 'completed' | 'interrupted';
  started_at: string;
  ended_at: string | null;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [autoCenter, setAutoCenter] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Overall analytics state
  const [totalTripsCount, setTotalTripsCount] = useState<number>(0);
  const [totalOverallDistanceKm, setTotalOverallDistanceKm] = useState<number>(0);
  const [totalOverallSeconds, setTotalOverallSeconds] = useState<number>(0);
  const [overallAvgSpeedKmh, setOverallAvgSpeedKmh] = useState<number>(0);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // 1. Fetch user trips and compute overall metrics
  const loadUserTripsAndActiveSession = useCallback(async () => {
    if (!user) return;
    try {
      const { data: tripsData, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const trips = (tripsData || []) as Trip[];
      setTotalTripsCount(trips.length);

      // Find if any trip is currently active
      const current = trips.find((t) => t.status === 'active') || trips[0] || null;
      setActiveTrip(current);

      if (current) {
        // Load initial historical GPS points for this trip
        const { data: locData, error: locErr } = await supabase
          .from('location_history')
          .select('id, latitude, longitude, accuracy, speed, recorded_at')
          .eq('trip_id', current.id)
          .order('recorded_at', { ascending: true });

        if (!locErr && locData) {
          setPoints(locData as LocationPoint[]);
        }
      } else {
        setPoints([]);
      }
    } catch (err) {
      console.error('Error loading trips:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserTripsAndActiveSession();
  }, [loadUserTripsAndActiveSession]);

  // 2. Realtime subscription to location_history
  useEffect(() => {
    if (!user || !activeTrip) return;

    setRealtimeStatus('connecting');

    // Subscribe to INSERTs on location_history for this active trip
    const channel = supabase
      .channel(`live-tracking-${activeTrip.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_history',
          filter: `trip_id=eq.${activeTrip.id}`,
        },
        (payload) => {
          const newPoint = payload.new as LocationPoint;
          setPoints((prev) => {
            // Deduplicate by ID or timestamp
            if (prev.some((p) => (newPoint.id && p.id === newPoint.id) || p.recorded_at === newPoint.recorded_at)) {
              return prev;
            }
            return [...prev, newPoint];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${activeTrip.id}`,
        },
        (payload) => {
          const updated = payload.new as Trip;
          setActiveTrip(updated);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, activeTrip?.id]);

  // Compute live distance and speed for the current points
  let currentTripDistanceKm = 0;
  let currentTripSpeedKmh: number | null = null;
  const speedSamples: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) {
      const prev = points[i - 1];
      const dist = calculateHaversineDistance(prev.latitude, prev.longitude, p.latitude, p.longitude);
      if (dist < 150) {
        currentTripDistanceKm += dist / 1000;
      }
    }
    const spd = speedMpsToKmh(p.speed);
    if (spd > 0) speedSamples.push(spd);
  }

  if (points.length > 0) {
    const latest = points[points.length - 1];
    currentTripSpeedKmh = speedMpsToKmh(latest.speed);
  }

  const avgSpeed = speedSamples.length > 0
    ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
    : 0;

  const lastFix = points.length > 0 ? points[points.length - 1] : null;
  const lastFixFormatted = lastFix
    ? new Date(lastFix.recorded_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* System Health Status Panel */}
      <SystemHealthPanel
        realtimeStatus={realtimeStatus}
        lastFixTime={lastFixFormatted}
        activeTripName={activeTrip?.status === 'active' ? activeTrip.trip_name : null}
      />

      {/* Analytics Cards */}
      <AnalyticsCards
        totalTrips={totalTripsCount}
        totalDistanceKm={currentTripDistanceKm}
        totalSeconds={points.length > 0 ? points.length : 0}
        avgSpeedKmh={avgSpeed}
        currentSpeedKmh={currentTripSpeedKmh}
        isActiveTrip={activeTrip?.status === 'active'}
      />

      {/* Map Section */}
      <div className="bg-surface rounded-2xl border border-borderline p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-borderline gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold text-charcoal">
                {activeTrip ? activeTrip.trip_name : 'OpenStreetMap Live Radar'}
              </h2>
              {activeTrip?.status === 'active' ? (
                <span className="bg-primary/20 text-charcoal font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center space-x-1 border border-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span>TRANSMITTING</span>
                </span>
              ) : activeTrip ? (
                <span className="bg-canvas text-muted text-xs font-bold px-2 py-0.5 rounded-md border border-borderline">
                  COMPLETED JOURNEY
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Receiving high-accuracy GPS fixes directly from the STELLA Android Mobile App via Supabase Realtime
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-muted">
              {points.length} GPS Fixes Recorded
            </span>
          </div>
        </div>

        {/* Live Leaflet Map */}
        <LiveMap
          points={points}
          autoCenter={autoCenter}
          onToggleAutoCenter={() => setAutoCenter(!autoCenter)}
          tripStatus={activeTrip?.status}
        />
      </div>
    </div>
  );
};

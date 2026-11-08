import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import { SystemHealthPanel } from '../components/SystemHealthPanel';
import { AnalyticsCards } from '../components/AnalyticsCards';
import { LiveMap, LocationPoint } from '../components/LiveMap';
import { calculateHaversineDistance, speedMpsToKmh } from '../utils/geo';
import { RealtimeChannel } from '@supabase/supabase-js';
import { PlayCircle, CheckCircle2, Radio, Compass, Wifi } from 'lucide-react';

interface Trip {
  id: string;
  trip_name: string;
  status: 'active' | 'completed' | 'interrupted';
  started_at: string;
  ended_at: string | null;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // 20-minute inactivity session timeout
  useInactivityTimeout(() => {
    alert('KARP telemetry session expired after 20 minutes of inactivity. Please sign in again.');
  });

  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [standbyPoint, setStandbyPoint] = useState<LocationPoint | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [autoCenter, setAutoCenter] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalTripsCount, setTotalTripsCount] = useState<number>(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const activeTripRef = useRef<Trip | null>(null);
  activeTripRef.current = activeTrip;

  // 1. Initial Load: Fetch active or most recent trip + latest standby position
  const loadInitialData = useCallback(async () => {
    if (!user) return;
    try {
      // Check trips
      const { data: tripsData, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const trips = (tripsData || []) as Trip[];
      setTotalTripsCount(trips.length);

      const currentActive = trips.find((t) => t.status === 'active') || null;

      if (currentActive) {
        setActiveTrip(currentActive);
        // Load points for this active trip
        const { data: locData, error: locErr } = await supabase
          .from('location_history')
          .select('id, latitude, longitude, accuracy, speed, recorded_at')
          .eq('trip_id', currentActive.id)
          .order('recorded_at', { ascending: true });

        if (!locErr && locData) {
          setPoints(locData as LocationPoint[]);
        }
      } else {
        // No active trip, check for latest standby fix (trip_id IS NULL)
        setActiveTrip(trips[0] || null);

        const { data: standbyData } = await supabase
          .from('location_history')
          .select('id, latitude, longitude, accuracy, speed, recorded_at')
          .eq('user_id', user.id)
          .is('trip_id', null)
          .order('recorded_at', { ascending: false })
          .limit(1);

        if (standbyData && standbyData.length > 0) {
          setStandbyPoint(standbyData[0] as LocationPoint);
        }

        // If last trip exists, load its points for initial route overview
        if (trips[0]) {
          const { data: histData } = await supabase
            .from('location_history')
            .select('id, latitude, longitude, accuracy, speed, recorded_at')
            .eq('trip_id', trips[0].id)
            .order('recorded_at', { ascending: true });

          if (histData && histData.length > 0) {
            setPoints(histData as LocationPoint[]);
          }
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Global Realtime Subscription: listens to trips & location_history for this user
  useEffect(() => {
    if (!user) return;

    setRealtimeStatus('connecting');

    // Subscribe to both user trips and location_history changes
    const channel = supabase
      .channel(`karp-telemetry-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trips',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTrip = payload.new as Trip;
          if (newTrip.status === 'active') {
            console.log('KARP: New active trip detected in real time:', newTrip.id);
            setActiveTrip(newTrip);
            setPoints([]); // Clear previous points for fresh journey
            setTotalTripsCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedTrip = payload.new as Trip;
          if (activeTripRef.current?.id === updatedTrip.id) {
            setActiveTrip(updatedTrip);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_history',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newPoint = payload.new as LocationPoint & { trip_id?: string | null };

          if (newPoint.trip_id && activeTripRef.current?.id === newPoint.trip_id) {
            // Point belongs to current active trip
            setPoints((prev) => {
              if (prev.some((p) => p.id === newPoint.id || p.recorded_at === newPoint.recorded_at)) {
                return prev;
              }
              return [...prev, newPoint];
            });
          } else if (!newPoint.trip_id) {
            // Standby point (3-second cadence before trip start)
            setStandbyPoint(newPoint);
          }
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
  }, [user]);

  // 3. Periodic Reconciliation Ticker (Every 4 seconds)
  // Ensures 100% sync even if WebSockets are briefly backgrounded or throttled
  useEffect(() => {
    if (!user) return;

    const reconcileInterval = setInterval(async () => {
      try {
        // A. Check if an active trip started on mobile that client hasn't caught yet
        const { data: latestTrips } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(2);

        if (latestTrips && latestTrips.length > 0) {
          const liveActive = latestTrips.find((t) => t.status === 'active');
          if (liveActive && activeTripRef.current?.id !== liveActive.id) {
            setActiveTrip(liveActive);
            // Fetch points for this new active trip
            const { data: freshPoints } = await supabase
              .from('location_history')
              .select('id, latitude, longitude, accuracy, speed, recorded_at')
              .eq('trip_id', liveActive.id)
              .order('recorded_at', { ascending: true });

            if (freshPoints) setPoints(freshPoints as LocationPoint[]);
            return;
          } else if (!liveActive && activeTripRef.current?.status === 'active') {
            // Active trip was ended on mobile
            const updated = latestTrips.find((t) => t.id === activeTripRef.current?.id);
            if (updated) setActiveTrip(updated);
          }
        }

        // B. If currently in an active trip, reconcile latest points
        if (activeTripRef.current?.status === 'active') {
          const lastRecordedAt = points.length > 0 ? points[points.length - 1].recorded_at : null;
          let query = supabase
            .from('location_history')
            .select('id, latitude, longitude, accuracy, speed, recorded_at')
            .eq('trip_id', activeTripRef.current.id)
            .order('recorded_at', { ascending: true });

          if (lastRecordedAt) {
            query = query.gt('recorded_at', lastRecordedAt);
          }

          const { data: missingPoints } = await query;
          if (missingPoints && missingPoints.length > 0) {
            setPoints((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const toAdd = (missingPoints as LocationPoint[]).filter((p) => !existingIds.has(p.id));
              return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
            });
          }
        } else {
          // C. If no active trip, reconcile standby location fix
          const { data: latestStandby } = await supabase
            .from('location_history')
            .select('id, latitude, longitude, accuracy, speed, recorded_at')
            .eq('user_id', user.id)
            .is('trip_id', null)
            .order('recorded_at', { ascending: false })
            .limit(1);

          if (latestStandby && latestStandby.length > 0) {
            setStandbyPoint(latestStandby[0] as LocationPoint);
          }
        }
      } catch (e) {
        // Background reconciliation error safe fail
      }
    }, 4000);

    return () => clearInterval(reconcileInterval);
  }, [user, points]);

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

  const isTripActive = activeTrip?.status === 'active';

  // Determine what points to display on the map
  // If active trip: show trip points polyline & latest point
  // If no active trip, but standby point exists: show standby point
  // If neither, fallback to points of previous trip
  let displayPoints: LocationPoint[] = [];
  if (isTripActive && points.length > 0) {
    displayPoints = points;
    const latest = points[points.length - 1];
    currentTripSpeedKmh = speedMpsToKmh(latest.speed);
  } else if (!isTripActive && standbyPoint) {
    displayPoints = [standbyPoint];
    currentTripSpeedKmh = speedMpsToKmh(standbyPoint.speed);
  } else {
    displayPoints = points;
  }

  const avgSpeed =
    speedSamples.length > 0 ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length : 0;

  const lastFix = displayPoints.length > 0 ? displayPoints[displayPoints.length - 1] : null;
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
        activeTripName={isTripActive ? activeTrip?.trip_name || 'Active Cruise' : null}
      />

      {/* Analytics Cards */}
      <AnalyticsCards
        totalTrips={totalTripsCount}
        totalDistanceKm={currentTripDistanceKm}
        totalSeconds={points.length > 0 ? points.length : 0}
        avgSpeedKmh={avgSpeed}
        currentSpeedKmh={currentTripSpeedKmh}
        isActiveTrip={isTripActive}
      />

      {/* Map Section */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-2">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-black text-navy">
                {isTripActive
                  ? activeTrip?.trip_name
                  : standbyPoint
                  ? 'Mobile Pilot Standby Radar'
                  : activeTrip
                  ? activeTrip.trip_name
                  : 'OpenStreetMap ADAS Radar'}
              </h2>

              {isTripActive ? (
                <span className="bg-primary text-white font-black text-xs px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>CRUISE ACTIVE (1s)</span>
                </span>
              ) : standbyPoint ? (
                <span className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>STANDBY BEACON (3s)</span>
                </span>
              ) : activeTrip ? (
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-md border border-slate-200">
                  COMPLETED CRUISE
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted mt-1 font-medium">
              {isTripActive
                ? 'Broadcasting high-cadence 1-second ADAS telemetry with zero web refresh required'
                : standbyPoint
                ? 'Mobile app is connected in Standby Mode (broadcasting live location every 3s)'
                : 'Awaiting connection or journey initialization from the KARP Android app'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              {displayPoints.length} Coordinate Fixes
            </span>
          </div>
        </div>

        {/* Live Leaflet Map */}
        <LiveMap
          points={displayPoints}
          autoCenter={autoCenter}
          onToggleAutoCenter={() => setAutoCenter(!autoCenter)}
          tripStatus={activeTrip?.status}
        />
      </div>
    </div>
  );
};

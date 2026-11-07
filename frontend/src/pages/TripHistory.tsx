import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { LiveMap, LocationPoint } from '../components/LiveMap';
import { calculateHaversineDistance, speedMpsToKmh, formatDuration } from '../utils/geo';
import { Route, Clock, Calendar, ChevronRight, X, Play, CheckCircle } from 'lucide-react';

interface TripWithStats {
  id: string;
  trip_name: string;
  status: 'active' | 'completed' | 'interrupted';
  started_at: string;
  ended_at: string | null;
  distanceKm: number;
  durationSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  pointsCount: number;
}

export const TripHistory: React.FC = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<TripWithStats | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<LocationPoint[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    async function loadTrips() {
      if (!user) return;
      try {
        const { data: tripsData, error: tripsErr } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false });

        if (tripsErr) throw tripsErr;

        // Fetch location points count and compute stats for each trip
        const computedTrips: TripWithStats[] = [];

        for (const t of tripsData || []) {
          const { data: pts } = await supabase
            .from('location_history')
            .select('latitude, longitude, speed, recorded_at')
            .eq('trip_id', t.id)
            .order('recorded_at', { ascending: true });

          let dist = 0;
          let maxSpd = 0;
          const spds: number[] = [];

          if (pts && pts.length > 0) {
            for (let i = 0; i < pts.length; i++) {
              if (i > 0) {
                const d = calculateHaversineDistance(
                  pts[i - 1].latitude,
                  pts[i - 1].longitude,
                  pts[i].latitude,
                  pts[i].longitude
                );
                if (d < 150) dist += d;
              }
              const spd = speedMpsToKmh(pts[i].speed);
              if (spd > 0) {
                spds.push(spd);
                if (spd > maxSpd) maxSpd = spd;
              }
            }
          }

          let duration = 0;
          if (t.ended_at && t.started_at) {
            duration = Math.max(0, Math.floor((new Date(t.ended_at).getTime() - new Date(t.started_at).getTime()) / 1000));
          } else if (pts && pts.length > 1) {
            duration = Math.max(0, Math.floor((new Date(pts[pts.length - 1].recorded_at).getTime() - new Date(pts[0].recorded_at).getTime()) / 1000));
          }

          const avgSpd = spds.length > 0 ? spds.reduce((a, b) => a + b, 0) / spds.length : 0;

          computedTrips.push({
            id: t.id,
            trip_name: t.trip_name,
            status: t.status,
            started_at: t.started_at,
            ended_at: t.ended_at,
            distanceKm: dist / 1000,
            durationSec: duration,
            avgSpeedKmh: avgSpd,
            maxSpeedKmh: maxSpd,
            pointsCount: pts ? pts.length : 0,
          });
        }

        setTrips(computedTrips);
      } catch (e) {
        console.error('Error loading history:', e);
      } finally {
        setLoading(false);
      }
    }

    loadTrips();
  }, [user]);

  const viewTripRoute = async (trip: TripWithStats) => {
    setSelectedTrip(trip);
    setLoadingRoute(true);
    try {
      const { data } = await supabase
        .from('location_history')
        .select('id, latitude, longitude, accuracy, speed, recorded_at')
        .eq('trip_id', trip.id)
        .order('recorded_at', { ascending: true });

      setSelectedPoints((data || []) as LocationPoint[]);
    } catch (err) {
      console.error('Failed to load route points:', err);
    } finally {
      setLoadingRoute(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-borderline gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-charcoal">Trip History & Archives</h1>
          <p className="text-xs text-muted mt-1">
            Browse all completed and tracked journeys recorded by your device
          </p>
        </div>
        <div className="text-xs font-bold text-muted">
          {trips.length} Total Journeys
        </div>
      </div>

      {loading ? (
        <div className="bg-surface rounded-xl p-12 text-center border border-borderline">
          <p className="text-sm font-semibold text-muted animate-pulse">Loading recorded trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-surface rounded-xl p-12 text-center border border-borderline">
          <Route className="w-10 h-10 text-muted mx-auto mb-3" />
          <h3 className="text-base font-bold text-charcoal">No Trips Recorded Yet</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            Open the STELLA Tracker Android app, grant location permissions, and press "START TRIP" to begin recording.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-borderline shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas border-b border-borderline text-[11px] font-extrabold text-muted uppercase tracking-wider">
                  <th className="py-3.5 px-4">Journey Name</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Distance</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Avg Speed</th>
                  <th className="py-3.5 px-4">Max Speed</th>
                  <th className="py-3.5 px-4">GPS Fixes</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline text-xs font-medium text-charcoal">
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-canvas/60 transition">
                    <td className="py-3.5 px-4 font-bold">{trip.trip_name}</td>
                    <td className="py-3.5 px-4 text-muted">
                      {new Date(trip.started_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      at {new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold">{trip.distanceKm.toFixed(2)} km</td>
                    <td className="py-3.5 px-4">{formatDuration(trip.durationSec)}</td>
                    <td className="py-3.5 px-4">{trip.avgSpeedKmh.toFixed(1)} km/h</td>
                    <td className="py-3.5 px-4">{trip.maxSpeedKmh.toFixed(1)} km/h</td>
                    <td className="py-3.5 px-4">{trip.pointsCount} pts</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          trip.status === 'active'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => viewTripRoute(trip)}
                        className="bg-primary hover:bg-primary-dark text-charcoal font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
                      >
                        View Route
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Route Viewer */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-borderline shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-borderline bg-canvas">
              <div>
                <h3 className="font-extrabold text-base text-charcoal">{selectedTrip.trip_name}</h3>
                <p className="text-xs text-muted">
                  Recorded on {new Date(selectedTrip.started_at).toLocaleString()} • {selectedTrip.distanceKm.toFixed(2)} km • {selectedTrip.pointsCount} GPS points
                </p>
              </div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="p-1.5 text-muted hover:text-charcoal hover:bg-surface rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              {loadingRoute ? (
                <div className="h-96 flex items-center justify-center text-muted font-bold text-sm">
                  Loading GPS coordinate coordinates...
                </div>
              ) : (
                <LiveMap points={selectedPoints} autoCenter={true} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

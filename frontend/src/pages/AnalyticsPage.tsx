import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { calculateHaversineDistance, speedMpsToKmh, formatDuration } from '../utils/geo';
import { Route, Gauge, Clock, Award, BarChart2 } from 'lucide-react';

interface ChartDataPoint {
  name: string;
  distanceKm: number;
  avgSpeedKmh: number;
  durationMin: number;
}

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  useInactivityTimeout();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [totalKm, setTotalKm] = useState(0);
  const [totalSec, setTotalSec] = useState(0);
  const [topSpeed, setTopSpeed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      if (!user) return;
      try {
        const { data: trips, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: true });

        if (error) throw error;

        const pointsSummary: ChartDataPoint[] = [];
        let grandKm = 0;
        let grandSec = 0;
        let highestSpeed = 0;

        for (const t of trips || []) {
          const { data: locs } = await supabase
            .from('location_history')
            .select('latitude, longitude, speed, recorded_at')
            .eq('trip_id', t.id)
            .order('recorded_at', { ascending: true });

          let d = 0;
          let spdMax = 0;
          const spds: number[] = [];

          if (locs && locs.length > 0) {
            for (let i = 0; i < locs.length; i++) {
              if (i > 0) {
                const step = calculateHaversineDistance(
                  locs[i - 1].latitude,
                  locs[i - 1].longitude,
                  locs[i].latitude,
                  locs[i].longitude
                );
                if (step < 150) d += step;
              }
              const sp = speedMpsToKmh(locs[i].speed);
              if (sp > 0) {
                spds.push(sp);
                if (sp > spdMax) spdMax = sp;
                if (sp > highestSpeed) highestSpeed = sp;
              }
            }
          }

          let dur = 0;
          if (t.ended_at && t.started_at) {
            dur = Math.max(0, Math.floor((new Date(t.ended_at).getTime() - new Date(t.started_at).getTime()) / 1000));
          } else if (locs && locs.length > 1) {
            dur = Math.max(0, Math.floor((new Date(locs[locs.length - 1].recorded_at).getTime() - new Date(locs[0].recorded_at).getTime()) / 1000));
          }

          const avgS = spds.length > 0 ? spds.reduce((a, b) => a + b, 0) / spds.length : 0;
          const distKm = Math.round((d / 1000) * 100) / 100;

          grandKm += distKm;
          grandSec += dur;

          pointsSummary.push({
            name: t.trip_name.replace('Trip', '#').slice(0, 10),
            distanceKm: distKm,
            avgSpeedKmh: Math.round(avgS * 10) / 10,
            durationMin: Math.round((dur / 60) * 10) / 10,
          });
        }

        setChartData(pointsSummary);
        setTotalKm(grandKm);
        setTotalSec(grandSec);
        setTopSpeed(highestSpeed);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="pb-4 mb-6 border-b border-borderline">
        <h1 className="text-2xl font-extrabold text-charcoal">Fleet & Journey Analytics</h1>
        <p className="text-xs text-muted mt-1">
          Aggregated distance, speed telemetry, and journey comparisons derived from actual GPS records
        </p>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface rounded-xl p-4 border border-borderline shadow-sm">
          <div className="flex items-center space-x-2 text-muted text-xs font-bold uppercase mb-2">
            <Route className="w-4 h-4 text-charcoal" />
            <span>Cumulative Distance</span>
          </div>
          <p className="text-2xl font-extrabold text-charcoal">{totalKm.toFixed(2)} km</p>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-borderline shadow-sm">
          <div className="flex items-center space-x-2 text-muted text-xs font-bold uppercase mb-2">
            <Clock className="w-4 h-4 text-charcoal" />
            <span>Cumulative Time</span>
          </div>
          <p className="text-2xl font-extrabold text-charcoal">{formatDuration(totalSec)}</p>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-borderline shadow-sm">
          <div className="flex items-center space-x-2 text-muted text-xs font-bold uppercase mb-2">
            <Gauge className="w-4 h-4 text-charcoal" />
            <span>Top Recorded Speed</span>
          </div>
          <p className="text-2xl font-extrabold text-charcoal">{topSpeed.toFixed(1)} km/h</p>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-borderline shadow-sm">
          <div className="flex items-center space-x-2 text-muted text-xs font-bold uppercase mb-2">
            <Award className="w-4 h-4 text-charcoal" />
            <span>Total Journeys</span>
          </div>
          <p className="text-2xl font-extrabold text-charcoal">{chartData.length}</p>
        </div>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="bg-surface rounded-xl p-12 text-center border border-borderline">
          <p className="text-sm font-semibold text-muted animate-pulse">Calculating telemetry analytics...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="bg-surface rounded-xl p-12 text-center border border-borderline">
          <BarChart2 className="w-10 h-10 text-muted mx-auto mb-2" />
          <h4 className="text-sm font-bold text-charcoal">No Analytics Data Available</h4>
          <p className="text-xs text-muted mt-1">Complete at least one tracking journey to generate charts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distance per Trip Chart */}
          <div className="bg-surface rounded-xl p-5 border border-borderline shadow-sm">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4">
              Distance Per Journey (km)
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0EE" />
                  <XAxis dataKey="name" stroke="#777777" fontSize={11} tickLine={false} />
                  <YAxis stroke="#777777" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E8E8E4',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="distanceKm" fill="#FF5500" radius={[4, 4, 0, 0]} name="Distance (km)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Average Speed Profile Chart */}
          <div className="bg-surface rounded-xl p-5 border border-borderline shadow-sm">
            <h3 className="text-sm font-extrabold text-charcoal uppercase tracking-wider mb-4">
              Average Speed Profile (km/h)
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0EE" />
                  <XAxis dataKey="name" stroke="#777777" fontSize={11} tickLine={false} />
                  <YAxis stroke="#777777" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E8E8E4',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgSpeedKmh"
                    stroke="#0B3C5D"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#FF5500' }}
                    name="Avg Speed (km/h)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

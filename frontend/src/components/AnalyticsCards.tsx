import React from 'react';
import { Route, Gauge, Clock, Award, Compass } from 'lucide-react';
import { formatDuration } from '../utils/geo';

interface AnalyticsCardsProps {
  totalTrips: number;
  totalDistanceKm: number;
  totalSeconds: number;
  avgSpeedKmh: number;
  currentSpeedKmh?: number | null;
  isActiveTrip: boolean;
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({
  totalTrips,
  totalDistanceKm,
  totalSeconds,
  avgSpeedKmh,
  currentSpeedKmh,
  isActiveTrip,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Distance Card */}
      <div className="bg-surface rounded-xl p-4 border border-borderline shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">Total Distance</span>
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Route className="w-4 h-4 text-charcoal" />
          </div>
        </div>
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-extrabold text-charcoal">{totalDistanceKm.toFixed(2)}</span>
          <span className="text-xs font-bold text-muted">km</span>
        </div>
      </div>

      {/* Live / Average Speed Card */}
      <div
        className={`rounded-xl p-4 border shadow-sm relative overflow-hidden ${
          isActiveTrip
            ? 'bg-[#FFFCF0] border-primary'
            : 'bg-surface border-borderline'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            {isActiveTrip ? 'Current Live Speed' : 'Average Speed'}
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isActiveTrip ? 'bg-primary text-charcoal' : 'bg-canvas text-charcoal'
            }`}
          >
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-extrabold text-charcoal">
            {isActiveTrip
              ? (currentSpeedKmh || 0).toFixed(1)
              : avgSpeedKmh.toFixed(1)}
          </span>
          <span className="text-xs font-bold text-muted">km/h</span>
        </div>
      </div>

      {/* Tracking Duration Card */}
      <div className="bg-surface rounded-xl p-4 border border-borderline shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">Total Journey Time</span>
          <div className="w-8 h-8 rounded-lg bg-canvas flex items-center justify-center">
            <Clock className="w-4 h-4 text-charcoal" />
          </div>
        </div>
        <div className="flex items-baseline space-x-1">
          <span className="text-xl font-extrabold text-charcoal">{formatDuration(totalSeconds)}</span>
        </div>
      </div>

      {/* Total Trips Card */}
      <div className="bg-surface rounded-xl p-4 border border-borderline shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">Total Recorded Trips</span>
          <div className="w-8 h-8 rounded-lg bg-canvas flex items-center justify-center">
            <Award className="w-4 h-4 text-charcoal" />
          </div>
        </div>
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-extrabold text-charcoal">{totalTrips}</span>
          <span className="text-xs font-bold text-muted">journeys</span>
        </div>
      </div>
    </div>
  );
};

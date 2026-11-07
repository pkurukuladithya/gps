import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Navigation, Gauge, ShieldAlert } from 'lucide-react';
import { speedMpsToKmh } from '../utils/geo';

export interface LocationPoint {
  id?: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  recorded_at: string;
}

interface LiveMapProps {
  points: LocationPoint[];
  autoCenter?: boolean;
  onToggleAutoCenter?: () => void;
  tripStatus?: 'active' | 'completed' | 'interrupted';
}

// Custom animated Radar Pulse Marker icon
const createPulsingIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="stella-pulse-marker">
        <div class="pulse"></div>
        <div class="dot"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

// Component to handle auto-centering smoothly
function AutoCenterMap({ center, enabled }: { center: [number, number]; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (enabled && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, enabled, map]);
  return null;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  points,
  autoCenter = true,
  onToggleAutoCenter,
  tripStatus,
}) => {
  const latestPoint = points.length > 0 ? points[points.length - 1] : null;

  // Default coordinate (if no points, e.g. center of Sri Lanka or default fallback)
  const defaultCenter: [number, number] = latestPoint
    ? [latestPoint.latitude, latestPoint.longitude]
    : [6.9271, 79.8612]; // Colombo coordinates fallback

  const polylinePositions: [number, number][] = points.map((p) => [p.latitude, p.longitude]);

  return (
    <div className="relative w-full h-[520px] bg-canvas rounded-xl border border-borderline overflow-hidden shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={16}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route Polyline */}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#1C1C1C',
              weight: 5,
              opacity: 0.85,
              lineJoin: 'round',
            }}
          />
        )}

        {/* Live Marker */}
        {latestPoint && (
          <Marker
            position={[latestPoint.latitude, latestPoint.longitude]}
            icon={createPulsingIcon()}
          />
        )}

        {/* Auto-centering controller */}
        {latestPoint && (
          <AutoCenterMap
            center={[latestPoint.latitude, latestPoint.longitude]}
            enabled={autoCenter}
          />
        )}
      </MapContainer>

      {/* Map Floating Controls & Telemetry Overlay */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col space-y-2">
        {onToggleAutoCenter && (
          <button
            onClick={onToggleAutoCenter}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition ${
              autoCenter
                ? 'bg-primary text-charcoal'
                : 'bg-surface text-muted border border-borderline hover:text-charcoal'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{autoCenter ? 'Auto-Centering ON' : 'Auto-Centering OFF'}</span>
          </button>
        )}
      </div>

      {/* Bottom Floating Telemetry Bar */}
      {latestPoint ? (
        <div className="absolute bottom-4 left-4 right-4 z-[400] bg-surface/95 backdrop-blur-sm rounded-xl p-3 border border-borderline shadow-lg">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="border-r border-borderline last:border-none pr-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Latitude / Longitude</span>
              <span className="text-xs font-extrabold text-charcoal">
                {latestPoint.latitude.toFixed(5)}°, {latestPoint.longitude.toFixed(5)}°
              </span>
            </div>

            <div className="border-r border-borderline last:border-none pr-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Speed</span>
              <span className="text-xs font-extrabold text-charcoal">
                {speedMpsToKmh(latestPoint.speed)} km/h
              </span>
            </div>

            <div className="border-r border-borderline last:border-none pr-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Accuracy</span>
              <span className="text-xs font-extrabold text-charcoal">
                {latestPoint.accuracy ? `±${Math.round(latestPoint.accuracy)} m` : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">GPS Fix Timestamp</span>
              <span className="text-xs font-extrabold text-charcoal">
                {new Date(latestPoint.recorded_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 z-[300] bg-canvas/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="bg-surface p-4 rounded-xl shadow-lg border border-borderline text-center max-w-sm">
            <Navigation className="w-8 h-8 text-primary-dark mx-auto mb-2 animate-bounce" />
            <h4 className="text-sm font-bold text-charcoal">Awaiting GPS Live Stream</h4>
            <p className="text-xs text-muted mt-1">
              Start an active journey on your Android phone to transmit real-time GPS coordinates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../hooks/useAuth';
import { useKeepAwakeTrip } from '../hooks/useKeepAwakeTrip';
import { Button } from '../components/Button';
import { StatusBadge, StatusType } from '../components/StatusBadge';
import { THEME } from '../constants/theme';
import {
  LocationService,
  LocationReading,
} from '../services/locationService';
import {
  calculateHaversineDistance,
  speedMpsToKmh,
  isValidCoordinate,
} from '../utils/geo';
import { formatElapsedTime, formatTime } from '../utils/time';
import { subscribeToNetworkState } from '../services/networkService';

export default function ActiveTripScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    tripId: string;
    tripName: string;
    startedAt: string;
  }>();

  const tripId = params.tripId;
  const startedAtIso = params.startedAt || new Date().toISOString();

  // Screen keep-awake hook
  const [isTripActive, setIsTripActive] = useState<boolean>(true);
  useKeepAwakeTrip(isTripActive);

  // Live Timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Live Metrics
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState<number>(0);
  const [averageSpeedKmh, setAverageSpeedKmh] = useState<number>(0);
  const [totalDistanceMeters, setTotalDistanceMeters] = useState<number>(0);
  const [totalPointsRecorded, setTotalPointsRecorded] = useState<number>(0);

  // Latest Coordinates Fix
  const [lastFix, setLastFix] = useState<LocationReading | null>(null);

  // Network & Upload Status
  const [internetStatus, setInternetStatus] = useState<StatusType>('connected');
  const [uploadStatusText, setUploadStatusText] = useState<string>('Live Syncing');
  const [uploadStatus, setUploadStatus] = useState<StatusType>('connected');
  const [isStopping, setIsStopping] = useState<boolean>(false);

  // References to preserve state across callbacks
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<LocationReading | null>(null);
  const speedSamplesRef = useRef<number[]>([]);
  const totalDistanceRef = useRef<number>(0);
  const pointsCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.parse(startedAtIso) || Date.now());

  // 1. Elapsed timer interval
  useEffect(() => {
    if (!isTripActive) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - startTimeRef.current) / 1000));
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [isTripActive]);

  // 2. Internet connectivity listener
  useEffect(() => {
    const unsubscribeNet = subscribeToNetworkState((isConnected) => {
      setInternetStatus(isConnected ? 'connected' : 'disconnected');
      if (isConnected) {
        LocationService.flushQueue();
      }
    });

    return () => {
      unsubscribeNet();
    };
  }, []);

  // 3. Process new GPS reading
  const processLocationFix = useCallback(
    async (location: Location.LocationObject) => {
      if (!isTripActive || !tripId || !user) return;

      const { latitude, longitude, accuracy, speed } = location.coords;
      const timestamp = location.timestamp;

      if (!isValidCoordinate(latitude, longitude)) {
        return;
      }

      const reading: LocationReading = {
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        speed: speed ?? null,
        timestamp,
      };

      setLastFix(reading);

      // Speed calculations
      const speedKmh = speedMpsToKmh(reading.speed);
      setCurrentSpeedKmh(speedKmh);

      if (speedKmh > 0) {
        speedSamplesRef.current.push(speedKmh);
      }

      setMaxSpeedKmh((prev) => Math.max(prev, speedKmh));

      if (speedSamplesRef.current.length > 0) {
        const sum = speedSamplesRef.current.reduce((a, b) => a + b, 0);
        const avg = Math.round((sum / speedSamplesRef.current.length) * 10) / 10;
        setAverageSpeedKmh(avg);
      }

      // Distance calculation via Haversine between consecutive fixes
      if (lastLocationRef.current) {
        const deltaMeters = calculateHaversineDistance(
          lastLocationRef.current.latitude,
          lastLocationRef.current.longitude,
          reading.latitude,
          reading.longitude
        );

        // Filter out unreasonable GPS jitter (>100 m/s ~ 360 km/h)
        if (deltaMeters > 0.5 && deltaMeters < 150) {
          totalDistanceRef.current += deltaMeters;
          setTotalDistanceMeters(totalDistanceRef.current);
        }
      }

      lastLocationRef.current = reading;
      pointsCountRef.current += 1;
      setTotalPointsRecorded(pointsCountRef.current);

      // Upload to Supabase
      const result = await LocationService.recordLocation(tripId, user.id, reading);
      if (result.success && !result.queued) {
        setUploadStatus('connected');
        setUploadStatusText('Live Synced');
      } else if (result.queued) {
        setUploadStatus('checking');
        setUploadStatusText(`Queued (${LocationService.getQueueLength()})`);
      } else {
        setUploadStatus('error');
        setUploadStatusText('Upload Failed');
      }
    },
    [isTripActive, tripId, user]
  );

  // 4. Start foreground GPS subscription
  useEffect(() => {
    let isSubscribed = true;

    async function startWatching() {
      try {
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          (loc) => {
            if (isSubscribed) {
              processLocationFix(loc);
            }
          }
        );
        locationSubscriptionRef.current = sub;
      } catch (err: any) {
        console.error('Failed to start location subscription:', err);
        Alert.alert('GPS Error', 'Could not establish high-accuracy GPS subscription.');
      }
    }

    startWatching();

    return () => {
      isSubscribed = false;
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, [processLocationFix]);

  // 5. App lifecycle monitoring (Foreground-only enforcement)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active' && isTripActive) {
        // App was minimized or backgrounded
        console.warn('STELLA: App minimized during active trip. Foreground tracking interrupted.');
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isTripActive]);

  // 6. Stop trip handler
  const handleStopTrip = () => {
    Alert.alert(
      'Finish Trip',
      'Are you sure you want to stop tracking this journey?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Trip',
          style: 'destructive',
          onPress: async () => {
            await finalizeTrip('completed');
          },
        },
      ]
    );
  };

  const finalizeTrip = async (status: 'completed' | 'interrupted') => {
    setIsStopping(true);
    setIsTripActive(false);

    // Stop location subscription
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }

    // Flush any pending queue
    await LocationService.flushQueue();

    try {
      if (tripId) {
        await LocationService.stopTrip(tripId, status);
      }
    } catch (err: any) {
      console.warn('Error saving trip status:', err);
    } finally {
      setIsStopping(false);
      // Navigate to summary screen
      router.replace({
        pathname: '/trip-summary',
        params: {
          tripId: tripId || '',
          tripName: params.tripName || 'STELLA Trip',
          startedAt: startedAtIso,
          endedAt: new Date().toISOString(),
          durationSeconds: elapsedSeconds.toString(),
          totalDistanceKm: (totalDistanceRef.current / 1000).toFixed(2),
          averageSpeedKmh: averageSpeedKmh.toFixed(1),
          maxSpeedKmh: maxSpeedKmh.toFixed(1),
          pointsCount: pointsCountRef.current.toString(),
        },
      });
    }
  };

  const distanceKm = (totalDistanceMeters / 1000).toFixed(2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Active Banner */}
        <View style={styles.activeBanner}>
          <View style={styles.pulseDot} />
          <Text style={styles.bannerText}>ACTIVE TRIP TRACKING</Text>
        </View>

        {/* Large Speed Display */}
        <View style={styles.speedHero}>
          <Text style={styles.speedLabel}>CURRENT SPEED</Text>
          <View style={styles.speedNumberRow}>
            <Text style={styles.speedNumber}>{currentSpeedKmh.toFixed(1)}</Text>
            <Text style={styles.speedUnit}>KM/H</Text>
          </View>
        </View>

        {/* Big Elapsed Timer */}
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>TRIP DURATION</Text>
          <Text style={styles.timerValue}>{formatElapsedTime(elapsedSeconds)}</Text>
        </View>

        {/* Secondary Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>DISTANCE</Text>
            <Text style={styles.metricValue}>{distanceKm}</Text>
            <Text style={styles.metricUnit}>km</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>AVG SPEED</Text>
            <Text style={styles.metricValue}>{averageSpeedKmh.toFixed(1)}</Text>
            <Text style={styles.metricUnit}>km/h</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>MAX SPEED</Text>
            <Text style={styles.metricValue}>{maxSpeedKmh.toFixed(1)}</Text>
            <Text style={styles.metricUnit}>km/h</Text>
          </View>
        </View>

        {/* Realtime GPS Fix Coordinates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SATELLITE POSITION & FIX</Text>
          <View style={styles.coordRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.coordLabel}>LATITUDE</Text>
              <Text style={styles.coordValue}>
                {lastFix ? lastFix.latitude.toFixed(6) : 'Acquiring...'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coordLabel}>LONGITUDE</Text>
              <Text style={styles.coordValue}>
                {lastFix ? lastFix.longitude.toFixed(6) : 'Acquiring...'}
              </Text>
            </View>
          </View>
          <View style={[styles.coordRow, { marginTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.coordLabel}>ACCURACY</Text>
              <Text style={styles.coordValue}>
                {lastFix?.accuracy !== null && lastFix?.accuracy !== undefined
                  ? `±${Math.round(lastFix.accuracy)} m`
                  : '--'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coordLabel}>POINTS RECORDED</Text>
              <Text style={styles.coordValue}>{totalPointsRecorded}</Text>
            </View>
          </View>
          <View style={styles.timestampRow}>
            <Text style={styles.coordLabel}>LAST FIX:</Text>
            <Text style={styles.timestampVal}>
              {lastFix ? formatTime(lastFix.timestamp) : '--'}
            </Text>
          </View>
        </View>

        {/* Live Connectivity Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TRANSMISSION & CLOUD STATUS</Text>
          <StatusBadge label="Internet Connection" status={internetStatus} />
          <StatusBadge
            label="Supabase GPS Upload"
            status={uploadStatus}
            customText={uploadStatusText}
          />
        </View>

        {/* Stop Action */}
        <View style={styles.actionContainer}>
          <Button
            title="STOP TRIP"
            variant="danger"
            onPress={handleStopTrip}
            loading={isStopping}
            style={styles.stopBtn}
            textStyle={styles.stopBtnText}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 16,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D97706',
    marginRight: 8,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 1,
  },
  speedHero: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  speedLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  speedNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  speedNumber: {
    fontSize: 54,
    fontWeight: '900',
    color: THEME.colors.text,
  },
  speedUnit: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    marginLeft: 8,
  },
  timerCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0A0A0',
    letterSpacing: 1,
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 34,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  coordValue: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0EE',
  },
  timestampVal: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
    marginLeft: 6,
  },
  actionContainer: {
    marginTop: 8,
  },
  stopBtn: {
    height: 56,
  },
  stopBtnText: {
    fontSize: 18,
    letterSpacing: 1,
  },
});

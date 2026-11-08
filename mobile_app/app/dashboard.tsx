import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../hooks/useAuth';
import { StellaLogo } from '../components/StellaLogo';
import { StatusBadge, StatusType } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { THEME } from '../constants/theme';
import {
  LocationService,
  LocationReading,
} from '../services/locationService';
import { performFullSystemHealthCheck } from '../services/networkService';
import { speedMpsToKmh } from '../utils/geo';
import { formatTime } from '../utils/time';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Live device clock
  const [deviceTime, setDeviceTime] = useState<Date>(new Date());

  // Connection states
  const [internetStatus, setInternetStatus] = useState<StatusType>('checking');
  const [supabaseStatus, setSupabaseStatus] = useState<StatusType>('checking');
  const [, setSupabaseMessage] = useState<string>('');
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<StatusType>('checking');
  const [gpsProviderStatus, setGpsProviderStatus] = useState<StatusType>('checking');
  const [locationAcquisitionStatus, setLocationAcquisitionStatus] = useState<StatusType>('checking');
  const [standbyActive, setStandbyActive] = useState<boolean>(false);

  // Preview GPS fix
  const [currentLocation, setCurrentLocation] = useState<LocationReading | null>(null);
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Full system check + activate Standby watcher
  const runSystemChecks = useCallback(async () => {
    // 1. Internet & Supabase
    setInternetStatus('checking');
    setSupabaseStatus('checking');
    const netCheck = await performFullSystemHealthCheck();
    setInternetStatus(netCheck.internet === 'connected' ? 'connected' : 'disconnected');
    setSupabaseStatus(netCheck.supabase === 'connected' ? 'connected' : 'error');
    if (netCheck.supabaseMessage) setSupabaseMessage(netCheck.supabaseMessage);

    // 2. GPS Permission
    setGpsPermissionStatus('checking');
    const { status: permStatus } = await Location.getForegroundPermissionsAsync();
    let hasPermission = permStatus === Location.PermissionStatus.GRANTED;

    if (!hasPermission) {
      const requested = await LocationService.requestPermissions();
      hasPermission = requested;
    }
    setGpsPermissionStatus(hasPermission ? 'connected' : 'permission_required');

    // 3. GPS Hardware Provider
    setGpsProviderStatus('checking');
    const isProviderOn = await LocationService.checkProviderEnabled();
    setGpsProviderStatus(isProviderOn ? 'connected' : 'unavailable');

    // 4. Initial Fix & Standby Watcher Activation (3s interval)
    setLocationAcquisitionStatus('checking');
    if (hasPermission && isProviderOn) {
      const fix = await LocationService.getCurrentLocation();
      if (fix) {
        setCurrentLocation(fix);
        setLocationAcquisitionStatus('connected');
      } else {
        setLocationAcquisitionStatus('unavailable');
      }

      // If user is logged in, start standby watcher (3-second cadence to Supabase)
      if (user) {
        const started = await LocationService.startStandbyWatcher(user.id, (reading) => {
          setCurrentLocation(reading);
          setLocationAcquisitionStatus('connected');
        });
        setStandbyActive(started);
      }
    } else {
      setLocationAcquisitionStatus('unavailable');
      setStandbyActive(false);
    }
  }, [user]);

  useEffect(() => {
    runSystemChecks();

    return () => {
      // Clean up standby watcher when leaving dashboard
      LocationService.stopStandbyWatcher();
    };
  }, [runSystemChecks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await runSystemChecks();
    setRefreshing(false);
  };

  const handleStartTrip = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to start tracking.');
      return;
    }

    if (gpsPermissionStatus !== 'connected') {
      Alert.alert(
        'GPS Permission Required',
        'KARP v1.0 requires high-accuracy foreground location permission to track your trip. Please grant permission in device settings.'
      );
      return;
    }

    if (gpsProviderStatus !== 'connected') {
      Alert.alert(
        'Location Services Disabled',
        'Please turn on your phone GPS / Location toggle in Android Quick Settings.'
      );
      return;
    }

    if (internetStatus !== 'connected' || supabaseStatus !== 'connected') {
      Alert.alert(
        'Network Connection Required',
        'A working internet connection to Supabase is required to start your journey.'
      );
      return;
    }

    try {
      setIsStartingTrip(true);
      // Automatically stops standby watcher and elevates to active trip
      const trip = await LocationService.startTrip(user.id);
      setIsStartingTrip(false);
      setStandbyActive(false);

      // Navigate to active trip screen
      router.push({
        pathname: '/active-trip',
        params: {
          tripId: trip.id,
          tripName: trip.trip_name,
          startedAt: trip.started_at,
        },
      });
    } catch (err: any) {
      setIsStartingTrip(false);
      Alert.alert('Failed to Start Trip', err?.message || 'An unexpected error occurred.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of KARP v1.0?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          LocationService.stopStandbyWatcher();
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const isReadyToStart =
    user &&
    gpsPermissionStatus === 'connected' &&
    gpsProviderStatus === 'connected' &&
    internetStatus === 'connected' &&
    supabaseStatus === 'connected';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <StellaLogo size="medium" />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* User & Live Clock Bar */}
        <View style={styles.statusBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.userLabel}>PILOT ACCOUNT</Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || 'Authenticated Pilot'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.userLabel}>TELEMETRY CLOCK</Text>
            <Text style={styles.clockText}>{formatTime(deviceTime)}</Text>
          </View>
        </View>

        {/* Standby Live Beacon Banner */}
        <View style={[styles.standbyBanner, standbyActive ? styles.standbyBannerActive : styles.standbyBannerStandby]}>
          <View style={[styles.pulseDot, standbyActive ? styles.pulseDotLive : styles.pulseDotIdle]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.standbyBannerTitle}>
              {standbyActive ? 'STANDBY TELEMETRY BROADCAST ACTIVE (3s)' : 'STANDBY TELEMETRY PAUSED'}
            </Text>
            <Text style={styles.standbyBannerSubtitle}>
              {standbyActive
                ? 'Position is syncing with web dashboard in real time'
                : 'Awaiting satellite lock or network sync'}
            </Text>
          </View>
        </View>

        {/* System Diagnostics Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>SYSTEM CONNECTION STATUS</Text>
            <TouchableOpacity onPress={runSystemChecks}>
              <Text style={styles.refreshLink}>Re-check</Text>
            </TouchableOpacity>
          </View>

          <StatusBadge label="Internet Connectivity" status={internetStatus} />
          <StatusBadge
            label="Supabase Server"
            status={supabaseStatus}
            customText={supabaseStatus === 'error' ? 'Connection Error' : undefined}
          />
          <StatusBadge label="GPS Location Permission" status={gpsPermissionStatus} />
          <StatusBadge label="Android GPS Provider" status={gpsProviderStatus} />
          <StatusBadge label="Satellite Fix" status={locationAcquisitionStatus} />
        </View>

        {/* Live Standby Telemetry Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>STANDBY POSITION & SENSORS</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>LATITUDE</Text>
              <Text style={styles.infoValue}>
                {currentLocation ? currentLocation.latitude.toFixed(6) : '--'}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>LONGITUDE</Text>
              <Text style={styles.infoValue}>
                {currentLocation ? currentLocation.longitude.toFixed(6) : '--'}
              </Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>GPS ACCURACY</Text>
              <Text style={styles.infoValue}>
                {currentLocation?.accuracy !== null && currentLocation?.accuracy !== undefined
                  ? `±${Math.round(currentLocation.accuracy)} m`
                  : '--'}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>CURRENT SPEED</Text>
              <Text style={styles.infoValue}>
                {currentLocation ? `${speedMpsToKmh(currentLocation.speed)} km/h` : '0.0 km/h'}
              </Text>
            </View>
          </View>

          <View style={styles.timestampRow}>
            <View>
              <Text style={styles.infoLabel}>LAST FIX TIME</Text>
              <Text style={styles.timestampText}>
                {currentLocation ? formatTime(currentLocation.timestamp) : 'Awaiting fix...'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoLabel}>BROADCAST CADENCE</Text>
              <Text style={[styles.timestampText, { color: THEME.colors.primary, fontWeight: '700' }]}>
                3 Seconds (Standby)
              </Text>
            </View>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.actionContainer}>
          {!isReadyToStart && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                Ensure Internet, Supabase, and Android GPS are connected before starting a journey.
              </Text>
            </View>
          )}

          <Button
            title="START TRIP (1s TRACKING)"
            onPress={handleStartTrip}
            loading={isStartingTrip}
            disabled={!isReadyToStart}
            style={styles.startBtn}
            textStyle={styles.startBtnText}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#0B3C5D15',
    borderWidth: 1,
    borderColor: '#0B3C5D30',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.navy,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  userLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginTop: 2,
  },
  clockText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 2,
  },
  standbyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 16,
    borderWidth: 1,
  },
  standbyBannerActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  standbyBannerStandby: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  pulseDotLive: {
    backgroundColor: '#10B981',
  },
  pulseDotIdle: {
    backgroundColor: '#94A3B8',
  },
  standbyBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.navy,
    letterSpacing: 0.5,
  },
  standbyBannerSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0EE',
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.navy,
    letterSpacing: 0.8,
  },
  refreshLink: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0EE',
  },
  timestampText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  actionContainer: {
    marginTop: 8,
  },
  noticeBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '600',
    textAlign: 'center',
  },
  startBtn: {
    height: 56,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.primary,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
});

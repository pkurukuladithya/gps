import React, { useEffect, useState, useCallback } from 'react';
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
import { formatCoordinates, speedMpsToKmh } from '../utils/geo';
import { formatTime, formatDateTime } from '../utils/time';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Live device clock
  const [deviceTime, setDeviceTime] = useState<Date>(new Date());

  // Connection states
  const [internetStatus, setInternetStatus] = useState<StatusType>('checking');
  const [supabaseStatus, setSupabaseStatus] = useState<StatusType>('checking');
  const [supabaseMessage, setSupabaseMessage] = useState<string>('');
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<StatusType>('checking');
  const [gpsProviderStatus, setGpsProviderStatus] = useState<StatusType>('checking');
  const [locationAcquisitionStatus, setLocationAcquisitionStatus] = useState<StatusType>('checking');

  // Preview GPS fix
  const [currentLocation, setCurrentLocation] = useState<LocationReading | null>(null);
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Full system check
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

    // 4. Location Acquisition
    setLocationAcquisitionStatus('checking');
    if (hasPermission && isProviderOn) {
      const fix = await LocationService.getCurrentLocation();
      if (fix) {
        setCurrentLocation(fix);
        setLocationAcquisitionStatus('connected');
      } else {
        setLocationAcquisitionStatus('unavailable');
      }
    } else {
      setLocationAcquisitionStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    runSystemChecks();
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
        'STELLA requires high-accuracy foreground location permission to track your trip. Please grant permission in device settings.'
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
        'A working internet connection to Supabase is required to create your active trip.'
      );
      return;
    }

    try {
      setIsStartingTrip(true);
      const trip = await LocationService.startTrip(user.id);
      setIsStartingTrip(false);

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
    Alert.alert('Sign Out', 'Are you sure you want to log out of STELLA?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
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
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* User & Live Clock Bar */}
        <View style={styles.statusBar}>
          <View>
            <Text style={styles.userLabel}>ACCOUNT</Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || 'Authenticated User'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.userLabel}>DEVICE CLOCK</Text>
            <Text style={styles.clockText}>{formatTime(deviceTime)}</Text>
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
          <StatusBadge label="Initial Satellite Fix" status={locationAcquisitionStatus} />
        </View>

        {/* Before-Trip Info Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>BEFORE-TRIP TELEMETRY</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>CURRENT LATITUDE</Text>
              <Text style={styles.infoValue}>
                {currentLocation ? currentLocation.latitude.toFixed(6) : '--'}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>CURRENT LONGITUDE</Text>
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
              <Text style={styles.infoLabel}>LAST GPS FIX TIME</Text>
              <Text style={styles.timestampText}>
                {currentLocation ? formatTime(currentLocation.timestamp) : 'Awaiting fix...'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoLabel}>LOCAL DATE</Text>
              <Text style={styles.timestampText}>{deviceTime.toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.actionContainer}>
          {!isReadyToStart && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                Ensure Internet, Supabase, and Android GPS are connected before starting a trip.
              </Text>
            </View>
          )}

          <Button
            title="START TRIP"
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#EBEBEB',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
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
    marginBottom: 16,
  },
  userLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
    maxWidth: 180,
  },
  clockText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
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
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
  },
  refreshLink: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
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
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    textAlign: 'center',
  },
  startBtn: {
    height: 56,
    borderRadius: THEME.borderRadius.md,
  },
  startBtnText: {
    fontSize: 18,
    letterSpacing: 1,
  },
});

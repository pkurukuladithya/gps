import * as Location from 'expo-location';
import { supabase } from './supabase';
import { isValidCoordinate } from '../utils/geo';

export interface LocationReading {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null; // in m/s
  timestamp: number;
}

export interface TripRecord {
  id: string;
  user_id: string;
  trip_name: string;
  status: 'active' | 'completed' | 'interrupted';
  started_at: string;
  ended_at?: string | null;
  created_at: string;
}

export class LocationService {
  private static retryQueue: Array<{
    trip_id: string | null;
    user_id: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    recorded_at: string;
  }> = [];
  private static isFlushingQueue = false;
  private static standbySubscription: Location.LocationSubscription | null = null;

  /**
   * Check and request foreground GPS permission.
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED;
    } catch (e) {
      console.error('Error requesting location permissions:', e);
      return false;
    }
  }

  /**
   * Check if location services (GPS hardware/provider) are enabled on the device.
   */
  static async checkProviderEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (e) {
      console.error('Error checking location provider:', e);
      return false;
    }
  }

  /**
   * Get single current position for preview / before-trip panel.
   */
  static async getCurrentLocation(): Promise<LocationReading | null> {
    try {
      const isEnabled = await this.checkProviderEnabled();
      if (!isEnabled) return null;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        speed: pos.coords.speed ?? null,
        timestamp: pos.timestamp,
      };
    } catch (e) {
      console.error('Error acquiring current location:', e);
      return null;
    }
  }

  /**
   * Start 3-second standby location transmission while user is logged in.
   */
  static async startStandbyWatcher(
    userId: string,
    onFix?: (reading: LocationReading) => void
  ): Promise<boolean> {
    if (this.standbySubscription) {
      // Already running
      return true;
    }

    try {
      const hasPerm = await this.requestPermissions();
      const isEnabled = await this.checkProviderEnabled();
      if (!hasPerm || !isEnabled) return false;

      this.standbySubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 3000, // 3-second standby interval
          distanceInterval: 0,
        },
        async (loc) => {
          const reading: LocationReading = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? null,
            speed: loc.coords.speed ?? null,
            timestamp: loc.timestamp,
          };

          if (onFix) onFix(reading);

          // Transmit standby live location (trip_id is null)
          await this.recordLocation(null, userId, reading);
        }
      );

      return true;
    } catch (e) {
      console.error('Failed to start standby location watcher:', e);
      return false;
    }
  }

  /**
   * Stop standby location transmission.
   */
  static stopStandbyWatcher(): void {
    if (this.standbySubscription) {
      this.standbySubscription.remove();
      this.standbySubscription = null;
    }
  }

  /**
   * Start a new active trip in Supabase.
   */
  static async startTrip(userId: string, tripName?: string): Promise<TripRecord> {
    // Stop standby transmission when elevating to active trip
    this.stopStandbyWatcher();

    const defaultName = tripName || `Trip ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const startedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        trip_name: defaultName,
        status: 'active',
        started_at: startedAt,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create trip in database: ${error?.message || 'Unknown error'}`);
    }

    return data as TripRecord;
  }

  /**
   * Stop an active trip in Supabase.
   */
  static async stopTrip(tripId: string, status: 'completed' | 'interrupted' = 'completed'): Promise<void> {
    const endedAt = new Date().toISOString();
    const { error } = await supabase
      .from('trips')
      .update({
        status,
        ended_at: endedAt,
      })
      .eq('id', tripId);

    if (error) {
      throw new Error(`Failed to update trip completion: ${error.message}`);
    }
  }

  /**
   * Insert GPS record into location_history with offline retry queue buffering.
   * Supports both active trips (with tripId) and standby telemetry (tripId = null).
   */
  static async recordLocation(
    tripId: string | null,
    userId: string,
    reading: LocationReading
  ): Promise<{ success: boolean; queued: boolean; error?: string }> {
    if (!isValidCoordinate(reading.latitude, reading.longitude)) {
      return { success: false, queued: false, error: 'Invalid coordinates' };
    }

    const payload = {
      trip_id: tripId || null,
      user_id: userId,
      latitude: reading.latitude,
      longitude: reading.longitude,
      accuracy: reading.accuracy,
      speed: reading.speed,
      recorded_at: new Date(reading.timestamp).toISOString(),
    };

    // If queue is non-empty, queue this item too to maintain ordering
    if (this.retryQueue.length > 0) {
      this.retryQueue.push(payload);
      this.flushQueue();
      return { success: true, queued: true };
    }

    try {
      const { error } = await supabase.from('location_history').insert({
        ...payload,
        received_at: new Date().toISOString(),
      });

      if (error) {
        // Enqueue for retry
        this.retryQueue.push(payload);
        return { success: false, queued: true, error: error.message };
      }

      return { success: true, queued: false };
    } catch (err: any) {
      this.retryQueue.push(payload);
      return { success: false, queued: true, error: err?.message || 'Network error' };
    }
  }

  /**
   * Flush any buffered offline/retry items to Supabase.
   */
  static async flushQueue(): Promise<void> {
    if (this.isFlushingQueue || this.retryQueue.length === 0) return;
    this.isFlushingQueue = true;

    try {
      while (this.retryQueue.length > 0) {
        const batch = this.retryQueue.slice(0, 20); // Flush in batches of 20
        const batchWithReceived = batch.map((item) => ({
          ...item,
          received_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from('location_history').insert(batchWithReceived);
        if (error) {
          // Break flush and retry on next cycle
          break;
        }

        // Remove uploaded items from queue
        this.retryQueue.splice(0, batch.length);
      }
    } catch (e) {
      console.warn('Queue flush temporarily failed, will retry:', e);
    } finally {
      this.isFlushingQueue = false;
    }
  }

  static getQueueLength(): number {
    return this.retryQueue.length;
  }
}

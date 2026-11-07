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
    trip_id: string;
    user_id: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    recorded_at: string;
  }> = [];
  private static isFlushingQueue = false;

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
   * Start a new trip in Supabase.
   */
  static async startTrip(userId: string, tripName?: string): Promise<TripRecord> {
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
   */
  static async recordLocation(
    tripId: string,
    userId: string,
    reading: LocationReading
  ): Promise<{ success: boolean; queued: boolean; error?: string }> {
    if (!isValidCoordinate(reading.latitude, reading.longitude)) {
      return { success: false, queued: false, error: 'Invalid coordinates' };
    }

    const payload = {
      trip_id: tripId,
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

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { MetricCard } from '../components/MetricCard';
import { StellaLogo } from '../components/StellaLogo';
import { THEME } from '../constants/theme';
import { formatElapsedTime, formatDateTime } from '../utils/time';

export default function TripSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tripId: string;
    tripName: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: string;
    totalDistanceKm: string;
    averageSpeedKmh: string;
    maxSpeedKmh: string;
    pointsCount: string;
  }>();

  const durationSec = parseInt(params.durationSeconds || '0', 10);
  const distance = params.totalDistanceKm || '0.00';
  const avgSpeed = params.averageSpeedKmh || '0.0';
  const maxSpeed = params.maxSpeedKmh || '0.0';
  const points = params.pointsCount || '0';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <StellaLogo size="medium" />
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>TRIP COMPLETED</Text>
          </View>
        </View>

        <View style={styles.tripNameCard}>
          <Text style={styles.tripNameLabel}>JOURNEY SUMMARY</Text>
          <Text style={styles.tripNameTitle}>{params.tripName || 'STELLA Journey'}</Text>
        </View>

        {/* Primary Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricWrapper}>
            <MetricCard
              title="Distance"
              value={distance}
              unit="km"
              highlight
            />
          </View>
          <View style={styles.metricWrapper}>
            <MetricCard
              title="Duration"
              value={formatElapsedTime(durationSec)}
            />
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricWrapper}>
            <MetricCard
              title="Avg Speed"
              value={avgSpeed}
              unit="km/h"
            />
          </View>
          <View style={styles.metricWrapper}>
            <MetricCard
              title="Max Speed"
              value={maxSpeed}
              unit="km/h"
            />
          </View>
        </View>

        {/* Detailed Timestamps & Counts Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>TRIP DETAILS</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>START TIME</Text>
            <Text style={styles.detailValue}>{formatDateTime(params.startedAt)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>END TIME</Text>
            <Text style={styles.detailValue}>{formatDateTime(params.endedAt)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>GPS POINTS RECORDED</Text>
            <Text style={styles.detailValue}>{points} coordinate fixes</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>CLOUD STATUS</Text>
            <Text style={[styles.detailValue, { color: THEME.colors.success }]}>
              Synced to Supabase
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Button
            title="BACK TO DASHBOARD"
            variant="primary"
            onPress={() => router.replace('/dashboard')}
            style={styles.doneBtn}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  completedBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: THEME.colors.success,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.sm,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  tripNameCard: {
    backgroundColor: THEME.colors.surface,
    padding: 16,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  tripNameLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
  },
  tripNameTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metricWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  detailsCard: {
    backgroundColor: THEME.colors.surface,
    padding: 16,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 4,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0EE',
    paddingBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  actionContainer: {
    marginTop: 8,
  },
  doneBtn: {
    height: 52,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, highlight }) => {
  return (
    <View style={[styles.card, highlight && styles.highlightCard]}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, highlight && styles.highlightValue]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  highlightCard: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#FFFCF0',
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  highlightValue: {
    color: '#000000',
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
});

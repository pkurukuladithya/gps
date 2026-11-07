import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

export type StatusType =
  | 'connected'
  | 'disconnected'
  | 'checking'
  | 'permission_required'
  | 'unavailable'
  | 'error';

interface StatusBadgeProps {
  label: string;
  status: StatusType;
  customText?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, status, customText }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return THEME.colors.success;
      case 'checking':
        return THEME.colors.warning;
      case 'permission_required':
      case 'error':
        return THEME.colors.error;
      case 'disconnected':
      case 'unavailable':
      default:
        return THEME.colors.textMuted;
    }
  };

  const getStatusLabel = () => {
    if (customText) return customText;
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'checking':
        return 'Checking...';
      case 'permission_required':
        return 'Permission Required';
      case 'unavailable':
        return 'Unavailable';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
    }
  };

  const color = getStatusColor();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.badge}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color }]}>{getStatusLabel()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

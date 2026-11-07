import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

interface StellaLogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
}

export const StellaLogo: React.FC<StellaLogoProps> = ({ size = 'medium', showSubtitle = true }) => {
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 56;
      default:
        return 44;
    }
  };

  const getTitleSize = () => {
    switch (size) {
      case 'small':
        return 18;
      case 'large':
        return 30;
      default:
        return 24;
    }
  };

  const iconDim = getIconSize();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { width: iconDim, height: iconDim, borderRadius: iconDim / 2 }]}>
        <View style={styles.pulseRing} />
        <View style={styles.corePin} />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.brandRow}>
          <Text style={[styles.title, { fontSize: getTitleSize() }]}>STELLA</Text>
          <View style={styles.liveTag}>
            <Text style={styles.liveText}>GPS</Text>
          </View>
        </View>
        {showSubtitle && (
          <Text style={styles.subtitle}>Smart Tracking & Location Live Analytics</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#F5C400',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  pulseRing: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    opacity: 0.8,
  },
  corePin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.text,
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: '900',
    color: THEME.colors.text,
    letterSpacing: 1.5,
  },
  liveTag: {
    backgroundColor: THEME.colors.text,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  liveText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
});

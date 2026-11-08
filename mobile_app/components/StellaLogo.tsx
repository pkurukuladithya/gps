import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { THEME } from '../constants/theme';

interface KarpLogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
}

export const KarpLogo: React.FC<KarpLogoProps> = ({ size = 'medium', showSubtitle = true }) => {
  const getIconDim = () => {
    switch (size) {
      case 'small':
        return 36;
      case 'large':
        return 64;
      default:
        return 48;
    }
  };

  const getTitleSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 32;
      default:
        return 26;
    }
  };

  const iconDim = getIconDim();

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/app_icon.jpg')}
        style={[styles.iconImage, { width: iconDim, height: iconDim, borderRadius: iconDim * 0.22 }]}
        resizeMode="contain"
      />
      <View style={styles.textContainer}>
        <View style={styles.brandRow}>
          <Text style={[styles.titleK, { fontSize: getTitleSize() }]}>K</Text>
          <Text style={[styles.titleA, { fontSize: getTitleSize() }]}>A</Text>
          <Text style={[styles.titleR, { fontSize: getTitleSize() }]}>R</Text>
          <Text style={[styles.titleP, { fontSize: getTitleSize() }]}>P</Text>
          <View style={styles.vTag}>
            <Text style={styles.vText}>v1.0</Text>
          </View>
        </View>
        {showSubtitle && (
          <Text style={styles.subtitle}>smart adas • cruise system • fleet</Text>
        )}
      </View>
    </View>
  );
};

// Backwards-compatible alias
export const StellaLogo = KarpLogo;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconImage: {
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleK: {
    fontWeight: '900',
    color: '#FF5500', // KARP Orange
    letterSpacing: 0.5,
  },
  titleA: {
    fontWeight: '900',
    color: '#FF5500',
    letterSpacing: 0.5,
  },
  titleR: {
    fontWeight: '900',
    color: '#0B3C5D', // KARP Navy
    letterSpacing: 0.5,
  },
  titleP: {
    fontWeight: '900',
    color: '#0B3C5D',
    letterSpacing: 0.5,
  },
  vTag: {
    backgroundColor: '#FF5500',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  vText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
});

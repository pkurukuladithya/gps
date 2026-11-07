import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { StellaLogo } from '../components/StellaLogo';
import { THEME } from '../constants/theme';

export default function IndexScreen() {
  const { session, loading } = useAuth();

  // Once loading completes, use Expo Router's declarative Redirect component
  if (!loading) {
    if (session) {
      return <Redirect href="/dashboard" />;
    } else {
      return <Redirect href="/(auth)/login" />;
    }
  }

  // Initial loading splash view
  return (
    <View style={styles.container}>
      <StellaLogo size="large" />
      <ActivityIndicator
        size="large"
        color={THEME.colors.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  spinner: {
    marginTop: 32,
  },
});

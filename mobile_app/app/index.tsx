import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { StellaLogo } from '../components/StellaLogo';
import { THEME } from '../constants/theme';

export default function IndexScreen() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/dashboard');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [session, loading, router]);

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

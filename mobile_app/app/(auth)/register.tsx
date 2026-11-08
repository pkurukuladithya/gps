import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { StellaLogo } from '../../components/StellaLogo';
import { Button } from '../../components/Button';
import { THEME } from '../../constants/theme';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email confirmation link state
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const { signUp } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    setErrorMessage(null);

    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { data, error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message || 'Failed to create account.');
    } else if (data?.session) {
      // Auto signed in (if email confirmations are disabled)
      router.replace('/dashboard');
    } else {
      // Email link sent
      setRegisteredEmail(email.trim());
      setIsEmailSent(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <StellaLogo size="large" />
            <Text style={styles.subtitle}>
              {isEmailSent
                ? 'Email Verification Required'
                : 'Create your KARP v1.0 account'}
            </Text>
          </View>

          <View style={styles.card}>
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {isEmailSent ? (
              /* EMAIL CONFIRMATION NOTICE */
              <View style={styles.noticeContainer}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconSymbol}>✉</Text>
                </View>

                <Text style={styles.noticeTitle}>Check Your Email</Text>
                <Text style={styles.noticeDescription}>
                  We have sent an activation link to:
                </Text>
                <Text style={styles.targetEmail}>{registeredEmail}</Text>

                <View style={styles.instructionBox}>
                  <Text style={styles.instructionText}>
                    1. Open the email in your phone or browser.
                  </Text>
                  <Text style={styles.instructionText}>
                    2. Tap the <Text style={{ fontWeight: '800' }}>Confirm email address</Text> button.
                  </Text>
                  <Text style={styles.instructionText}>
                    3. Return here and sign in with your credentials.
                  </Text>
                </View>

                <Button
                  title="PROCEED TO SIGN IN"
                  onPress={() => router.replace('/(auth)/login')}
                  style={styles.submitBtn}
                />

                <TouchableOpacity
                  onPress={() => {
                    setIsEmailSent(false);
                    setErrorMessage(null);
                  }}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>Wrong email? Register again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* REGISTRATION CREDENTIALS STEP */
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PILOT EMAIL</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="pilot@karp.com"
                    placeholderTextColor={THEME.colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setErrorMessage(null);
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor={THEME.colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setErrorMessage(null);
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CONFIRM PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat password"
                    placeholderTextColor={THEME.colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setErrorMessage(null);
                    }}
                  />
                </View>

                <Button
                  title="CREATE ACCOUNT"
                  onPress={handleRegister}
                  loading={loading}
                  style={styles.submitBtn}
                />

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Already registered? </Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                    <Text style={styles.linkText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: THEME.borderRadius.sm,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  noticeContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconSymbol: {
    fontSize: 26,
    color: '#059669',
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.navy,
    marginBottom: 6,
  },
  noticeDescription: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  targetEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.navy,
    marginTop: 2,
    marginBottom: 16,
  },
  instructionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 12,
    color: '#334155',
    marginVertical: 3,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    fontSize: 14,
    color: THEME.colors.text,
  },
  submitBtn: {
    marginTop: 8,
    height: 50,
    width: '100%',
  },
  backBtn: {
    marginTop: 14,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});

import React, { useState, useEffect } from 'react';
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP Verification state
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { signUp, verifyOtp, resendOtp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRegister = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

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
      // Move to OTP Step
      setIsOtpStep(true);
      setResendCooldown(60);
      setSuccessMessage(`A 6-digit verification code has been sent to ${email.trim()}.`);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    const { error, session } = await verifyOtp(email, cleanOtp);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message || 'Invalid verification code. Please check and try again.');
    } else {
      setSuccessMessage('Email verified successfully! Logging you in...');
      setTimeout(() => {
        router.replace('/dashboard');
      }, 1000);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    setLoading(true);
    const { error } = await resendOtp(email);
    setLoading(false);
    if (error) {
      setErrorMessage(error.message || 'Failed to resend code.');
    } else {
      setResendCooldown(60);
      setSuccessMessage('A new 6-digit code has been sent to your email.');
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
              {isOtpStep
                ? 'Verify Your Email Address'
                : 'Create your KARP v1.0 account'}
            </Text>
          </View>

          <View style={styles.card}>
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {isOtpStep ? (
              /* OTP VERIFICATION STEP */
              <View>
                <Text style={styles.otpInstructions}>
                  Enter the 6-digit one-time password (OTP) sent to:
                </Text>
                <Text style={styles.targetEmail}>{email}</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>6-DIGIT VERIFICATION CODE</Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="000000"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={(t) => {
                      setOtpCode(t);
                      setErrorMessage(null);
                    }}
                  />
                </View>

                <Button
                  title="VERIFY & SIGN IN"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  style={styles.submitBtn}
                />

                <View style={styles.otpActions}>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendCooldown > 0}
                  >
                    <Text
                      style={[
                        styles.resendText,
                        resendCooldown > 0 && styles.resendDisabled,
                      ]}
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : 'Resend Verification Code'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsOtpStep(false);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    style={styles.backEmailBtn}
                  >
                    <Text style={styles.backEmailText}>Edit email address</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* REGISTRATION CREDENTIALS STEP */
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
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
                  title="REGISTER"
                  onPress={handleRegister}
                  loading={loading}
                  style={styles.submitBtn}
                />

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Already have an account? </Text>
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
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 10,
    fontWeight: '500',
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: THEME.colors.error,
    borderWidth: 1,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 16,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
  },
  successContainer: {
    backgroundColor: '#ECFDF5',
    borderColor: THEME.colors.success,
    borderWidth: 1,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 16,
  },
  successText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
  },
  otpInstructions: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  targetEmail: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    fontSize: 15,
    color: THEME.colors.text,
    backgroundColor: '#FAFAFA',
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '800',
    color: '#0F172A',
  },
  submitBtn: {
    marginTop: 8,
  },
  otpActions: {
    marginTop: 18,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  resendDisabled: {
    color: THEME.colors.textMuted,
  },
  backEmailBtn: {
    marginTop: 12,
  },
  backEmailText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textDecorationLine: 'underline',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
    textDecorationLine: 'underline',
  },
});

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, KeyRound, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { signIn, signUp, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError('Please provide your email address and password.');
      return;
    }

    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      navigate('/');
    }
  };

  const handleRegisterInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await signUp(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    if (res.data?.session) {
      // Auto-confirmed in Supabase settings
      navigate('/');
      return;
    }

    // Move to 6-digit OTP step
    setRegisterStep('otp');
    setResendCooldown(60);
    setSuccess(`A 6-digit confirmation code was sent to ${email.trim()}.`);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanToken = otpCode.trim().replace(/\D/g, '');
    if (cleanToken.length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setLoading(true);
    const res = await verifyOtp(email, cleanToken);
    setLoading(false);

    if (res.error) {
      setError(res.error.message || 'Invalid or expired OTP code. Please try again.');
      return;
    }

    setSuccess('Email successfully verified! Entering dashboard...');
    setTimeout(() => {
      navigate('/');
    }, 800);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setError(null);
    setResending(true);

    const res = await resendOtp(email);
    setResending(false);

    if (res.error) {
      setError(res.error.message || 'Failed to resend code.');
    } else {
      setSuccess('A new 6-digit OTP has been dispatched to your email.');
      setResendCooldown(60);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img
              src="/app_icon.jpg"
              alt="KARP Logo"
              className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-navy/20"
            />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-3xl font-black tracking-wider text-navy">KARP</h1>
            <span className="bg-primary text-white text-xs font-extrabold px-2 py-0.5 rounded shadow-sm">
              v1.0 ADAS
            </span>
          </div>
          <p className="text-xs text-muted mt-1 font-semibold uppercase tracking-wider">
            Smart ADAS • Cruise System • Fleet Telemetry
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8">
          {/* Mode Switcher Tabs (when not in OTP step) */}
          {registerStep === 'form' ? (
            <div className="flex border-b border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 pb-3 text-sm font-extrabold transition border-b-2 ${
                  !isRegister
                    ? 'border-primary text-navy'
                    : 'border-transparent text-slate-400 hover:text-navy'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 pb-3 text-sm font-extrabold transition border-b-2 ${
                  isRegister
                    ? 'border-primary text-navy'
                    : 'border-transparent text-slate-400 hover:text-navy'
                }`}
              >
                Pilot Registration
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
              <button
                type="button"
                onClick={() => {
                  setRegisterStep('form');
                  setError(null);
                  setSuccess(null);
                }}
                className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-navy"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>
              <span className="text-xs font-extrabold text-navy uppercase tracking-wider">
                Step 2 of 2: OTP Verification
              </span>
            </div>
          )}

          {/* Feedback alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3.5 rounded-xl mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl mb-4 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* 1. Sign In Form */}
          {!isRegister && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Pilot Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pilot@karp.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-slate-900 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-primary hover:bg-primary-dark text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating Pilot...' : 'Sign In to KARP v1.0'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* 2. Registration Step 1: Form */}
          {isRegister && registerStep === 'form' && (
            <form onSubmit={handleRegisterInitiate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Pilot Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pilot@karp.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-slate-900 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-primary hover:bg-primary-dark text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'Submitting...' : 'Send 6-Digit OTP Code'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* 3. Registration Step 2: 6-Digit OTP Verification */}
          {isRegister && registerStep === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    6-Digit OTP Code
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Sent to: <b className="text-navy">{email}</b>
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-9 pr-3 py-2.5 text-lg font-mono tracking-widest text-center bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-navy font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Check your inbox or spam folder for the one-time code. No magic link redirection required!
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.trim().length !== 6}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'Verifying OTP...' : 'Verify & Enter Dashboard'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || resending}
                  onClick={handleResendOtp}
                  className="text-xs font-bold text-navy hover:text-primary transition disabled:opacity-40 flex items-center justify-center space-x-1 mx-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend OTP code in ${resendCooldown}s`
                      : resending
                      ? 'Sending new code...'
                      : 'Resend 6-Digit OTP Code'}
                  </span>
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Secured with Supabase Email OTP & Row-Level Security
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, CheckCircle2, MailCheck, ArrowLeft } from 'lucide-react';

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

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

  const handleRegister = async (e: React.FormEvent) => {
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

    // Email confirmation link was dispatched by Supabase
    setRegisteredEmail(email.trim());
    setShowEmailSent(true);
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
          {/* 1. Email Sent Notice State */}
          {showEmailSent ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
                <MailCheck className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-black text-navy mb-2">Check Your Email</h2>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                We have sent an activation link to:
                <br />
                <b className="text-navy font-bold">{registeredEmail}</b>
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 text-left mb-6 space-y-2">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Click the <b>Confirm email address</b> button in your email inbox.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>The link will redirect to your KARP dashboard and activate your account.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowEmailSent(false);
                  setIsRegister(false);
                  setError(null);
                  setSuccess('Once you click the link in your email, sign in here to access your dashboard.');
                }}
                className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition shadow-sm"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEmailSent(false);
                  setIsRegister(true);
                  setError(null);
                }}
                className="mt-3 text-xs font-bold text-slate-500 hover:text-navy transition flex items-center justify-center space-x-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Wrong email address? Register again</span>
              </button>
            </div>
          ) : (
            <>
              {/* Mode Switcher Tabs */}
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

              {/* 2. Sign In Form */}
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

              {/* 3. Registration Form */}
              {isRegister && (
                <form onSubmit={handleRegister} className="space-y-4">
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
                    <span>{loading ? 'Submitting Registration...' : 'Create Account'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Secured with Supabase Auth & Row-Level Security
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isRegister) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
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
      } else if (res.data?.session) {
        navigate('/');
      } else {
        setSuccess('Account created! Please sign in with your credentials.');
        setIsRegister(false);
      }
    } else {
      setLoading(true);
      const res = await signIn(email, password);
      setLoading(false);

      if (res.error) {
        setError(res.error.message);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center shadow-md mb-3">
            <div className="w-7 h-7 rounded-full bg-charcoal flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider text-charcoal">STELLA</h1>
          <p className="text-sm text-muted mt-1 font-medium">
            Smart Tracking, Exploration & Location Live Analytics
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl border border-borderline shadow-sm p-8">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-borderline mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold transition border-b-2 ${
                !isRegister
                  ? 'border-primary text-charcoal'
                  : 'border-transparent text-muted hover:text-charcoal'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold transition border-b-2 ${
                isRegister
                  ? 'border-primary text-charcoal'
                  : 'border-transparent text-muted hover:text-charcoal'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold p-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-canvas border border-borderline rounded-lg focus:outline-none focus:border-primary text-charcoal font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-canvas border border-borderline rounded-lg focus:outline-none focus:border-primary text-charcoal font-medium"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-canvas border border-borderline rounded-lg focus:outline-none focus:border-primary text-charcoal font-medium"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary hover:bg-primary-dark text-charcoal font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In to STELLA'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-borderline text-center">
            <span className="text-[11px] text-muted flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Secured with Supabase Email Auth & Row-Level Security
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null; session: Session | null }>;
  resendOtp: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, data: null }),
  verifyOtp: async () => ({ error: null, session: null }),
  resendOtp: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // Hard safety timer: ensure loading never hangs past 1.5 seconds under any circumstance
    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 1500);

    // 1. Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('KARP Auth: session retrieval error:', err);
        if (isMounted) setLoading(false);
      });

    // 2. Listen for auth state changes
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      });

      return () => {
        isMounted = false;
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    } catch (e) {
      if (isMounted) setLoading(false);
      return () => {
        isMounted = false;
        clearTimeout(timeout);
      };
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'signup',
      });
      if (error) {
        // Fallback to 'email' type if 'signup' is not accepted
        const fallback = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'email',
        });
        if (fallback.error) return { error: fallback.error, session: null };
        if (fallback.data?.session) {
          setSession(fallback.data.session);
          setUser(fallback.data.session.user);
        }
        return { error: null, session: fallback.data?.session || null };
      }
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      return { error: null, session: data?.session || null };
    } catch (err: any) {
      return { error: err, session: null };
    }
  };

  const resendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, verifyOtp, resendOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

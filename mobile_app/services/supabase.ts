import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Safe polyfill check
try {
  if (typeof URL === 'undefined') {
    require('react-native-url-polyfill/auto');
  }
} catch (e) {}

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Fallback to valid URL structure so createClient never throws an uncaught startup exception
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

export const isConfigured = Boolean(rawUrl && rawKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Perform a real lightweight query against Supabase to verify server connectivity.
 */
export async function checkSupabaseConnection(): Promise<{ connected: boolean; message: string }> {
  if (!isConfigured) {
    return {
      connected: false,
      message: 'Supabase credentials missing. Check GitHub Secrets or .env',
    };
  }

  try {
    const { error } = await supabase.from('trips').select('id').limit(1);
    // If no error, or RLS denies access (which still means server is reachable)
    if (!error || error.code === '42501' || error.message.includes('row-level security')) {
      return { connected: true, message: 'Supabase Connected' };
    }
    return { connected: false, message: error.message };
  } catch (err: any) {
    return { connected: false, message: err?.message || 'Connection failed' };
  }
}

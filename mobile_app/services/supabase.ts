import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'STELLA: Supabase environment variables (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) are missing.'
  );
}

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

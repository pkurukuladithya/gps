import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'STELLA Frontend: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export async function checkDatabaseHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.from('trips').select('id').limit(1);
    if (!error || error.code === '42501' || error.message.includes('row-level security')) {
      return { ok: true, message: 'Database online' };
    }
    return { ok: false, message: error.message };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection failed' };
  }
}

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { checkSupabaseConnection } from './supabase';

export interface SystemStatus {
  internet: 'checking' | 'connected' | 'disconnected';
  supabase: 'checking' | 'connected' | 'disconnected' | 'error';
  supabaseMessage?: string;
}

export async function checkNetworkState(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export function subscribeToNetworkState(callback: (isConnected: boolean) => void) {
  return NetInfo.addEventListener((state: NetInfoState) => {
    callback(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}

export async function performFullSystemHealthCheck(): Promise<SystemStatus> {
  const isNetConnected = await checkNetworkState();
  if (!isNetConnected) {
    return {
      internet: 'disconnected',
      supabase: 'disconnected',
      supabaseMessage: 'No internet connection',
    };
  }

  const supa = await checkSupabaseConnection();
  return {
    internet: 'connected',
    supabase: supa.connected ? 'connected' : 'error',
    supabaseMessage: supa.message,
  };
}

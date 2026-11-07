import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const STELLA_KEEP_AWAKE_TAG = 'STELLA_ACTIVE_TRIP';

/**
 * Hook to manage screen keep-awake state during active tracking.
 * Automatically activates when isActive is true, and cleans up when false or on unmount.
 */
export function useKeepAwakeTrip(isActive: boolean) {
  useEffect(() => {
    if (isActive) {
      activateKeepAwakeAsync(STELLA_KEEP_AWAKE_TAG).catch((err) => {
        console.warn('Failed to activate keep awake:', err);
      });
    } else {
      deactivateKeepAwake(STELLA_KEEP_AWAKE_TAG).catch(() => {});
    }

    return () => {
      deactivateKeepAwake(STELLA_KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [isActive]);
}

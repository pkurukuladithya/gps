import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

const TIMEOUT_DURATION_MS = 20 * 60 * 1000; // 20 minutes

export function useInactivityTimeout(onTimeout?: () => void) {
  const { user, signOut } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        console.warn('Session expired due to 20 minutes of inactivity.');
        if (onTimeout) {
          onTimeout();
        }
        await signOut();
      }, TIMEOUT_DURATION_MS);
    };

    // Events to monitor user presence
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, signOut, onTimeout]);
}

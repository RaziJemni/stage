import { useEffect, useRef } from 'react';

/** Run periodic refreshes only while the tab is visible. */
export function useVisiblePolling(
  refresh: () => void | Promise<void>,
  intervalMs: number,
): void {
  const refreshRef = useRef(refresh);
  const inFlightRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const run = () => {
      if (document.hidden || inFlightRef.current) return;
      inFlightRef.current = true;
      void Promise.resolve(refreshRef.current())
        .catch(() => undefined)
        .finally(() => {
          inFlightRef.current = false;
        });
    };
    const onVisibilityChange = () => {
      if (!document.hidden) run();
    };

    const interval = window.setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs]);
}

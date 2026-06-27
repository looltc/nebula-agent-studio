import { useEffect, useRef } from 'react';

/**
 * Polls an async function at a fixed interval. Skips overlapping calls.
 * Pass `enabled: false` to pause.
 */
export function usePolling(
  fn: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
  deps: unknown[] = [],
): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const tick = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await fnRef.current();
      } finally {
        inFlight.current = false;
      }
    };

    const id = setInterval(() => {
      if (!cancelled) void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled, ...deps]);
}

export default usePolling;

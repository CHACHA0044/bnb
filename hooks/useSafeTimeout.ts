import { useEffect, useRef, useCallback, useMemo } from "react";

/**
 * A hook that provides a safe way to use setTimeout that auto-cleans on unmount.
 */
export function useSafeTimeout() {
  const timeouts = useRef<any[]>([]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timeouts.current.forEach(t => window.clearTimeout(t));
    };
  }, []);

  const safeSetTimeout = useCallback((handler: TimerHandler, timeout?: number) => {
    const t = window.setTimeout(handler, timeout);
    timeouts.current.push(t);
    return t;
  }, []);

  const safeClearTimeout = useCallback((t: any) => {
    window.clearTimeout(t);
    timeouts.current = timeouts.current.filter(timer => timer !== t);
  }, []);

  return useMemo(() => ({ setTimeout: safeSetTimeout, clearTimeout: safeClearTimeout }), [safeSetTimeout, safeClearTimeout]);
}

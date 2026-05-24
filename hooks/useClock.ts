"use client";

import { useState, useEffect } from "react";

/**
 * A centralized clock hook that provides the current timestamp every second.
 * This prevents multiple intervals from running in different components.
 */
export function useClock() {
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return now;
}

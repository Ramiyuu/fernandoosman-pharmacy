'use client';

import { useEffect, useRef } from 'react';

/** Calls `callback` once `delay` ms have passed without `trigger` changing. */
export function useDebouncedEffect(callback: () => void, trigger: unknown, delay: number, enabled = true) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => callbackRef.current(), delay);
    return () => window.clearTimeout(timer);
  }, [trigger, delay, enabled]);
}

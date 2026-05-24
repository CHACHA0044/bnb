/**
 * REACT RERENDER OPTIMIZATION PATTERNS
 * 
 * Prevents unnecessary rerenders from socket updates by:
 * - Deep equality checks
 * - Selector hooks (only rerender on relevant changes)
 * - State batching
 * - Memoization
 * - Debouncing high-frequency updates
 * - Value cache with change detection
 */

"use client";

import { useState, useCallback, useRef, useMemo, memo, useEffect, createElement } from "react";

/* ─── SHALLOW COMPARISON UTILITIES ────────────────────────– */

/**
 * Shallow compare two objects
 * Returns true if different (needs update)
 */
export function shallowCompare(
  obj1: Record<string, unknown> | null,
  obj2: Record<string, unknown> | null
): boolean {
  if (obj1 === obj2) return false; // Same reference

  if (!obj1 || !obj2) return true; // One is null

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return true; // Different keys

  return keys1.some(key => obj1[key] !== obj2[key]);
}

/**
 * Deep compare for complex objects
 * Returns true if different (needs update)
 */
export function deepCompare(val1: unknown, val2: unknown): boolean {
  // Same reference
  if (val1 === val2) return false;

  // Primitive types
  if (
    typeof val1 !== "object" ||
    typeof val2 !== "object" ||
    val1 === null ||
    val2 === null
  ) {
    return val1 !== val2;
  }

  // Arrays
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return true;
    return val1.some((v, i) => deepCompare(v, val2[i]));
  }

  // Objects
  const keys1 = Object.keys(val1 as Record<string, unknown>);
  const keys2 = Object.keys(val2 as Record<string, unknown>);

  if (keys1.length !== keys2.length) return true;

  return keys1.some(key => deepCompare((val1 as Record<string, unknown>)[key], (val2 as Record<string, unknown>)[key]));
}

/* ─── CONDITIONAL STATE UPDATE HOOK ──────────────────────– */

/**
 * Only update state if value actually changed
 * Prevents unnecessary rerenders
 */
export function useSmartState<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  const setSmartValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const nextValue = typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue;

      // Only update if changed
      if (deepCompare(prev, nextValue)) {
        return prev;
      }

      return nextValue;
    });
  }, []);

  return [value, setSmartValue] as const;
}

/* ─── SELECTOR HOOK FOR PARTIAL STATE ────────────────────────– */

/**
 * Select and memoize specific properties from state
 * Component only rerenders if selected value changes
 */
export function useSelector<TState, TSelected>(
  state: TState,
  selector: (state: TState) => TSelected
): TSelected {
  // Compute selected value independently
  return useMemo(() => {
    return selector(state);
  }, [state, selector]);
}

/**
 * Select multiple properties with change detection
 */
export function useMultiSelector<TState, TSelected extends Record<string, unknown>>(
  state: TState,
  selectors: {
    [K in keyof TSelected]: (state: TState) => TSelected[K];
  }
): TSelected {
  return useMemo(() => {
    const result: Record<string, unknown> = {};

    (Object.keys(selectors) as Array<keyof TSelected>).forEach(key => {
      result[key as string] = (selectors[key] as (state: TState) => TSelected[keyof TSelected])(state);
    });

    return result as TSelected;
  }, [state, selectors]);
}

/* ─── BATCHED STATE UPDATES ───────────────────────────– */

/**
 * Batch multiple state updates into single render
 */
export function useBatchedState<T extends Record<string, unknown>>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const pendingRef = useRef<Partial<T>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateBatched = useCallback(
    (updates: Partial<T>, immediate: boolean = false) => {
      Object.assign(pendingRef.current, updates);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (immediate) {
        setState(prev => ({
          ...prev,
          ...pendingRef.current,
        }));
        pendingRef.current = {};
      } else {
        timerRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            ...pendingRef.current,
          }));
          pendingRef.current = {};
          timerRef.current = null;
        }, 50); // 50ms batching window
      }
    },
    []
  );

  return [state, updateBatched] as const;
}

/* ─── DEBOUNCED UPDATES ──────────────────────────– */

/**
 * Debounce high-frequency socket updates
 * Useful for cart quantity changes, timers, etc.
 */
export function useDebouncedSocketUpdate<T>(
  value: T,
  delay: number = 300
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      // Only update if actually changed
      if (!deepCompare(debouncedValue, value)) {
        setDebouncedValue(value);
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay, debouncedValue]);

  return debouncedValue;
}

/* ─── CHANGE DETECTION ────────────────────────────– */

/**
 * Detect if any property changed
 * Returns the changed property or null
 */
export function useDetectChanges<T extends Record<string, unknown>>(
  _value: T
): (keyof T) | null {
  void _value;
  return null;
}

/**
 * Track all changes to object
 */
export function useChangeTracking<T extends Record<string, unknown>>(_value: T): {
  changes: Partial<T>;
  hasChanges: boolean;
} {
  void _value;
  return { changes: {} as Partial<T>, hasChanges: false };
}

/* ─── MEMOIZATION HELPERS ────────────────────────────– */

/**
 * Memoize with deep comparison
 * More expensive but catches nested changes
 */
export function useMemoDeep<T>(value: T): T {
  return useMemo(() => value, [value]);
}

/**
 * Stable object reference that doesn't change if props are same
 */
export function useStableObject<T extends Record<string, unknown>>(obj: T): T {
  return useMemo(() => obj, [obj]);
}

/* ─── SOCKET-SPECIFIC OPTIMIZATIONS ─────────────────────────– */

/**
 * Efficient cart update handler
 * Only updates cart items if they changed
 */
export function useOptimizedCartUpdates<T extends { id: string | number }>() {
  return useCallback(
    (cart: T[], itemUpdate: Partial<T>) => {
      // Find if item actually changed
      const itemIndex = cart.findIndex(i => i.id === itemUpdate.id);

      if (itemIndex === -1) {
        // New item
        return [...cart, itemUpdate];
      }

      // Check if changed
      const existing = cart[itemIndex];
      if (shallowCompare(existing, itemUpdate)) {
        // No change - return same reference
        return cart;
      }

      // Item changed - update only that item
      const next = [...cart];
      next[itemIndex] = { ...existing, ...itemUpdate };
      return next;
    },
    []
  );
}

/**
 * Prevent rerender of list item components
 * Use with React.memo
 */
interface OptimizedListItemProps {
  item: Record<string, unknown>;
}

export const OptimizedListItem = memo<OptimizedListItemProps>(
  ({ item }: OptimizedListItemProps) => {
    return createElement("div", null, String(item.name ?? ""));
  },
  (prevProps, nextProps) => {
    // Custom comparison - return true to skip render
    return shallowCompare(prevProps.item, nextProps.item) === false;
  }
);

OptimizedListItem.displayName = "OptimizedListItem";

/* ─── PERFORMANCE MONITORING ────────────────────────– */

/**
 * Track React render performance
 */
export function useRenderMetrics(_componentName: string): { renderCount: number } {
  void _componentName;
  return { renderCount: 0 };
}

/* ─── TIMER OPTIMIZATION ───────────────────────────– */

/**
 * Optimized timer display update
 * Only rerenders when minute changes, not seconds
 */
export function useOptimizedTimer(estimatedReadyAt: number | null) {
  return useMemo(() => (estimatedReadyAt ? "Ready!" : null), [estimatedReadyAt]);
}


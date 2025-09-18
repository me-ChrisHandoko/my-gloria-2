import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Throttle a value with configurable delay
 * Useful for limiting the rate of state updates
 *
 * @param value - The value to throttle
 * @param delay - Throttle delay in milliseconds
 * @returns The throttled value
 */
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

/**
 * Throttle a callback function
 * Ensures the callback is called at most once per specified interval
 *
 * @param callback - The function to throttle
 * @param delay - Throttle delay in milliseconds
 * @param options - Throttle options
 * @returns Throttled callback function
 */
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options;

  const lastRan = useRef<number>(0);
  const lastArgs = useRef<Parameters<T> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref on every render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRan.current;

      // Store args for potential trailing call
      lastArgs.current = args;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Leading edge execution
      if (leading && timeSinceLastRun >= delay) {
        callbackRef.current(...args);
        lastRan.current = now;
        lastArgs.current = null;
      }
      // Schedule trailing edge execution
      else if (trailing) {
        const remainingTime = delay - timeSinceLastRun;

        timeoutRef.current = setTimeout(() => {
          if (lastArgs.current) {
            callbackRef.current(...lastArgs.current);
            lastRan.current = Date.now();
            lastArgs.current = null;
          }
          timeoutRef.current = null;
        }, remainingTime);
      }
    },
    [delay, leading, trailing]
  );
}

/**
 * Advanced throttle hook with additional features
 * Provides more control over throttling behavior
 */
export function useAdvancedThrottle<T>(
  value: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
    equalityFn?: (a: T, b: T) => boolean;
  } = {}
) {
  const {
    leading = true,
    trailing = true,
    maxWait,
    equalityFn = (a, b) => a === b,
  } = options;

  const [throttledValue, setThrottledValue] = useState<T>(value);
  const [isThrottled, setIsThrottled] = useState(false);

  const lastValue = useRef<T>(value);
  const lastRan = useRef(Date.now());
  const maxWaitTimeout = useRef<NodeJS.Timeout | null>(null);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
      throttleTimeout.current = null;
    }
    if (maxWaitTimeout.current) {
      clearTimeout(maxWaitTimeout.current);
      maxWaitTimeout.current = null;
    }
    setIsThrottled(false);
  }, []);

  useEffect(() => {
    // Check if value actually changed
    if (equalityFn(value, lastValue.current)) {
      return;
    }

    lastValue.current = value;
    const now = Date.now();
    const timeSinceLastRun = now - lastRan.current;

    // Clear existing timeouts
    cleanup();

    // Leading edge
    if (leading && timeSinceLastRun >= delay) {
      setThrottledValue(value);
      lastRan.current = now;
    } else {
      setIsThrottled(true);

      // Schedule trailing edge
      if (trailing) {
        const remainingTime = delay - timeSinceLastRun;

        throttleTimeout.current = setTimeout(() => {
          setThrottledValue(lastValue.current);
          lastRan.current = Date.now();
          setIsThrottled(false);
        }, remainingTime);
      }

      // Max wait timeout
      if (maxWait && maxWait > delay) {
        maxWaitTimeout.current = setTimeout(() => {
          setThrottledValue(lastValue.current);
          lastRan.current = Date.now();
          cleanup();
        }, maxWait);
      }
    }

    return cleanup;
  }, [value, delay, leading, trailing, maxWait, equalityFn, cleanup]);

  // Force update function
  const forceUpdate = useCallback(() => {
    cleanup();
    setThrottledValue(lastValue.current);
    lastRan.current = Date.now();
  }, [cleanup]);

  // Cancel pending updates
  const cancel = useCallback(() => {
    cleanup();
    lastValue.current = throttledValue;
  }, [cleanup, throttledValue]);

  return {
    value: throttledValue,
    isThrottled,
    forceUpdate,
    cancel,
  };
}

/**
 * Throttle multiple values together
 * Useful for throttling related state updates
 */
export function useThrottleMultiple<T extends Record<string, any>>(
  values: T,
  delay: number
): T {
  const [throttledValues, setThrottledValues] = useState<T>(values);
  const lastRan = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRan.current;

    if (timeSinceLastRun >= delay) {
      setThrottledValues(values);
      lastRan.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setThrottledValues(values);
        lastRan.current = Date.now();
      }, delay - timeSinceLastRun);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [values, delay]);

  return throttledValues;
}

/**
 * Throttle with request animation frame
 * Ideal for animations and visual updates
 */
export function useRAFThrottle<T>(value: T): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      setThrottledValue(value);
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value]);

  return throttledValue;
}

export default useThrottle;
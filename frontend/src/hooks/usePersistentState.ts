import { useState, useEffect, useCallback, useRef } from 'react';

interface PersistentStateOptions<T> {
  storage?: Storage;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  syncAcrossTabs?: boolean;
  fallbackValue?: T;
}

/**
 * Custom hook for persistent state management with localStorage/sessionStorage
 * Includes cross-tab synchronization support
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  options?: PersistentStateOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    storage = typeof window !== 'undefined' ? localStorage : undefined,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = true,
    fallbackValue = defaultValue,
  } = options || {};

  const [state, setState] = useState<T>(() => {
    if (!storage || typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = storage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return deserialize(item);
    } catch (error) {
      console.error(`Error loading ${key} from storage:`, error);
      return fallbackValue;
    }
  });

  const isUpdatingRef = useRef(false);

  // Save state to storage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    if (!storage) {
      setState(value);
      return;
    }

    try {
      setState(prevState => {
        const nextState = value instanceof Function ? value(prevState) : value;

        // Save to storage
        storage.setItem(key, serialize(nextState));

        // Mark as updating to prevent sync loop
        isUpdatingRef.current = true;
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);

        return nextState;
      });
    } catch (error) {
      console.error(`Error saving ${key} to storage:`, error);
    }
  }, [key, serialize, storage]);

  // Remove value from storage
  const removeValue = useCallback(() => {
    if (!storage) {
      setState(defaultValue);
      return;
    }

    try {
      storage.removeItem(key);
      setState(defaultValue);

      // Mark as updating to prevent sync loop
      isUpdatingRef.current = true;
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  }, [key, defaultValue, storage]);

  // Sync state across tabs
  useEffect(() => {
    if (!syncAcrossTabs || !storage || typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      // Ignore if we're the source of the change
      if (isUpdatingRef.current) {
        return;
      }

      // Check if it's our key
      if (e.key !== key) {
        return;
      }

      // Handle deletion
      if (e.newValue === null) {
        setState(defaultValue);
        return;
      }

      // Update state with new value
      try {
        setState(deserialize(e.newValue));
      } catch (error) {
        console.error(`Error syncing ${key} from storage:`, error);
        setState(fallbackValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue, deserialize, fallbackValue, syncAcrossTabs, storage]);

  // Sync with storage on mount (in case it changed while unmounted)
  useEffect(() => {
    if (!storage || typeof window === 'undefined') {
      return;
    }

    try {
      const item = storage.getItem(key);
      if (item !== null) {
        const parsed = deserialize(item);
        setState(current => {
          // Only update if different
          if (serialize(current) !== item) {
            return parsed;
          }
          return current;
        });
      }
    } catch (error) {
      console.error(`Error syncing ${key} on mount:`, error);
    }
  }, [key, storage, deserialize, serialize]);

  return [state, setValue, removeValue];
}

/**
 * Hook for localStorage with JSON serialization
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: Omit<PersistentStateOptions<T>, 'storage'>
) {
  return usePersistentState(key, defaultValue, {
    ...options,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  });
}

/**
 * Hook for sessionStorage with JSON serialization
 */
export function useSessionStorage<T>(
  key: string,
  defaultValue: T,
  options?: Omit<PersistentStateOptions<T>, 'storage'>
) {
  return usePersistentState(key, defaultValue, {
    ...options,
    storage: typeof window !== 'undefined' ? sessionStorage : undefined,
  });
}

/**
 * Hook for storing user preferences
 */
export function useUserPreference<T>(
  preferenceKey: string,
  defaultValue: T
) {
  const fullKey = `user-preference-${preferenceKey}`;
  return useLocalStorage(fullKey, defaultValue, {
    syncAcrossTabs: true,
  });
}

/**
 * Hook for storing temporary data that expires
 */
export function useTemporaryStorage<T>(
  key: string,
  defaultValue: T,
  expirationMs: number = 3600000 // 1 hour default
) {
  interface StoredValue {
    value: T;
    expiry: number;
  }

  const [storedValue, setStoredValue] = useLocalStorage<StoredValue | null>(
    key,
    null
  );

  const value = storedValue && storedValue.expiry > Date.now()
    ? storedValue.value
    : defaultValue;

  const setValue = useCallback((newValue: T) => {
    setStoredValue({
      value: newValue,
      expiry: Date.now() + expirationMs,
    });
  }, [expirationMs, setStoredValue]);

  const removeValue = useCallback(() => {
    setStoredValue(null);
  }, [setStoredValue]);

  // Clean up expired value on mount
  useEffect(() => {
    if (storedValue && storedValue.expiry <= Date.now()) {
      setStoredValue(null);
    }
  }, [storedValue, setStoredValue]);

  return [value, setValue, removeValue] as const;
}
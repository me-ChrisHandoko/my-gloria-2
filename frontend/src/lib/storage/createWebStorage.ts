/**
 * SSR-safe storage implementation for Redux Persist
 * Provides a storage adapter that works in both server and client environments
 */

interface WebStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Create a noop storage for server-side rendering
 */
const createNoopStorage = (): WebStorage => {
  return {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
  };
};

/**
 * Create a web storage adapter for browser environment
 */
const createWebStorage = (type: 'local' | 'session'): WebStorage => {
  // Return noop storage for server-side rendering
  if (typeof window === 'undefined') {
    return createNoopStorage();
  }

  const storage = type === 'local' ? window.localStorage : window.sessionStorage;

  return {
    getItem: (key: string) => {
      return new Promise((resolve) => {
        try {
          const item = storage.getItem(key);
          resolve(item);
        } catch (error) {
          console.error(`Error getting item from ${type}Storage:`, error);
          resolve(null);
        }
      });
    },
    setItem: (key: string, value: string) => {
      return new Promise((resolve, reject) => {
        try {
          storage.setItem(key, value);
          resolve();
        } catch (error) {
          console.error(`Error setting item in ${type}Storage:`, error);
          // Resolve instead of reject to prevent app crashes
          resolve();
        }
      });
    },
    removeItem: (key: string) => {
      return new Promise((resolve) => {
        try {
          storage.removeItem(key);
          resolve();
        } catch (error) {
          console.error(`Error removing item from ${type}Storage:`, error);
          resolve();
        }
      });
    },
  };
};

/**
 * Default local storage adapter
 */
export const localStorage = createWebStorage('local');

/**
 * Session storage adapter
 */
export const sessionStorage = createWebStorage('session');

/**
 * Default export for redux-persist
 */
export default localStorage;
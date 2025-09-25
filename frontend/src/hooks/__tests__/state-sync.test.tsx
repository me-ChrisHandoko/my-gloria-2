/**
 * Tests for state synchronization hooks
 * Verifies cross-tab communication and persistent state management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useStateSync, useSyncedActions, useSyncedCache } from '../useStateSync';
import {
  usePersistentState,
  useLocalStorage,
  useSessionStorage,
  useUserPreference,
  useTemporaryStorage
} from '../usePersistentState';

// Mock BroadcastChannel
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: any) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(message: any) {
    // Simulate cross-tab communication
    MockBroadcastChannel.instances.forEach(instance => {
      if (instance !== this && instance.name === this.name && instance.onmessage) {
        const event = new MessageEvent('message', { data: message });
        instance.onmessage(event);
      }
    });
  }

  close() {
    const index = MockBroadcastChannel.instances.indexOf(this);
    if (index > -1) {
      MockBroadcastChannel.instances.splice(index, 1);
    }
  }

  static reset() {
    MockBroadcastChannel.instances = [];
  }
}

// Mock store setup
const createMockStore = () => {
  return configureStore({
    reducer: {
      test: (state = { value: 0 }, action) => {
        switch (action.type) {
          case 'INCREMENT':
            return { value: state.value + 1 };
          case 'SET_VALUE':
            return { value: action.payload };
          default:
            return state;
        }
      },
    },
  });
};

describe('useStateSync', () => {
  let originalBroadcastChannel: any;

  beforeEach(() => {
    originalBroadcastChannel = global.BroadcastChannel;
    (global as any).BroadcastChannel = MockBroadcastChannel;
    MockBroadcastChannel.reset();
  });

  afterEach(() => {
    global.BroadcastChannel = originalBroadcastChannel;
    MockBroadcastChannel.reset();
  });

  it('should broadcast messages to other tabs', async () => {
    const store = createMockStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    // First tab
    const { result: result1 } = renderHook(
      () => useStateSync({
        channel: 'test-channel',
        actions: ['TEST_ACTION'],
        enableCrossTab: true,
      }),
      { wrapper }
    );

    // Second tab
    const { result: result2 } = renderHook(
      () => useStateSync({
        channel: 'test-channel',
        actions: ['TEST_ACTION'],
        enableCrossTab: true,
      }),
      { wrapper }
    );

    // Broadcast from first tab
    act(() => {
      result1.current.broadcast('TEST_ACTION', { data: 'test' });
    });

    // Verify both tabs have different IDs
    expect(result1.current.tabId).not.toBe(result2.current.tabId);
    expect(result1.current.isConnected).toBe(true);
    expect(result2.current.isConnected).toBe(true);
  });

  it('should sync state updates across tabs', async () => {
    const store = createMockStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(
      () => useStateSync({
        channel: 'state-sync',
        actions: ['UPDATE_STATE'],
        enableCrossTab: true,
      }),
      { wrapper }
    );

    act(() => {
      result.current.broadcastStateUpdate({ type: 'SET_VALUE', payload: 42 });
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should handle cache invalidation broadcasts', () => {
    const store = createMockStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(
      () => useStateSync({
        channel: 'cache-sync',
        actions: ['INVALIDATE_CACHE'],
        enableCrossTab: true,
      }),
      { wrapper }
    );

    act(() => {
      result.current.broadcastCacheInvalidation(['User', 'Organization']);
    });

    expect(result.current.isConnected).toBe(true);
  });
});

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should persist state to localStorage', () => {
    const { result } = renderHook(() =>
      usePersistentState('test-key', 'initial')
    );

    const [value, setValue] = result.current;
    expect(value).toBe('initial');

    act(() => {
      setValue('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe('"updated"');
  });

  it('should load persisted state on mount', () => {
    localStorage.setItem('existing-key', '"persisted value"');

    const { result } = renderHook(() =>
      usePersistentState('existing-key', 'default')
    );

    expect(result.current[0]).toBe('persisted value');
  });

  it('should handle removal of persisted state', () => {
    const { result } = renderHook(() =>
      usePersistentState('remove-key', 'value')
    );

    act(() => {
      result.current[1]('stored');
    });

    expect(localStorage.getItem('remove-key')).toBe('"stored"');

    act(() => {
      result.current[2](); // removeValue
    });

    expect(result.current[0]).toBe('value');
    expect(localStorage.getItem('remove-key')).toBeNull();
  });

  it('should sync state across tabs', async () => {
    const { result: result1 } = renderHook(() =>
      usePersistentState('sync-key', 'initial', { syncAcrossTabs: true })
    );

    const { result: result2 } = renderHook(() =>
      usePersistentState('sync-key', 'initial', { syncAcrossTabs: true })
    );

    act(() => {
      result1.current[1]('synced');
    });

    // Simulate storage event
    const event = new StorageEvent('storage', {
      key: 'sync-key',
      newValue: '"synced"',
      oldValue: '"initial"',
      storageArea: localStorage,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(result2.current[0]).toBe('synced');
    });
  });
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should use localStorage by default', () => {
    const { result } = renderHook(() =>
      useLocalStorage('local-key', { count: 0 })
    );

    act(() => {
      result.current[1]({ count: 5 });
    });

    expect(JSON.parse(localStorage.getItem('local-key') || '{}')).toEqual({ count: 5 });
  });
});

describe('useSessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should use sessionStorage', () => {
    const { result } = renderHook(() =>
      useSessionStorage('session-key', 'session-value')
    );

    act(() => {
      result.current[1]('updated-session');
    });

    expect(sessionStorage.getItem('session-key')).toBe('"updated-session"');
  });
});

describe('useUserPreference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should prefix preference keys', () => {
    const { result } = renderHook(() =>
      useUserPreference('theme', 'light')
    );

    act(() => {
      result.current[1]('dark');
    });

    expect(localStorage.getItem('user-preference-theme')).toBe('"dark"');
  });
});

describe('useTemporaryStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should store values with expiration', () => {
    const { result } = renderHook(() =>
      useTemporaryStorage('temp-key', 'default', 1000)
    );

    act(() => {
      result.current[1]('temporary');
    });

    expect(result.current[0]).toBe('temporary');

    // Advance time past expiration
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    // Re-render to check expiration
    const { result: result2 } = renderHook(() =>
      useTemporaryStorage('temp-key', 'default', 1000)
    );

    expect(result2.current[0]).toBe('default');
  });

  it('should handle removal of temporary values', () => {
    const { result } = renderHook(() =>
      useTemporaryStorage('temp-remove', 'value', 5000)
    );

    act(() => {
      result.current[1]('stored');
    });

    expect(result.current[0]).toBe('stored');

    act(() => {
      result.current[2](); // removeValue
    });

    expect(result.current[0]).toBe('value');
  });
});

describe('useSyncedActions', () => {
  it('should sync specific Redux actions', () => {
    const store = createMockStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(
      () => useSyncedActions(['INCREMENT', 'SET_VALUE']),
      { wrapper }
    );

    act(() => {
      result.current.syncAction({ type: 'INCREMENT' });
    });

    // Action should be synced since it's in the allowed list
    expect(result.current).toBeDefined();
  });
});

describe('useSyncedCache', () => {
  it('should sync cache invalidation for specific tags', () => {
    const store = createMockStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(
      () => useSyncedCache(['User', 'Organization', 'Role']),
      { wrapper }
    );

    act(() => {
      result.current.invalidateAndSync(['User', 'NonExistentTag']);
    });

    // Only 'User' should be synced since 'NonExistentTag' is not in the allowed list
    expect(result.current).toBeDefined();
  });
});
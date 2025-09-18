/**
 * State Monitoring Utilities
 * Real-time state monitoring and debugging tools
 */

import { Store } from '@reduxjs/toolkit';
import type { RootState } from '../index';

/**
 * State change listener configuration
 */
export interface StateChangeListener {
  id: string;
  path: string[];
  callback: (newValue: any, oldValue: any, path: string[]) => void;
  enabled: boolean;
}

/**
 * State monitor configuration
 */
export interface StateMonitorConfig {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableAlerts?: boolean;
  slowActionThreshold?: number; // ms
  largeStateChangeThreshold?: number; // bytes
  maxHistorySize?: number;
}

/**
 * State change history entry
 */
export interface StateChangeHistory {
  timestamp: number;
  action: string;
  path: string[];
  oldValue: any;
  newValue: any;
  metadata?: Record<string, any>;
}

/**
 * State monitoring class
 */
export class StateMonitor {
  private store: Store<RootState> | null = null;
  private listeners: Map<string, StateChangeListener> = new Map();
  private history: StateChangeHistory[] = [];
  private config: StateMonitorConfig;
  private unsubscribe: (() => void) | null = null;
  private previousState: RootState | null = null;
  private isMonitoring = false;

  constructor(config: StateMonitorConfig = {}) {
    this.config = {
      enableLogging: true,
      enableMetrics: true,
      enableAlerts: true,
      slowActionThreshold: 16, // 1 frame at 60fps
      largeStateChangeThreshold: 10240, // 10KB
      maxHistorySize: 100,
      ...config,
    };
  }

  /**
   * Initialize the state monitor
   */
  public init(store: Store<RootState>): void {
    if (this.store) {
      console.warn('[StateMonitor] Already initialized');
      return;
    }

    this.store = store;
    this.previousState = store.getState();
    this.startMonitoring();
  }

  /**
   * Start monitoring state changes
   */
  private startMonitoring(): void {
    if (!this.store || this.isMonitoring) return;

    this.unsubscribe = this.store.subscribe(() => {
      const currentState = this.store!.getState();
      this.handleStateChange(currentState);
      this.previousState = currentState;
    });

    this.isMonitoring = true;
    console.log('[StateMonitor] Started monitoring');
  }

  /**
   * Stop monitoring state changes
   */
  public stopMonitoring(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isMonitoring = false;
    console.log('[StateMonitor] Stopped monitoring');
  }

  /**
   * Handle state change
   */
  private handleStateChange(currentState: RootState): void {
    if (!this.previousState) return;

    // Check for changes and notify listeners
    this.detectChanges(this.previousState, currentState, []);

    // Log metrics if enabled
    if (this.config.enableMetrics) {
      this.logMetrics(currentState);
    }
  }

  /**
   * Recursively detect changes in state
   */
  private detectChanges(
    oldState: any,
    newState: any,
    path: string[]
  ): void {
    if (oldState === newState) return;

    // Check if this path has listeners
    const pathStr = path.join('.');
    this.listeners.forEach((listener) => {
      if (listener.enabled && this.matchesPath(listener.path, path)) {
        listener.callback(newState, oldState, path);
      }
    });

    // Add to history
    this.addToHistory({
      timestamp: Date.now(),
      action: 'STATE_CHANGE',
      path,
      oldValue: oldState,
      newValue: newState,
    });

    // Recursively check nested objects
    if (typeof newState === 'object' && newState !== null && typeof oldState === 'object' && oldState !== null) {
      const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);
      allKeys.forEach((key) => {
        this.detectChanges(oldState[key], newState[key], [...path, key]);
      });
    }
  }

  /**
   * Check if a listener path matches the current path
   */
  private matchesPath(listenerPath: string[], currentPath: string[]): boolean {
    if (listenerPath.length > currentPath.length) return false;

    for (let i = 0; i < listenerPath.length; i++) {
      if (listenerPath[i] !== '*' && listenerPath[i] !== currentPath[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add a state change listener
   */
  public addListener(
    id: string,
    path: string[],
    callback: StateChangeListener['callback']
  ): void {
    this.listeners.set(id, {
      id,
      path,
      callback,
      enabled: true,
    });

    if (this.config.enableLogging) {
      console.log(`[StateMonitor] Added listener: ${id} for path: ${path.join('.')}`);
    }
  }

  /**
   * Remove a state change listener
   */
  public removeListener(id: string): void {
    this.listeners.delete(id);

    if (this.config.enableLogging) {
      console.log(`[StateMonitor] Removed listener: ${id}`);
    }
  }

  /**
   * Enable/disable a listener
   */
  public toggleListener(id: string, enabled?: boolean): void {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.enabled = enabled !== undefined ? enabled : !listener.enabled;
    }
  }

  /**
   * Add entry to history
   */
  private addToHistory(entry: StateChangeHistory): void {
    this.history.push(entry);

    // Limit history size
    if (this.history.length > this.config.maxHistorySize!) {
      this.history.shift();
    }
  }

  /**
   * Get state change history
   */
  public getHistory(filter?: {
    path?: string[];
    startTime?: number;
    endTime?: number;
  }): StateChangeHistory[] {
    let filtered = [...this.history];

    if (filter?.path) {
      filtered = filtered.filter((entry) =>
        this.matchesPath(filter.path!, entry.path)
      );
    }

    if (filter?.startTime) {
      filtered = filtered.filter((entry) => entry.timestamp >= filter.startTime!);
    }

    if (filter?.endTime) {
      filtered = filtered.filter((entry) => entry.timestamp <= filter.endTime!);
    }

    return filtered;
  }

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.history = [];
  }

  /**
   * Log state metrics
   */
  private logMetrics(state: RootState): void {
    const stateSize = JSON.stringify(state).length;
    const metrics = {
      stateSize,
      slices: Object.keys(state).length,
      timestamp: Date.now(),
    };

    // Check for large state
    if (stateSize > this.config.largeStateChangeThreshold!) {
      console.warn('[StateMonitor] Large state detected:', {
        size: `${(stateSize / 1024).toFixed(2)}KB`,
        ...metrics,
      });
    }
  }

  /**
   * Get current state snapshot
   */
  public getSnapshot(): RootState | null {
    return this.store ? this.store.getState() : null;
  }

  /**
   * Get state at specific path
   */
  public getStateAt(path: string[]): any {
    const state = this.getSnapshot();
    if (!state) return undefined;

    return path.reduce((current, key) => current?.[key], state as any);
  }

  /**
   * Watch specific state path
   */
  public watch(path: string[], callback: (value: any) => void): () => void {
    const id = `watch-${Date.now()}-${Math.random()}`;

    this.addListener(id, path, (newValue) => {
      callback(newValue);
    });

    // Return unsubscribe function
    return () => this.removeListener(id);
  }

  /**
   * Create a state selector
   */
  public createSelector<T>(
    selector: (state: RootState) => T
  ): () => T | undefined {
    return () => {
      const state = this.getSnapshot();
      return state ? selector(state) : undefined;
    };
  }

  /**
   * Export monitoring data
   */
  public exportData(): {
    history: StateChangeHistory[];
    metrics: any;
    config: StateMonitorConfig;
  } {
    return {
      history: this.history,
      metrics: {
        historySize: this.history.length,
        listenersCount: this.listeners.size,
        isMonitoring: this.isMonitoring,
      },
      config: this.config,
    };
  }

  /**
   * Destroy the monitor
   */
  public destroy(): void {
    this.stopMonitoring();
    this.listeners.clear();
    this.history = [];
    this.store = null;
    this.previousState = null;
  }
}

/**
 * Create a singleton state monitor instance
 */
let stateMonitorInstance: StateMonitor | null = null;

export const getStateMonitor = (config?: StateMonitorConfig): StateMonitor => {
  if (!stateMonitorInstance) {
    stateMonitorInstance = new StateMonitor(config);
  }
  return stateMonitorInstance;
};

/**
 * State path helper utilities
 */
export const StatePathHelpers = {
  /**
   * Convert string path to array
   */
  fromString: (path: string): string[] => {
    return path.split('.').filter(Boolean);
  },

  /**
   * Convert array path to string
   */
  toString: (path: string[]): string => {
    return path.join('.');
  },

  /**
   * Check if path matches pattern
   */
  matches: (pattern: string[], path: string[]): boolean => {
    if (pattern.length > path.length) return false;

    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] !== '*' && pattern[i] !== path[i]) {
        return false;
      }
    }

    return true;
  },
};
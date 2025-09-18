'use client';

/**
 * State DevTools Component
 * Visual debugging interface for Redux state in development
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { getStateMonitor, StateMonitor } from '@/store/devtools/stateMonitor';
import {
  getPerformanceMetrics,
  getStateSnapshots,
  clearPerformanceMetrics,
  clearStateSnapshots,
  captureStateSnapshot,
  exportState,
  isDevelopment,
} from '@/store/devtools';
import type { RootState } from '@/store';

interface StateDevToolsProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  defaultOpen?: boolean;
  maxHeight?: string;
}

/**
 * State DevTools Component
 * Only renders in development mode
 */
export const StateDevTools: React.FC<StateDevToolsProps> = ({
  position = 'bottom-right',
  defaultOpen = false,
  maxHeight = '400px',
}) => {
  // Don't render in production
  if (!isDevelopment) return null;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'state' | 'metrics' | 'history' | 'snapshots'>('state');
  const [selectedSlice, setSelectedSlice] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(1000);

  const state = useAppSelector((state) => state);
  const dispatch = useAppDispatch();

  const [stateMonitor, setStateMonitor] = useState<StateMonitor | null>(null);
  const [metrics, setMetrics] = useState(getPerformanceMetrics());
  const [snapshots, setSnapshots] = useState(getStateSnapshots());
  const [stateHistory, setStateHistory] = useState<any[]>([]);

  // Initialize state monitor
  useEffect(() => {
    const monitor = getStateMonitor({
      enableLogging: true,
      enableMetrics: true,
      enableAlerts: true,
    });

    // Initialize with store if available
    if (typeof window !== 'undefined' && (window as any).__REDUX_STORE__) {
      monitor.init((window as any).__REDUX_STORE__);
    }

    setStateMonitor(monitor);

    return () => {
      monitor.destroy();
    };
  }, []);

  // Auto-refresh metrics and snapshots
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setMetrics(getPerformanceMetrics());
      setSnapshots(getStateSnapshots());

      if (stateMonitor) {
        setStateHistory(stateMonitor.getHistory());
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, stateMonitor]);

  // Get position styles
  const positionStyles = useMemo(() => {
    const base = {
      position: 'fixed' as const,
      zIndex: 9999,
      backgroundColor: 'var(--background)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
    };

    const positions = {
      'bottom-right': { bottom: 20, right: 20 },
      'bottom-left': { bottom: 20, left: 20 },
      'top-right': { top: 20, right: 20 },
      'top-left': { top: 20, left: 20 },
    };

    return { ...base, ...positions[position] };
  }, [position]);

  // Filter state based on search query
  const filteredState = useMemo(() => {
    if (!searchQuery) return state;

    const filterObject = (obj: any, query: string): any => {
      const filtered: any = {};
      const lowerQuery = query.toLowerCase();

      for (const [key, value] of Object.entries(obj)) {
        if (key.toLowerCase().includes(lowerQuery)) {
          filtered[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          const nested = filterObject(value, query);
          if (Object.keys(nested).length > 0) {
            filtered[key] = nested;
          }
        }
      }

      return filtered;
    };

    return filterObject(state, searchQuery);
  }, [state, searchQuery]);

  // Handle snapshot capture
  const handleCaptureSnapshot = useCallback(() => {
    const label = prompt('Enter snapshot label:') || undefined;
    captureStateSnapshot(state as RootState, label);
    setSnapshots(getStateSnapshots());
  }, [state]);

  // Handle state export
  const handleExportState = useCallback(() => {
    exportState(state as RootState);
  }, [state]);

  // Handle clear metrics
  const handleClearMetrics = useCallback(() => {
    clearPerformanceMetrics();
    setMetrics([]);
  }, []);

  // Handle clear snapshots
  const handleClearSnapshots = useCallback(() => {
    clearStateSnapshots();
    setSnapshots([]);
  }, []);

  // Render state tree
  const renderStateTree = (obj: any, depth = 0): JSX.Element => {
    if (obj === null) return <span className="text-gray-500">null</span>;
    if (obj === undefined) return <span className="text-gray-500">undefined</span>;

    if (typeof obj !== 'object') {
      if (typeof obj === 'string') return <span className="text-green-600">"{obj}"</span>;
      if (typeof obj === 'number') return <span className="text-blue-600">{obj}</span>;
      if (typeof obj === 'boolean') return <span className="text-purple-600">{obj.toString()}</span>;
      return <span>{String(obj)}</span>;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span className="text-gray-500">[]</span>;
      if (depth > 2) return <span className="text-gray-500">[{obj.length} items]</span>;

      return (
        <div className="ml-4">
          [
          {obj.map((item, index) => (
            <div key={index} className="ml-2">
              {index}: {renderStateTree(item, depth + 1)}
              {index < obj.length - 1 && ','}
            </div>
          ))}
          ]
        </div>
      );
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) return <span className="text-gray-500">{'{}'}</span>;
    if (depth > 2) return <span className="text-gray-500">{'{'}...{'}'}</span>;

    return (
      <div className="ml-4">
        {'{'}
        {entries.map(([key, value], index) => (
          <div key={key} className="ml-2">
            <span className="text-blue-700">{key}</span>: {renderStateTree(value, depth + 1)}
            {index < entries.length - 1 && ','}
          </div>
        ))}
        {'}'}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        style={positionStyles}
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        title="Open Redux DevTools"
      >
        🛠️ DevTools
      </button>
    );
  }

  return (
    <div
      style={{
        ...positionStyles,
        width: '600px',
        maxHeight,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Redux DevTools</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCaptureSnapshot}
            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            title="Capture Snapshot"
          >
            📸
          </button>
          <button
            onClick={handleExportState}
            className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            title="Export State"
          >
            💾
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-2 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            title="Close DevTools"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(['state', 'metrics', 'history', 'snapshots'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 capitalize ${
              activeTab === tab
                ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-700'
                : 'hover:bg-gray-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* State Tab */}
        {activeTab === 'state' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="mb-4">
              <select
                value={selectedSlice}
                onChange={(e) => setSelectedSlice(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Slices</option>
                {Object.keys(state).map((slice) => (
                  <option key={slice} value={slice}>
                    {slice}
                  </option>
                ))}
              </select>
            </div>
            <div className="font-mono text-sm">
              {selectedSlice
                ? renderStateTree({ [selectedSlice]: (state as any)[selectedSlice] })
                : renderStateTree(filteredState)}
            </div>
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div>
            <div className="flex justify-between mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>
              <button
                onClick={handleClearMetrics}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {metrics.slice(-20).reverse().map((metric, index) => (
                <div
                  key={index}
                  className={`p-2 border rounded ${
                    metric.error ? 'bg-red-50 border-red-300' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-mono text-sm">{metric.actionType}</span>
                    <span
                      className={`text-sm ${
                        metric.duration > 16 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {metric.duration.toFixed(2)}ms
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    State size: {(metric.stateSize / 1024).toFixed(2)}KB
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => stateMonitor?.clearHistory()}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear History
              </button>
            </div>
            <div className="space-y-2">
              {stateHistory.slice(-20).reverse().map((entry, index) => (
                <div key={index} className="p-2 border rounded bg-gray-50">
                  <div className="flex justify-between">
                    <span className="font-mono text-sm">{entry.path.join('.')}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs mt-1">
                    <span className="text-red-600">Old: {JSON.stringify(entry.oldValue)}</span>
                    {' → '}
                    <span className="text-green-600">New: {JSON.stringify(entry.newValue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Snapshots Tab */}
        {activeTab === 'snapshots' && (
          <div>
            <div className="flex justify-between mb-4">
              <button
                onClick={handleCaptureSnapshot}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Capture New
              </button>
              <button
                onClick={handleClearSnapshots}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {snapshots.map((snapshot, index) => (
                <div key={index} className="p-2 border rounded bg-gray-50">
                  <div className="flex justify-between">
                    <span className="font-semibold">{snapshot.label}</span>
                    <span className="text-xs text-gray-500">{snapshot.timestamp}</span>
                  </div>
                  <button
                    onClick={() => console.log('Snapshot:', snapshot)}
                    className="mt-2 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Log to Console
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t text-xs text-gray-500 text-center">
        Redux DevTools v1.0.0 | {Object.keys(state).length} slices | Development Mode
      </div>
    </div>
  );
};

// Store reference helper for state monitor
if (typeof window !== 'undefined' && isDevelopment) {
  (window as any).__REDUX_STORE__ = null;
}

export default StateDevTools;
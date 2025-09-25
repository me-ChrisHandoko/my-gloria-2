'use client';

/**
 * Cache Monitoring Component
 * Real-time cache statistics and management interface
 */

import React, { useState } from 'react';
import { useCacheStats, useCacheInvalidation } from '@/hooks/useCache';
import { CacheStrategy, CACHE_LIMITS } from '@/lib/cache/types';

export function CacheMonitor() {
  const { stats, detailedStats, clearCache } = useCacheStats();
  const { invalidatePattern } = useCacheInvalidation();
  const [invalidateInput, setInvalidateInput] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<CacheStrategy | 'all'>('all');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleInvalidatePattern = async () => {
    if (invalidateInput) {
      await invalidatePattern(invalidateInput);
      setInvalidateInput('');
    }
  };

  const handleClearCache = async () => {
    const strategy = selectedStrategy === 'all' ? undefined : selectedStrategy;
    await clearCache(strategy as CacheStrategy | undefined);
  };

  if (!stats) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Cache Statistics
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Hit Rate</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatPercentage(stats.hitRate)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.hits} hits / {stats.misses} misses
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Cache Size</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatBytes(stats.size)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.itemCount} items
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Evictions</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.evictions}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total evicted
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Errors</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.errors}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total errors
            </div>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Cache Usage</span>
            <span>{formatBytes(stats.size)} / {formatBytes(CACHE_LIMITS.MAX_MEMORY_SIZE)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((stats.size / CACHE_LIMITS.MAX_MEMORY_SIZE) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Stats by Strategy */}
      {detailedStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Storage Strategy Details
          </h3>

          <div className="space-y-4">
            {Array.from(detailedStats.byStrategy.entries() as [string, any][]).map(([strategy, strategyStats]) => (
              <div key={strategy} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                    {strategy} Storage
                  </h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatBytes(strategyStats.size)} / {strategyStats.itemCount} items
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full"
                      style={{ width: `${strategyStats.usage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cache Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Cache Management
        </h3>

        <div className="space-y-4">
          {/* Invalidate by Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invalidate by Pattern
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={invalidateInput}
                onChange={(e) => setInvalidateInput(e.target.value)}
                placeholder="e.g., api:users:*"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleInvalidatePattern}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Invalidate
              </button>
            </div>
          </div>

          {/* Clear Cache */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Clear Cache
            </label>
            <div className="flex gap-2">
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value as CacheStrategy | 'all')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Strategies</option>
                <option value={CacheStrategy.MEMORY}>Memory</option>
                <option value={CacheStrategy.LOCAL_STORAGE}>Local Storage</option>
                <option value={CacheStrategy.SESSION_STORAGE}>Session Storage</option>
                <option value={CacheStrategy.INDEXED_DB}>IndexedDB</option>
              </select>
              <button
                onClick={handleClearCache}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Last Cleaned */}
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Last cleaned: {new Date(stats.lastCleaned).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact cache status widget for dashboards
 */
export function CacheStatusWidget() {
  const { stats } = useCacheStats();

  if (!stats) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Cache Status</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {stats.itemCount} items
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Hit Rate</span>
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            {stats.hitRate.toFixed(1)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div
            className="bg-green-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${stats.hitRate}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {stats.hits} hits
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {stats.misses} misses
          </span>
        </div>
      </div>
    </div>
  );
}
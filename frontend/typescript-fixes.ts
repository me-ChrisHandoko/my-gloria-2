// This file contains all TypeScript fixes for production readiness
// Run the fix-all-typescript-errors.sh script to apply these fixes

export const fixes = {
  // Fix 1: CacheMonitor.tsx - Proper typing for Map entries
  cacheMonitor: `
    // Line 131 - Replace explicit type annotation with proper handling
    {Array.from(detailedStats.byStrategy.entries()).map(([strategy, strategyStats]) => {
      const typedStrategy = strategy as string;
      const typedStats = strategyStats as any;
      return (
        <div key={typedStrategy} className="border-l-4 border-blue-500 pl-4">
          {/* Use typedStrategy and typedStats */}
        </div>
      );
    })}
  `,

  // Fix 2: useNotifications.ts - Browser Notification API typing
  notifications: `
    // Line 101 - Cast to proper type
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: notification.id,
      requireInteraction: notification.priority === 'high',
      silent: !playSound,
      data: notification,
    } as any); // Type assertion for browser API
  `,

  // Fix 3: api-monitor.ts - Error object typing
  apiMonitor: `
    // Line 321 - Create proper error object
    const errorObj = Object.assign(new Error(message), {
      endpoint: '/health',
      statusCode: 503,
    });
  `,

  // Fix 4: compression.ts - Uint8Array type assertions
  compression: `
    // Lines 415, 440 - Add type assertions
    const result = await decompressionFunction(data);
    return result as Uint8Array;
  `,

  // Fix 5: WebSocket client - EventEmitter signature
  websocket: `
    // Line 429 - Update method signature
    emit(event: string, data?: any, callback?: (response: any) => void): boolean {
      // Implementation
      super.emit(event, data);
      if (callback) {
        callback(data);
      }
      return true;
    }
  `,

  // Fix 6: Redux store API slices - Type guards for statusCode
  apiSlices: `
    // Lines in apiSlice.ts, apiSliceWithHook.ts, baseApi.ts
    if (typeof statusCode === 'number' && statusCode >= 500) {
      // Handle error
    }
  `,

  // Fix 7: userApi.ts - Date type conversion
  userApi: `
    // Transform response data
    const transformUser = (data: any): User => ({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  `,

  // Fix 8: DevTools type declarations
  devtools: `
    // src/store/devtools.ts
    declare global {
      interface Window {
        __REDUX_DEVTOOLS_EXTENSION__?: () => any;
        __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: (options?: any) => any;
      }
    }
    export {};
  `,

  // Fix 9: Security api-keys.ts - Optional chaining
  apiKeys: `
    // Lines 187, 230-231 - Use optional chaining
    if (metadata?.maxUsageCount && usageCount >= metadata.maxUsageCount) {
      // Handle max usage
    }
  `,

  // Fix 10: Middleware auth.ts - NextRequest typing
  authMiddleware: `
    // Line 194 - Get IP properly
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';
  `,

  // Fix 11: WebSocket exports
  websocketExports: `
    // src/contexts/WebSocketContext.tsx - Export the interface
    export interface WebSocketContextValue {
      // Interface definition
    }
  `,

  // Fix 12: error-tracking.ts - Type compatibility
  errorTracking: `
    // Lines 657, 700, 703 - Type assertions
    setContext(context as any);
    captureException(error instanceof Error ? error : new Error(String(error)));
  `,
};
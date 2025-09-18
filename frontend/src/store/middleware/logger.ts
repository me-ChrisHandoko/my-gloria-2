import { Middleware } from '@reduxjs/toolkit';

/**
 * Logger middleware for development environment
 * Logs actions and state changes for debugging
 */
export const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();

    // Skip logging for frequent actions to reduce noise
    const skipActions = [
      'persist/PERSIST',
      'persist/REHYDRATE',
      'api/executeQuery/pending',
      'api/executeQuery/fulfilled',
    ];

    if (!skipActions.some(skipAction => action.type.includes(skipAction))) {
      console.group(`🎬 Action: ${action.type}`);
      console.log('📦 Payload:', action.payload);
      console.log('⏰ Time:', new Date().toISOString());

      const result = next(action);
      const endTime = performance.now();

      console.log('🏪 New State:', store.getState());
      console.log(`⏱️ Duration: ${(endTime - startTime).toFixed(2)}ms`);
      console.groupEnd();

      return result;
    }
  }

  return next(action);
};
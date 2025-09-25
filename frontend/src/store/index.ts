import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from '@/lib/storage/createWebStorage';

// API Slices
import { apiSlice } from './api/apiSliceWithHook';

// Feature Slices
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import userReducer from './slices/userSlice';
import preferencesReducer from './slices/preferencesSlice';
import notificationReducer from './slices/notificationSlice';
import workflowReducer from './slices/workflowSlice';
import sseReducer from './slices/sseSlice';

// Middleware
import { cacheMiddleware } from '@/lib/cache/rtkQueryCache';
import { loggerMiddleware } from './middleware/logger';
import { analyticsMiddleware } from './middleware/analytics';

// Environment configuration
import { isDevelopment, isBrowser } from './config/environment';

// DevTools imports
import {
  setupDevTools,
  performanceMonitor,
  stateDiffLogger,
  errorLogger,
} from './devtools/index';
import { getStateMonitor } from './devtools/stateMonitor';
import { getStateInspector } from './devtools/stateInspector';

// Persist Configuration
const persistConfig = {
  key: 'gloria-root',
  version: 1,
  storage,
  whitelist: ['auth', 'preferences'], // Only persist auth and preferences
  blacklist: ['api', 'ui'], // Don't persist API cache and UI state
};

// Root Reducer
const rootReducer = combineReducers({
  // API State
  [apiSlice.reducerPath]: apiSlice.reducer,

  // Feature State
  auth: authReducer,
  ui: uiReducer,
  user: userReducer,
  preferences: preferencesReducer,
  notifications: notificationReducer,
  workflow: workflowReducer,
  sse: sseReducer,
});

// Persisted Reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Custom Middleware Array
const customMiddleware = [
  loggerMiddleware,
  analyticsMiddleware,
  cacheMiddleware,
];

// DevTools Middleware (only in development)
const devToolsMiddleware = isDevelopment
  ? [performanceMonitor, stateDiffLogger, errorLogger]
  : [];

// Setup Redux DevTools configuration
const devToolsConfig = setupDevTools({
  name: 'Gloria State',
  maxAge: 50,
  trace: true,
  traceLimit: 25,
  features: {
    pause: true,
    lock: true,
    persist: true,
    export: true,
    import: 'custom' as any,
    jump: true,
    skip: true,
    reorder: true,
    dispatch: true,
    test: true,
  },
});

// Store Configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
    })
    .concat(apiSlice.middleware)
    .concat(customMiddleware)
    .concat(devToolsMiddleware),
  devTools: devToolsConfig || (process.env.NODE_ENV !== 'production'),
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

// Initialize DevTools monitoring in development
if (isDevelopment && isBrowser) {
  // Store reference for DevTools
  (window as any).__REDUX_STORE__ = store;

  // Initialize state monitor
  const stateMonitor = getStateMonitor({
    enableLogging: true,
    enableMetrics: true,
    enableAlerts: true,
    slowActionThreshold: 16,
    largeStateChangeThreshold: 10240,
    maxHistorySize: 100,
  });
  stateMonitor.init(store);

  // Initialize state inspector
  const stateInspector = getStateInspector(store);

  // Export to window for debugging
  (window as any).__STATE_MONITOR__ = stateMonitor;
  (window as any).__STATE_INSPECTOR__ = stateInspector;

  console.log('[Redux DevTools] Initialized with advanced debugging features');
  console.log('Available debugging tools:');
  console.log('- window.__REDUX_STORE__ - Direct store access');
  console.log('- window.__STATE_MONITOR__ - State monitoring utilities');
  console.log('- window.__STATE_INSPECTOR__ - State inspection utilities');
  console.log('- Redux DevTools Extension - Browser extension integration');
}

// Persistor
export const persistor = persistStore(store);

// Type exports
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
/**
 * Central export file for all custom hooks
 * This file exports all hooks to enable clean imports throughout the application
 */

// State management hooks
export { useAppDispatch } from './useAppDispatch';
export { useAppSelector } from './useAppSelector';
export { useAppState } from './useAppState';

// Authentication & Authorization
export { useAuth } from './useAuth';
export { usePermissions } from './usePermissions';

// Real-time & Communication
export { useWebSocket } from './useWebSocket';
export { useCrossTabSync } from './useCrossTabSync';

// UI & User Experience
export { useNotifications } from './useNotifications';
export { usePreferences } from './usePreferences';
export { useIsMobile } from './use-mobile';
export { useThrottle } from './useThrottle';
export { useDebounce } from './useDebounce';
export { useInfiniteScroll } from './useInfiniteScroll';

// Data & State Management
export { useCache } from './useCache';
export { usePersistentState } from './usePersistentState';
export { useStateSync } from './useStateSync';

// Error Handling & Recovery
export { useErrorHandler } from './useErrorHandler';
export { useErrorRecovery } from './useErrorRecovery';

// Business Logic
export { useWorkflow } from './useWorkflow';

// API hooks
export { useUsers } from './api/useUsers';
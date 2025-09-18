import { useCallback, useMemo } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectPermissions,
  selectRoles,
  selectHasPermission,
  selectHasRole,
} from '@/store/slices/authSlice';
import {
  selectTheme,
  selectSidebarOpen,
  selectModals,
  selectToasts,
  selectLoading,
  selectBreadcrumbs,
  setLoading,
  showToast,
  removeToast,
} from '@/store/slices/uiSlice';
import {
  selectNotifications,
  selectUnreadCount,
  selectUnreadNotifications,
} from '@/store/slices/notificationSlice';
import {
  selectPreferences,
  selectDisplayPreferences,
  selectWorkspacePreferences,
} from '@/store/slices/preferencesSlice';
import {
  selectWorkflowTemplates,
  selectWorkflowInstances,
  selectActiveWorkflowInstance,
  selectWorkflowStatistics,
} from '@/store/slices/workflowSlice';

/**
 * Main hook for accessing application state
 * Provides a unified interface to all state slices
 */
export const useAppState = () => {
  const dispatch = useAppDispatch();

  // Auth state
  const user = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const permissions = useAppSelector(selectPermissions);
  const roles = useAppSelector(selectRoles);

  // UI state
  const theme = useAppSelector(selectTheme);
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const modals = useAppSelector(selectModals);
  const toasts = useAppSelector(selectToasts);
  const breadcrumbs = useAppSelector(selectBreadcrumbs);

  // Notification state
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const unreadNotifications = useAppSelector(selectUnreadNotifications);

  // Preferences state
  const preferences = useAppSelector(selectPreferences);
  const displayPreferences = useAppSelector(selectDisplayPreferences);
  const workspacePreferences = useAppSelector(selectWorkspacePreferences);

  // Workflow state
  const workflowTemplates = useAppSelector(selectWorkflowTemplates);
  const workflowInstances = useAppSelector(selectWorkflowInstances);
  const activeWorkflowInstance = useAppSelector(selectActiveWorkflowInstance);
  const workflowStatistics = useAppSelector(selectWorkflowStatistics);

  // Permission checks
  const hasPermission = useCallback(
    (permission: string) => {
      return permissions.some(p => p.name === permission);
    },
    [permissions]
  );

  const hasRole = useCallback(
    (role: string) => {
      return roles.some(r => r.name === role);
    },
    [roles]
  );

  const hasAnyPermission = useCallback(
    (permissionList: string[]) => {
      return permissionList.some(permission => hasPermission(permission));
    },
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (permissionList: string[]) => {
      return permissionList.every(permission => hasPermission(permission));
    },
    [hasPermission]
  );

  const hasAnyRole = useCallback(
    (roleList: string[]) => {
      return roleList.some(role => hasRole(role));
    },
    [hasRole]
  );

  const hasAllRoles = useCallback(
    (roleList: string[]) => {
      return roleList.every(role => hasRole(role));
    },
    [hasRole]
  );

  // Loading state management
  const isLoading = useCallback(
    (key: string) => {
      return useAppSelector(state => selectLoading(key)(state));
    },
    []
  );

  const setLoadingState = useCallback(
    (key: string, value: boolean) => {
      dispatch(setLoading({ key, value }));
    },
    [dispatch]
  );

  // Toast management
  const addToast = useCallback(
    (toast: {
      type: 'success' | 'error' | 'warning' | 'info';
      message: string;
      duration?: number;
    }) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      dispatch(showToast({ id, ...toast }));
      return id;
    },
    [dispatch]
  );

  const removeToastById = useCallback(
    (id: string) => {
      dispatch(removeToast(id));
    },
    [dispatch]
  );

  // Computed values
  const isAdmin = useMemo(() => hasRole('admin'), [hasRole]);
  const isSuperAdmin = useMemo(() => hasRole('super_admin'), [hasRole]);
  const canManageUsers = useMemo(() => hasPermission('manage_users'), [hasPermission]);
  const canManageWorkflows = useMemo(() => hasPermission('manage_workflows'), [hasPermission]);

  return {
    // Auth
    user,
    isAuthenticated,
    permissions,
    roles,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isSuperAdmin,
    canManageUsers,
    canManageWorkflows,

    // UI
    theme,
    sidebarOpen,
    modals,
    toasts,
    breadcrumbs,
    addToast,
    removeToast: removeToastById,

    // Notifications
    notifications,
    unreadCount,
    unreadNotifications,

    // Preferences
    preferences,
    displayPreferences,
    workspacePreferences,

    // Workflows
    workflowTemplates,
    workflowInstances,
    activeWorkflowInstance,
    workflowStatistics,

    // Loading
    isLoading,
    setLoadingState,
  };
};

/**
 * Hook for auth-specific state
 */
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    permissions,
    roles,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isSuperAdmin,
  } = useAppState();

  return {
    user,
    isAuthenticated,
    permissions,
    roles,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isSuperAdmin,
  };
};

/**
 * Hook for UI-specific state
 */
export const useUI = () => {
  const {
    theme,
    sidebarOpen,
    modals,
    toasts,
    breadcrumbs,
    addToast,
    removeToast,
    isLoading,
    setLoadingState,
  } = useAppState();

  return {
    theme,
    sidebarOpen,
    modals,
    toasts,
    breadcrumbs,
    addToast,
    removeToast,
    isLoading,
    setLoadingState,
  };
};

/**
 * Hook for notification-specific state
 */
export const useNotifications = () => {
  const {
    notifications,
    unreadCount,
    unreadNotifications,
  } = useAppState();

  return {
    notifications,
    unreadCount,
    unreadNotifications,
    hasUnread: unreadCount > 0,
  };
};

/**
 * Hook for workflow-specific state
 */
export const useWorkflows = () => {
  const {
    workflowTemplates,
    workflowInstances,
    activeWorkflowInstance,
    workflowStatistics,
  } = useAppState();

  return {
    templates: workflowTemplates,
    instances: workflowInstances,
    activeInstance: activeWorkflowInstance,
    statistics: workflowStatistics,
    hasRunningWorkflows: workflowStatistics.runningInstances > 0,
  };
};
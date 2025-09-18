'use client';

import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setUser,
  setPermissions,
  setRoles,
  setAuthenticated,
  setLoading,
  setError,
  clearAuth,
  selectIsAuthenticated,
  selectUser,
  selectPermissions,
  selectRoles,
  selectIsLoading,
  selectAuthError,
} from '@/store/slices/authSlice';
import apiClient from '@/lib/api/client';
import { AuthService } from '@/lib/api/services/auth.service';

// Types
interface AuthContextType {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  permissions: string[];
  roles: string[];
  error: string | null;

  // Methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Permission & Role checks
  hasPermission: (permission: string) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;

  // Clerk integration
  clerkUser: any | null;
  getToken: () => Promise<string | null>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  // Redux selectors
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const permissions = useAppSelector(selectPermissions);
  const roles = useAppSelector(selectRoles);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectAuthError);

  // Auth service instance
  const authService = useMemo(() => AuthService.getInstance(), []);

  // Sync Clerk auth with backend
  const syncAuthWithBackend = useCallback(async () => {
    if (!isLoaded) return;

    try {
      dispatch(setLoading(true));

      if (isSignedIn) {
        // Get Clerk token
        const token = await getToken();

        if (token) {
          // Set token in API client
          apiClient.setAuthToken(token, 3600); // 1 hour expiry

          // Fetch user data from backend
          const userData = await authService.getCurrentUser();

          if (userData) {
            // Update Redux store
            dispatch(setUser({
              id: userData.id,
              email: userData.email,
              firstName: userData.firstName || null,
              lastName: userData.lastName || null,
              imageUrl: userData.imageUrl || null,
              role: userData.role || null,
              department: userData.department || null,
              position: userData.position || null,
              permissions: userData.permissions || [],
              roles: userData.roles || [],
              organizationId: userData.organizationId || null,
              organizationName: userData.organizationName || null,
            }));

            // Set permissions and roles
            if (userData.permissions) {
              dispatch(setPermissions(userData.permissions));
            }
            if (userData.roles) {
              dispatch(setRoles(userData.roles));
            }

            dispatch(setAuthenticated(true));
          }
        }
      } else {
        // Clear auth state
        apiClient.clearAuthToken();
        dispatch(clearAuth());
      }
    } catch (error: any) {
      console.error('Auth sync error:', error);
      dispatch(setError(error.message || 'Authentication sync failed'));

      // Clear auth on error
      apiClient.clearAuthToken();
      dispatch(clearAuth());
    } finally {
      dispatch(setLoading(false));
    }
  }, [isLoaded, isSignedIn, getToken, dispatch, authService]);

  // Initial sync on mount and when Clerk auth changes
  useEffect(() => {
    syncAuthWithBackend();
  }, [syncAuthWithBackend]);

  // Token refresh interval
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh token every 5 minutes
    const interval = setInterval(async () => {
      try {
        const token = await getToken({ template: 'gloria' });
        if (token) {
          apiClient.setAuthToken(token, 3600);
        }
      } catch (error) {
        console.error('Token refresh error:', error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, getToken]);

  // Login method (for non-Clerk auth)
  const login = useCallback(async (email: string, password: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      const response = await authService.login({ email, password });

      if (response.token) {
        apiClient.setAuthToken(response.token, response.expiresIn || 3600);

        // Fetch user data
        const userData = await authService.getCurrentUser();

        if (userData) {
          dispatch(setUser({
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName || null,
            lastName: userData.lastName || null,
            imageUrl: userData.imageUrl || null,
            role: userData.role || null,
            department: userData.department || null,
            position: userData.position || null,
            permissions: userData.permissions || [],
            roles: userData.roles || [],
            organizationId: userData.organizationId || null,
            organizationName: userData.organizationName || null,
          }));

          if (userData.permissions) {
            dispatch(setPermissions(userData.permissions));
          }
          if (userData.roles) {
            dispatch(setRoles(userData.roles));
          }

          dispatch(setAuthenticated(true));
        }
      }
    } catch (error: any) {
      dispatch(setError(error.message || 'Login failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, authService]);

  // Logout method
  const logout = useCallback(async () => {
    try {
      dispatch(setLoading(true));

      // Call backend logout
      await authService.logout();

      // Clear API client token
      apiClient.clearAuthToken();

      // Clear Redux state
      dispatch(clearAuth());

      // Sign out from Clerk if using Clerk auth
      if (isSignedIn) {
        await signOut();
      }
    } catch (error: any) {
      console.error('Logout error:', error);
      dispatch(setError(error.message || 'Logout failed'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, authService, isSignedIn, signOut]);

  // Refresh token method
  const refreshToken = useCallback(async () => {
    try {
      if (isSignedIn) {
        // Refresh Clerk token
        const token = await getToken({ template: 'gloria' });
        if (token) {
          apiClient.setAuthToken(token, 3600);
        }
      } else {
        // Refresh backend token
        const response = await authService.refreshToken();
        if (response.token) {
          apiClient.setAuthToken(response.token, response.expiresIn || 3600);
        }
      }
    } catch (error: any) {
      console.error('Token refresh error:', error);
      dispatch(setError(error.message || 'Token refresh failed'));
      throw error;
    }
  }, [isSignedIn, getToken, authService, dispatch]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      dispatch(setLoading(true));

      const userData = await authService.getCurrentUser();

      if (userData) {
        dispatch(setUser({
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          imageUrl: userData.imageUrl || null,
          role: userData.role || null,
          department: userData.department || null,
          position: userData.position || null,
          permissions: userData.permissions || [],
          roles: userData.roles || [],
          organizationId: userData.organizationId || null,
          organizationName: userData.organizationName || null,
        }));

        if (userData.permissions) {
          dispatch(setPermissions(userData.permissions));
        }
        if (userData.roles) {
          dispatch(setRoles(userData.roles));
        }
      }
    } catch (error: any) {
      console.error('User refresh error:', error);
      dispatch(setError(error.message || 'Failed to refresh user data'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, authService]);

  // Permission check methods
  const hasPermission = useCallback((permission: string) => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasAllPermissions = useCallback((perms: string[]) => {
    return perms.every(p => permissions.includes(p));
  }, [permissions]);

  const hasAnyPermission = useCallback((perms: string[]) => {
    return perms.some(p => permissions.includes(p));
  }, [permissions]);

  // Role check methods
  const hasRole = useCallback((role: string) => {
    return roles.includes(role);
  }, [roles]);

  const hasAllRoles = useCallback((roleList: string[]) => {
    return roleList.every(r => roles.includes(r));
  }, [roles]);

  const hasAnyRole = useCallback((roleList: string[]) => {
    return roleList.some(r => roles.includes(r));
  }, [roles]);

  // Context value
  const value = useMemo<AuthContextType>(() => ({
    // State
    isAuthenticated,
    isLoading,
    user,
    permissions,
    roles,
    error,

    // Methods
    login,
    logout,
    refreshToken,
    refreshUser,

    // Permission & Role checks
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    hasAllRoles,
    hasAnyRole,

    // Clerk integration
    clerkUser,
    getToken,
  }), [
    isAuthenticated,
    isLoading,
    user,
    permissions,
    roles,
    error,
    login,
    logout,
    refreshToken,
    refreshUser,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    hasAllRoles,
    hasAnyRole,
    clerkUser,
    getToken,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export context for direct use if needed
export { AuthContext };
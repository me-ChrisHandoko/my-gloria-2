import { useAuth, useUser } from '@clerk/nextjs';
import { useCallback, useEffect } from 'react';
import apiClient from '@/lib/api/client';
import { useAppDispatch } from '@/store/hooks';
import { setUser, setPermissions, setRoles } from '@/store/slices/authSlice';

/**
 * Custom hook for making authenticated requests with Clerk tokens
 */
export const useAuthenticatedRequest = () => {
  const { getToken } = useAuth();

  return useCallback(async (config: RequestInit = {}) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error('No authentication token available');
      }

      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${token}`,
          'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        },
      };
    } catch (error) {
      console.error('Failed to get auth token:', error);
      throw error;
    }
  }, [getToken]);
};

/**
 * Hook to sync Clerk authentication with API client
 */
export const useClerkApiSync = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isLoaded) return;

    const syncToken = async () => {
      try {
        if (isSignedIn) {
          const token = await getToken();
          if (token) {
            // Set token in API client
            apiClient.setAuthToken(token, 3600); // 1 hour expiry

            // Fetch user data from backend
            const response = await apiClient.get('/api/v1/auth/me');

            // Update Redux store
            if (response) {
              dispatch(setUser(response as any));

              // Set permissions and roles if available
              if ((response as any).permissions) {
                dispatch(setPermissions((response as any).permissions));
              }
              if ((response as any).roles) {
                dispatch(setRoles((response as any).roles));
              }
            }
          }
        } else {
          // Clear token from API client
          apiClient.clearAuthToken();
        }
      } catch (error) {
        console.error('Failed to sync auth token:', error);
        apiClient.clearAuthToken();
      }
    };

    syncToken();

    // Refresh token every 5 minutes
    const interval = setInterval(syncToken, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [getToken, isLoaded, isSignedIn, user, dispatch]);
};

/**
 * Hook to handle Clerk session changes
 */
export const useClerkSessionSync = () => {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;

    const handleSessionChange = () => {
      // Invalidate any cached data when session changes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('clerk-session-change', {
          detail: { session }
        }));
      }
    };

    handleSessionChange();
  }, [session]);
};

/**
 * Get authentication headers for server-side requests
 */
export const getServerAuthHeaders = async (token: string | null): Promise<HeadersInit> => {
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
    'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  };
};

/**
 * Middleware to check permissions
 */
export const usePermissionCheck = (requiredPermissions: string[]) => {
  const { isLoaded, isSignedIn } = useAuth();
  const userPermissions = useAppSelector(state => state.auth.permissions);

  const hasPermission = useCallback(() => {
    if (!isLoaded || !isSignedIn) return false;

    if (requiredPermissions.length === 0) return true;

    return requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );
  }, [isLoaded, isSignedIn, userPermissions, requiredPermissions]);

  return { hasPermission: hasPermission(), isLoaded };
};

/**
 * Middleware to check roles
 */
export const useRoleCheck = (requiredRoles: string[]) => {
  const { isLoaded, isSignedIn } = useAuth();
  const userRoles = useAppSelector(state => state.auth.roles);

  const hasRole = useCallback(() => {
    if (!isLoaded || !isSignedIn) return false;

    if (requiredRoles.length === 0) return true;

    return requiredRoles.some(role => userRoles.includes(role));
  }, [isLoaded, isSignedIn, userRoles, requiredRoles]);

  return { hasRole: hasRole(), isLoaded };
};

// Import useAppSelector
import { useAppSelector } from '@/store/hooks';
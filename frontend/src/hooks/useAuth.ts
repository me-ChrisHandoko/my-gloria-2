/**
 * Authentication Hooks
 * Custom hooks for authentication and authorization
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { useAppSelector } from '@/store/hooks';
import {
  selectHasPermission,
  selectHasAllPermissions,
  selectHasAnyPermission,
  selectHasRole,
  selectHasAllRoles,
  selectHasAnyRole,
} from '@/store/slices/authSlice';

/**
 * Hook for checking single permission
 */
export const usePermission = (permission: string) => {
  const hasPermission = useAppSelector(selectHasPermission(permission));
  const { isAuthenticated, isLoading } = useAuthContext();

  return {
    hasPermission: isAuthenticated && hasPermission,
    isLoading,
    isAuthenticated,
  };
};

/**
 * Hook for checking multiple permissions (all required)
 */
export const usePermissions = (permissions: string[]) => {
  const hasPermissions = useAppSelector(selectHasAllPermissions(permissions));
  const { isAuthenticated, isLoading } = useAuthContext();

  return {
    hasPermissions: isAuthenticated && hasPermissions,
    isLoading,
    isAuthenticated,
  };
};

/**
 * Hook for checking if user has any of the specified permissions
 */
export const useAnyPermission = (permissions: string[]) => {
  const hasAnyPermission = useAppSelector(selectHasAnyPermission(permissions));
  const { isAuthenticated, isLoading } = useAuthContext();

  return {
    hasAnyPermission: isAuthenticated && hasAnyPermission,
    isLoading,
    isAuthenticated,
  };
};

/**
 * Hook for checking single role
 */
export const useRole = (role: string) => {
  const hasRole = useAppSelector(selectHasRole(role));
  const { isAuthenticated, isLoading } = useAuthContext();

  return {
    hasRole: isAuthenticated && hasRole,
    isLoading,
    isAuthenticated,
  };
};

/**
 * Hook for checking multiple roles (all required)
 */
export const useRoles = (roles: string[]) => {
  const hasRoles = useAppSelector(selectHasAllRoles(roles));
  const { isAuthenticated, isLoading } = useAuthContext();

  return {
    hasRoles: isAuthenticated && hasRoles,
    isLoading,
    isAuthenticated,
  };
};

/**
 * Hook for checking if user has any of the specified roles
 */
export const useAnyRole = (roles: string[]) => {
  const hasAnyRole = useAppSelector(selectHasAnyRole(roles));
  const { isAuthenticated, isLoading } = useAuthContext();

  return {
    hasAnyRole: isAuthenticated && hasAnyRole,
    isLoading,
    isAuthenticated,
  };
};

/**
 * Hook for protected routes
 */
export const useRequireAuth = (
  redirectTo: string = '/login',
  options?: {
    permissions?: string[];
    roles?: string[];
    requireAll?: boolean;
  }
) => {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Check permissions if specified
  const hasRequiredPermissions = useAppSelector(
    options?.permissions
      ? options.requireAll
        ? selectHasAllPermissions(options.permissions)
        : selectHasAnyPermission(options.permissions)
      : () => true
  );

  // Check roles if specified
  const hasRequiredRoles = useAppSelector(
    options?.roles
      ? options.requireAll
        ? selectHasAllRoles(options.roles)
        : selectHasAnyRole(options.roles)
      : () => true
  );

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Store the current path for redirect after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      }
      router.push(redirectTo);
      setIsAuthorized(false);
    } else {
      // Check permissions and roles
      const authorized = hasRequiredPermissions && hasRequiredRoles;

      if (!authorized) {
        // Redirect to unauthorized page
        router.push('/unauthorized');
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    hasRequiredPermissions,
    hasRequiredRoles,
    router,
    redirectTo,
  ]);

  return {
    isAuthorized,
    isLoading,
    user,
  };
};

/**
 * Hook for guest routes (redirect if authenticated)
 */
export const useRequireGuest = (redirectTo: string = '/dashboard') => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      // Check if there's a redirect path stored
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      } else {
        router.push(redirectTo);
      }
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return {
    isGuest: !isAuthenticated,
    isLoading,
  };
};

/**
 * Hook for conditional rendering based on authentication
 */
export const useAuthState = () => {
  const { isAuthenticated, isLoading, user, error } = useAuthContext();

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    isGuest: !isAuthenticated,
  };
};

/**
 * Hook for login functionality
 */
export const useLogin = () => {
  const { login } = useAuthContext();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = useCallback(async (
    email: string,
    password: string,
    redirectTo?: string
  ) => {
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      await login(email, password);

      // Check for stored redirect path
      const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
      const finalRedirect = redirectTo || storedRedirect || '/dashboard';

      if (storedRedirect) {
        sessionStorage.removeItem('redirectAfterLogin');
      }

      router.push(finalRedirect);
    } catch (error: any) {
      setLoginError(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }, [login, router]);

  return {
    login: handleLogin,
    isLoggingIn,
    loginError,
  };
};

/**
 * Hook for logout functionality
 */
export const useLogout = () => {
  const { logout } = useAuthContext();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async (redirectTo: string = '/login') => {
    setIsLoggingOut(true);

    try {
      await logout();
      router.push(redirectTo);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, router]);

  return {
    logout: handleLogout,
    isLoggingOut,
  };
};

/**
 * Hook for session management
 */
export const useSession = () => {
  const { user, isAuthenticated, refreshToken, refreshUser } = useAuthContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshToken();
      await refreshUser();
    } catch (error) {
      console.error('Session refresh error:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshToken, refreshUser]);

  return {
    user,
    isAuthenticated,
    refresh,
    isRefreshing,
  };
};

/**
 * Hook for activity tracking
 */
export const useActivityTracking = (timeoutMinutes: number = 30) => {
  const { isAuthenticated, logout } = useAuthContext();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timeout = timeoutMinutes * 60 * 1000;
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      setLastActivity(Date.now());
      setIsIdle(false);

      timer = setTimeout(() => {
        setIsIdle(true);
        // Auto logout on idle
        logout();
      }, timeout);
    };

    // Activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Initial timer
    resetTimer();

    // Cleanup
    return () => {
      clearTimeout(timer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [isAuthenticated, logout, timeoutMinutes]);

  return {
    lastActivity,
    isIdle,
  };
};

// Re-export the main useAuth hook from context
export { useAuth } from '@/contexts/AuthContext';
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import {
  validateUserWithBackend,
  storeUserSession,
  clearUserSession,
  getStoredUserSession
} from '@/lib/auth';
import { UserProfile } from '@/types/auth';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  error: string | null;
  checkAuthorization: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Global Auth Provider
 * Manages authorization state across the application
 * Automatically validates and refreshes authorization
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  // Check if the current path is public (doesn't require auth)
  const isPublicPath = useCallback((path: string) => {
    const publicPaths = [
      '/sign-in',
      '/sign-up',
      '/auth/validate',
      '/',
      '/terms',
      '/privacy',
      '/help'
    ];
    return publicPaths.some(p => path.startsWith(p));
  }, []);

  /**
   * Check user authorization with backend
   * Returns true if authorized, false otherwise
   */
  const checkAuthorization = useCallback(async (): Promise<boolean> => {
    try {
      // Skip check for public paths
      if (isPublicPath(pathname)) {
        return true;
      }

      // If not signed in with Clerk, not authorized
      if (!isSignedIn) {
        setUser(null);
        setIsAuthorized(false);
        return false;
      }

      // Check if we need to revalidate (every 5 minutes or on critical paths)
      const now = Date.now();
      const shouldRevalidate =
        now - lastCheckTime > 5 * 60 * 1000 || // 5 minutes
        pathname.includes('/admin') ||
        pathname.includes('/settings') ||
        !user; // No cached user

      if (!shouldRevalidate && user) {
        // Use cached authorization
        return true;
      }

      // Get Clerk token
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Validate with backend
      const response = await validateUserWithBackend(token);

      // Update state
      setUser(response.user);
      storeUserSession(response);
      setIsAuthorized(true);
      setLastCheckTime(now);
      setError(null);

      return true;
    } catch (error: any) {
      console.error('Authorization check failed:', error);

      const errorMessage = error.message || 'Authorization failed';
      setError(errorMessage);
      setUser(null);
      setIsAuthorized(false);

      // Clear session
      clearUserSession();

      // Sign out from Clerk if it's an authorization error
      if (errorMessage.includes('not registered') ||
          errorMessage.includes('inactive') ||
          errorMessage.includes('forbidden')) {
        try {
          await clerkSignOut();
        } catch (signOutError) {
          console.error('Failed to sign out from Clerk:', signOutError);
        }
      }

      return false;
    }
  }, [isSignedIn, pathname, user, lastCheckTime, getToken, clerkSignOut, isPublicPath]);

  /**
   * Sign out user completely
   */
  const signOut = useCallback(async () => {
    try {
      // Clear local state
      setUser(null);
      setIsAuthorized(false);
      clearUserSession();

      // Sign out from Clerk
      await clerkSignOut();

      // Redirect to sign-in
      router.push('/sign-in');
    } catch (error) {
      console.error('Sign out failed:', error);
      // Force redirect even if sign out fails
      router.push('/sign-in');
    }
  }, [clerkSignOut, router]);

  /**
   * Refresh authentication state
   */
  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      await checkAuthorization();
    } finally {
      setIsLoading(false);
    }
  }, [checkAuthorization]);

  // Initial auth check and setup
  useEffect(() => {
    const initAuth = async () => {
      if (!isLoaded) return;

      setIsLoading(true);
      try {
        // Try to load cached session first
        const cachedUser = getStoredUserSession();
        if (cachedUser && isSignedIn) {
          setUser(cachedUser);
          setIsAuthorized(true);
        }

        // Then validate with backend
        const authorized = await checkAuthorization();

        // If not authorized and not on public path, redirect
        if (!authorized && !isPublicPath(pathname)) {
          router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [isLoaded, isSignedIn]);

  // Re-check authorization on route changes
  useEffect(() => {
    if (!isLoading && isLoaded) {
      checkAuthorization();
    }
  }, [pathname]);

  // Periodic authorization check (every 5 minutes)
  useEffect(() => {
    if (!isAuthorized || isPublicPath(pathname)) return;

    const interval = setInterval(() => {
      checkAuthorization();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthorized, pathname, isPublicPath, checkAuthorization]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: isSignedIn || false,
    isAuthorized,
    error,
    checkAuthorization,
    signOut,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication
 * Automatically redirects if not authenticated
 */
export function useRequireAuth(redirectTo = '/sign-in') {
  const { isAuthenticated, isAuthorized, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAuthorized)) {
      router.push(`${redirectTo}?redirect_url=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, isAuthorized, router, pathname, redirectTo]);

  return { isAuthenticated, isAuthorized, isLoading };
}
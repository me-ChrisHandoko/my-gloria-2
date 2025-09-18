'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { initializeApiClient } from './client';

/**
 * Provider component that integrates Clerk authentication with the API client
 * This should be used in client components to automatically manage auth tokens
 */
export function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    let cleanup: (() => void) | undefined;

    if (isSignedIn) {
      // Initialize API client with Clerk's getToken function
      cleanup = initializeApiClient(async () => {
        try {
          const token = await getToken();
          return token;
        } catch (error) {
          console.error('Failed to get Clerk token:', error);
          return null;
        }
      });

      // Get initial token
      getToken().then((token) => {
        if (token) {
          // Token is automatically set by initializeApiClient
          console.log('[API Auth] Token initialized');
        }
      });
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [getToken, isLoaded, isSignedIn]);

  return <>{children}</>;
}

/**
 * Hook to use the API client with automatic auth
 * This ensures the API client is properly authenticated
 */
export function useApiAuth() {
  const { getToken, isSignedIn } = useAuth();

  return {
    isAuthenticated: isSignedIn,
    refreshToken: async () => {
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const { default: apiClient } = await import('./client');
          apiClient.setAuthToken(token);
          return true;
        }
      }
      return false;
    },
  };
}
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import {
  validateUserWithBackend,
  getStoredUserSession,
  clearUserSession,
  storeUserSession
} from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
  fallbackUrl?: string;
}

/**
 * AuthGuard Component
 * Protects routes by validating user authorization with backend
 * Automatically signs out and redirects unauthorized users
 */
export default function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/sign-in',
  allowedRoles = [],
  fallbackUrl = '/sign-in',
}: AuthGuardProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add validation state tracking to prevent multiple validations
  const validationInProgress = useRef(false);
  const lastValidationTime = useRef<number>(0);
  const VALIDATION_CACHE_DURATION = 60000; // 1 minute

  useEffect(() => {
    const validateAuthorization = async () => {
      // Wait for Clerk to load
      if (!isLoaded) return;

      // Prevent multiple simultaneous validations
      if (validationInProgress.current) {
        return;
      }

      // Check if we recently validated (within cache duration)
      const now = Date.now();
      if (lastValidationTime.current && (now - lastValidationTime.current) < VALIDATION_CACHE_DURATION) {
        // If we're already authorized and within cache duration, skip re-validation
        if (isAuthorized) {
          return;
        }
      }

      // If auth is not required, allow access
      if (!requireAuth) {
        setIsAuthorized(true);
        setIsValidating(false);
        return;
      }

      // If user is not signed in, redirect to login
      if (!isSignedIn) {
        clearUserSession();
        router.push(`${redirectTo}?redirect_url=${encodeURIComponent(pathname)}`);
        return;
      }

      // Check if we have a cached user session
      const cachedUser = getStoredUserSession();
      if (cachedUser) {
        // Check role-based access if needed
        if (allowedRoles.length > 0) {
          const hasRequiredRole = allowedRoles.some(role =>
            cachedUser.roles?.includes(role)
          );

          if (!hasRequiredRole) {
            setError('Insufficient permissions');
            setIsAuthorized(false);
            router.replace(`${fallbackUrl}?error=insufficient_permissions&source=guard`);
            return;
          }
        }

        // Fast authorization - no backend call needed
        setIsAuthorized(true);
        setIsValidating(false);
        return;
      }

      // No cached user, validate with backend
      validationInProgress.current = true;

      try {
        const token = await getToken();

        if (!token) {
          throw new Error('No authentication token available');
        }

        // Validate with backend
        const response = await validateUserWithBackend(token);

        // Store the session
        storeUserSession(response);

        // Update last validation time
        lastValidationTime.current = Date.now();

        // Check role-based access if roles are specified
        if (allowedRoles.length > 0) {
          const hasRequiredRole = allowedRoles.some(role =>
            response.user.roles.includes(role)
          );

          if (!hasRequiredRole) {
            throw new Error('Insufficient permissions for this resource');
          }
        }

        setIsAuthorized(true);
      } catch (error: any) {
        console.error('Authorization validation failed:', error);
        setError(error.message || 'Authorization failed');
        setIsAuthorized(false);

        // Sign out from Clerk
        try {
          await signOut();
        } catch (signOutError) {
          console.error('Failed to sign out:', signOutError);
        }

        // Clear local session
        clearUserSession();

        // Store the actual backend error message in sessionStorage
        // This allows the sign-in page to display the exact backend message
        const errorMessage = error.message || 'Authorization failed. Please try again or contact support.';
        sessionStorage.setItem('gloria_error_message', errorMessage);

        // Determine where to redirect based on error
        // For authorization errors, redirect to sign-in with error parameters
        if (error.message?.includes('not registered')) {
          router.replace(`${redirectTo}?error=not_registered&source=guard`);
        } else if (error.message?.includes('inactive')) {
          router.replace(`${redirectTo}?error=inactive&source=guard`);
        } else if (error.message?.includes('permissions')) {
          router.replace(`${redirectTo}?error=insufficient_permissions&source=guard`);
        } else {
          // For other errors, redirect to sign-in
          router.replace(`${redirectTo}?redirect_url=${encodeURIComponent(pathname)}&error=session_invalid`);
        }
      } finally {
        setIsValidating(false);
        validationInProgress.current = false;
      }
    };

    validateAuthorization();
  }, [
    isLoaded,
    isSignedIn,
    requireAuth,
    redirectTo,
    pathname,
    router,
    getToken,
    signOut,
    allowedRoles,
    fallbackUrl
  ]);

  // Show loading state while validating OR if not yet authorized
  // This prevents any content flash by ensuring we stay in loading state
  // until we're absolutely sure the user is authorized
  if (isValidating || (!isAuthorized && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8">
          <div className="relative">
            {/* Primary spinner */}
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
            {/* Secondary pulsing ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border-4 border-blue-300 animate-ping opacity-30"></div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Securing your session
          </h3>
          <p className="text-sm text-gray-600">
            Please wait while we verify your access...
          </p>
        </div>
      </div>
    );
  }

  // If we have an error, we should be redirecting, so show loading
  if (!isAuthorized && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-sm text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Render children if authorized
  return <>{children}</>;
}
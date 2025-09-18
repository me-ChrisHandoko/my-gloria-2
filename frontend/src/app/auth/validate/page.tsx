'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { validateUserWithBackend, storeUserSession, getErrorReason, clearUserSession } from '@/lib/auth';
import { oauthLogger } from '@/lib/oauth-logger';

const LoadingSpinner = () => (
  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
);


export default function OAuthValidationPage() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateOAuthUser = async () => {
      // Wait for Clerk to load
      if (!isLoaded) return;

      // Check if validation is pending
      const isPending = sessionStorage.getItem('gloria_pending_validation');
      const redirectUrl = sessionStorage.getItem('gloria_redirect_url') || '/dashboard';

      // Clean up session storage
      sessionStorage.removeItem('gloria_pending_validation');
      sessionStorage.removeItem('gloria_redirect_url');

      if (!isPending) {
        // Not coming from OAuth flow, redirect to sign-in
        router.push('/sign-in');
        return;
      }

      if (isSignedIn) {
        try {
          // Log validation start
          oauthLogger.info('Backend Validation', 'Starting backend validation after OAuth');

          // Get Clerk token
          const token = await getToken();

          if (!token) {
            throw new Error('Failed to get authentication token');
          }

          oauthLogger.debug('Backend Validation', 'Retrieved Clerk token successfully');

          // Validate with backend
          const response = await validateUserWithBackend(token);

          // Store user session
          storeUserSession(response);

          oauthLogger.info('Backend Validation Success', 'User validated successfully', {
            userId: response.user?.id,
            userEmail: response.user?.email
          });

          // Validation successful - redirect to intended destination
          router.push(redirectUrl);
        } catch (error: any) {
          // Enhanced error logging with more details
          const errorDetails = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            name: error.name,
            timestamp: new Date().toISOString()
          };

          oauthLogger.error('Backend Validation Failed', 'Failed to validate user with backend', errorDetails);

          // Sign out from Clerk immediately
          await signOut();

          // Clear any stored session data
          clearUserSession();

          // Get structured error reason for routing (backward compatibility)
          const errorReason = getErrorReason(error.message || '');

          // Use actual backend error message for display
          // The backend already sends appropriate messages based on the error type
          const errorMessage = error.message || 'Access validation failed. Please contact support if this issue persists.';

          // Log the error message that will be displayed to the user
          oauthLogger.info('User Error Display', `Showing error to user: ${errorMessage}`);

          // Set the actual error message from backend
          setError(errorMessage);

          setIsValidating(false);

          // Store the actual backend error message in sessionStorage for the sign-in page
          sessionStorage.setItem('gloria_error_message', errorMessage);

          // Redirect to sign-in page with error reason for query params
          setTimeout(() => {
            router.replace(`/sign-in?error=${errorReason}&source=oauth`);
          }, 2000);
        }
      } else {
        // Not signed in after OAuth - something went wrong
        setError('Authentication failed. Please try signing in again.');
        setIsValidating(false);

        setTimeout(() => {
          router.push('/sign-in');
        }, 3000);
      }
    };

    validateOAuthUser();
  }, [isLoaded, isSignedIn, getToken, signOut, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white shadow-xl rounded-xl border border-gray-100 p-8">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Access Denied
              </h1>

              <p className="text-gray-700 mb-6">
                {error}
              </p>

              <p className="text-sm text-gray-500 mb-4">
                Redirecting you to the login page...
              </p>

              <div className="flex justify-center">
                <LoadingSpinner />
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a href="mailto:hr@gloria.gov" className="text-blue-500 hover:text-blue-600">
                Contact HR Department
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-xl rounded-xl border border-gray-100 p-8">
          <div className="text-center">
            <LoadingSpinner />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              {isValidating ? 'Validating your access...' : 'Completing sign in...'}
            </h2>
            <p className="mt-2 text-gray-600">
              Please wait while we verify your credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
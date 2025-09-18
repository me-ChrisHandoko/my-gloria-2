'use client';

import { useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { oauthLogger, formatOAuthError } from '@/lib/oauth-logger';

const LoadingSpinner = () => (
  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
);

/**
 * OAuth Callback Handler
 *
 * This page handles the OAuth callback from external providers (Google, Microsoft).
 * Clerk automatically handles the OAuth flow, we just need to wait for it to complete
 * and then redirect to the validation page.
 */
export default function OAuthCallbackPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processOAuthCallback = async () => {
      // Wait for Clerk to be fully loaded
      if (!isLoaded) return;

      try {
        // Log callback processing
        oauthLogger.info('OAuth Callback', 'Processing OAuth callback', {
          url: window.location.href,
          hasCode: window.location.search.includes('code'),
          hasError: window.location.search.includes('error')
        });

        // Handle the OAuth redirect callback
        // This will complete the OAuth flow and create a session if successful
        await handleRedirectCallback({
          afterSignInUrl: '/auth/validate',
          afterSignUpUrl: '/auth/validate',
        });

        // Mark that validation is pending
        sessionStorage.setItem('gloria_pending_validation', 'true');

        // Get the redirect URL from query params or default to dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect_url') || '/dashboard';
        sessionStorage.setItem('gloria_redirect_url', redirectUrl);

        // If sign-in was successful, redirect to validation
        if (isSignedIn) {
          oauthLogger.info('OAuth Callback Success', 'OAuth authentication successful, redirecting to validation');
          router.push('/auth/validate');
        } else {
          // If not signed in after callback, something went wrong
          throw new Error('OAuth authentication failed. Session was not created.');
        }
      } catch (error: any) {
        oauthLogger.error('OAuth Callback Failed', 'Failed to process OAuth callback', error);

        // Use the improved error formatter
        // Try to detect provider from URL or error details
        const urlParams = new URLSearchParams(window.location.search);
        const provider = urlParams.get('provider') ||
                        (error?.message?.includes('microsoft') ? 'Microsoft' :
                         error?.message?.includes('google') ? 'Google' : undefined);

        const errorMessage = formatOAuthError(error, provider);

        setError(errorMessage);
        setIsProcessing(false);

        // Store error for sign-in page
        sessionStorage.setItem('gloria_error_message', errorMessage);

        // Redirect back to sign-in with error
        setTimeout(() => {
          router.replace('/sign-in?error=oauth_failed&source=callback');
        }, 3000);
      }
    };

    processOAuthCallback();
  }, [isLoaded, isSignedIn, handleRedirectCallback, router]);

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
                Authentication Failed
              </h1>

              <p className="text-gray-700 mb-6">
                {error}
              </p>

              <p className="text-sm text-gray-500 mb-4">
                Redirecting you back to the login page...
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
              {isProcessing ? 'Processing authentication...' : 'Completing sign in...'}
            </h2>
            <p className="mt-2 text-gray-600">
              Please wait while we complete your sign-in
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
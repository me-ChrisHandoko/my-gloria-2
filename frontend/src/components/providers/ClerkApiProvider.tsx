'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setClerkGetToken } from '@/store/api/apiSliceWithHook';

/**
 * Provider component to initialize Clerk authentication for RTK Query
 * This should wrap your app to ensure the getToken function is available
 */
export function ClerkApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set the getToken function for the API slice to use
    setClerkGetToken(getToken);
  }, [getToken]);

  return <>{children}</>;
}
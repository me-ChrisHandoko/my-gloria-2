'use client';

import React from 'react';
import { useRequireAuth, useAuth, useRequireGuest } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * Protected Route Component
 * Wraps content that requires authentication and optional permissions/roles
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permissions,
  roles,
  requireAll = true,
  redirectTo = '/login',
  fallback,
}) => {
  const { isAuthorized, isLoading } = useRequireAuth(redirectTo, {
    permissions,
    roles,
    requireAll,
  });

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    );
  }

  // If not authorized, useRequireAuth will handle redirect
  if (!isAuthorized) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
};

/**
 * HOC for protecting pages
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    permissions?: string[];
    roles?: string[];
    requireAll?: boolean;
    redirectTo?: string;
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Permission-based conditional rendering
 */
interface CanProps {
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permissions = [],
  roles = [],
  requireAll = true,
  children,
  fallback = null,
}) => {
  const { hasPermission, hasRole } = useAuth();

  let isAuthorized = true;

  // Check permissions
  if (permissions.length > 0) {
    if (requireAll) {
      isAuthorized = permissions.every(p => hasPermission(p));
    } else {
      isAuthorized = permissions.some(p => hasPermission(p));
    }
  }

  // Check roles
  if (isAuthorized && roles.length > 0) {
    if (requireAll) {
      isAuthorized = roles.every(r => hasRole(r));
    } else {
      isAuthorized = roles.some(r => hasRole(r));
    }
  }

  return isAuthorized ? <>{children}</> : <>{fallback}</>;
};

/**
 * Guest-only route component
 */
interface GuestRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export const GuestRoute: React.FC<GuestRouteProps> = ({
  children,
  redirectTo = '/dashboard',
  fallback,
}) => {
  const { isGuest, isLoading } = useRequireGuest(redirectTo);

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    );
  }

  // If authenticated, useRequireGuest will handle redirect
  if (!isGuest) {
    return null;
  }

  // Render guest content
  return <>{children}</>;
};
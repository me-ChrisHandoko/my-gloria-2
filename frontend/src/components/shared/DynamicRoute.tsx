'use client';

import { Suspense, lazy, useEffect, ComponentType, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { preloadRouteComponents } from '@/lib/utils/lazyImports';

interface DynamicRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentPath?: string;
  preloadPaths?: string[];
}

/**
 * DynamicRoute wrapper for route-based code splitting
 * Automatically preloads components based on the current route
 */
export function DynamicRoute({
  children,
  fallback = <LoadingState variant="spinner" />,
  componentPath,
  preloadPaths = []
}: DynamicRouteProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Preload components for the current route
    if (pathname) {
      preloadRouteComponents(pathname);
    }

    // Preload components for potential next routes
    preloadPaths.forEach(path => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          preloadRouteComponents(path);
        });
      }
    });
  }, [pathname, preloadPaths]);

  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Dynamic component loader with error boundary and loading state
 */
export function DynamicComponent<P extends object>({
  loader,
  fallback = <LoadingState variant="spinner" />,
  errorFallback,
  ...props
}: {
  loader: () => Promise<{ default: ComponentType<P> }>;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
} & P) {
  const Component = lazy(loader);

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        <Component {...props as P} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Route-level lazy loading wrapper
 * Use this for entire route components
 */
export function LazyRoute({
  component,
  fallback = <LoadingState variant="spinner" />,
  ...props
}: {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  [key: string]: any;
}) {
  const Component = lazy(component);

  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Progressive loading component
 * Shows a basic version immediately, then loads the full version
 */
export function ProgressiveComponent<P extends object>({
  basic,
  enhanced,
  ...props
}: {
  basic: ComponentType<P>;
  enhanced: () => Promise<{ default: ComponentType<P> }>;
} & P) {
  const EnhancedComponent = lazy(enhanced);
  const BasicComponent = basic;

  return (
    <ErrorBoundary fallback={<BasicComponent {...props as P} />}>
      <Suspense fallback={<BasicComponent {...props as P} />}>
        <EnhancedComponent {...props as P} />
      </Suspense>
    </ErrorBoundary>
  );
}
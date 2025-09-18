'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'dots' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

/**
 * Production-ready loading state component with variants
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'md',
  text,
  className
}) => {
  const sizeClasses = {
    sm: {
      spinner: 'h-4 w-4',
      container: 'py-4',
      text: 'text-sm'
    },
    md: {
      spinner: 'h-8 w-8',
      container: 'py-8',
      text: 'text-base'
    },
    lg: {
      spinner: 'h-12 w-12',
      container: 'py-12',
      text: 'text-lg'
    }
  };

  const styles = sizeClasses[size];

  if (variant === 'spinner') {
    return (
      <div className={cn("flex flex-col items-center justify-center", styles.container, className)}>
        <Loader2 className={cn("animate-spin text-gray-400 dark:text-gray-600", styles.spinner)} />
        {text && (
          <p className={cn("mt-4 text-gray-500 dark:text-gray-400", styles.text)}>
            {text}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn("flex items-center justify-center gap-1", styles.container, className)}>
        <span className="sr-only">{text || 'Loading'}</span>
        <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" />
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("flex items-center justify-center", styles.container, className)}>
        <div className="relative">
          <div className={cn(
            "rounded-full bg-blue-400 dark:bg-blue-600 opacity-75 animate-ping absolute",
            size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-12 w-12' : 'h-16 w-16'
          )} />
          <div className={cn(
            "rounded-full bg-blue-500 dark:bg-blue-700 relative",
            size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-12 w-12' : 'h-16 w-16'
          )} />
        </div>
        {text && (
          <p className={cn("ml-4 text-gray-500 dark:text-gray-400", styles.text)}>
            {text}
          </p>
        )}
      </div>
    );
  }

  // Skeleton variant
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
};

/**
 * Page-level loading skeleton
 */
export const PageSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Table loading skeleton
 */
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => {
  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-3 mb-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-8 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Card loading skeleton
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("border rounded-lg p-6 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-10 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
};

/**
 * Form loading skeleton
 */
export const FormSkeleton: React.FC<{
  fields?: number;
  className?: string;
}> = ({ fields = 4, className }) => {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 justify-end">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};
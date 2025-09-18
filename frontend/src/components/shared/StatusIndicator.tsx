'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Pause,
  Play,
  Archive,
  Ban,
  AlertTriangle
} from 'lucide-react';

type StatusType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'pending'
  | 'processing'
  | 'active'
  | 'inactive'
  | 'archived'
  | 'blocked';

interface StatusIndicatorProps {
  status: StatusType | string;
  label?: string;
  showIcon?: boolean;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'dot' | 'text';
  className?: string;
  pulse?: boolean;
}

/**
 * Production-ready status indicator component
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  showIcon = true,
  showDot = false,
  size = 'md',
  variant = 'badge',
  className,
  pulse = false
}) => {
  const statusConfig: Record<string, {
    label: string;
    color: string;
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
  }> = {
    success: {
      label: label || 'Success',
      color: 'bg-green-500',
      icon: <CheckCircle className={cn(
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-400'
    },
    error: {
      label: label || 'Error',
      color: 'bg-red-500',
      icon: <XCircle className={cn(
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-400'
    },
    warning: {
      label: label || 'Warning',
      color: 'bg-yellow-500',
      icon: <AlertTriangle className={cn(
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-400'
    },
    info: {
      label: label || 'Info',
      color: 'bg-blue-500',
      icon: <AlertCircle className={cn(
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-700 dark:text-blue-400'
    },
    pending: {
      label: label || 'Pending',
      color: 'bg-gray-500',
      icon: <Clock className={cn(
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      textColor: 'text-gray-700 dark:text-gray-400'
    },
    processing: {
      label: label || 'Processing',
      color: 'bg-purple-500',
      icon: <Loader2 className={cn(
        'animate-spin',
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-700 dark:text-purple-400'
    },
    active: {
      label: label || 'Active',
      color: 'bg-green-500',
      icon: <Play className={cn(
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-400'
    },
    inactive: {
      label: label || 'Inactive',
      color: 'bg-gray-500',
      icon: <Pause className={cn(
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      textColor: 'text-gray-700 dark:text-gray-400'
    },
    archived: {
      label: label || 'Archived',
      color: 'bg-slate-500',
      icon: <Archive className={cn(
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-slate-100 dark:bg-slate-900/30',
      textColor: 'text-slate-700 dark:text-slate-400'
    },
    blocked: {
      label: label || 'Blocked',
      color: 'bg-red-500',
      icon: <Ban className={cn(
        size === 'sm' ? 'h-3 w-3' :
        size === 'md' ? 'h-4 w-4' :
        'h-5 w-5'
      )} />,
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-400'
    }
  };

  // Default config for unknown status
  const config = statusConfig[status.toLowerCase()] || {
    label: label || status,
    color: 'bg-gray-500',
    icon: <AlertCircle className={cn(
      size === 'sm' ? 'h-3 w-3' :
      size === 'md' ? 'h-4 w-4' :
      'h-5 w-5'
    )} />,
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    textColor: 'text-gray-700 dark:text-gray-400'
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Dot variant
  if (variant === 'dot') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className={cn(
          'inline-block rounded-full',
          config.color,
          size === 'sm' ? 'h-2 w-2' :
          size === 'md' ? 'h-2.5 w-2.5' :
          'h-3 w-3',
          pulse && 'animate-pulse'
        )} />
        <span className={cn(sizeClasses[size], config.textColor)}>
          {config.label}
        </span>
      </div>
    );
  }

  // Text variant
  if (variant === 'text') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1',
        sizeClasses[size],
        config.textColor,
        className
      )}>
        {showIcon && config.icon}
        {config.label}
      </span>
    );
  }

  // Badge variant (default)
  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1',
        config.bgColor,
        config.textColor,
        'border-0',
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span className={cn(
          'inline-block rounded-full',
          config.color,
          size === 'sm' ? 'h-1.5 w-1.5' :
          size === 'md' ? 'h-2 w-2' :
          'h-2.5 w-2.5',
          pulse && 'animate-pulse'
        )} />
      )}
      {showIcon && !showDot && config.icon}
      {config.label}
    </Badge>
  );
};

interface ConnectionStatusProps {
  isConnected: boolean;
  label?: string;
  showPulse?: boolean;
  className?: string;
}

/**
 * Connection status indicator
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  label,
  showPulse = true,
  className
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <span className={cn(
          'block h-2 w-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-red-500'
        )} />
        {showPulse && isConnected && (
          <span className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
        )}
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {label || (isConnected ? 'Connected' : 'Disconnected')}
      </span>
    </div>
  );
};

interface ProgressStatusProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Progress status indicator
 */
export const ProgressStatus: React.FC<ProgressStatusProps> = ({
  progress,
  label,
  showPercentage = true,
  color = 'blue',
  size = 'md',
  className
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn('space-y-1', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full transition-all duration-300 rounded-full', colorClasses[color])}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DataCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Production-ready data card component for displaying metrics and KPIs
 */
export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading = false,
  className,
  onClick
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;

    if (trend.value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    } else if (trend.value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    }
    return <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';

    if (trend.value > 0) {
      return 'text-green-600 dark:text-green-400';
    } else if (trend.value < 0) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  if (loading) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        onClick && "cursor-pointer hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </CardTitle>
          {Icon && (
            <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {value}
          </div>
          {trend && (
            <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
              {getTrendIcon()}
              <span className="font-medium">{Math.abs(trend.value)}%</span>
              <span className="text-gray-500 dark:text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        {description && (
          <CardDescription className="mt-2">
            {description}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  loading?: boolean;
  className?: string;
}

/**
 * Compact stat card for dashboard grids
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeLabel = 'vs last period',
  icon: Icon,
  color = 'blue',
  loading = false,
  className
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    gray: 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400',
  };

  if (loading) {
    return (
      <div className={cn("p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800", className)}>
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div className={cn("p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        {Icon && (
          <div className={cn("p-2 rounded-lg", colorClasses[color])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {value}
        </p>

        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}

        {change !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            {change > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : change < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            ) : (
              <Minus className="h-3 w-3 text-gray-600 dark:text-gray-400" />
            )}
            <span className={cn(
              "font-medium",
              change > 0 ? "text-green-600 dark:text-green-400" :
              change < 0 ? "text-red-600 dark:text-red-400" :
              "text-gray-600 dark:text-gray-400"
            )}>
              {Math.abs(change)}%
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {changeLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
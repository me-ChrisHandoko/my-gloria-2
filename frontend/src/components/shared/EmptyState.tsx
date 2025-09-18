'use client';

import React from 'react';
import { LucideIcon, FileX, Search, Users, FolderOpen, Inbox, Database, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

/**
 * Production-ready empty state component for no-data scenarios
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className,
  children
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-sm'
    },
    md: {
      container: 'py-12',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-base'
    },
    lg: {
      container: 'py-16',
      icon: 'h-20 w-20',
      title: 'text-2xl',
      description: 'text-lg'
    }
  };

  const styles = sizeClasses[size];

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", styles.container, className)}>
      {Icon && (
        <div className="mb-4">
          <Icon className={cn("text-gray-400 dark:text-gray-600", styles.icon)} />
        </div>
      )}

      <h3 className={cn("font-semibold text-gray-900 dark:text-gray-100", styles.title)}>
        {title}
      </h3>

      {description && (
        <p className={cn("mt-2 text-gray-500 dark:text-gray-400 max-w-md", styles.description)}>
          {description}
        </p>
      )}

      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex gap-3">
          {action && (
            <Button
              variant={action.variant || 'default'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Pre-configured empty states for common scenarios
 */
export const EmptyStates = {
  NoData: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Database}
      title="No data available"
      description="There's no data to display at the moment."
      {...props}
    />
  ),

  NoResults: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search or filter criteria."
      {...props}
    />
  ),

  NoUsers: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Users}
      title="No users yet"
      description="Start by adding your first user to the system."
      action={{
        label: "Add User",
        onClick: () => console.log('Add user')
      }}
      {...props}
    />
  ),

  NoFiles: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={FileX}
      title="No files uploaded"
      description="Upload files to get started with document management."
      action={{
        label: "Upload Files",
        onClick: () => console.log('Upload files')
      }}
      {...props}
    />
  ),

  EmptyFolder: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={FolderOpen}
      title="This folder is empty"
      description="Add files or create subfolders to organize your content."
      {...props}
    />
  ),

  EmptyInbox: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={Inbox}
      title="Inbox is empty"
      description="You're all caught up! No new messages or notifications."
      {...props}
    />
  ),

  Error: (props: Partial<EmptyStateProps>) => (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description="We couldn't load the data. Please try again."
      action={{
        label: "Retry",
        onClick: () => window.location.reload()
      }}
      {...props}
    />
  )
};

interface EmptyTableStateProps {
  onClearFilters?: () => void;
  onAddNew?: () => void;
  hasFilters?: boolean;
  entityName?: string;
}

/**
 * Specialized empty state for data tables
 */
export const EmptyTableState: React.FC<EmptyTableStateProps> = ({
  onClearFilters,
  onAddNew,
  hasFilters = false,
  entityName = 'items'
}) => {
  if (hasFilters) {
    return (
      <EmptyState
        icon={Search}
        title="No results found"
        description={`No ${entityName} match your current filters.`}
        action={onClearFilters ? {
          label: "Clear Filters",
          onClick: onClearFilters,
          variant: 'outline'
        } : undefined}
      />
    );
  }

  return (
    <EmptyState
      icon={Database}
      title={`No ${entityName} yet`}
      description={`Get started by adding your first ${entityName.slice(0, -1)}.`}
      action={onAddNew ? {
        label: `Add ${entityName.slice(0, -1)}`,
        onClick: onAddNew
      } : undefined}
    />
  );
};
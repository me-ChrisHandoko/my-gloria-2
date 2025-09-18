'use client';

import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable page header component for consistent page layouts
 * Includes title, description, breadcrumbs, and action buttons
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs = [],
  actions,
  className,
  children
}) => {
  return (
    <div className={cn("bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800", className)}>
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* Header Content */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>

        {/* Additional Content */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

interface PageHeaderActionProps {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Pre-configured action button for page headers
 */
export const PageHeaderAction: React.FC<PageHeaderActionProps> = ({
  label,
  onClick,
  href,
  variant = 'default',
  icon = <Plus className="h-4 w-4" />,
  className
}) => {
  const buttonContent = (
    <>
      {icon}
      <span className="ml-2">{label}</span>
    </>
  );

  if (href) {
    return (
      <a href={href}>
        <Button variant={variant} className={className}>
          {buttonContent}
        </Button>
      </a>
    );
  }

  return (
    <Button variant={variant} onClick={onClick} className={className}>
      {buttonContent}
    </Button>
  );
};

/**
 * Page header with tabs for navigation between related pages
 */
interface TabItem {
  label: string;
  value: string;
  count?: number;
}

interface PageHeaderWithTabsProps extends Omit<PageHeaderProps, 'children'> {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const PageHeaderWithTabs: React.FC<PageHeaderWithTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  ...headerProps
}) => {
  return (
    <PageHeader {...headerProps}>
      <div className="border-t border-gray-200 dark:border-gray-800 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex space-x-8 pt-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === tab.value
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  "ml-2 py-0.5 px-2 rounded-full text-xs",
                  activeTab === tab.value
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                    : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-400"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </PageHeader>
  );
};
'use client';

import React, { ReactNode, Suspense, useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { redirect, usePathname } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import AuthGuard from '@/components/auth/auth-guard';
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// Loading components
function SidebarSkeleton() {
  return (
    <div className="w-[280px] h-screen border-r bg-background">
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-px" />
        <Skeleton className="h-4 w-48" />
      </div>
    </header>
  );
}

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  useEffect(() => {
    // Log error to monitoring service (e.g., Sentry)
    console.error('Dashboard Layout Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <h2 className="text-2xl font-bold text-destructive">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// Breadcrumb generator based on pathname
function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [];

  for (let i = 0; i < segments.length; i++) {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = segments[i].charAt(0).toUpperCase() + segments[i].slice(1).replace(/-/g, ' ');
    breadcrumbs.push({
      label,
      path,
      isLast: i === segments.length - 1
    });
  }

  return breadcrumbs;
}

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const [defaultOpen, setDefaultOpen] = useState(true);

  // Breadcrumbs
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Handle mounting
  useEffect(() => {
    // Check for saved sidebar state
    const savedState = localStorage.getItem('sidebar-state');
    if (savedState !== null) {
      setDefaultOpen(savedState === 'true');
    } else {
      // Default to open on desktop, closed on mobile
      const isMobile = window.innerWidth < 1024;
      setDefaultOpen(!isMobile);
    }
  }, []);

  // Handle sidebar state persistence
  const handleSidebarOpenChange = (open: boolean) => {
    localStorage.setItem('sidebar-state', String(open));
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <SidebarProvider
        defaultOpen={defaultOpen}
        onOpenChange={handleSidebarOpenChange}
      >
        <div className="flex min-h-screen w-full">
          {/* Sidebar with lazy loading */}
          <Suspense fallback={<SidebarSkeleton />}>
            <AppSidebar user={user} />
          </Suspense>

          {/* Main content area */}
          <SidebarInset className="flex flex-col w-full">
            {/* Header with breadcrumb */}
            <Suspense fallback={<HeaderSkeleton />}>
              <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4 w-full">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 h-4"
                  />

                  {/* Breadcrumb Navigation */}
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/dashboard">
                          Dashboard
                        </BreadcrumbLink>
                      </BreadcrumbItem>

                      {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.path}>
                          {index === 0 && breadcrumbs.length > 0 && (
                            <BreadcrumbSeparator className="hidden md:block" />
                          )}
                          <BreadcrumbItem>
                            {crumb.isLast ? (
                              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            ) : (
                              <>
                                <BreadcrumbLink href={crumb.path}>
                                  {crumb.label}
                                </BreadcrumbLink>
                                <BreadcrumbSeparator />
                              </>
                            )}
                          </BreadcrumbItem>
                        </React.Fragment>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>

                  {/* Right side header actions can be added here */}
                  <div className="ml-auto flex items-center gap-2">
                    {/* Add notification, search, or other header actions here */}
                  </div>
                </div>
              </header>
            </Suspense>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
              <ErrorBoundary
                FallbackComponent={ErrorFallback}
                resetKeys={[pathname]}
              >
                <div className="container mx-auto p-4 lg:p-6">
                  {children}
                </div>
              </ErrorBoundary>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
}

// Main export with Auth protection
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard
      requireAuth={true}
      redirectTo="/sign-in"
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthGuard>
  );
}
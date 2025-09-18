import { memo } from 'react';

// Skeleton loader for DashboardSidebar
export const DashboardSidebarSkeleton = memo(function DashboardSidebarSkeleton() {
  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col h-full animate-pulse">
      {/* Logo skeleton */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          <div className="space-y-2">
            <div className="h-5 w-20 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        </div>
      </div>

      {/* Navigation skeleton */}
      <nav className="flex-1 p-4 space-y-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 px-3 py-2.5">
            <div className="w-5 h-5 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded flex-1" style={{ width: `${60 + Math.random() * 40}%` }} />
          </div>
        ))}
      </nav>

      {/* User info skeleton */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-2 w-32 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    </aside>
  );
});

// Skeleton loader for DashboardHeader
export const DashboardHeaderSkeleton = memo(function DashboardHeaderSkeleton() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 animate-pulse">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Menu button skeleton */}
          <div className="lg:hidden w-10 h-10 bg-gray-200 rounded" />

          {/* Search bar skeleton */}
          <div className="flex-1 max-w-2xl">
            <div className="h-9 bg-gray-100 rounded-lg" />
          </div>
        </div>

        {/* Right side actions skeleton */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          <div className="hidden md:block w-24 h-9 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </header>
  );
});

// Full dashboard skeleton for initial load
export const DashboardLayoutSkeleton = memo(function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <DashboardSidebarSkeleton />
        <div className="flex-1 flex flex-col">
          <DashboardHeaderSkeleton />
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="p-6">
              {/* Content skeleton */}
              <div className="space-y-6 animate-pulse">
                <div className="h-8 w-48 bg-gray-200 rounded" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow">
                      <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                      <div className="h-8 w-32 bg-gray-300 rounded" />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-64 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
});
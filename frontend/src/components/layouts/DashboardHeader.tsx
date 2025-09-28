'use client';

import { useState, useCallback, memo } from 'react';
import { NotificationBell } from '@/components/features/notifications/NotificationBell';
import { MagnifyingGlassIcon, QuestionMarkCircleIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useDebounce } from '@/hooks/useDebounce';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

// Memoized header component for performance
const DashboardHeader = memo(function DashboardHeader({
  onMenuClick,
  showMenuButton = true
}: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Debounced search value for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handle search submit
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (debouncedSearchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', debouncedSearchQuery);
    }
  }, [debouncedSearchQuery]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Mobile menu button */}
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors duration-200"
              aria-label="Open menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
          )}

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search workflows, users, documents..."
                className="w-full px-4 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                aria-label="Search"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />

              {/* Search loading indicator */}
              {searchQuery !== debouncedSearchQuery && (
                <div className="absolute right-3 top-3">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Quick search shortcuts (hidden by default, shown on focus) */}
            <div className="absolute top-full left-0 right-0 mt-1 hidden group-focus-within:block">
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                <div className="text-xs text-gray-500 px-2 py-1">Quick shortcuts:</div>
                <div className="flex flex-wrap gap-2 px-2">
                  <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">@users</kbd>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">#workflows</kbd>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">!urgent</kbd>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <NotificationBell />

          {/* Help */}
          <button
            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="Help and documentation"
            onClick={() => {
              // TODO: Implement help modal/drawer
              console.log('Opening help documentation');
            }}
          >
            <QuestionMarkCircleIcon className="w-6 h-6" />
          </button>

          {/* Quick Actions Dropdown (for future implementation) */}
          <button
            className="hidden md:flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
            aria-label="Create new"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Global progress bar (for async operations) */}
      <div className="h-1 bg-gray-100 relative overflow-hidden hidden" id="global-progress">
        <div className="absolute inset-0 bg-blue-500 animate-pulse" style={{ width: '30%' }} />
      </div>
    </header>
  );
});

export default DashboardHeader;
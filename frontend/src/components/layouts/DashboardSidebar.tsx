'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { User } from '@clerk/nextjs/server';
import { memo } from 'react';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  LockClosedIcon,
  BellIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// Navigation items configuration with HeroIcons for better performance
const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: UsersIcon,
  },
  {
    name: 'Organizations',
    href: '/dashboard/organizations',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Workflows',
    href: '/dashboard/workflows',
    icon: ClipboardDocumentListIcon,
  },
  {
    name: 'Permissions',
    href: '/dashboard/permissions',
    icon: LockClosedIcon,
  },
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: BellIcon,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Cog6ToothIcon,
  },
];

interface DashboardSidebarProps {
  user: User;
}

// Memoized sidebar component for performance
const DashboardSidebar = memo(function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  // Check if path is active
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gloria</h2>
            <p className="text-xs text-gray-500">Workflow System</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center space-x-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 group
                ${active
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={`
                  w-5 h-5 flex-shrink-0
                  ${active
                    ? 'text-blue-600'
                    : 'text-gray-400 group-hover:text-gray-600'
                  }
                `}
              />
              <span className="font-medium">{item.name}</span>
              {active && (
                <div className="ml-auto w-1 h-6 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <UserButton
            fallbackRedirectUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: 'w-10 h-10',
              },
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
});

export default DashboardSidebar;
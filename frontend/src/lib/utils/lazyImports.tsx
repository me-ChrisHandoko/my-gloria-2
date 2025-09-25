/**
 * Centralized lazy imports for code splitting and performance optimization
 * This file contains all the lazy-loaded components and utilities
 */

import { lazy, ComponentType } from 'react';

// ============================================
// Dashboard Components (Heavy UI Components)
// ============================================

// User Management Components
export const UserList = lazy(() =>
  import('@/components/features/users/UserList').then(module => ({
    default: module.default
  }))
);

export const UserForm = lazy(() =>
  import('@/components/features/users/UserForm').then(module => ({
    default: module.default
  }))
);

// Data Table Component (Heavy component with sorting/filtering logic)
export const DataTable = lazy(() =>
  import('@/components/ui/data-table').then(module => ({
    default: module.DataTable
  }))
);

// ============================================
// Chart Components (Heavy visualization libraries)
// ============================================

// Dynamic import for Recharts components
export const AreaChart = lazy(async () => {
  const module = await import('recharts');
  return { default: module.AreaChart };
});

export const BarChart = lazy(async () => {
  const module = await import('recharts');
  return { default: module.BarChart };
});

export const LineChart = lazy(async () => {
  const module = await import('recharts');
  return { default: module.LineChart };
});

export const PieChart = lazy(async () => {
  const module = await import('recharts');
  return { default: module.PieChart };
});

// ============================================
// Modal Components
// ============================================

export const Modal = lazy(() =>
  import('@/components/shared/Modal').then(module => ({
    default: module.Modal
  }))
);

export const ConfirmModal = lazy(() =>
  import('@/components/shared/Modal').then(module => ({
    default: module.ConfirmModal
  }))
);

export const FormModal = lazy(() =>
  import('@/components/shared/Modal').then(module => ({
    default: module.FormModal
  }))
);

// ============================================
// Form Components (Complex forms)
// ============================================

// Date picker component (heavy with localization)
export const DatePicker = lazy(async () => {
  const module = await import('react-datepicker');
  return { default: module.default };
});

// Rich text editor (if needed in future)
export const RichTextEditor = lazy(() =>
  import('@/components/ui/rich-text-editor').then(module => ({
    default: module.default
  })).catch(() => ({
    // Fallback component if not yet implemented
    default: () => <div>Rich Text Editor not implemented</div>
  }))
);

// ============================================
// Utility Functions for Dynamic Imports
// ============================================

/**
 * Preload a component to improve perceived performance
 * Call this when you know a component will be needed soon
 */
export const preloadComponent = (
  componentLoader: () => Promise<{ default: ComponentType<any> }>
): void => {
  componentLoader();
};

/**
 * Batch preload multiple components
 */
export const preloadComponents = (
  loaders: Array<() => Promise<{ default: ComponentType<any> }>>
): void => {
  loaders.forEach(loader => loader());
};

/**
 * Preload components based on route
 */
export const preloadRouteComponents = (route: string): void => {
  switch (route) {
    case '/dashboard/users':
      preloadComponent(() => import('@/components/features/users/UserList'));
      preloadComponent(() => import('@/components/ui/data-table'));
      break;
    case '/dashboard/workflows':
      // Preload workflow components
      break;
    case '/dashboard/organizations':
      // Preload organization components
      break;
    default:
      break;
  }
};

/**
 * Preload components on browser idle time
 */
export const preloadOnIdle = (
  componentLoader: () => Promise<{ default: ComponentType<any> }>
): void => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      componentLoader();
    });
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(() => {
      componentLoader();
    }, 1);
  }
};

/**
 * Preload components when they become visible (using Intersection Observer)
 */
export const preloadOnVisible = (
  element: HTMLElement,
  componentLoader: () => Promise<{ default: ComponentType<any> }>
): void => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            componentLoader();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );
    observer.observe(element);
  } else {
    // Fallback: load immediately
    componentLoader();
  }
};

/**
 * Progressive enhancement: Load enhanced version after basic version
 */
export const progressiveEnhancement = async <T extends ComponentType<any>>(
  basicComponent: T,
  enhancedComponentLoader: () => Promise<{ default: T }>
): Promise<T> => {
  try {
    const enhanced = await enhancedComponentLoader();
    return enhanced.default;
  } catch {
    // Fall back to basic component if enhanced fails to load
    return basicComponent;
  }
};

// ============================================
// Route-based Code Splitting Configuration
// ============================================

export const routeConfig = {
  '/dashboard': {
    preload: ['DataCard', 'StatusIndicator'],
    lazy: ['AreaChart', 'BarChart']
  },
  '/dashboard/users': {
    preload: ['UserList', 'DataTable'],
    lazy: ['UserForm', 'Modal']
  },
  '/dashboard/workflows': {
    preload: ['WorkflowList'],
    lazy: ['WorkflowEditor', 'WorkflowChart']
  },
  '/dashboard/organizations': {
    preload: ['OrganizationList'],
    lazy: ['OrganizationForm', 'OrgChart']
  },
  '/dashboard/notifications': {
    preload: ['NotificationList'],
    lazy: ['NotificationSettings']
  },
  '/dashboard/settings': {
    preload: ['SettingsTabs'],
    lazy: ['ThemeSelector', 'AdvancedSettings']
  }
};

// ============================================
// Bundle Optimization Utilities
// ============================================

/**
 * Dynamic chunk naming for better caching
 */
export const getChunkName = (componentName: string): string => {
  return `chunk-${componentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
};

/**
 * Load external scripts dynamically
 */
export const loadExternalScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Load external styles dynamically
 */
export const loadExternalStyle = (href: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = reject;
    document.head.appendChild(link);
  });
};
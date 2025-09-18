'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  onClick?: () => void;
  metadata?: Record<string, any>;
}

interface BreadcrumbConfig {
  separator?: React.ReactNode;
  maxItems?: number;
  showHome?: boolean;
  homeLabel?: string;
  homePath?: string;
  homeIcon?: React.ComponentType<{ className?: string }>;
  capitalize?: boolean;
  replaceHyphens?: boolean;
  customLabels?: Record<string, string>;
  excludePaths?: string[];
}

interface BreadcrumbContextType {
  // Core state
  items: BreadcrumbItem[];
  config: BreadcrumbConfig;

  // Manual control
  setItems: (items: BreadcrumbItem[]) => void;
  addItem: (item: BreadcrumbItem) => void;
  removeItem: (index: number) => void;
  clearItems: () => void;
  updateItem: (index: number, updates: Partial<BreadcrumbItem>) => void;

  // Configuration
  updateConfig: (config: Partial<BreadcrumbConfig>) => void;
  resetConfig: () => void;

  // Navigation
  navigateToItem: (index: number) => void;
  goBack: () => void;

  // Utilities
  generateFromPath: (path: string) => BreadcrumbItem[];
  isLastItem: (index: number) => boolean;
  getItemPath: (index: number) => string;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

interface BreadcrumbProviderProps {
  children: React.ReactNode;
  defaultConfig?: BreadcrumbConfig;
  autoGenerate?: boolean;
  onNavigate?: (path: string) => void;
}

const defaultBreadcrumbConfig: BreadcrumbConfig = {
  separator: '/',
  maxItems: 5,
  showHome: true,
  homeLabel: 'Home',
  homePath: '/',
  capitalize: true,
  replaceHyphens: true,
  customLabels: {},
  excludePaths: [],
};

export const BreadcrumbProvider: React.FC<BreadcrumbProviderProps> = ({
  children,
  defaultConfig = {},
  autoGenerate = true,
  onNavigate,
}) => {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  const [config, setConfig] = useState<BreadcrumbConfig>({
    ...defaultBreadcrumbConfig,
    ...defaultConfig,
  });
  const pathname = usePathname();

  // Format label based on config
  const formatLabel = useCallback((label: string): string => {
    let formatted = label;

    // Replace hyphens with spaces
    if (config.replaceHyphens) {
      formatted = formatted.replace(/-/g, ' ');
    }

    // Apply custom labels
    if (config.customLabels && config.customLabels[formatted]) {
      formatted = config.customLabels[formatted];
    }

    // Capitalize
    if (config.capitalize) {
      formatted = formatted
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    return formatted;
  }, [config]);

  // Generate breadcrumb items from path
  const generateFromPath = useCallback((path: string): BreadcrumbItem[] => {
    const segments = path.split('/').filter(segment => segment !== '');
    const generatedItems: BreadcrumbItem[] = [];

    // Add home item if configured
    if (config.showHome) {
      generatedItems.push({
        label: config.homeLabel || 'Home',
        path: config.homePath || '/',
        icon: config.homeIcon,
        isActive: segments.length === 0,
      });
    }

    // Build items from path segments
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip excluded paths
      if (config.excludePaths?.includes(currentPath)) {
        return;
      }

      generatedItems.push({
        label: formatLabel(segment),
        path: currentPath,
        isActive: index === segments.length - 1,
      });
    });

    // Apply max items limit
    if (config.maxItems && generatedItems.length > config.maxItems) {
      const firstItem = generatedItems[0];
      const lastItems = generatedItems.slice(-(config.maxItems - 2));
      return [
        firstItem,
        { label: '...', path: undefined },
        ...lastItems,
      ];
    }

    return generatedItems;
  }, [config, formatLabel]);

  // Auto-generate breadcrumbs from current path
  useEffect(() => {
    if (autoGenerate && pathname) {
      const generated = generateFromPath(pathname);
      setItems(generated);
    }
  }, [pathname, autoGenerate, generateFromPath]);

  // Add item
  const addItem = useCallback((item: BreadcrumbItem) => {
    setItems(prev => {
      // Set previous items as inactive
      const updated = prev.map(i => ({ ...i, isActive: false }));
      return [...updated, { ...item, isActive: true }];
    });
  }, []);

  // Remove item
  const removeItem = useCallback((index: number) => {
    setItems(prev => {
      const updated = [...prev];
      updated.splice(index, 1);

      // Set last item as active
      if (updated.length > 0) {
        updated[updated.length - 1].isActive = true;
      }

      return updated;
    });
  }, []);

  // Clear items
  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  // Update item
  const updateItem = useCallback((index: number, updates: Partial<BreadcrumbItem>) => {
    setItems(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], ...updates };
      }
      return updated;
    });
  }, []);

  // Update config
  const updateConfig = useCallback((updates: Partial<BreadcrumbConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset config
  const resetConfig = useCallback(() => {
    setConfig({ ...defaultBreadcrumbConfig, ...defaultConfig });
  }, [defaultConfig]);

  // Navigate to item
  const navigateToItem = useCallback((index: number) => {
    const item = items[index];
    if (item?.path) {
      if (item.onClick) {
        item.onClick();
      } else if (onNavigate) {
        onNavigate(item.path);
      } else if (typeof window !== 'undefined') {
        window.location.href = item.path;
      }
    }
  }, [items, onNavigate]);

  // Go back
  const goBack = useCallback(() => {
    if (items.length > 1) {
      navigateToItem(items.length - 2);
    }
  }, [items, navigateToItem]);

  // Check if item is last
  const isLastItem = useCallback((index: number) => {
    return index === items.length - 1;
  }, [items]);

  // Get item path
  const getItemPath = useCallback((index: number): string => {
    return items
      .slice(0, index + 1)
      .map(item => item.path)
      .filter(Boolean)
      .join('') || '/';
  }, [items]);

  const contextValue: BreadcrumbContextType = {
    items,
    config,
    setItems,
    addItem,
    removeItem,
    clearItems,
    updateItem,
    updateConfig,
    resetConfig,
    navigateToItem,
    goBack,
    generateFromPath,
    isLastItem,
    getItemPath,
  };

  return (
    <BreadcrumbContext.Provider value={contextValue}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

// Hook to use breadcrumb context
export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
};

// Breadcrumb component for rendering
export interface BreadcrumbProps {
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  separatorClassName?: string;
  renderItem?: (item: BreadcrumbItem, index: number) => React.ReactNode;
  renderSeparator?: (index: number) => React.ReactNode;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  className = '',
  itemClassName = '',
  activeItemClassName = '',
  separatorClassName = '',
  renderItem,
  renderSeparator,
}) => {
  const { items, config, navigateToItem, isLastItem } = useBreadcrumb();

  const defaultRenderItem = (item: BreadcrumbItem, index: number) => {
    const isLast = isLastItem(index);
    const Icon = item.icon;

    const content = (
      <>
        {Icon && <Icon className="w-4 h-4 mr-1" />}
        <span>{item.label}</span>
      </>
    );

    if (isLast || !item.path) {
      return (
        <span
          className={`inline-flex items-center text-gray-900 dark:text-gray-100 ${activeItemClassName}`}
          aria-current="page"
        >
          {content}
        </span>
      );
    }

    return (
      <button
        onClick={() => navigateToItem(index)}
        className={`inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ${itemClassName}`}
      >
        {content}
      </button>
    );
  };

  const defaultRenderSeparator = () => (
    <span className={`mx-2 text-gray-400 dark:text-gray-600 ${separatorClassName}`}>
      {config.separator}
    </span>
  );

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="inline-flex items-center space-x-1">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (renderSeparator ? renderSeparator(index) : defaultRenderSeparator())}
            <li className="inline-flex items-center">
              {renderItem ? renderItem(item, index) : defaultRenderItem(item, index)}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
};

// Utility hook for programmatic breadcrumb management
export const useBreadcrumbNavigation = () => {
  const { items, navigateToItem, goBack, generateFromPath } = useBreadcrumb();

  const navigateToPath = useCallback((path: string) => {
    const pathItems = generateFromPath(path);
    const targetIndex = pathItems.length - 1;
    if (targetIndex >= 0) {
      navigateToItem(targetIndex);
    }
  }, [generateFromPath, navigateToItem]);

  const navigateToHome = useCallback(() => {
    if (items.length > 0 && items[0].path) {
      navigateToItem(0);
    }
  }, [items, navigateToItem]);

  const canGoBack = items.length > 1;

  return {
    navigateToPath,
    navigateToHome,
    goBack,
    canGoBack,
    currentPath: items[items.length - 1]?.path || '/',
  };
};

// Utility hook for dynamic breadcrumb generation
export const useDynamicBreadcrumb = (
  pathMapping: Record<string, { label: string; icon?: React.ComponentType<{ className?: string }> }>
) => {
  const { setItems } = useBreadcrumb();
  const pathname = usePathname();

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    const dynamicItems: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const mapping = pathMapping[currentPath] || pathMapping[segment];

      dynamicItems.push({
        label: mapping?.label || segment,
        path: currentPath,
        icon: mapping?.icon,
        isActive: index === segments.length - 1,
      });
    });

    setItems(dynamicItems);
  }, [pathname, pathMapping, setItems]);
};
import { useCallback, useEffect, useMemo } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import {
  selectPreferences,
  selectNotificationPreferences,
  selectDisplayPreferences,
  selectAccessibilityPreferences,
  selectWorkspacePreferences,
  selectPrivacyPreferences,
  selectTheme,
  selectLanguage,
  selectCustomShortcuts,
  updateNotificationPreferences,
  updateDisplayPreferences,
  updateAccessibilityPreferences,
  updateWorkspacePreferences,
  updatePrivacyPreferences,
  setTheme,
  setLanguage,
  addShortcut,
  removeShortcut,
  resetShortcuts,
  setSyncEnabled,
  loadPreferences,
  resetPreferences,
  resetCategory,
  type PreferencesState,
} from '@/store/slices/preferencesSlice';

interface PreferenceSyncOptions {
  syncToServer?: boolean;
  syncToLocalStorage?: boolean;
  debounceMs?: number;
}

/**
 * Comprehensive user preferences management hook
 * Handles all user preferences with persistence and synchronization
 */
export const usePreferences = (options: PreferenceSyncOptions = {}) => {
  const {
    syncToServer = true,
    syncToLocalStorage = true,
    debounceMs = 1000,
  } = options;

  const dispatch = useAppDispatch();

  // Preference selectors
  const preferences = useAppSelector(selectPreferences);
  const notificationPrefs = useAppSelector(selectNotificationPreferences);
  const displayPrefs = useAppSelector(selectDisplayPreferences);
  const accessibilityPrefs = useAppSelector(selectAccessibilityPreferences);
  const workspacePrefs = useAppSelector(selectWorkspacePreferences);
  const privacyPrefs = useAppSelector(selectPrivacyPreferences);
  const theme = useAppSelector(selectTheme);
  const language = useAppSelector(selectLanguage);
  const customShortcuts = useAppSelector(selectCustomShortcuts);

  // Debounced sync to server
  const syncToServerDebounced = useMemo(() => {
    if (!syncToServer) return () => {};

    let timeoutId: NodeJS.Timeout;
    return (prefs: PreferencesState) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const response = await fetch('/api/v1/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prefs),
          });

          if (!response.ok) {
            throw new Error('Failed to sync preferences to server');
          }
        } catch (error) {
          console.error('Preference sync failed:', error);
        }
      }, debounceMs);
    };
  }, [syncToServer, debounceMs]);

  // Sync to localStorage
  useEffect(() => {
    if (syncToLocalStorage && preferences) {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
    }
  }, [preferences, syncToLocalStorage]);

  // Sync to server on changes
  useEffect(() => {
    if (syncToServer && preferences) {
      syncToServerDebounced(preferences);
    }
  }, [preferences, syncToServer, syncToServerDebounced]);

  /**
   * Update notification preferences
   */
  const updateNotifications = useCallback(
    (updates: Partial<typeof notificationPrefs>) => {
      dispatch(updateNotificationPreferences(updates));
    },
    [dispatch]
  );

  /**
   * Update display preferences
   */
  const updateDisplay = useCallback(
    (updates: Partial<typeof displayPrefs>) => {
      dispatch(updateDisplayPreferences(updates));
    },
    [dispatch]
  );

  /**
   * Update accessibility preferences
   */
  const updateAccessibility = useCallback(
    (updates: Partial<typeof accessibilityPrefs>) => {
      dispatch(updateAccessibilityPreferences(updates));
    },
    [dispatch]
  );

  /**
   * Update workspace preferences
   */
  const updateWorkspace = useCallback(
    (updates: Partial<typeof workspacePrefs>) => {
      dispatch(updateWorkspacePreferences(updates));
    },
    [dispatch]
  );

  /**
   * Update privacy preferences
   */
  const updatePrivacy = useCallback(
    (updates: Partial<typeof privacyPrefs>) => {
      dispatch(updatePrivacyPreferences(updates));
    },
    [dispatch]
  );

  /**
   * Change theme with system detection
   */
  const changeTheme = useCallback(
    (newTheme: 'light' | 'dark' | 'system') => {
      dispatch(setTheme(newTheme));

      // Apply theme to document
      if (typeof window !== 'undefined') {
        const root = document.documentElement;

        if (newTheme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
          root.setAttribute('data-theme', systemTheme);
        } else {
          root.setAttribute('data-theme', newTheme);
        }
      }
    },
    [dispatch]
  );

  /**
   * Change language with i18n integration
   */
  const changeLanguage = useCallback(
    async (newLanguage: string) => {
      dispatch(setLanguage(newLanguage));

      // Update i18n if available
      if (typeof window !== 'undefined' && (window as any).i18n) {
        await (window as any).i18n.changeLanguage(newLanguage);
      }
    },
    [dispatch]
  );

  /**
   * Toggle notification category
   */
  const toggleNotificationCategory = useCallback(
    (category: keyof typeof notificationPrefs.categories, enabled: boolean) => {
      updateNotifications({
        categories: {
          ...notificationPrefs.categories,
          [category]: enabled,
        },
      });
    },
    [notificationPrefs, updateNotifications]
  );

  /**
   * Set notification digest frequency
   */
  const setDigestFrequency = useCallback(
    (frequency: 'none' | 'daily' | 'weekly' | 'monthly') => {
      updateNotifications({ digest: frequency });
    },
    [updateNotifications]
  );

  /**
   * Toggle accessibility feature
   */
  const toggleAccessibilityFeature = useCallback(
    (feature: keyof typeof accessibilityPrefs, enabled: boolean) => {
      updateAccessibility({ [feature]: enabled });

      // Apply accessibility classes to document
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        const className = `a11y-${feature.replace(/([A-Z])/g, '-$1').toLowerCase()}`;

        if (enabled) {
          root.classList.add(className);
        } else {
          root.classList.remove(className);
        }
      }
    },
    [updateAccessibility]
  );

  /**
   * Set workspace default view
   */
  const setDefaultView = useCallback(
    (view: 'grid' | 'list' | 'kanban' | 'calendar') => {
      updateWorkspace({ defaultView: view });
    },
    [updateWorkspace]
  );

  /**
   * Set items per page
   */
  const setItemsPerPage = useCallback(
    (count: 10 | 25 | 50 | 100) => {
      updateWorkspace({ itemsPerPage: count });
    },
    [updateWorkspace]
  );

  /**
   * Manage keyboard shortcuts
   */
  const addKeyboardShortcut = useCallback(
    (key: string, action: string) => {
      dispatch(addShortcut({ key, action }));
    },
    [dispatch]
  );

  const removeKeyboardShortcut = useCallback(
    (key: string) => {
      dispatch(removeShortcut(key));
    },
    [dispatch]
  );

  const resetKeyboardShortcuts = useCallback(() => {
    dispatch(resetShortcuts());
  }, [dispatch]);

  /**
   * Export preferences
   */
  const exportPreferences = useCallback(() => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `preferences_${new Date().toISOString()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [preferences]);

  /**
   * Import preferences
   */
  const importPreferences = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedPrefs = JSON.parse(e.target?.result as string);
          dispatch(loadPreferences(importedPrefs));
        } catch (error) {
          console.error('Failed to import preferences:', error);
        }
      };
      reader.readAsText(file);
    },
    [dispatch]
  );

  /**
   * Reset preferences
   */
  const resetAllPreferences = useCallback(() => {
    if (confirm('Are you sure you want to reset all preferences to defaults?')) {
      dispatch(resetPreferences());
      localStorage.removeItem('userPreferences');
    }
  }, [dispatch]);

  /**
   * Reset specific category
   */
  const resetPreferenceCategory = useCallback(
    (category: 'notifications' | 'display' | 'accessibility' | 'workspace' | 'privacy') => {
      dispatch(resetCategory(category));
    },
    [dispatch]
  );

  /**
   * Load preferences from server
   */
  const loadFromServer = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/preferences');
      if (response.ok) {
        const serverPrefs = await response.json();
        dispatch(loadPreferences(serverPrefs));
      }
    } catch (error) {
      console.error('Failed to load preferences from server:', error);
    }
  }, [dispatch]);

  // Apply accessibility preferences on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && accessibilityPrefs) {
      const root = document.documentElement;

      Object.entries(accessibilityPrefs).forEach(([key, enabled]) => {
        const className = `a11y-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        if (enabled) {
          root.classList.add(className);
        } else {
          root.classList.remove(className);
        }
      });
    }
  }, [accessibilityPrefs]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Computed values
  const isReducedMotion = useMemo(
    () => accessibilityPrefs?.reducedMotion || false,
    [accessibilityPrefs]
  );

  const isHighContrast = useMemo(
    () => accessibilityPrefs?.highContrast || false,
    [accessibilityPrefs]
  );

  const effectiveTheme = useMemo(() => {
    if (theme === 'system' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  return {
    // All preferences
    preferences,
    notificationPrefs,
    displayPrefs,
    accessibilityPrefs,
    workspacePrefs,
    privacyPrefs,
    customShortcuts,

    // Specific values
    theme,
    effectiveTheme,
    language,
    isReducedMotion,
    isHighContrast,

    // Update functions
    updateNotifications,
    updateDisplay,
    updateAccessibility,
    updateWorkspace,
    updatePrivacy,

    // Specific setters
    changeTheme,
    changeLanguage,
    toggleNotificationCategory,
    setDigestFrequency,
    toggleAccessibilityFeature,
    setDefaultView,
    setItemsPerPage,

    // Keyboard shortcuts
    addKeyboardShortcut,
    removeKeyboardShortcut,
    resetKeyboardShortcuts,

    // Import/Export
    exportPreferences,
    importPreferences,
    loadFromServer,

    // Reset
    resetAllPreferences,
    resetPreferenceCategory,

    // Sync control
    enableSync: () => dispatch(setSyncEnabled(true)),
    disableSync: () => dispatch(setSyncEnabled(false)),
  };
};

export default usePreferences;
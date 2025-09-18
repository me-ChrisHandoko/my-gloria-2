import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define preference types
interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  digest: 'none' | 'daily' | 'weekly' | 'monthly';
  digestTime: string; // Time in HH:mm format
  categories: {
    system: boolean;
    workflow: boolean;
    approval: boolean;
    mention: boolean;
    update: boolean;
  };
}

interface DisplayPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  compactMode: boolean;
  animations: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusIndicator: boolean;
}

interface WorkspacePreferences {
  defaultView: 'grid' | 'list' | 'kanban' | 'calendar';
  itemsPerPage: 10 | 25 | 50 | 100;
  showSidebar: boolean;
  sidebarCollapsed: boolean;
  showActivityFeed: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  confirmBeforeDelete: boolean;
  defaultOrganization?: string;
  defaultDepartment?: string;
}

interface PrivacyPreferences {
  profileVisibility: 'public' | 'organization' | 'private';
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  shareAnalytics: boolean;
  allowIndexing: boolean;
}

export interface PreferencesState {
  notifications: NotificationPreferences;
  display: DisplayPreferences;
  accessibility: AccessibilityPreferences;
  workspace: WorkspacePreferences;
  privacy: PrivacyPreferences;
  customShortcuts: Record<string, string>;
  lastUpdated: string | null;
  syncEnabled: boolean;
}

const initialState: PreferencesState = {
  notifications: {
    email: true,
    push: true,
    inApp: true,
    digest: 'daily',
    digestTime: '09:00',
    categories: {
      system: true,
      workflow: true,
      approval: true,
      mention: true,
      update: true,
    },
  },
  display: {
    theme: 'system',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    firstDayOfWeek: 0,
    compactMode: false,
    animations: true,
    fontSize: 'medium',
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    screenReaderMode: false,
    keyboardNavigation: true,
    focusIndicator: true,
  },
  workspace: {
    defaultView: 'grid',
    itemsPerPage: 25,
    showSidebar: true,
    sidebarCollapsed: false,
    showActivityFeed: true,
    autoSave: true,
    autoSaveInterval: 30,
    confirmBeforeDelete: true,
    defaultOrganization: undefined,
    defaultDepartment: undefined,
  },
  privacy: {
    profileVisibility: 'organization',
    showOnlineStatus: true,
    showLastSeen: true,
    shareAnalytics: true,
    allowIndexing: true,
  },
  customShortcuts: {},
  lastUpdated: null,
  syncEnabled: true,
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    // Update entire preference categories
    updateNotificationPreferences: (state, action: PayloadAction<Partial<NotificationPreferences>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updateDisplayPreferences: (state, action: PayloadAction<Partial<DisplayPreferences>>) => {
      state.display = { ...state.display, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updateAccessibilityPreferences: (state, action: PayloadAction<Partial<AccessibilityPreferences>>) => {
      state.accessibility = { ...state.accessibility, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updateWorkspacePreferences: (state, action: PayloadAction<Partial<WorkspacePreferences>>) => {
      state.workspace = { ...state.workspace, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updatePrivacyPreferences: (state, action: PayloadAction<Partial<PrivacyPreferences>>) => {
      state.privacy = { ...state.privacy, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },

    // Theme-specific actions
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.display.theme = action.payload;
      state.lastUpdated = new Date().toISOString();
    },

    // Language-specific actions
    setLanguage: (state, action: PayloadAction<string>) => {
      state.display.language = action.payload;
      state.lastUpdated = new Date().toISOString();
    },

    // Custom shortcuts
    addShortcut: (state, action: PayloadAction<{ key: string; action: string }>) => {
      state.customShortcuts[action.payload.key] = action.payload.action;
      state.lastUpdated = new Date().toISOString();
    },
    removeShortcut: (state, action: PayloadAction<string>) => {
      delete state.customShortcuts[action.payload];
      state.lastUpdated = new Date().toISOString();
    },
    resetShortcuts: (state) => {
      state.customShortcuts = {};
      state.lastUpdated = new Date().toISOString();
    },

    // Sync preferences
    setSyncEnabled: (state, action: PayloadAction<boolean>) => {
      state.syncEnabled = action.payload;
      state.lastUpdated = new Date().toISOString();
    },

    // Load preferences from server
    loadPreferences: (state, action: PayloadAction<Partial<PreferencesState>>) => {
      return { ...state, ...action.payload };
    },

    // Reset preferences
    resetPreferences: () => initialState,
    resetCategory: (state, action: PayloadAction<keyof PreferencesState>) => {
      const category = action.payload;
      if (category in initialState) {
        (state as any)[category] = (initialState as any)[category];
        state.lastUpdated = new Date().toISOString();
      }
    },
  },
});

export const {
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
} = preferencesSlice.actions;

// Selectors
export const selectPreferences = (state: { preferences: PreferencesState }) => state.preferences;
export const selectNotificationPreferences = (state: { preferences: PreferencesState }) => state.preferences.notifications;
export const selectDisplayPreferences = (state: { preferences: PreferencesState }) => state.preferences.display;
export const selectAccessibilityPreferences = (state: { preferences: PreferencesState }) => state.preferences.accessibility;
export const selectWorkspacePreferences = (state: { preferences: PreferencesState }) => state.preferences.workspace;
export const selectPrivacyPreferences = (state: { preferences: PreferencesState }) => state.preferences.privacy;
export const selectTheme = (state: { preferences: PreferencesState }) => state.preferences.display.theme;
export const selectLanguage = (state: { preferences: PreferencesState }) => state.preferences.display.language;
export const selectCustomShortcuts = (state: { preferences: PreferencesState }) => state.preferences.customShortcuts;

export default preferencesSlice.reducer;
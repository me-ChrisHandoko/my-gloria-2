import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

// Types
type ThemeMode = 'light' | 'dark' | 'system';
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface Modal {
  id: string;
  title: string;
  content: React.ReactNode | string;
  type?: 'info' | 'warning' | 'error' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface UIState {
  // Theme
  theme: ThemeMode;

  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Mobile menu
  mobileMenuOpen: boolean;

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;
  loadingStates: Record<string, boolean>;

  // Toasts/Notifications
  toasts: Toast[];

  // Modals
  modals: Modal[];
  activeModalId: string | null;

  // Search
  searchOpen: boolean;
  searchQuery: string;

  // Breadcrumbs
  breadcrumbs: Array<{ label: string; href?: string }>;

  // Page-specific UI states
  tableFiltersOpen: Record<string, boolean>;
  expandedRows: Record<string, string[]>;
  selectedRows: Record<string, string[]>;

  // User preferences
  compactMode: boolean;
  showNotifications: boolean;
  soundEnabled: boolean;

  // Network status
  isOnline: boolean;
  connectionSpeed: 'slow' | 'medium' | 'fast' | null;
}

// Initial state
const initialState: UIState = {
  theme: 'light',
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  globalLoading: false,
  loadingMessage: null,
  loadingStates: {},
  toasts: [],
  modals: [],
  activeModalId: null,
  searchOpen: false,
  searchQuery: '',
  breadcrumbs: [],
  tableFiltersOpen: {},
  expandedRows: {},
  selectedRows: {},
  compactMode: false,
  showNotifications: true,
  soundEnabled: true,
  isOnline: true,
  connectionSpeed: null,
};

// Create the slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
    },

    // Sidebar
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },

    // Mobile menu
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },

    // Loading
    setGlobalLoading: (state, action: PayloadAction<{ loading: boolean; message?: string }>) => {
      state.globalLoading = action.payload.loading;
      state.loadingMessage = action.payload.message || null;
    },
    setLoading: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      state.loadingStates[action.payload.key] = action.payload.value;
    },

    // Toasts
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const toast: Toast = {
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random()}`,
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },

    // Modals
    openModal: (state, action: PayloadAction<Omit<Modal, 'id'>>) => {
      const modal: Modal = {
        ...action.payload,
        id: `modal-${Date.now()}-${Math.random()}`,
      };
      state.modals.push(modal);
      state.activeModalId = modal.id;
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter(modal => modal.id !== action.payload);
      if (state.activeModalId === action.payload) {
        state.activeModalId = state.modals.length > 0 ? state.modals[state.modals.length - 1].id : null;
      }
    },
    closeAllModals: (state) => {
      state.modals = [];
      state.activeModalId = null;
    },

    // Search
    toggleSearch: (state) => {
      state.searchOpen = !state.searchOpen;
      if (!state.searchOpen) {
        state.searchQuery = '';
      }
    },
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload;
      if (!action.payload) {
        state.searchQuery = '';
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    // Breadcrumbs
    setBreadcrumbs: (state, action: PayloadAction<Array<{ label: string; href?: string }>>) => {
      state.breadcrumbs = action.payload;
    },
    addBreadcrumb: (state, action: PayloadAction<{ label: string; href?: string }>) => {
      state.breadcrumbs.push(action.payload);
    },
    popBreadcrumb: (state) => {
      state.breadcrumbs.pop();
    },
    clearBreadcrumbs: (state) => {
      state.breadcrumbs = [];
    },

    // Table filters
    toggleTableFilter: (state, action: PayloadAction<string>) => {
      const tableId = action.payload;
      state.tableFiltersOpen[tableId] = !state.tableFiltersOpen[tableId];
    },
    setTableFilterOpen: (state, action: PayloadAction<{ tableId: string; open: boolean }>) => {
      state.tableFiltersOpen[action.payload.tableId] = action.payload.open;
    },

    // Expanded rows
    toggleRowExpanded: (state, action: PayloadAction<{ tableId: string; rowId: string }>) => {
      const { tableId, rowId } = action.payload;
      if (!state.expandedRows[tableId]) {
        state.expandedRows[tableId] = [];
      }
      const index = state.expandedRows[tableId].indexOf(rowId);
      if (index > -1) {
        state.expandedRows[tableId].splice(index, 1);
      } else {
        state.expandedRows[tableId].push(rowId);
      }
    },
    setExpandedRows: (state, action: PayloadAction<{ tableId: string; rowIds: string[] }>) => {
      state.expandedRows[action.payload.tableId] = action.payload.rowIds;
    },

    // Selected rows
    toggleRowSelected: (state, action: PayloadAction<{ tableId: string; rowId: string }>) => {
      const { tableId, rowId } = action.payload;
      if (!state.selectedRows[tableId]) {
        state.selectedRows[tableId] = [];
      }
      const index = state.selectedRows[tableId].indexOf(rowId);
      if (index > -1) {
        state.selectedRows[tableId].splice(index, 1);
      } else {
        state.selectedRows[tableId].push(rowId);
      }
    },
    setSelectedRows: (state, action: PayloadAction<{ tableId: string; rowIds: string[] }>) => {
      state.selectedRows[action.payload.tableId] = action.payload.rowIds;
    },
    clearSelectedRows: (state, action: PayloadAction<string>) => {
      state.selectedRows[action.payload] = [];
    },

    // User preferences
    toggleCompactMode: (state) => {
      state.compactMode = !state.compactMode;
    },
    setCompactMode: (state, action: PayloadAction<boolean>) => {
      state.compactMode = action.payload;
    },
    toggleNotifications: (state) => {
      state.showNotifications = !state.showNotifications;
    },
    setShowNotifications: (state, action: PayloadAction<boolean>) => {
      state.showNotifications = action.payload;
    },
    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled;
    },
    setSoundEnabled: (state, action: PayloadAction<boolean>) => {
      state.soundEnabled = action.payload;
    },

    // Network status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setConnectionSpeed: (state, action: PayloadAction<'slow' | 'medium' | 'fast' | null>) => {
      state.connectionSpeed = action.payload;
    },

    // Reset UI state
    resetUIState: () => initialState,
  },
});

// Export actions
export const {
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapse,
  setSidebarCollapsed,
  toggleMobileMenu,
  setMobileMenuOpen,
  setGlobalLoading,
  setLoading,
  addToast,
  removeToast,
  clearToasts,
  openModal,
  closeModal,
  closeAllModals,
  toggleSearch,
  setSearchOpen,
  setSearchQuery,
  setBreadcrumbs,
  addBreadcrumb,
  popBreadcrumb,
  clearBreadcrumbs,
  toggleTableFilter,
  setTableFilterOpen,
  toggleRowExpanded,
  setExpandedRows,
  toggleRowSelected,
  setSelectedRows,
  clearSelectedRows,
  toggleCompactMode,
  setCompactMode,
  toggleNotifications,
  setShowNotifications,
  toggleSound,
  setSoundEnabled,
  setOnlineStatus,
  setConnectionSpeed,
  resetUIState,
} = uiSlice.actions;

// Selectors
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectSidebarCollapsed = (state: RootState) => state.ui.sidebarCollapsed;
export const selectMobileMenuOpen = (state: RootState) => state.ui.mobileMenuOpen;
export const selectGlobalLoading = (state: RootState) => state.ui.globalLoading;
export const selectLoadingMessage = (state: RootState) => state.ui.loadingMessage;
export const selectToasts = (state: RootState) => state.ui.toasts;
export const selectModals = (state: RootState) => state.ui.modals;
export const selectActiveModal = (state: RootState) =>
  state.ui.modals.find(modal => modal.id === state.ui.activeModalId);
export const selectSearchOpen = (state: RootState) => state.ui.searchOpen;
export const selectSearchQuery = (state: RootState) => state.ui.searchQuery;
export const selectBreadcrumbs = (state: RootState) => state.ui.breadcrumbs;
export const selectTableFilterOpen = (tableId: string) => (state: RootState) =>
  state.ui.tableFiltersOpen[tableId] || false;
export const selectExpandedRows = (tableId: string) => (state: RootState) =>
  state.ui.expandedRows[tableId] || [];
export const selectSelectedRows = (tableId: string) => (state: RootState) =>
  state.ui.selectedRows[tableId] || [];
export const selectCompactMode = (state: RootState) => state.ui.compactMode;
export const selectShowNotifications = (state: RootState) => state.ui.showNotifications;
export const selectSoundEnabled = (state: RootState) => state.ui.soundEnabled;
export const selectIsOnline = (state: RootState) => state.ui.isOnline;
export const selectConnectionSpeed = (state: RootState) => state.ui.connectionSpeed;
export const selectLoading = (key: string) => (state: RootState) =>
  state.ui.loadingStates[key] || false;

// Alias for addToast for compatibility
export const showToast = addToast;

// Export reducer
export default uiSlice.reducer;
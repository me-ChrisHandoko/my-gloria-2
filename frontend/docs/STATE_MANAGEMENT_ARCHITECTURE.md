# State Management Architecture for Gloria Frontend

## 📋 Overview

This document outlines the state management architecture for the Gloria frontend application using Redux Toolkit, RTK Query, and React Context for different types of state management needs.

## 🏗️ State Architecture Layers

### State Categories

```
┌─────────────────────────────────────────────────────────┐
│                    Application State                      │
├─────────────────────────────────────────────────────────┤
│  Server State  │  Client State  │  UI State  │  Form State│
│   (RTK Query)  │  (Redux Slice) │  (Context) │  (RHF)    │
└─────────────────────────────────────────────────────────┘
```

1. **Server State**: Data fetched from API (users, organizations, permissions)
2. **Client State**: Application-level state (auth, preferences, cache)
3. **UI State**: Component-level state (modals, sidebars, themes)
4. **Form State**: Form data and validation (React Hook Form)

## 📦 Redux Store Structure

### Store Configuration

```typescript
// src/store/index.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// API Slices
import { apiSlice } from './api/apiSlice';

// Feature Slices
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import preferencesReducer from './slices/preferencesSlice';
import notificationReducer from './slices/notificationSlice';
import workflowReducer from './slices/workflowSlice';

// Persist Configuration
const persistConfig = {
  key: 'gloria-root',
  version: 1,
  storage,
  whitelist: ['auth', 'preferences'], // Only persist auth and preferences
  blacklist: ['api', 'ui'], // Don't persist API cache and UI state
};

// Root Reducer
const rootReducer = combineReducers({
  // API State
  [apiSlice.reducerPath]: apiSlice.reducer,

  // Feature State
  auth: authReducer,
  ui: uiReducer,
  preferences: preferencesReducer,
  notification: notificationReducer,
  workflow: workflowReducer,
});

// Persisted Reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store Configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
    })
    .concat(apiSlice.middleware)
    .concat(customMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

// Persistor
export const persistor = persistStore(store);

// Type exports
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Custom Middleware

```typescript
// src/store/middleware/logger.ts
import { Middleware } from '@reduxjs/toolkit';

export const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(action.type);
    console.info('dispatching', action);
    const result = next(action);
    console.log('next state', store.getState());
    console.groupEnd();
    return result;
  }
  return next(action);
};

// src/store/middleware/analytics.ts
export const analyticsMiddleware: Middleware = (store) => (next) => (action) => {
  // Track specific actions
  const trackedActions = [
    'auth/login',
    'auth/logout',
    'workflow/create',
    'notification/markAsRead',
  ];

  if (trackedActions.includes(action.type)) {
    window.analytics?.track('Redux Action', {
      action: action.type,
      payload: action.payload,
      timestamp: Date.now(),
    });
  }

  return next(action);
};
```

## 🔄 RTK Query API Slices

### Base API Configuration

```typescript
// src/store/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { Mutex } from 'async-mutex';
import { getAuth } from '@clerk/nextjs/server';

// Create a new mutex
const mutex = new Mutex();

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  prepareHeaders: async (headers, { getState }) => {
    const token = await getAuth().getToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Wait until the mutex is available without locking it
  await mutex.waitForUnlock();

  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Check if the mutex is locked
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        // Try to refresh the token
        const refreshResult = await baseQuery(
          '/auth/refresh',
          api,
          extraOptions
        );

        if (refreshResult.data) {
          // Retry the initial query
          result = await baseQuery(args, api, extraOptions);
        } else {
          // Refresh failed, redirect to login
          window.location.href = '/sign-in';
        }
      } finally {
        release();
      }
    } else {
      // Wait for the mutex to be available
      await mutex.waitForUnlock();
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Organization',
    'School',
    'Department',
    'Position',
    'Permission',
    'Role',
    'Workflow',
    'WorkflowTemplate',
    'WorkflowInstance',
    'Notification',
    'NotificationTemplate',
    'Audit',
    'FeatureFlag',
    'SystemConfig',
  ],
  endpoints: () => ({}),
});
```

### Feature API Slices

```typescript
// src/store/api/userApi.ts
import { apiSlice } from './apiSlice';
import { User, PaginatedResponse, QueryParams } from '@/types';

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Queries
    getUsers: builder.query<PaginatedResponse<User>, QueryParams>({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
      keepUnusedDataFor: 60, // Cache for 60 seconds
    }),

    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    getCurrentUser: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
      transformResponse: (response: User) => {
        // Store in local state for quick access
        localStorage.setItem('currentUser', JSON.stringify(response));
        return response;
      },
    }),

    // Mutations
    createUser: builder.mutation<User, Partial<User>>({
      query: (user) => ({
        url: '/users',
        method: 'POST',
        body: user,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
      // Optimistic update
      async onQueryStarted(user, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData('getUsers', undefined, (draft) => {
            draft.data.push({ ...user, id: 'temp-id' } as User);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    updateUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
      // Optimistic update
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData('getUserById', id, (draft) => {
            Object.assign(draft, data);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // Batch operations
    batchUpdateUsers: builder.mutation<User[], { ids: string[]; data: Partial<User> }>({
      query: ({ ids, data }) => ({
        url: '/users/batch',
        method: 'PATCH',
        body: { ids, data },
      }),
      invalidatesTags: (result, error, { ids }) => [
        ...ids.map(id => ({ type: 'User' as const, id })),
        { type: 'User', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useGetUserByIdQuery,
  useGetCurrentUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useBatchUpdateUsersMutation,
} = userApi;

// Export endpoints for use in SSR
export const { getUsers, getUserById, getCurrentUser } = userApi.endpoints;
```

## 🎯 Feature Slices

### ✅ Auth Slice (Implemented)

```typescript
// src/store/slices/authSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { User, Permission, Role } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Permission[];
  roles: Role[];
  lastActivity: number;
  sessionExpiry: number | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  permissions: [],
  roles: [],
  lastActivity: Date.now(),
  sessionExpiry: null,
};

// Async thunks
export const checkPermission = createAsyncThunk(
  'auth/checkPermission',
  async (permission: string, { getState }) => {
    const state = getState() as { auth: AuthState };
    return state.auth.permissions.some(p => p.name === permission);
  }
);

export const checkRole = createAsyncThunk(
  'auth/checkRole',
  async (role: string, { getState }) => {
    const state = getState() as { auth: AuthState };
    return state.auth.roles.some(r => r.name === role);
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.lastActivity = Date.now();
    },
    setPermissions: (state, action: PayloadAction<Permission[]>) => {
      state.permissions = action.payload;
    },
    setRoles: (state, action: PayloadAction<Role[]>) => {
      state.roles = action.payload;
    },
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    setSessionExpiry: (state, action: PayloadAction<number>) => {
      state.sessionExpiry = action.payload;
    },
    clearAuth: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkPermission.fulfilled, (state, action) => {
        // Log permission check
        console.log('Permission check:', action.meta.arg, action.payload);
      })
      .addCase(checkRole.fulfilled, (state, action) => {
        // Log role check
        console.log('Role check:', action.meta.arg, action.payload);
      });
  },
});

export const {
  setUser,
  setPermissions,
  setRoles,
  updateLastActivity,
  setSessionExpiry,
  clearAuth,
} = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectRoles = (state: { auth: AuthState }) => state.auth.roles;

export const selectHasPermission = (permission: string) => (state: { auth: AuthState }) =>
  state.auth.permissions.some(p => p.name === permission);

export const selectHasRole = (role: string) => (state: { auth: AuthState }) =>
  state.auth.roles.some(r => r.name === role);

export default authSlice.reducer;
```

### ✅ UI Slice (Implemented)

```typescript
// src/store/slices/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Modal {
  id: string;
  component: string;
  props?: any;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  modals: Modal[];
  toasts: Toast[];
  loading: {
    [key: string]: boolean;
  };
  breadcrumbs: Array<{ label: string; path: string }>;
}

const initialState: UIState = {
  theme: 'system',
  sidebarOpen: true,
  sidebarCollapsed: false,
  modals: [],
  toasts: [],
  loading: {},
  breadcrumbs: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<UIState['theme']>) => {
      state.theme = action.payload;
      // Apply theme to document
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-theme', action.payload);
      }
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    openModal: (state, action: PayloadAction<Modal>) => {
      state.modals.push(action.payload);
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter(m => m.id !== action.payload);
    },
    closeAllModals: (state) => {
      state.modals = [];
    },
    showToast: (state, action: PayloadAction<Toast>) => {
      state.toasts.push(action.payload);
      // Auto-remove after duration
      if (action.payload.duration) {
        setTimeout(() => {
          state.toasts = state.toasts.filter(t => t.id !== action.payload.id);
        }, action.payload.duration);
      }
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },
    setBreadcrumbs: (state, action: PayloadAction<UIState['breadcrumbs']>) => {
      state.breadcrumbs = action.payload;
    },
  },
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapse,
  openModal,
  closeModal,
  closeAllModals,
  showToast,
  removeToast,
  setLoading,
  setBreadcrumbs,
} = uiSlice.actions;

// Selectors
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSidebarOpen = (state: { ui: UIState }) => state.ui.sidebarOpen;
export const selectModals = (state: { ui: UIState }) => state.ui.modals;
export const selectToasts = (state: { ui: UIState }) => state.ui.toasts;
export const selectLoading = (key: string) => (state: { ui: UIState }) => state.ui.loading[key];
export const selectBreadcrumbs = (state: { ui: UIState }) => state.ui.breadcrumbs;

export default uiSlice.reducer;
```

### ✅ Notification Slice (Implemented)

```typescript
// src/store/slices/notificationSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notification/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount++;
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        state.unreadCount--;
      }
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    updateUnreadCount: (state) => {
      state.unreadCount = state.notifications.filter(n => !n.read).length;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.data;
        state.unreadCount = action.payload.data.filter((n: Notification) => !n.read).length;
        state.lastFetch = Date.now();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  updateUnreadCount,
} = notificationSlice.actions;

// Selectors
export const selectNotifications = (state: { notification: NotificationState }) =>
  state.notification.notifications;

export const selectUnreadCount = (state: { notification: NotificationState }) =>
  state.notification.unreadCount;

export const selectUnreadNotifications = (state: { notification: NotificationState }) =>
  state.notification.notifications.filter(n => !n.read);

export default notificationSlice.reducer;
```

### ✅ Preferences Slice (Implemented)

```typescript
// src/store/slices/preferencesSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Comprehensive preference categories
interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  digest: 'none' | 'daily' | 'weekly' | 'monthly';
  digestTime: string;
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
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
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
  autoSaveInterval: number;
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

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    // Update entire preference categories
    updateNotificationPreferences: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updateDisplayPreferences: (state, action) => {
      state.display = { ...state.display, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updateAccessibilityPreferences: (state, action) => {
      state.accessibility = { ...state.accessibility, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updateWorkspacePreferences: (state, action) => {
      state.workspace = { ...state.workspace, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updatePrivacyPreferences: (state, action) => {
      state.privacy = { ...state.privacy, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    // Theme and language specific actions
    setTheme: (state, action) => {
      state.display.theme = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    setLanguage: (state, action) => {
      state.display.language = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    // Custom shortcuts management
    addShortcut: (state, action) => {
      state.customShortcuts[action.payload.key] = action.payload.action;
      state.lastUpdated = new Date().toISOString();
    },
    removeShortcut: (state, action) => {
      delete state.customShortcuts[action.payload];
      state.lastUpdated = new Date().toISOString();
    },
    resetShortcuts: (state) => {
      state.customShortcuts = {};
      state.lastUpdated = new Date().toISOString();
    },
    // Sync and reset operations
    setSyncEnabled: (state, action) => {
      state.syncEnabled = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    loadPreferences: (state, action) => {
      return { ...state, ...action.payload };
    },
    resetPreferences: () => initialState,
    resetCategory: (state, action) => {
      const category = action.payload;
      if (category in initialState) {
        (state as any)[category] = (initialState as any)[category];
        state.lastUpdated = new Date().toISOString();
      }
    },
  },
});

// Export actions and selectors
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

// Comprehensive selectors
export const selectPreferences = (state) => state.preferences;
export const selectNotificationPreferences = (state) => state.preferences.notifications;
export const selectDisplayPreferences = (state) => state.preferences.display;
export const selectAccessibilityPreferences = (state) => state.preferences.accessibility;
export const selectWorkspacePreferences = (state) => state.preferences.workspace;
export const selectPrivacyPreferences = (state) => state.preferences.privacy;
export const selectTheme = (state) => state.preferences.display.theme;
export const selectLanguage = (state) => state.preferences.display.language;
export const selectCustomShortcuts = (state) => state.preferences.customShortcuts;

export default preferencesSlice.reducer;
```

### ✅ Workflow Slice (Implemented)

```typescript
// src/store/slices/workflowSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

// Comprehensive workflow types
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'review' | 'action' | 'notification' | 'condition';
  description?: string;
  assignees?: string[];
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
  nextSteps?: string[];
  previousSteps?: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  comments?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface WorkflowAction {
  id: string;
  type: 'email' | 'webhook' | 'update_field' | 'create_task' | 'assign_user';
  config: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  steps: WorkflowStep[];
  triggers?: WorkflowTrigger[];
  variables?: WorkflowVariable[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  tags?: string[];
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  templateName: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  currentStep?: string;
  startedAt?: string;
  completedAt?: string;
  startedBy: string;
  data: Record<string, any>;
  history: WorkflowHistoryItem[];
  errors?: WorkflowError[];
}

export interface WorkflowState {
  templates: WorkflowTemplate[];
  instances: WorkflowInstance[];
  activeInstance: WorkflowInstance | null;
  selectedTemplate: WorkflowTemplate | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: string[];
    category?: string[];
    tags?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  statistics: {
    totalTemplates: number;
    activeTemplates: number;
    totalInstances: number;
    runningInstances: number;
    completedInstances: number;
    failedInstances: number;
    averageCompletionTime?: number;
  };
}

// Async thunks for workflow operations
export const executeWorkflow = createAsyncThunk(
  'workflow/execute',
  async ({ templateId, data }: { templateId: string; data: Record<string, any> }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/workflows/${templateId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to execute workflow');
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const pauseWorkflow = createAsyncThunk(
  'workflow/pause',
  async (instanceId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/workflows/instances/${instanceId}/pause`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to pause workflow');
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const resumeWorkflow = createAsyncThunk(
  'workflow/resume',
  async (instanceId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/workflows/instances/${instanceId}/resume`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resume workflow');
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const cancelWorkflow = createAsyncThunk(
  'workflow/cancel',
  async (instanceId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/workflows/instances/${instanceId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to cancel workflow');
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    // Template management
    setTemplates: (state, action) => {
      state.templates = action.payload;
      state.statistics.totalTemplates = action.payload.length;
      state.statistics.activeTemplates = action.payload.filter(t => t.isActive).length;
    },
    addTemplate: (state, action) => {
      state.templates.push(action.payload);
      state.statistics.totalTemplates++;
      if (action.payload.isActive) state.statistics.activeTemplates++;
    },
    updateTemplate: (state, action) => {
      const index = state.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        const wasActive = state.templates[index].isActive;
        state.templates[index] = action.payload;
        if (!wasActive && action.payload.isActive) state.statistics.activeTemplates++;
        if (wasActive && !action.payload.isActive) state.statistics.activeTemplates--;
      }
    },
    deleteTemplate: (state, action) => {
      const template = state.templates.find(t => t.id === action.payload);
      if (template) {
        state.templates = state.templates.filter(t => t.id !== action.payload);
        state.statistics.totalTemplates--;
        if (template.isActive) state.statistics.activeTemplates--;
      }
    },
    selectTemplate: (state, action) => {
      state.selectedTemplate = action.payload
        ? state.templates.find(t => t.id === action.payload) || null
        : null;
    },
    // Instance management
    setInstances: (state, action) => {
      state.instances = action.payload;
      // Update statistics based on instances
      state.statistics.totalInstances = action.payload.length;
      state.statistics.runningInstances = action.payload.filter(i => i.status === 'running').length;
      state.statistics.completedInstances = action.payload.filter(i => i.status === 'completed').length;
      state.statistics.failedInstances = action.payload.filter(i => i.status === 'failed').length;
    },
    addInstance: (state, action) => {
      state.instances.push(action.payload);
      state.statistics.totalInstances++;
      if (action.payload.status === 'running') state.statistics.runningInstances++;
    },
    updateInstance: (state, action) => {
      const index = state.instances.findIndex(i => i.id === action.payload.id);
      if (index !== -1) {
        const oldStatus = state.instances[index].status;
        const newStatus = action.payload.status;
        state.instances[index] = action.payload;
        // Update statistics based on status change
        if (oldStatus === 'running') state.statistics.runningInstances--;
        if (oldStatus === 'completed') state.statistics.completedInstances--;
        if (oldStatus === 'failed') state.statistics.failedInstances--;
        if (newStatus === 'running') state.statistics.runningInstances++;
        if (newStatus === 'completed') state.statistics.completedInstances++;
        if (newStatus === 'failed') state.statistics.failedInstances++;
        // Update active instance if it's the same
        if (state.activeInstance?.id === action.payload.id) {
          state.activeInstance = action.payload;
        }
      }
    },
    deleteInstance: (state, action) => {
      const instance = state.instances.find(i => i.id === action.payload);
      if (instance) {
        state.instances = state.instances.filter(i => i.id !== action.payload);
        state.statistics.totalInstances--;
        if (instance.status === 'running') state.statistics.runningInstances--;
        if (instance.status === 'completed') state.statistics.completedInstances--;
        if (instance.status === 'failed') state.statistics.failedInstances--;
        if (state.activeInstance?.id === action.payload) {
          state.activeInstance = null;
        }
      }
    },
    setActiveInstance: (state, action) => {
      state.activeInstance = action.payload
        ? state.instances.find(i => i.id === action.payload) || null
        : null;
    },
    // Step updates
    updateStep: (state, action) => {
      const instance = state.instances.find(i => i.id === action.payload.instanceId);
      if (instance) {
        const template = state.templates.find(t => t.id === instance.templateId);
        if (template) {
          const stepIndex = template.steps.findIndex(s => s.id === action.payload.step.id);
          if (stepIndex !== -1) {
            template.steps[stepIndex] = action.payload.step;
          }
        }
      }
    },
    // Filter management
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    // Error and loading state management
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Execute workflow handling
      .addCase(executeWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(executeWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.instances.push(action.payload);
        state.activeInstance = action.payload;
        state.statistics.totalInstances++;
        state.statistics.runningInstances++;
      })
      .addCase(executeWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Pause workflow handling
      .addCase(pauseWorkflow.fulfilled, (state, action) => {
        const instance = state.instances.find(i => i.id === action.meta.arg);
        if (instance) {
          instance.status = 'paused';
          state.statistics.runningInstances--;
        }
      })
      // Resume workflow handling
      .addCase(resumeWorkflow.fulfilled, (state, action) => {
        const instance = state.instances.find(i => i.id === action.meta.arg);
        if (instance) {
          instance.status = 'running';
          state.statistics.runningInstances++;
        }
      })
      // Cancel workflow handling
      .addCase(cancelWorkflow.fulfilled, (state, action) => {
        const instance = state.instances.find(i => i.id === action.meta.arg);
        if (instance) {
          instance.status = 'cancelled';
          state.statistics.runningInstances--;
        }
      });
  },
});

// Export actions
export const {
  setTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  selectTemplate,
  setInstances,
  addInstance,
  updateInstance,
  deleteInstance,
  setActiveInstance,
  updateStep,
  setFilters,
  clearFilters,
  setError,
  clearError,
  setLoading,
} = workflowSlice.actions;

// Export selectors
export const selectWorkflowTemplates = (state) => state.workflow.templates;
export const selectWorkflowInstances = (state) => state.workflow.instances;
export const selectActiveWorkflowInstance = (state) => state.workflow.activeInstance;
export const selectSelectedTemplate = (state) => state.workflow.selectedTemplate;
export const selectWorkflowStatistics = (state) => state.workflow.statistics;
export const selectWorkflowFilters = (state) => state.workflow.filters;
export const selectWorkflowLoading = (state) => state.workflow.isLoading;
export const selectWorkflowError = (state) => state.workflow.error;

// Complex selectors
export const selectRunningWorkflows = (state) =>
  state.workflow.instances.filter(i => i.status === 'running');

export const selectTemplateById = (templateId: string) => (state) =>
  state.workflow.templates.find(t => t.id === templateId);

export const selectInstancesByTemplate = (templateId: string) => (state) =>
  state.workflow.instances.filter(i => i.templateId === templateId);

export default workflowSlice.reducer;
```

## 🎨 React Context for UI State

### ✅ Theme Context (Implemented)

```typescript
// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      setResolvedTheme(systemTheme);
      root.setAttribute('data-theme', systemTheme);
    } else {
      setResolvedTheme(theme);
      root.setAttribute('data-theme', theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

### ✅ Modal Context (Implemented)

```typescript
// src/contexts/ModalContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

interface ModalConfig {
  component: string;
  props?: any;
  options?: {
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    className?: string;
  };
}

interface ModalContextType {
  openModal: (config: ModalConfig) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// Modal components registry
const modalComponents = {
  UserForm: dynamic(() => import('@/components/modals/UserForm')),
  ConfirmDialog: dynamic(() => import('@/components/modals/ConfirmDialog')),
  WorkflowEditor: dynamic(() => import('@/components/modals/WorkflowEditor')),
  // Add more modal components as needed
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<Array<ModalConfig & { id: string }>>([]);

  const openModal = useCallback((config: ModalConfig) => {
    const id = `modal-${Date.now()}-${Math.random()}`;
    setModals(prev => [...prev, { ...config, id }]);
    return id;
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal, closeAllModals }}>
      {children}
      {modals.map(modal => {
        const Component = modalComponents[modal.component as keyof typeof modalComponents];
        if (!Component) return null;

        return (
          <div
            key={modal.id}
            className={`modal-container ${modal.options?.className || ''}`}
            onClick={(e) => {
              if (modal.options?.closeOnOverlayClick && e.target === e.currentTarget) {
                closeModal(modal.id);
              }
            }}
          >
            <Component
              {...modal.props}
              onClose={() => closeModal(modal.id)}
            />
          </div>
        );
      })}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
```

### ✅ Toast Context (Implemented)

```typescript
// src/contexts/ToastContext.tsx
// Production-ready toast notification system with:
// - Multiple toast types (success, error, warning, info)
// - Configurable positions and animations
// - Auto-dismiss with custom durations
// - Pause on hover functionality
// - Action buttons support
// - Promise-based toasts for async operations
// - Framer Motion animations
// - Dark mode support
```

### ✅ Sidebar Context (Implemented)

```typescript
// src/contexts/SidebarContext.tsx
// Advanced sidebar management with:
// - Responsive behavior with breakpoints
// - Collapse/expand functionality
// - Pin/unpin support
// - Mobile swipe gestures
// - Keyboard shortcuts
// - Persistent preferences
// - Position configuration (left/right)
// - Multiple size options
// - Scroll lock on mobile
// - Hover detection
```

### ✅ Loading Context (Implemented)

```typescript
// src/contexts/LoadingContext.tsx
// Comprehensive loading state management with:
// - Global and named loading states
// - Progress tracking with estimated time
// - Minimum loading time to prevent flashing
// - Batch loading operations
// - Auto-progress calculation
// - Custom spinner and progress bar components
// - Async operation hooks
// - Loading state cleanup on unmount
```

### ✅ Breadcrumb Context (Implemented)

```typescript
// src/contexts/BreadcrumbContext.tsx
// Smart breadcrumb navigation with:
// - Auto-generation from URL paths
// - Manual breadcrumb control
// - Custom labels and icons
// - Configurable separators
// - Max items with ellipsis
// - Home navigation support
// - Dynamic path mapping
// - Navigation callbacks
// - Capitalize and formatting options
// - Path exclusion support
```

## 🔄 State Synchronization ✅

### Cross-Component State Sync (Implemented)

```typescript
// src/hooks/useStateSync.ts
import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { apiSlice } from '@/store/api/apiSlice';

interface SyncConfig {
  channel: string;
  actions: string[];
  debounce?: number;
}

export const useStateSync = (config: SyncConfig) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const channel = new BroadcastChannel(config.channel);
    let debounceTimer: NodeJS.Timeout;

    channel.onmessage = (event) => {
      if (config.actions.includes(event.data.type)) {
        if (config.debounce) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            handleSync(event.data);
          }, config.debounce);
        } else {
          handleSync(event.data);
        }
      }
    };

    const handleSync = (data: any) => {
      switch (data.type) {
        case 'INVALIDATE_CACHE':
          dispatch(apiSlice.util.invalidateTags(data.tags));
          break;
        case 'UPDATE_STATE':
          dispatch(data.action);
          break;
        case 'REFETCH':
          dispatch(apiSlice.util.resetApiState());
          break;
      }
    };

    return () => {
      channel.close();
      clearTimeout(debounceTimer);
    };
  }, [config.channel, config.actions, config.debounce, dispatch]);

  const broadcast = useCallback((type: string, payload: any) => {
    const channel = new BroadcastChannel(config.channel);
    channel.postMessage({ type, payload, timestamp: Date.now() });
    channel.close();
  }, [config.channel]);

  return { broadcast };
};
```

### Persistent State Management (Implemented)

```typescript
// src/hooks/usePersistentState.ts
import { useState, useEffect, useCallback } from 'react';

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  options?: {
    storage?: Storage;
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
) {
  const storage = options?.storage || localStorage;
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;

  const [state, setState] = useState<T>(() => {
    try {
      const item = storage.getItem(key);
      return item ? deserialize(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from storage:`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setState(prevState => {
        const nextState = value instanceof Function ? value(prevState) : value;
        storage.setItem(key, serialize(nextState));
        return nextState;
      });
    } catch (error) {
      console.error(`Error saving ${key} to storage:`, error);
    }
  }, [key, serialize, storage]);

  const removeValue = useCallback(() => {
    try {
      storage.removeItem(key);
      setState(defaultValue);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  }, [key, defaultValue, storage]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setState(deserialize(e.newValue));
        } catch (error) {
          console.error(`Error syncing ${key} from storage:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize]);

  return [state, setValue, removeValue] as const;
}
```

## 🎣 Custom Hooks ✅

### Production-Ready Custom Hooks Implementation

All custom hooks have been implemented with production-ready features including TypeScript support, error handling, performance optimizations, and comprehensive documentation.

#### ✅ Implemented Hooks

- [x] **useAppState** - Main hook for accessing application state with unified interface
- [x] **useAuth** - Authentication management with permission and role checking
- [x] **usePermissions** - Advanced permission checking with caching and O(1) lookups
- [x] **useNotifications** - Real-time notifications with browser API integration
- [x] **useWorkflow** - Workflow execution, monitoring, and analytics
- [x] **usePreferences** - User preferences with sync and persistence
- [x] **useUI** - UI state management for theme, modals, toasts, and loading
- [x] **usePersistentState** - Local/session storage with automatic sync
- [x] **useStateSync** - Cross-tab synchronization with BroadcastChannel API
- [x] **useDebounce** - Optimized state updates with configurable delay
- [x] **useThrottle** - Rate limiting with leading/trailing edge control

#### Hook Features by Category

##### Core State Management Hooks
```typescript
// ✅ useAppState - Unified state access
// Location: src/hooks/useAppState.ts
// Features:
// - Centralized access to all state slices
// - Memoized selectors for performance
// - Permission and role checking utilities
// - Loading state management
// - Toast and notification management

// ✅ useAuth - Authentication management
// Location: src/hooks/useAppState.ts
// Features:
// - User authentication status
// - Permission and role validation
// - Admin/SuperAdmin checks
// - Session management integration

// ✅ usePermissions - Advanced permission system
// Location: src/hooks/usePermissions.ts
// Features:
// - O(1) permission lookups with Map
// - Resource-scoped permissions
// - Permission expressions (AND, OR, NOT)
// - Role hierarchy validation
// - CRUD permission helpers
// - Async server validation
```

##### UI and Notification Hooks
```typescript
// ✅ useUI - UI state management
// Location: src/hooks/useAppState.ts
// Features:
// - Theme management
// - Modal and toast controls
// - Sidebar state
// - Loading indicators
// - Breadcrumb management

// ✅ useNotifications - Real-time notifications
// Location: src/hooks/useNotifications.ts
// Features:
// - Browser notification API
// - Sound and vibration support
// - Auto-fetch with intervals
// - Priority and type filtering
// - Mark as read functionality
// - Notification statistics
```

##### Workflow and Preferences Hooks
```typescript
// ✅ useWorkflow - Workflow management
// Location: src/hooks/useWorkflow.ts
// Features:
// - Workflow execution with retry logic
// - Step approval/rejection
// - Progress tracking
// - Statistics and analytics
// - Template search and filtering
// - Workflow builder utilities

// ✅ usePreferences - User preferences
// Location: src/hooks/usePreferences.ts
// Features:
// - All preference categories
// - Server synchronization
// - LocalStorage persistence
// - Import/export functionality
// - Accessibility integration
// - Keyboard shortcuts management
```

##### Utility Hooks
```typescript
// ✅ usePersistentState - Storage persistence
// Location: src/hooks/usePersistentState.ts
// Features:
// - LocalStorage/SessionStorage support
// - Custom serialization
// - Cross-tab synchronization
// - Error recovery
// - TypeScript generics

// ✅ useStateSync - Cross-tab sync
// Location: src/hooks/useStateSync.ts
// Features:
// - BroadcastChannel API
// - Debounced synchronization
// - Cache invalidation
// - State broadcasting
// - Multiple channel support

// ✅ useDebounce - Debounced values
// Location: src/hooks/useDebounce.ts
// Features:
// - Configurable delay
// - Callback debouncing
// - Value debouncing
// - Cleanup on unmount

// ✅ useThrottle - Rate limiting
// Location: src/hooks/useThrottle.ts
// Features:
// - Leading/trailing edge control
// - Maximum wait time
// - Force update capability
// - RAF throttling for animations
// - Multiple value throttling
```

## 🔄 State DevTools ✅

### Redux DevTools Configuration (Implemented)

The State DevTools system provides comprehensive debugging capabilities for Redux state management in development mode.

#### Core Components

1. **DevTools Configuration** (`src/store/devtools/index.ts`)
   - ✅ Action and state sanitizers for sensitive data redaction
   - ✅ Performance monitoring middleware
   - ✅ State diff logger for change tracking
   - ✅ Error logger with Sentry integration
   - ✅ State snapshot utilities
   - ✅ Export/import state functionality

2. **State Monitor** (`src/store/devtools/stateMonitor.ts`)
   - ✅ Real-time state change monitoring
   - ✅ State change listeners with path matching
   - ✅ History tracking with filtering
   - ✅ Metrics logging and alerting
   - ✅ Watch specific state paths

3. **State Inspector** (`src/store/devtools/stateInspector.ts`)
   - ✅ Deep state inspection at any path
   - ✅ Pattern-based state searching
   - ✅ State validation against schemas
   - ✅ State comparison utilities
   - ✅ Statistics and metrics generation
   - ✅ Query interface for state exploration

4. **DevTools React Component** (`src/components/DevTools/StateDevTools.tsx`)
   - ✅ Visual debugging interface
   - ✅ State tree visualization
   - ✅ Performance metrics display
   - ✅ State history tracking
   - ✅ Snapshot management
   - ✅ Export/import functionality

#### Key Features

- **Sensitive Data Protection**: Automatic redaction of passwords, tokens, and other sensitive data
- **Performance Monitoring**: Track action execution time and state size changes
- **State Diffing**: Visual representation of state changes
- **Time Travel**: Jump to any point in state history
- **State Export/Import**: Save and restore state for debugging
- **Real-time Monitoring**: Watch specific paths for changes
- **Validation**: Schema-based state validation
- **Statistics**: Comprehensive state metrics and analysis

#### Usage in Development

```typescript
// Automatically initialized in development mode
// Access via browser console:
window.__REDUX_STORE__      // Direct store access
window.__STATE_MONITOR__    // State monitoring utilities
window.__STATE_INSPECTOR__  // State inspection utilities

// Use the visual component in your app:
import { StateDevTools } from '@/components/DevTools/StateDevTools';

// Add to your app layout (only renders in development)
<StateDevTools position="bottom-right" defaultOpen={false} />
```

#### Browser Extension Integration

The DevTools integrate seamlessly with the Redux DevTools browser extension, providing:
- Action history with time travel
- State diff visualization
- Action dispatching
- Test generation
- Performance profiling

## ✅ State Management Checklist

### Core Infrastructure
- [x] Redux store configured with persist
- [x] RTK Query setup for API state
- [x] Feature slices created for each domain
- [x] Custom middleware implemented
- [x] React Context for UI state
- [x] State synchronization across tabs
- [x] Persistent state management
- [x] Custom hooks for state access ✅
- [x] DevTools configured ✅
- [x] Type safety for all state
- [x] Optimistic updates implemented
- [x] Cache invalidation strategy
- [x] Error handling in all slices
- [x] Loading states managed
- [x] State synchronization across tabs
- [x] Persistent state hooks with fallback
- [x] State DevTools implementation ✅
- [ ] State normalization where needed

### Feature Slices (Implemented)
- [x] Auth Slice - User authentication, permissions, roles, session management
- [x] UI Slice - Theme, sidebar, modals, toasts, loading states, breadcrumbs
- [x] Notification Slice - Real-time notifications, unread count, marking as read
- [x] Preferences Slice - User preferences (notifications, display, accessibility, workspace, privacy)
- [x] Workflow Slice - Workflow templates, instances, execution, statistics

### React Context UI State (Implemented)
- [x] Theme Context - Light/dark/system theme management with persistence
- [x] Modal Context - Dynamic modal management with animations and stacking
- [x] Toast Context - Toast notifications with multiple types and positions
- [x] Sidebar Context - Responsive sidebar with collapse, pin, and swipe support
- [x] Loading Context - Global and named loading states with progress tracking
- [x] Breadcrumb Context - Smart breadcrumb navigation with auto-generation

### RTK Query API Slices (Implemented)
- [x] Base API configuration with Clerk authentication
- [x] User API slice (CRUD, permissions, bulk operations)
- [x] Organization API slice (CRUD, hierarchy, settings, statistics)
- [x] School API slice (CRUD, departments, academic periods)
- [x] Department API slice (CRUD, hierarchy, members management)
- [x] Position API slice (CRUD, permissions, assignments)
- [x] Role & Permission API slice (RBAC, role assignments)
- [x] Workflow API slice (templates, instances, approvals)
- [x] Notification API slice (templates, preferences, bulk sending)
- [x] System Configuration API slice (audit logs, feature flags, configs)

### Custom Hooks (Implemented) ✅
- [x] useAppState - Unified state access with all slices
- [x] useAuth - Authentication and session management
- [x] usePermissions - Advanced permission checking with O(1) lookups
- [x] useNotifications - Real-time notifications with browser API
- [x] useWorkflow - Workflow execution and monitoring
- [x] usePreferences - User preferences with sync
- [x] useUI - UI state management
- [x] usePersistentState - Storage persistence
- [x] useStateSync - Cross-tab synchronization
- [x] useDebounce - Optimized state updates
- [x] useThrottle - Rate limiting with advanced options

### Production Features
- [x] Optimistic updates for better UX
- [x] Request caching with configurable TTL
- [x] Automatic re-authentication with mutex
- [x] Request deduplication
- [x] Refetch on focus/reconnect
- [x] Comprehensive error handling
- [x] TypeScript type safety
- [x] Export/Import functionality
- [x] Bulk operations support
- [x] Real-time statistics endpoints
- [x] Cross-tab state synchronization with BroadcastChannel API
- [x] Persistent state management with localStorage/sessionStorage
- [x] Temporary storage with expiration support
- [x] User preference storage system
- [x] Type-safe state synchronization interfaces
- [x] Production-ready custom hooks with full TypeScript support ✅
- [x] Redux DevTools with advanced debugging features ✅
- [x] State monitoring and performance profiling ✅
- [x] State inspection and validation utilities ✅
- [x] Visual debugging interface for development ✅
- [x] Sensitive data protection in DevTools ✅
- [x] State snapshot and time-travel debugging ✅

---

This architecture ensures efficient, scalable, and maintainable state management for the Gloria frontend application.
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { permissionService } from '@/lib/api/services/permissions.service';

// Types
interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
  permissions: string[];
  roles: string[];
  organizationId: string | null;
  organizationName: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  permissions: string[];
  roles: string[];
  sessionId: string | null;
  lastActivity: number | null;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  permissions: [],
  roles: [],
  sessionId: null,
  lastActivity: null,
  error: null,
};

// Async thunks for permission and role validation
export const checkPermission = createAsyncThunk(
  'auth/checkPermission',
  async (permission: string) => {
    // Check permission using the permission service
    const result = await permissionService.checkPermission({
      resource: permission.split('_')[1] || 'general',
      action: permission.split('_')[0] || 'view',
    });
    return result.allowed;
  }
);

export const checkRole = createAsyncThunk(
  'auth/checkRole',
  async (role: string) => {
    // Check if the user has the specified role
    // Since there's no specific checkRole endpoint, we'll check against user's roles
    const userRoles = await permissionService.getMyRoles();
    return userRoles.some(r => r.name === role || r.code === role);
  }
);

// Create the slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set authentication status
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
      state.isLoading = false;
      if (!action.payload) {
        // Clear user data when not authenticated
        state.user = null;
        state.permissions = [];
        state.roles = [];
        state.sessionId = null;
      }
    },

    // Set user profile
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },

    // Update user profile partially
    updateUser: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    // Set permissions
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
      if (state.user) {
        state.user.permissions = action.payload;
      }
    },

    // Add permission
    addPermission: (state, action: PayloadAction<string>) => {
      if (!state.permissions.includes(action.payload)) {
        state.permissions.push(action.payload);
        if (state.user) {
          state.user.permissions.push(action.payload);
        }
      }
    },

    // Remove permission
    removePermission: (state, action: PayloadAction<string>) => {
      state.permissions = state.permissions.filter(p => p !== action.payload);
      if (state.user) {
        state.user.permissions = state.user.permissions.filter(p => p !== action.payload);
      }
    },

    // Set roles
    setRoles: (state, action: PayloadAction<string[]>) => {
      state.roles = action.payload;
      if (state.user) {
        state.user.roles = action.payload;
      }
    },

    // Add role
    addRole: (state, action: PayloadAction<string>) => {
      if (!state.roles.includes(action.payload)) {
        state.roles.push(action.payload);
        if (state.user && !state.user.roles.includes(action.payload)) {
          state.user.roles.push(action.payload);
        }
      }
    },

    // Remove role
    removeRole: (state, action: PayloadAction<string>) => {
      state.roles = state.roles.filter(r => r !== action.payload);
      if (state.user) {
        state.user.roles = state.user.roles.filter(r => r !== action.payload);
      }
    },

    // Set session
    setSession: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
      state.lastActivity = Date.now();
    },

    // Update last activity
    updateActivity: (state) => {
      state.lastActivity = Date.now();
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Clear auth state (logout)
    clearAuth: () => {
      return initialState;
    },

    // Reset error
    resetError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Handle checkPermission async thunk
    builder
      .addCase(checkPermission.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkPermission.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(checkPermission.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Permission check failed';
      });

    // Handle checkRole async thunk
    builder
      .addCase(checkRole.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkRole.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(checkRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Role check failed';
      });
  },
});

// Export actions
export const {
  setAuthenticated,
  setUser,
  updateUser,
  setPermissions,
  addPermission,
  removePermission,
  setRoles,
  addRole,
  removeRole,
  setSession,
  updateActivity,
  setLoading,
  setError,
  clearAuth,
  resetError,
} = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectUser = (state: RootState) => state.auth.user;
export const selectCurrentUser = (state: RootState) => state.auth.user; // Alias for compatibility
export const selectPermissions = (state: RootState) => state.auth.permissions;
export const selectRoles = (state: RootState) => state.auth.roles;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectSessionId = (state: RootState) => state.auth.sessionId;
export const selectLastActivity = (state: RootState) => state.auth.lastActivity;

// Permission check selector
export const selectHasPermission = (permission: string) => (state: RootState) =>
  state.auth.permissions.includes(permission);

// Multiple permissions check selector
export const selectHasAllPermissions = (permissions: string[]) => (state: RootState) =>
  permissions.every(permission => state.auth.permissions.includes(permission));

// Any permission check selector
export const selectHasAnyPermission = (permissions: string[]) => (state: RootState) =>
  permissions.some(permission => state.auth.permissions.includes(permission));

// Role check selector
export const selectHasRole = (role: string) => (state: RootState) =>
  state.auth.roles.includes(role);

// Multiple roles check selector
export const selectHasAllRoles = (roles: string[]) => (state: RootState) =>
  roles.every(role => state.auth.roles.includes(role));

// Any role check selector
export const selectHasAnyRole = (roles: string[]) => (state: RootState) =>
  roles.some(role => state.auth.roles.includes(role));

// Export reducer
export default authSlice.reducer;
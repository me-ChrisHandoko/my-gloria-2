import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

// Types
interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Position {
  id: string;
  name: string;
  level: string;
  description?: string;
}

interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  phoneNumber?: string;
  nip?: string; // Nomor Induk Pegawai (Indonesian Employee Number)
  bio?: string;
  organizationId?: string;
  organization?: Organization;
  departmentId?: string;
  department?: Department;
  positionId?: string;
  position?: Position;
  roleId?: string;
  role?: {
    id: string;
    name: string;
    permissions: string[];
  };
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  address?: Address;
  dateOfBirth?: string;
  joinedDate?: string;
  lastLoginAt?: string;
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface UserState {
  // Current user
  currentUser: User | null;

  // Users list (for user management)
  users: User[];
  totalUsers: number;
  currentPage: number;
  pageSize: number;

  // Selected user (for viewing/editing)
  selectedUser: User | null;

  // Filters
  filters: {
    search: string;
    status: string | null;
    role: string | null;
    department: string | null;
    organization: string | null;
  };

  // Sorting
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Error states
  error: string | null;
  validationErrors: Record<string, string>;
}

// Initial state
const initialState: UserState = {
  currentUser: null,
  users: [],
  totalUsers: 0,
  currentPage: 1,
  pageSize: 10,
  selectedUser: null,
  filters: {
    search: '',
    status: null,
    role: null,
    department: null,
    organization: null,
  },
  sortBy: 'createdAt',
  sortOrder: 'desc',
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  validationErrors: {},
};

// Create the slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Current user
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.error = null;
    },
    updateCurrentUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },

    // Users list
    setUsers: (state, action: PayloadAction<{ users: User[]; total: number }>) => {
      state.users = action.payload.users;
      state.totalUsers = action.payload.total;
      state.isLoading = false;
      state.error = null;
    },
    addUser: (state, action: PayloadAction<User>) => {
      state.users.unshift(action.payload);
      state.totalUsers += 1;
      state.isCreating = false;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<{ id: string; updates: Partial<User> }>) => {
      const index = state.users.findIndex(u => u.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = { ...state.users[index], ...action.payload.updates };
      }
      if (state.selectedUser?.id === action.payload.id) {
        state.selectedUser = { ...state.selectedUser, ...action.payload.updates };
      }
      if (state.currentUser?.id === action.payload.id) {
        state.currentUser = { ...state.currentUser, ...action.payload.updates };
      }
      state.isUpdating = false;
      state.error = null;
    },
    removeUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(u => u.id !== action.payload);
      state.totalUsers -= 1;
      if (state.selectedUser?.id === action.payload) {
        state.selectedUser = null;
      }
      state.isDeleting = false;
      state.error = null;
    },

    // Selected user
    setSelectedUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },

    // Pagination
    setPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.currentPage = 1; // Reset to first page when changing page size
    },
    nextPage: (state) => {
      const maxPage = Math.ceil(state.totalUsers / state.pageSize);
      if (state.currentPage < maxPage) {
        state.currentPage += 1;
      }
    },
    previousPage: (state) => {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
      }
    },

    // Filters
    setFilters: (state, action: PayloadAction<Partial<UserState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1; // Reset to first page when filtering
    },
    setSearchFilter: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
      state.currentPage = 1;
    },
    setStatusFilter: (state, action: PayloadAction<string | null>) => {
      state.filters.status = action.payload;
      state.currentPage = 1;
    },
    setRoleFilter: (state, action: PayloadAction<string | null>) => {
      state.filters.role = action.payload;
      state.currentPage = 1;
    },
    setDepartmentFilter: (state, action: PayloadAction<string | null>) => {
      state.filters.department = action.payload;
      state.currentPage = 1;
    },
    setOrganizationFilter: (state, action: PayloadAction<string | null>) => {
      state.filters.organization = action.payload;
      state.currentPage = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.currentPage = 1;
    },

    // Sorting
    setSort: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    toggleSort: (state, action: PayloadAction<string>) => {
      if (state.sortBy === action.payload) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = action.payload;
        state.sortOrder = 'asc';
      }
    },

    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setCreating: (state, action: PayloadAction<boolean>) => {
      state.isCreating = action.payload;
    },
    setUpdating: (state, action: PayloadAction<boolean>) => {
      state.isUpdating = action.payload;
    },
    setDeleting: (state, action: PayloadAction<boolean>) => {
      state.isDeleting = action.payload;
    },

    // Error states
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isCreating = false;
      state.isUpdating = false;
      state.isDeleting = false;
    },
    setValidationErrors: (state, action: PayloadAction<Record<string, string>>) => {
      state.validationErrors = action.payload;
    },
    clearValidationErrors: (state) => {
      state.validationErrors = {};
    },
    clearError: (state) => {
      state.error = null;
    },

    // Reset state
    resetUserState: () => initialState,
  },
});

// Export actions
export const {
  setCurrentUser,
  updateCurrentUser,
  clearCurrentUser,
  setUsers,
  addUser,
  updateUser,
  removeUser,
  setSelectedUser,
  clearSelectedUser,
  setPage,
  setPageSize,
  nextPage,
  previousPage,
  setFilters,
  setSearchFilter,
  setStatusFilter,
  setRoleFilter,
  setDepartmentFilter,
  setOrganizationFilter,
  clearFilters,
  setSort,
  toggleSort,
  setLoading,
  setCreating,
  setUpdating,
  setDeleting,
  setError,
  setValidationErrors,
  clearValidationErrors,
  clearError,
  resetUserState,
} = userSlice.actions;

// Selectors
export const selectCurrentUser = (state: RootState) => state.user.currentUser;
export const selectUsers = (state: RootState) => state.user.users;
export const selectTotalUsers = (state: RootState) => state.user.totalUsers;
export const selectSelectedUser = (state: RootState) => state.user.selectedUser;
export const selectUserFilters = (state: RootState) => state.user.filters;
export const selectUserSort = (state: RootState) => ({
  sortBy: state.user.sortBy,
  sortOrder: state.user.sortOrder,
});
export const selectUserPagination = (state: RootState) => ({
  currentPage: state.user.currentPage,
  pageSize: state.user.pageSize,
  total: state.user.totalUsers,
});
export const selectUserLoadingStates = (state: RootState) => ({
  isLoading: state.user.isLoading,
  isCreating: state.user.isCreating,
  isUpdating: state.user.isUpdating,
  isDeleting: state.user.isDeleting,
});
export const selectUserError = (state: RootState) => state.user.error;
export const selectUserValidationErrors = (state: RootState) => state.user.validationErrors;

// Computed selectors
export const selectUserById = (userId: string) => (state: RootState) =>
  state.user.users.find(u => u.id === userId);

export const selectFilteredUsersCount = (state: RootState) => {
  const { filters } = state.user;
  let count = state.user.users.length;

  // This is a simplified count - in real app, filtering would happen on backend
  if (filters.search) {
    count = state.user.users.filter(u =>
      u.fullName.toLowerCase().includes(filters.search.toLowerCase()) ||
      u.email.toLowerCase().includes(filters.search.toLowerCase())
    ).length;
  }

  return count;
};

// Export reducer
export default userSlice.reducer;
# API Integration Guide for Gloria Frontend

## 📋 Overview

This guide provides detailed patterns and best practices for integrating the Gloria frontend with the backend API. It covers authentication, data fetching, state management, error handling, and performance optimization.

## 🏗️ API Architecture

### Base Configuration ✅
```
Backend URL: http://localhost:3001
API Version: v1
Base Path: /api/v1
Documentation: http://localhost:3001/api/docs
```

#### Implementation Status ✅
- [x] Production-ready API configuration module (`/src/lib/api/config.ts`)
- [x] Environment detection and configuration (`development`, `staging`, `production`, `test`)
- [x] Configuration validation with Zod schema
- [x] Type-safe configuration with TypeScript
- [x] Environment-specific configuration files (`.env.development`, `.env.production`)
- [x] API health monitoring service (`/src/lib/api/health-monitor.ts`)
- [x] Configuration validator (`/src/lib/api/config-validator.ts`)
- [x] Singleton pattern for configuration management
- [x] Feature flags based on environment
- [x] Timeout configuration for different operations
- [x] Rate limiting configuration
- [x] Retry configuration with exponential backoff
- [x] CORS and security headers configuration
- [x] WebSocket and SSE configuration
- [x] Monitoring and analytics configuration
- [x] Cache strategy configuration

### Using the Configuration

```typescript
// Import the configuration
import { apiConfig, getApiEndpoints } from '@/lib/api/config';
import { healthMonitor, isApiHealthy } from '@/lib/api/health-monitor';
import { validateApiConfiguration } from '@/lib/api/config-validator';

// Get configuration values
const config = apiConfig.getConfig();
const baseUrl = apiConfig.getBaseUrl(); // Returns: http://localhost:3001/api/v1
const endpoints = getApiEndpoints();

// Check environment
if (apiConfig.isProduction()) {
  // Production-specific logic
}

// Use endpoints
const userEndpoint = endpoints.users.byId('123'); // /api/v1/users/123

// Monitor API health
healthMonitor.subscribe((status) => {
  console.log('API Status:', status.status);
});

// Validate configuration (automatically runs in development)
const validation = await validateApiConfiguration();
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

### Available Modules and Endpoints ✅

> **Implementation Status**: All endpoints have been implemented in production-ready TypeScript modules
> - ✅ Comprehensive endpoint definitions in `/src/lib/api/endpoints.ts`
> - ✅ Type-safe endpoint functions with parameter validation
> - ✅ Production-ready service classes in `/src/lib/api/services/`
> - ✅ Centralized service exports in `/src/lib/api/services/index.ts`

#### 1. Authentication Module ✅
```
POST   /api/v1/auth/login          - User login
POST   /api/v1/auth/logout         - User logout
POST   /api/v1/auth/refresh        - Refresh token
GET    /api/v1/auth/me            - Get current user
GET    /api/v1/auth/health        - Health check
```
**Implementation**: `/src/lib/api/services/auth.service.ts`

#### 2. Users Module ✅
```
GET    /api/v1/users              - List users (paginated)
GET    /api/v1/users/:id          - Get user by ID
GET    /api/v1/users/me           - Get current user profile
GET    /api/v1/users/by-nip/:nip  - Get user by NIP
GET    /api/v1/users/stats        - Get user statistics
POST   /api/v1/users              - Create user
PATCH  /api/v1/users/:id          - Update user
DELETE /api/v1/users/:id          - Delete user
```
**Implementation**: Endpoints defined in `/src/lib/api/endpoints.ts`

#### 3. Organizations Module ✅
```
# Schools
GET    /api/v1/schools            - List schools
GET    /api/v1/schools/:id        - Get school by ID
POST   /api/v1/schools            - Create school
PATCH  /api/v1/schools/:id        - Update school
DELETE /api/v1/schools/:id        - Delete school

# Departments
GET    /api/v1/departments        - List departments
GET    /api/v1/departments/:id    - Get department by ID
POST   /api/v1/departments        - Create department
PATCH  /api/v1/departments/:id    - Update department
DELETE /api/v1/departments/:id    - Delete department

# Positions
GET    /api/v1/positions          - List positions
GET    /api/v1/positions/:id      - Get position by ID
POST   /api/v1/positions          - Create position
PATCH  /api/v1/positions/:id      - Update position
DELETE /api/v1/positions/:id      - Delete position
```
**Implementation**: All organization endpoints defined in `/src/lib/api/endpoints.ts`

#### 4. Permissions Module ✅
```
# Permissions
GET    /api/v1/permissions        - List permissions
GET    /api/v1/permissions/:id    - Get permission by ID
POST   /api/v1/permissions        - Create permission
PATCH  /api/v1/permissions/:id    - Update permission
DELETE /api/v1/permissions/:id    - Delete permission

# Roles
GET    /api/v1/roles              - List roles
GET    /api/v1/roles/:id          - Get role by ID
POST   /api/v1/roles              - Create role
PATCH  /api/v1/roles/:id          - Update role
DELETE /api/v1/roles/:id          - Delete role

# Module Access
GET    /api/v1/module-access      - List module access
POST   /api/v1/module-access      - Grant module access
DELETE /api/v1/module-access/:id  - Revoke module access
```
**Implementation**: All permission endpoints defined in `/src/lib/api/endpoints.ts`

#### 5. Workflows Module ✅
```
# Workflows
GET    /api/v1/workflows          - List workflows
GET    /api/v1/workflows/:id      - Get workflow by ID
POST   /api/v1/workflows          - Create workflow
PATCH  /api/v1/workflows/:id      - Update workflow
DELETE /api/v1/workflows/:id      - Delete workflow

# Workflow Templates
GET    /api/v1/workflow-templates     - List templates
GET    /api/v1/workflow-templates/:id - Get template by ID
POST   /api/v1/workflow-templates     - Create template
PATCH  /api/v1/workflow-templates/:id - Update template
DELETE /api/v1/workflow-templates/:id - Delete template

# Workflow Instances
GET    /api/v1/workflow-instances     - List instances
GET    /api/v1/workflow-instances/:id - Get instance by ID
POST   /api/v1/workflow-instances     - Create instance
PATCH  /api/v1/workflow-instances/:id - Update instance
DELETE /api/v1/workflow-instances/:id - Delete instance
```
**Implementation**: All workflow endpoints defined in `/src/lib/api/endpoints.ts`

#### 6. Notifications Module ✅
```
# Notifications
GET    /api/v1/notifications          - List notifications
GET    /api/v1/notifications/:id      - Get notification by ID
POST   /api/v1/notifications          - Send notification
PATCH  /api/v1/notifications/:id      - Mark as read
DELETE /api/v1/notifications/:id      - Delete notification

# Notification Preferences
GET    /api/v1/notification-preferences        - Get preferences
PATCH  /api/v1/notification-preferences        - Update preferences

# Notification Templates
GET    /api/v1/notification-templates          - List templates
GET    /api/v1/notification-templates/:id      - Get template by ID
POST   /api/v1/notification-templates          - Create template
PATCH  /api/v1/notification-templates/:id      - Update template
DELETE /api/v1/notification-templates/:id      - Delete template
```
**Implementation**: All notification endpoints defined in `/src/lib/api/endpoints.ts`

#### 7. Audit Module ✅
```
GET    /api/v1/audit              - List audit logs
GET    /api/v1/audit/:id          - Get audit log by ID
GET    /api/v1/audit/export       - Export audit logs
```
**Implementation**: All audit endpoints defined in `/src/lib/api/endpoints.ts`

#### 8. Feature Flags Module ✅
```
GET    /api/v1/feature-flags      - List feature flags
GET    /api/v1/feature-flags/:key - Get feature flag by key
POST   /api/v1/feature-flags      - Create feature flag
PATCH  /api/v1/feature-flags/:id  - Update feature flag
DELETE /api/v1/feature-flags/:id  - Delete feature flag
```
**Implementation**: All feature flag endpoints defined in `/src/lib/api/endpoints.ts`

#### 9. System Config Module ✅
```
GET    /api/v1/system-config      - Get system configuration
PATCH  /api/v1/system-config      - Update system configuration
```
**Implementation**: All system config endpoints defined in `/src/lib/api/endpoints.ts`

## 🔐 Authentication Flow ✅

### Implementation Status ✅
- [x] Complete authentication flow with Clerk integration
- [x] Redux auth slice with roles and permissions management
- [x] Token management with secure storage options
- [x] Authentication context and provider
- [x] Comprehensive authentication hooks
- [x] Protected route components
- [x] Authentication middleware with role-based access control
- [x] Rate limiting and security headers
- [x] Activity tracking and session management
- [x] Token refresh mechanism

### Clerk Integration with Backend ✅

**Implementation**: `/src/lib/auth/clerk-config.ts`

```typescript
// src/lib/auth/clerk-config.ts
import { useAuth, useUser } from '@clerk/nextjs';

export const useAuthenticatedRequest = () => {
  const { getToken } = useAuth();

  return async (config: RequestInit = {}) => {
    const token = await getToken();
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  };
};

// Automatic token sync with backend
export const useClerkApiSync = () => {
  // Syncs Clerk auth with backend API
  // Refreshes token every 5 minutes
  // Updates Redux store with user data
};
```

### Authentication State Management ✅

**Implementation**: `/src/store/slices/authSlice.ts`

```typescript
// Complete auth slice with roles and permissions
interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  roles: string[];  // Added role management
  sessionId: string | null;
  lastActivity: number | null;
  error: string | null;
}

// Available actions:
// - setUser, updateUser, clearAuth
// - setPermissions, addPermission, removePermission
// - setRoles, addRole, removeRole  // New role actions
// - setSession, updateActivity
// - setLoading, setError, resetError

// Selectors for permissions and roles:
// - selectHasPermission, selectHasAllPermissions, selectHasAnyPermission
// - selectHasRole, selectHasAllRoles, selectHasAnyRole
```

### Authentication Context ✅

**Implementation**: `/src/contexts/AuthContext.tsx`

```typescript
// Comprehensive auth context providing:
interface AuthContextType {
  // State
  isAuthenticated: boolean;
  user: any | null;
  permissions: string[];
  roles: string[];

  // Methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Permission & Role checks
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  // ... and more
}
```

### Token Management ✅

**Implementation**: `/src/lib/auth/token-manager.ts`

```typescript
// Secure token management with multiple storage options:
enum TokenStorage {
  MEMORY = 'memory',        // Most secure, in-memory only
  SESSION = 'session',      // Session storage
  LOCAL = 'local',         // Encrypted local storage
  SECURE_COOKIE = 'secure_cookie'  // HttpOnly cookies
}

// Features:
// - Automatic token refresh before expiry
// - Token encryption for local storage
// - JWT decode and validation
// - Expiry tracking and management
```

### Authentication Hooks ✅

**Implementation**: `/src/hooks/useAuth.ts`

```typescript
// Available hooks:
export const useAuth = () => {};           // Main auth hook
export const usePermission = () => {};     // Check single permission
export const usePermissions = () => {};    // Check multiple permissions
export const useRole = () => {};           // Check single role
export const useRoles = () => {};          // Check multiple roles
export const useRequireAuth = () => {};    // Protected route enforcement
export const useRequireGuest = () => {};   // Guest-only routes
export const useLogin = () => {};          // Login functionality
export const useLogout = () => {};         // Logout functionality
export const useSession = () => {};        // Session management
export const useActivityTracking = () => {}; // Idle timeout
```

### Protected Routes ✅

**Implementation**: `/src/components/auth/ProtectedRoute.tsx`

```typescript
// Protected route component
<ProtectedRoute permissions={['admin']} roles={['manager']}>
  <AdminDashboard />
</ProtectedRoute>

// HOC for page protection
export default withAuth(MyPage, {
  permissions: ['view_users'],
  roles: ['admin'],
});

// Conditional rendering
<Can permissions={['edit']} roles={['editor']}>
  <EditButton />
</Can>

// Guest-only routes
<GuestRoute redirectTo="/dashboard">
  <LoginPage />
</GuestRoute>
```

### Authentication Middleware ✅

**Implementation**: `/src/middleware/auth.ts`

```typescript
// Complete middleware stack:
// 1. CORS handling with configurable origins
// 2. Security headers (CSP, HSTS, etc.)
// 3. Rate limiting (60 req/min default)
// 4. Authentication verification
// 5. Role-based access control
// 6. Admin route protection

// Route configuration:
const publicRoutes = ['/login', '/register'];
const protectedApiRoutes = ['/api/users/*'];
const adminRoutes = ['/admin/*'];
const roleBasedRoutes = {
  '/dashboard/admin': ['admin', 'super_admin'],
  '/reports': ['admin', 'analyst'],
};
```

## 📡 Data Fetching Patterns ✅

### 1. RTK Query Setup ✅

> **Implementation Status**: ✅ Complete production-ready implementation
> - ✅ Base API with retry logic (`/src/store/api/baseApi.ts`)
> - ✅ Exponential backoff with jitter
> - ✅ Authentication with token refresh
> - ✅ Request ID tracking for debugging
> - ✅ Comprehensive error handling

```typescript
// src/store/api/baseApi.ts
import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import { getAuth } from '@clerk/nextjs/server';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  prepareHeaders: async (headers) => {
    const token = await getAuth().getToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('X-Request-ID', `${Date.now()}-${Math.random()}`);
    return headers;
  },
});

const baseQueryWithRetry = retry(baseQuery, { maxRetries: 3 });

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,
  tagTypes: [
    'User',
    'Organization',
    'Permission',
    'Role',
    'Workflow',
    'Notification',
    'Audit',
    'FeatureFlag',
    'SystemConfig',
  ],
  endpoints: () => ({}),
});
```

### 2. Query Hooks with Caching ✅

> **Implementation Status**: ✅ Complete implementation
> - ✅ Custom hooks for users with filtering (`/src/hooks/api/useUsers.ts`)
> - ✅ Pagination support with helpers
> - ✅ Sorting and search functionality
> - ✅ Export/Import capabilities
> - ✅ Automatic polling and refetching

```typescript
// src/hooks/api/useUsers.ts
import { useGetUsersQuery } from '@/store/api/userApi';
import { useState, useCallback } from 'react';

export const useUsers = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  });

  const { data, isLoading, error, refetch } = useGetUsersQuery(filters, {
    pollingInterval: 30000, // Poll every 30 seconds
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refreshData = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    users: data?.data || [],
    total: data?.total || 0,
    isLoading,
    error,
    filters,
    updateFilters,
    refreshData,
  };
};
```

### 3. Optimistic Updates ✅

> **Implementation Status**: ✅ Complete implementation
> - ✅ Optimistic updates for all user mutations (`/src/store/api/userApi.ts`)
> - ✅ Create, Update, Delete with instant UI feedback
> - ✅ Automatic rollback on errors
> - ✅ Cache synchronization across queries

```typescript
// src/store/api/userApi.ts
export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    updateUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      // Optimistic update
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData('getUser', id, (draft) => {
            Object.assign(draft, data);
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
  }),
});
```

### 4. Infinite Scrolling Pattern ✅

> **Implementation Status**: ✅ Complete implementation
> - ✅ Reusable infinite scroll hook (`/src/hooks/useInfiniteScroll.ts`)
> - ✅ Support for Intersection Observer API
> - ✅ Container-based scrolling support
> - ✅ Virtual scrolling for performance
> - ✅ Example component implementation (`/src/components/examples/InfiniteUserList.tsx`)

```typescript
// src/hooks/useInfiniteScroll.ts
import { useCallback, useEffect, useRef } from 'react';

export const useInfiniteScroll = (
  callback: () => void,
  hasMore: boolean,
  isLoading: boolean
) => {
  const observer = useRef<IntersectionObserver>();

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          callback();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore, callback]
  );

  useEffect(() => {
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  return lastElementRef;
};

// Usage
const UserList = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetUsersQuery({ page, limit: 20 });

  const lastUserRef = useInfiniteScroll(
    () => setPage(p => p + 1),
    data?.hasMore || false,
    isLoading
  );

  return (
    <div>
      {data?.users.map((user, index) => (
        <div
          key={user.id}
          ref={index === data.users.length - 1 ? lastUserRef : null}
        >
          {user.name}
        </div>
      ))}
    </div>
  );
};
```

## 🔄 Real-time Updates ✅

### Implementation Status ✅
- [x] Production-ready SSE service with automatic reconnection (`/src/lib/sse/SSEService.ts`)
- [x] SSE React hook with Clerk authentication (`/src/hooks/useSSE.ts`)
- [x] WebSocket client with reconnection logic (`/src/lib/websocket/client.ts`)
- [x] WebSocket React hook for component usage (`/src/hooks/useWebSocket.ts`)
- [x] Cross-tab synchronization service (`/src/hooks/useCrossTabSync.ts`)
- [x] Redux notification slice with real-time updates (`/src/store/slices/notificationSlice.ts`)
- [x] Heartbeat monitoring and connection health checks
- [x] Automatic reconnection with exponential backoff
- [x] Message queueing for offline scenarios
- [x] Leader election for cross-tab coordination
- [x] Type-safe event handling and message structures

### Server-Sent Events (SSE) ✅

**Implementation**: `/src/lib/sse/SSEService.ts` and `/src/hooks/useSSE.ts`

```typescript
// Using the production-ready SSE hook
import { useSSE } from '@/hooks/useSSE';

const MyComponent = () => {
  const {
    status,
    isConnected,
    connect,
    disconnect,
    addEventListener
  } = useSSE('/sse', {
    autoConnect: true,
    reconnectOnFocus: true,
    reconnectOnOnline: true,
  });

  useEffect(() => {
    // Add custom event listeners
    const unsubscribe = addEventListener(SSEEventType.NOTIFICATION_CREATED, (data) => {
      console.log('New notification:', data);
    });

    return unsubscribe;
  }, [addEventListener]);

  return (
    <div>
      <div>SSE Status: {status}</div>
      {isConnected && <span>✅ Connected</span>}
    </div>
  );
};
```

**Features**:
- Automatic reconnection with exponential backoff
- Authentication with Clerk integration
- Heartbeat monitoring for connection health
- Event type safety with TypeScript enums
- Redux integration for state updates
- Toast notifications for user feedback
- Support for multiple event types

### WebSocket Connection ✅

**Implementation**: `/src/lib/websocket/client.ts` and `/src/hooks/useWebSocket.ts`

```typescript
// Using the production-ready WebSocket hook
import { useWebSocket } from '@/hooks/useWebSocket';

const MyComponent = () => {
  const {
    state,
    isConnected,
    socketId,
    connect,
    disconnect,
    emit,
    on,
    request,
    joinRoom,
    metrics,
  } = useWebSocket('/', {
    autoConnect: true,
    reconnectOnFocus: true,
    room: 'global',
  });

  // Send message
  const sendMessage = () => {
    emit('message', { text: 'Hello World' });
  };

  // Request-response pattern
  const fetchData = async () => {
    try {
      const response = await request('getData', { id: 123 });
      console.log('Data:', response);
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  return (
    <div>
      <div>WebSocket State: {state}</div>
      <div>Socket ID: {socketId}</div>
      <div>Messages Sent: {metrics.messagesSent}</div>
      <div>Messages Received: {metrics.messagesReceived}</div>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
};
```

**Features**:
- Socket.io client with automatic reconnection
- Room-based messaging for multi-user features
- Request-response pattern with promises
- Connection metrics and monitoring
- Message queueing for offline scenarios
- Heartbeat/ping-pong for connection health
- Event emitter pattern for flexible event handling

## 🔄 State Synchronization ✅

### Cross-Tab Synchronization ✅

**Implementation**: `/src/hooks/useCrossTabSync.ts`

```typescript
// Using the production-ready cross-tab sync hook
import { useCrossTabSync } from '@/hooks/useCrossTabSync';

const MyComponent = () => {
  const {
    broadcast,
    broadcastAuthUpdate,
    broadcastNotification,
    broadcastCacheInvalidation,
    isLeader,
    tabId,
    getTabInfo,
  } = useCrossTabSync({
    channelName: 'gloria-sync',
    enableHeartbeat: true,
    autoSync: true,
  });

  // Broadcast auth update to other tabs
  const handleLogin = (user: any) => {
    broadcastAuthUpdate(user, permissions, roles);
  };

  // Broadcast notification to all tabs
  const handleNewNotification = (notification: any) => {
    broadcastNotification(notification);
  };

  // Get tab information
  const tabInfo = getTabInfo();
  console.log(`Tab ${tabInfo.tabId} - Leader: ${tabInfo.isLeader}`);

  return (
    <div>
      {isLeader && <span>👑 Leader Tab</span>}
      <div>Tab ID: {tabId}</div>
    </div>
  );
};
```

**Features**:
- BroadcastChannel API for cross-tab communication
- Leader election for coordinated operations
- Automatic fallback to localStorage for older browsers
- Heartbeat monitoring for active tab tracking
- Redux state synchronization across tabs
- Type-safe message passing
- Automatic cleanup on tab close

## 🚨 Error Handling ✅

### Implementation Status ✅
- [x] Production-ready custom error classes with detailed categorization (`/src/lib/api/errors.ts`)
- [x] Global error boundary for React components (`/src/components/shared/ErrorBoundary.tsx`)
- [x] API error interceptors with automatic retry logic (`/src/lib/api/client.ts`)
- [x] Comprehensive error monitoring and logging service (`/src/lib/errors/errorLogger.ts`)
- [x] User-friendly error UI components (`/src/components/errors/ErrorFallback.tsx`)
- [x] Advanced error recovery mechanisms (`/src/hooks/useErrorRecovery.ts`)
- [x] Sentry integration for production error tracking
- [x] Circuit breaker pattern implementation
- [x] Exponential backoff with jitter for retries
- [x] Network and timeout error handling

### Custom Error Classes ✅

**Implementation**: `/src/lib/api/errors.ts`

```typescript
// Production-ready error classes with full type safety
export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;
  public timestamp: string;
  public requestId?: string;
  public isRetryable: boolean;

  constructor(info: ApiErrorInfo) {
    super(info.message);
    this.name = 'ApiError';
    // Full implementation with stack trace preservation
  }

  static fromAxiosError(error: AxiosError): ApiError {
    // Intelligent error conversion with retry detection
  }
}

// Specialized error classes for common scenarios
export class UnauthorizedError extends ApiError { /* 401 */ }
export class ForbiddenError extends ApiError { /* 403 */ }
export class NotFoundError extends ApiError { /* 404 */ }
export class ValidationError extends ApiError { /* 400 */ }
export class RateLimitError extends ApiError { /* 429 */ }
export class NetworkError extends ApiError { /* Network failures */ }
export class TimeoutError extends ApiError { /* Timeouts */ }
export class ServerError extends ApiError { /* 5xx errors */ }
```

### Global Error Boundary ✅

**Implementation**: `/src/components/shared/ErrorBoundary.tsx`

```typescript
// Production-ready error boundary with recovery options
export class ErrorBoundary extends Component<Props, State> {
  // Features:
  // - Chunk load error detection and recovery
  // - Error history tracking
  // - Sentry integration with error IDs
  // - User feedback collection
  // - Multiple retry attempts tracking
  // - Development/production mode support
}

// Usage
<ErrorBoundary fallback={<CustomFallback />} onError={handleError}>
  <YourComponent />
</ErrorBoundary>

// HOC for functional components
export default withErrorBoundary(MyComponent, fallback, onError);
```

### API Error Interceptors ✅

**Implementation**: `/src/lib/api/client.ts`

```typescript
// Comprehensive error interceptors with retry logic
class ApiClient {
  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add request tracking
        // Add authentication headers
        // Add correlation IDs
        // Add request signing
        return config;
      }
    );

    // Response interceptor with error handling
    this.client.interceptors.response.use(
      (response) => {
        // Track metrics
        // Handle rate limit headers
        return response;
      },
      async (error) => {
        // Handle network errors
        // Handle timeouts
        // Auto-retry with exponential backoff
        // Token refresh on 401
        // Rate limit handling
        // Convert to ApiError
        throw ApiError.fromAxiosError(error);
      }
    );
  }
}
```

### Error Monitoring & Logging ✅

**Implementation**: `/src/lib/errors/errorLogger.ts`

```typescript
// Comprehensive logging with Sentry integration
class Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error, data?: any): void;
  fatal(message: string, error?: Error, data?: any): void;

  // Features:
  // - Log levels with filtering
  // - Sentry breadcrumbs
  // - Performance monitoring
  // - User action tracking
  // - Buffer management
  // - Context enrichment
}

// Performance monitoring
export class PerformanceMonitor {
  start(label: string): void;
  end(label: string): number;
  async measure<T>(label: string, operation: () => Promise<T>): Promise<T>;
}
```

### User-Friendly Error Components ✅

**Implementation**: `/src/components/errors/ErrorFallback.tsx`

```typescript
// Production-ready error UI components
export function ErrorFallback({
  error,
  reset,
  category,
  severity,
  showDetails,
  customActions,
}: ErrorFallbackProps) {
  // Features:
  // - Category-specific icons and messages
  // - Severity-based styling
  // - Debug information in development
  // - Recovery action suggestions
  // - Offline detection
  // - 404 handling
}

// Specialized fallbacks
export function AsyncErrorFallback({ error }: { error: Error });
export function NotFoundFallback();
export function OfflineFallback();
```

### Advanced Error Recovery ✅

**Implementation**: `/src/hooks/useErrorRecovery.ts`

```typescript
// Advanced recovery hook with multiple strategies
export function useErrorRecovery(options: UseErrorRecoveryOptions) {
  // Features:
  // - Multiple recovery strategies
  // - Auto-retry with exponential backoff
  // - Strategy suggestions based on error type
  // - Circuit breaker pattern
  // - Recovery state management

  return {
    state,
    handleError,
    handleRetry,
    executeStrategy,
    clearError,
    isRecoverable,
    getSuggestedStrategies,
  };
}

// Circuit breaker for preventing cascading failures
export function useCircuitBreaker(threshold: number, timeout: number) {
  // Features:
  // - Automatic circuit opening on failures
  // - Half-open state testing
  // - Auto-recovery after timeout

  return {
    isOpen,
    failures,
    recordSuccess,
    recordFailure,
    canExecute,
  };
}
```

### Error Handler Configuration ✅

**Implementation**: `/src/lib/errors/errorHandler.ts`

```typescript
// Global error handler with multiple severity levels
export function handleError(
  error: Error | ApplicationError,
  config: ErrorHandlerConfig = {}
): void {
  // Features:
  // - Toast notifications by severity
  // - Sentry reporting
  // - Console logging in development
  // - Custom handler support
  // - User-friendly messages
}

// Install global handlers
export function installGlobalErrorHandlers(): void {
  // Catches:
  // - Unhandled promise rejections
  // - Global JavaScript errors
  // - Cross-origin script errors
}

// Error recovery strategies
export const ErrorRecovery = {
  reload: () => window.location.reload(),
  goHome: () => window.location.href = '/',
  goDashboard: () => window.location.href = '/dashboard',
  clearAndReload: () => { /* Clear storage and reload */ },
  signOut: () => { /* Clear auth and redirect */ },
};
```

### Retry Logic with Exponential Backoff ✅

**Implementation**: `/src/lib/errors/errorHandler.ts`

```typescript
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  // Features:
  // - Exponential backoff with jitter
  // - Maximum delay capping
  // - Retry callback for monitoring
  // - Skip retry for non-retryable errors

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(factor, attempt - 1),
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 🎯 Performance Optimization ✅

### Implementation Status ✅
- [x] Production-ready request deduplication with TTL and metrics (`/src/lib/api/performance/deduplicator.ts`)
- [x] Batch request handler with automatic grouping and priority queue (`/src/lib/api/performance/batcher.ts`)
- [x] Advanced caching with multiple storage strategies (Memory, Session, Local, IndexedDB) (`/src/lib/api/performance/cache.ts`)
- [x] Intelligent prefetching with viewport and hover triggers (`/src/lib/api/performance/prefetch.ts`)
- [x] Comprehensive performance monitoring with percentiles (`/src/lib/api/performance/monitor.ts`)
- [x] Bundle optimization with dynamic imports and code splitting (`/src/lib/api/performance/bundle.ts`)
- [x] Data compression utilities with streaming support (`/src/lib/utils/compression.ts`)
- [x] Centralized performance module exports (`/src/lib/api/performance/index.ts`)

### 1. Request Deduplication ✅

**Implementation**: `/src/lib/api/performance/deduplicator.ts`

Production-ready service that prevents duplicate API requests, featuring:
- TTL-based cache expiration
- Memory management with size limits
- Hit rate tracking and metrics
- Batch deduplication support
- Automatic cleanup of expired entries

```typescript
import { dedupe, prefetch, clearCache, getDeduplicationMetrics } from '@/lib/api/performance';

// Basic deduplication
const user = await dedupe(
  `user-${userId}`,
  () => apiClient.get(`/users/${userId}`),
  5000 // TTL in ms
);

// Prefetch data for later use
await prefetch('dashboard-data', fetchDashboardData, 10000);

// Get metrics
const metrics = getDeduplicationMetrics();
console.log(`Cache hit rate: ${metrics.hitRate}%`);

// Clear specific or all cache
clearCache('user-123'); // Clear specific
clearCache(); // Clear all
```

**Features**:
- Configurable TTL per request
- Maximum cache size enforcement
- LRU eviction policy
- Metrics tracking (hits, misses, evictions)
- Error handling with automatic cache cleanup

### 2. Request Batching ✅

**Implementation**: `/src/lib/api/performance/batcher.ts`

Automatically groups multiple API requests into batch operations:
- Priority queue support
- Configurable batch size and delay
- Error isolation per request
- Retry logic with exponential backoff
- Progress tracking

```typescript
import { batchRequest, flushBatches, getBatchMetrics } from '@/lib/api/performance';

// Add requests to batch (automatically grouped by endpoint)
const user1 = await batchRequest('/api/users', { id: 1 }, 'high');
const user2 = await batchRequest('/api/users', { id: 2 }, 'medium');
const user3 = await batchRequest('/api/users', { id: 3 }, 'low');

// Manually flush all pending batches
await flushBatches();

// Get batching metrics
const metrics = getBatchMetrics();
console.log(`Average batch size: ${metrics.averageBatchSize}`);
```

**Configuration**:
- `maxBatchSize`: Maximum requests per batch (default: 50)
- `batchDelayMs`: Delay before sending batch (default: 10ms)
- `maxRetries`: Retry attempts for failed batches (default: 3)
- `enablePriority`: Enable priority queue (default: true)

### 3. Advanced Caching ✅

**Implementation**: `/src/lib/api/performance/cache.ts`

Multi-tier caching system with multiple storage strategies:

```typescript
import {
  memoryCache,
  sessionCache,
  persistentCache,
  CacheStrategy,
  EvictionPolicy
} from '@/lib/api/performance';

// Use different cache strategies
await memoryCache.set('key', data, { ttl: 5000 });
await sessionCache.set('user-session', userData, { ttl: 30 * 60 * 1000 });
await persistentCache.set('app-config', config, {
  ttl: 60 * 60 * 1000,
  metadata: { version: '1.0.0' }
});

// Create custom cache
import { AdvancedCache } from '@/lib/api/performance';

const apiCache = new AdvancedCache({
  strategy: CacheStrategy.HYBRID, // Memory + IndexedDB
  maxSize: 10 * 1024 * 1024, // 10MB
  maxEntries: 500,
  ttl: 5 * 60 * 1000, // 5 minutes
  compression: true,
  evictionPolicy: EvictionPolicy.LRU,
  enableCrossTab: true,
});

// Use the cache
await apiCache.set('api-response', responseData);
const cached = await apiCache.get('api-response');

// Get cache metrics
const metrics = apiCache.getMetrics();
console.log(`Cache hit rate: ${metrics.hitRate}%`);
```

**Storage Strategies**:
- `MEMORY`: In-memory only (fastest)
- `SESSION`: SessionStorage (tab-specific)
- `LOCAL`: LocalStorage (persistent)
- `INDEXED_DB`: IndexedDB (large data)
- `HYBRID`: Memory + Persistent (best of both)

**Eviction Policies**:
- `LRU`: Least Recently Used
- `LFU`: Least Frequently Used
- `FIFO`: First In First Out
- `TTL`: Time-based expiration

### 4. Request Prefetching ✅

**Implementation**: `/src/lib/api/performance/prefetch.ts`

Intelligent prefetching based on user behavior:

```typescript
import {
  prefetch,
  prefetchRoute,
  observePrefetch,
  hoverPrefetch,
  predictivePrefetch
} from '@/lib/api/performance';

// Basic prefetching
await prefetch('user-profile', fetchUserProfile, {
  priority: 'high',
  ttl: 10000,
  strategy: 'eager',
  networkCondition: '4g', // Only on fast networks
});

// Route-based prefetching
prefetchService.registerRoutePattern(
  /^\/users\/\d+$/,
  ['user-details', 'user-posts', 'user-comments'],
  { priority: 'medium' }
);

await prefetchRoute('/users/123');

// Viewport-based prefetching (Intersection Observer)
const element = document.getElementById('lazy-section');
observePrefetch(element, 'section-data', fetchSectionData, {
  strategy: 'viewport',
});

// Hover-based prefetching
const link = document.getElementById('user-link');
hoverPrefetch(link, 'user-preview', fetchUserPreview, {
  delay: 100, // Wait 100ms after hover
});

// Predictive prefetching based on patterns
await predictivePrefetch('current-page');
```

**Strategies**:
- `eager`: Prefetch immediately
- `lazy`: Prefetch when idle
- `viewport`: Prefetch when near viewport
- `hover`: Prefetch on element hover
- `predictive`: ML-based prediction

### 5. Performance Monitoring ✅

**Implementation**: `/src/lib/api/performance/monitor.ts`

Real-time performance metrics and alerting:

```typescript
import {
  trackApiRequest,
  getPerformanceMetrics,
  subscribeToMetrics,
  setPerformanceBudget
} from '@/lib/api/performance';

// Track API requests
trackApiRequest({
  endpoint: '/api/users',
  method: 'GET',
  timestamp: Date.now(),
  duration: 245,
  statusCode: 200,
  bytesReceived: 1024,
  bytesSent: 256,
  cached: false,
});

// Set performance budgets
setPerformanceBudget({
  metric: 'p95Latency',
  threshold: 1000,
  severity: 'warning',
});

// Subscribe to real-time metrics
const unsubscribe = subscribeToMetrics((metrics) => {
  console.log(`Average latency: ${metrics.averageLatency}ms`);
  console.log(`P95 latency: ${metrics.p95Latency}ms`);
  console.log(`Error rate: ${metrics.errorRate}%`);
});

// Get current metrics
const metrics = getPerformanceMetrics();
```

**Metrics Available**:
- Latency percentiles (P50, P90, P95, P99)
- Request/response counts
- Error rates
- Cache hit rates
- Throughput (requests/second)
- Performance and availability scores

### 6. Bundle Optimization ✅

**Implementation**: `/src/lib/api/performance/bundle.ts`

Optimize bundle loading and code splitting:

```typescript
import {
  dynamicImport,
  lazyLoadComponent,
  preloadComponent,
  loadScript,
  loadCSS,
  preconnectOrigins
} from '@/lib/api/performance';

// Dynamic import with retry
const module = await dynamicImport(
  () => import('./heavy-module'),
  {
    chunkName: 'heavy-module',
    maxRetries: 3,
    retryDelay: 1000,
  }
);

// Lazy load React components
const LazyDashboard = lazyLoadComponent(
  () => import('@/components/Dashboard'),
  {
    fallback: LoadingComponent,
    retry: 3,
    preload: true, // Preload in background
  }
);

// Preload component for faster navigation
await preloadComponent(() => import('@/components/UserProfile'));

// Load external resources
await loadScript('https://cdn.example.com/analytics.js', {
  async: true,
  crossOrigin: 'anonymous',
});

await loadCSS('https://cdn.example.com/theme.css', {
  media: 'screen',
});

// Optimize connections
preconnectOrigins([
  'https://api.example.com',
  'https://cdn.example.com',
]);
```

### 7. Response Compression ✅

**Implementation**: `/src/lib/utils/compression.ts`

Compress API responses for reduced bandwidth:

```typescript
import {
  compress,
  decompress,
  compressStream,
  calculateCompressionRatio
} from '@/lib/api/performance';

// Compress data
const result = await compress(largeData, {
  format: 'gzip',
  threshold: 1024, // Only compress if > 1KB
  encoding: 'base64',
});

console.log(`Compression ratio: ${result.compressionRatio.toFixed(2)}x`);
console.log(`Saved: ${result.originalSize - result.compressedSize} bytes`);

// Decompress data
const original = await decompress(result.compressed, {
  format: 'gzip',
  encoding: 'base64',
});

// Stream compression for large data
const compressedStream = compressStream(dataStream, 'gzip');
for await (const chunk of compressedStream) {
  // Process compressed chunks
}
```

### Integration with API Client

```typescript
// src/lib/api/client.ts
import {
  dedupe,
  batchRequest,
  persistentCache,
  trackApiRequest,
  compress,
  decompress
} from '@/lib/api/performance';

class EnhancedApiClient {
  async get(url: string, options?: RequestOptions) {
    // Check cache first
    const cacheKey = `GET:${url}`;
    const cached = await persistentCache.get(cacheKey);
    if (cached) return cached;

    // Deduplicate concurrent requests
    return dedupe(cacheKey, async () => {
      const startTime = Date.now();

      try {
        const response = await fetch(url, options);
        const data = await response.json();

        // Decompress if needed
        if (response.headers.get('content-encoding')) {
          data = await decompress(data);
        }

        // Track performance
        trackApiRequest({
          endpoint: url,
          method: 'GET',
          timestamp: startTime,
          duration: Date.now() - startTime,
          statusCode: response.status,
          bytesReceived: JSON.stringify(data).length,
          bytesSent: 0,
          cached: false,
        });

        // Cache successful responses
        if (response.ok) {
          await persistentCache.set(cacheKey, data, { ttl: 60000 });
        }

        return data;
      } catch (error) {
        // Track failed request
        trackApiRequest({
          endpoint: url,
          method: 'GET',
          timestamp: startTime,
          duration: Date.now() - startTime,
          statusCode: 0,
          bytesReceived: 0,
          bytesSent: 0,
          cached: false,
          error: error as Error,
        });

        throw error;
      }
    });
  }
}
```

## 📊 Monitoring and Analytics ✅

### Implementation Status ✅
- [x] Production-ready API monitoring service with real-time metrics (`/src/lib/monitoring/api-monitor.ts`)
- [x] Comprehensive user analytics tracker with privacy compliance (`/src/lib/analytics/user-analytics.ts`)
- [x] Error tracking and alerting system with Sentry integration (`/src/lib/monitoring/error-tracking.ts`)
- [x] Performance metrics collector with Core Web Vitals (`/src/lib/monitoring/performance-metrics.ts`)
- [x] Custom event tracking system with batching (`/src/lib/analytics/custom-events.ts`)
- [x] Multi-provider analytics integration (Google, Mixpanel, Amplitude, PostHog) (`/src/lib/analytics/providers/index.ts`)
- [x] Real-time monitoring dashboard components (`/src/components/monitoring/MonitoringDashboard.tsx`)
- [x] Health scoring and alerting system
- [x] Performance budgets and recommendations
- [x] Cross-tab analytics synchronization

### 1. API Monitoring Service ✅

**Implementation**: `/src/lib/monitoring/api-monitor.ts`

```typescript
import { apiMonitor, trackApiRequest, getApiHealthScore, subscribeToMonitoring } from '@/lib/monitoring/api-monitor';

// Track API requests
trackApiRequest({
  endpoint: '/api/users',
  method: 'GET',
  statusCode: 200,
  duration: 245,
  timestamp: Date.now(),
  requestSize: 256,
  responseSize: 1024,
  cached: false,
  userId: 'user-123',
  sessionId: 'session-456',
  traceId: 'trace-789',
});

// Get health score
const health = getApiHealthScore();
console.log(`API Health: ${health?.overall}% - Status: ${health?.status}`);

// Subscribe to alerts
const unsubscribe = subscribeToMonitoring('alert', (alert) => {
  console.error('API Alert:', alert.message);
  // Send to notification service
});

// Get endpoint-specific metrics
const userEndpointMetrics = apiMonitor.getEndpointMetric('/api/users', 'GET');
console.log(`P95 Latency: ${userEndpointMetrics?.p95Latency}ms`);
```

**Features**:
- Real-time metrics collection with sampling
- Latency percentiles (P50, P90, P95, P99)
- Error rate monitoring and alerting
- Health scoring (0-100) with status indicators
- Endpoint-specific metrics and analysis
- Throughput and performance tracking
- Configurable alert thresholds
- Event-driven architecture for real-time updates
- Metrics export for analysis

### 2. User Analytics Tracking ✅

**Implementation**: `/src/lib/analytics/user-analytics.ts`

```typescript
import { userAnalytics, trackPageView, trackEvent, identifyUser } from '@/lib/analytics/user-analytics';

// Initialize analytics
await userAnalytics.initialize();

// Track page views
trackPageView({
  customProperty: 'value',
});

// Track custom events
trackEvent('Button Click', {
  category: 'UI',
  action: 'click',
  label: 'Submit Form',
  value: 1,
});

// Identify user
identifyUser('user-123', {
  email: 'user@example.com',
  plan: 'premium',
  signupDate: new Date().toISOString(),
});

// Add conversion goals
userAnalytics.addConversionGoal({
  id: 'purchase',
  name: 'Complete Purchase',
  type: 'event',
  matcher: (data) => data.event === 'purchase',
  value: 100,
});

// Track scroll depth and engagement
// Automatically tracked when enabled
```

**Features**:
- Page view tracking with SPA support
- Custom event tracking with properties
- User identification and traits
- Session management with timeout
- Conversion tracking and goals
- Scroll depth tracking
- Form interaction tracking
- Click tracking with element context
- Cross-tab synchronization
- Privacy-compliant with consent management
- Device and location detection
- Campaign tracking (UTM parameters)

### 3. Error Tracking System ✅

**Implementation**: `/src/lib/monitoring/error-tracking.ts`

```typescript
import { errorTracking, captureError, addBreadcrumb, getErrorStats } from '@/lib/monitoring/error-tracking';

// Initialize error tracking
await errorTracking.initialize();

// Capture errors
try {
  // Your code
} catch (error) {
  captureError(error as Error, {
    context: {
      userId: 'user-123',
      url: '/dashboard',
      tags: { feature: 'user-management' },
    },
    metadata: {
      type: ErrorType.API,
      category: ErrorCategory.BACKEND,
      severity: ErrorSeverity.HIGH,
      isRetryable: true,
    },
  });
}

// Add breadcrumbs for context
addBreadcrumb({
  type: 'navigation',
  category: 'navigation',
  message: 'User navigated to dashboard',
  data: { from: '/login', to: '/dashboard' },
});

// Get error statistics
const stats = getErrorStats();
console.log(`Total Errors: ${stats.total}`);
console.log(`Error Trend: ${stats.trend}`);
console.log(`Affected Users: ${stats.affectedUsers}`);

// Resolve errors
errorTracking.resolveError('error-id-123');
```

**Features**:
- Automatic error capture with stack traces
- Error categorization and severity levels
- Error grouping and deduplication
- Breadcrumb tracking for context
- Sentry integration
- Custom error handlers
- Alert management with thresholds
- Error statistics and trends
- Affected user tracking
- Configurable ignore patterns

### 4. Performance Metrics ✅

**Implementation**: `/src/lib/monitoring/performance-metrics.ts`

```typescript
import {
  initializePerformanceMonitoring,
  performanceMark,
  performanceMeasure,
  trackMetric,
  setPerformanceBudget,
} from '@/lib/monitoring/performance-metrics';

// Initialize with callback for reports
initializePerformanceMonitoring((report) => {
  console.log(`Performance Score: ${report.score} (${report.grade})`);

  if (report.violations.length > 0) {
    console.warn('Performance budget violations:', report.violations);
  }

  if (report.recommendations.length > 0) {
    console.log('Recommendations:', report.recommendations);
  }
});

// Custom performance marks
performanceMark('data-fetch-start');
// ... fetch data ...
performanceMark('data-fetch-end');

// Measure between marks
const fetchTime = performanceMeasure('data-fetch', 'data-fetch-start', 'data-fetch-end');
console.log(`Data fetch took ${fetchTime}ms`);

// Track custom metrics
trackMetric('api-cache-hit-rate', 0.85);

// Set performance budgets
setPerformanceBudget('lcp', 2500, 'warning');
setPerformanceBudget('lcp', 4000, 'error');
```

**Core Web Vitals Tracked**:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)
- INP (Interaction to Next Paint)

**Additional Metrics**:
- Navigation timing metrics
- Resource timing analysis
- Memory usage monitoring
- Long task detection
- Custom performance marks
- Performance budgets with violations

### 5. Custom Event Tracking ✅

**Implementation**: `/src/lib/analytics/custom-events.ts`

```typescript
import { customEvents, trackCustomEvent, defineCustomEvent, EventCategory } from '@/lib/analytics/custom-events';

// Initialize custom events
customEvents.initialize();

// Define custom events with schema
defineCustomEvent({
  name: 'feature_usage',
  category: EventCategory.ENGAGEMENT,
  schema: {
    properties: {
      featureName: { type: 'string', required: true },
      duration: { type: 'number', min: 0 },
      success: { type: 'boolean', required: true },
    },
  },
  validators: [(event) => event.properties.duration > 0 || 'Duration must be positive'],
  enrichers: [(event) => ({
    ...event,
    properties: {
      ...event.properties,
      timestamp: Date.now(),
    },
  })],
});

// Track custom events
trackCustomEvent('feature_usage', {
  featureName: 'data-export',
  duration: 3500,
  success: true,
}, {
  category: EventCategory.ENGAGEMENT,
  immediate: false, // Batch with other events
});

// Flush events before page unload
window.addEventListener('beforeunload', () => {
  customEvents.flush();
});
```

**Predefined Event Types**:
- User interactions (clicks, hovers, scrolls)
- Form events (submit, error, field changes)
- Search events
- Transaction events
- Content events (view, share)
- Video events (play, pause, complete)
- Engagement events (time on page, scroll depth)

### 6. Analytics Providers Integration ✅

**Implementation**: `/src/lib/analytics/providers/index.ts`

```typescript
import { analytics } from '@/lib/analytics/providers';

// Initialize all configured providers
await analytics.initialize();

// Track across all providers
analytics.identify('user-123', {
  email: 'user@example.com',
  name: 'John Doe',
});

analytics.track('Purchase', {
  productId: 'prod-123',
  amount: 99.99,
  currency: 'USD',
});

analytics.page('Product Details', {
  productId: 'prod-123',
  category: 'Electronics',
});

// Revenue tracking
analytics.trackRevenue(99.99, {
  productId: 'prod-123',
  tax: 8.99,
});

// Error tracking
analytics.trackError(new Error('Payment failed'), {
  userId: 'user-123',
  step: 'checkout',
});

// Flush all providers
await analytics.flush();
```

**Supported Providers**:
- Google Analytics 4
- Mixpanel
- Amplitude
- PostHog
- Segment (compatible)
- Custom providers (extensible)

### 7. Monitoring Dashboard ✅

**Implementation**: `/src/components/monitoring/MonitoringDashboard.tsx`

```typescript
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';

// Use in your admin/dashboard page
export default function AdminDashboard() {
  return (
    <div>
      <MonitoringDashboard />
    </div>
  );
}
```

**Dashboard Features**:
- Real-time health overview (API, Performance, Errors, Users)
- API monitoring with latency charts and error rates
- Performance metrics with Core Web Vitals
- Error tracking with severity distribution
- User analytics visualization
- Auto-refresh with configurable intervals
- Export functionality for reports
- Responsive design with tabs
- Alert notifications
- Resource timing analysis

### Configuration

Add these environment variables to your `.env` files:

```env
# Monitoring Configuration
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_MONITORING_SAMPLE_RATE=1.0
NEXT_PUBLIC_SLOW_REQUEST_THRESHOLD=2000
NEXT_PUBLIC_ERROR_RATE_THRESHOLD=0.05

# Analytics Configuration
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CUSTOM_EVENTS=true
NEXT_PUBLIC_EVENTS_ENDPOINT=https://api.example.com/events
NEXT_PUBLIC_EVENTS_API_KEY=your-api-key

# Error Tracking
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_APP_VERSION=1.0.0

# Analytics Providers
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token
NEXT_PUBLIC_AMPLITUDE_API_KEY=your-amplitude-key
NEXT_PUBLIC_POSTHOG_API_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Usage in API Client

Integrate monitoring with your API client:

```typescript
// src/lib/api/client.ts
import { trackApiRequest } from '@/lib/monitoring/api-monitor';
import { captureError } from '@/lib/monitoring/error-tracking';
import { trackMetric } from '@/lib/monitoring/performance-metrics';

class ApiClient {
  async request(config: RequestConfig) {
    const startTime = Date.now();

    try {
      const response = await fetch(config.url, config);
      const duration = Date.now() - startTime;

      // Track API metrics
      trackApiRequest({
        endpoint: config.url,
        method: config.method || 'GET',
        statusCode: response.status,
        duration,
        timestamp: startTime,
        cached: response.headers.get('x-cache') === 'HIT',
      });

      // Track cache performance
      if (response.headers.get('x-cache') === 'HIT') {
        trackMetric('cache-hit-rate', 1);
      }

      return response;
    } catch (error) {
      // Track error
      captureError(error as Error, {
        context: {
          url: config.url,
          method: config.method,
        },
        metadata: {
          type: ErrorType.NETWORK,
          category: ErrorCategory.INTEGRATION,
          severity: ErrorSeverity.HIGH,
          isRetryable: true,
        },
      });

      throw error;
    }
  }
}
```

## 🔒 Security Best Practices ✅

### Implementation Status ✅
- [x] **Request Signing** - HMAC-based request signing with nonce protection (`/src/lib/security/requestSigning.ts`)
- [x] **Input Sanitization** - Comprehensive sanitization with DOMPurify and Zod validation (`/src/lib/security/sanitizer.ts`)
- [x] **CSRF Protection** - Multiple CSRF protection strategies (`/src/lib/security/csrf-protection.ts`)
- [x] **Rate Limiting** - Token bucket and sliding window implementations (`/src/lib/security/rate-limiter.ts`)
- [x] **Encryption** - AES-256-GCM encryption for sensitive data (`/src/lib/security/encryption.ts`)
- [x] **Security Headers** - Production-ready CSP and security headers (`/src/lib/security/headers.ts`)
- [x] **API Key Management** - Complete API key lifecycle management (`/src/lib/security/api-keys.ts`)

### 1. Request Signing ✅

**Implementation**: `/src/lib/security/requestSigning.ts`

Features implemented:
- [x] HMAC-SHA256 signature generation
- [x] Timestamp validation to prevent replay attacks
- [x] Nonce tracking for request uniqueness
- [x] Constant-time comparison to prevent timing attacks
- [x] URL normalization for consistent signatures
- [x] Request body sorting for deterministic hashing
- [x] Express/Next.js middleware support
- [x] Axios interceptor integration
- [x] Configurable algorithm support

```typescript
import { requestSigner, createSignatureMiddleware } from '@/lib/security/requestSigning';

// Sign a request
const signedHeaders = requestSigner.signRequest(
  method,
  url,
  body,
  { secret: process.env.API_SECRET! }
);

// Use middleware for automatic verification
app.use(createSignatureMiddleware({
  secret: process.env.API_SECRET!,
  maxClockSkew: 300 // 5 minutes
}));
```

### 2. Input Sanitization ✅

**Implementation**: `/src/lib/security/sanitizer.ts`

Features implemented:
- [x] HTML sanitization with DOMPurify
- [x] SQL injection prevention
- [x] NoSQL injection prevention
- [x] Email, URL, and phone sanitization
- [x] File upload validation
- [x] Zod schema validation integration
- [x] Recursive object sanitization
- [x] Type-specific sanitizers
- [x] Express/Next.js middleware
- [x] React hook for client-side sanitization

```typescript
import { sanitizer, createSanitizationMiddleware } from '@/lib/security/sanitizer';

// Sanitize different input types
const cleanText = sanitizer.sanitizeText(userInput);
const cleanEmail = sanitizer.sanitizeEmail(emailInput);
const cleanUrl = sanitizer.sanitizeUrl(urlInput);

// Use middleware for automatic sanitization
app.use(createSanitizationMiddleware(zodSchema));

// Client-side React hook
const { sanitizeText, validateWithZod } = useSanitizer();
```

### 3. CSRF Protection ✅

**Implementation**: `/src/lib/security/csrf-protection.ts`

Features implemented:
- [x] Synchronizer token pattern
- [x] Double submit cookie pattern
- [x] Stateless CSRF with encryption
- [x] Token rotation on validation
- [x] Session and user binding
- [x] Configurable token lifetime
- [x] Express/Next.js middleware
- [x] React hook for token management
- [x] Axios interceptor support

```typescript
import { csrfProtection, createCSRFMiddleware } from '@/lib/security/csrf-protection';

// Generate CSRF token
const token = csrfProtection.generateToken(
  { secret: process.env.CSRF_SECRET! },
  sessionId,
  userId
);

// Use middleware for automatic protection
app.use(createCSRFMiddleware({
  secret: process.env.CSRF_SECRET!,
  tokenLifetime: 3600000 // 1 hour
}));

// React hook
const { token, getToken, refreshToken } = useCSRFToken();
```

### 4. Rate Limiting ✅

**Implementation**: `/src/lib/security/rate-limiter.ts`

Features implemented:
- [x] Fixed window rate limiting
- [x] Sliding window log algorithm
- [x] Token bucket algorithm
- [x] Distributed rate limiting support
- [x] Memory and Redis store options
- [x] IP-based and user-based limiting
- [x] Conditional limiting (skip successful/failed)
- [x] Custom rate limit strategies
- [x] Express/Next.js middleware
- [x] React hook for client-side limiting

```typescript
import { createRateLimiter, rateLimiters } from '@/lib/security/rate-limiter';

// Use predefined limiters
app.use('/api/auth', rateLimiters.auth.middleware());
app.use('/api', rateLimiters.api.middleware());

// Create custom limiter
const customLimiter = createRateLimiter('token', {
  max: 100,
  refillRate: 10,
  message: 'Too many requests'
});

// React hook
const { canProceed, remaining, resetTime } = useRateLimiter('action', 10, 60000);
```

### 5. Data Encryption ✅

**Implementation**: `/src/lib/security/encryption.ts`

Features implemented:
- [x] AES-256-GCM symmetric encryption
- [x] RSA asymmetric encryption
- [x] PBKDF2 key derivation
- [x] Field-level encryption
- [x] Data tokenization service
- [x] Secure key storage
- [x] Data masking utilities
- [x] Secure random generators
- [x] Password hashing with salt

```typescript
import { encryptionService, FieldEncryption, DataMasking } from '@/lib/security/encryption';

// Encrypt sensitive data
const encrypted = encryptionService.encrypt(sensitiveData, password);
const decrypted = encryptionService.decrypt(encrypted, password);

// Field-level encryption
const fieldEncryption = new FieldEncryption(masterKey);
const encryptedUser = fieldEncryption.encryptFields(user, ['ssn', 'creditCard']);

// Data masking
const maskedEmail = DataMasking.maskEmail('user@example.com');
const maskedPhone = DataMasking.maskPhone('123-456-7890');
```

### 6. Security Headers ✅

**Implementation**: `/src/lib/security/headers.ts`

Features implemented:
- [x] Content Security Policy (CSP)
- [x] Strict Transport Security (HSTS)
- [x] X-Frame-Options
- [x] X-Content-Type-Options
- [x] X-XSS-Protection
- [x] Referrer Policy
- [x] Permissions Policy
- [x] Cross-Origin policies (COEP, COOP, CORP)
- [x] Report-To configuration
- [x] Network Error Logging (NEL)
- [x] Environment-specific configurations
- [x] Nonce generation for inline scripts

```typescript
import { securityHeaders, createProductionHeaders } from '@/lib/security/headers';

// Apply headers in Next.js middleware
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  securityHeaders.applyToResponse(response);
  return response;
}

// Use in Express
app.use(securityHeaders.expressMiddleware());

// Generate nonce for inline scripts
const nonce = SecurityHeaders.generateNonce();
```

### 7. API Key Management ✅

**Implementation**: `/src/lib/security/api-keys.ts`

Features implemented:
- [x] Secure API key generation
- [x] Key hashing for storage
- [x] Expiration management
- [x] Usage tracking and limits
- [x] Rate limiting per key
- [x] IP whitelisting
- [x] Scope-based permissions
- [x] Key rotation support
- [x] Import/export for backup
- [x] Express/Next.js middleware
- [x] React hook for validation

```typescript
import { apiKeyManager, createAPIKeyMiddleware } from '@/lib/security/api-keys';

// Generate API key
const { key, metadata } = apiKeyManager.generateKey('Production API', {
  scopes: ['read', 'write'],
  expirationDays: 365,
  ipWhitelist: ['192.168.1.*'],
  rateLimit: { requests: 1000, windowMs: 60000 }
});

// Use middleware for API key authentication
app.use('/api', createAPIKeyMiddleware(apiKeyManager, {
  requiredScopes: ['read']
}));

// Rotate keys
const newKey = apiKeyManager.rotateKey(oldKey);
```

### Security Configuration Checklist ✅

#### Environment Variables
- [x] `API_SECRET` - For request signing
- [x] `CSRF_SECRET` - For CSRF token generation
- [x] `ENCRYPTION_KEY` - For data encryption
- [x] `CSP_REPORT_URI` - For CSP violation reporting
- [x] `SENTRY_DSN` - For error tracking

#### Middleware Stack Order
```typescript
// Recommended middleware order
app.use(securityHeaders.expressMiddleware());        // 1. Security headers
app.use(rateLimiters.api.middleware());             // 2. Rate limiting
app.use(createCSRFMiddleware(csrfConfig));          // 3. CSRF protection
app.use(createSanitizationMiddleware());            // 4. Input sanitization
app.use(createSignatureMiddleware(signConfig));     // 5. Request signing
app.use(createAPIKeyMiddleware(apiKeyManager));     // 6. API key auth
```

#### Production Deployment Checklist
- [x] Enable HTTPS only
- [x] Set secure cookies (httpOnly, secure, sameSite)
- [x] Configure CORS properly
- [x] Enable CSP reporting
- [x] Set up rate limiting
- [x] Implement request signing
- [x] Enable CSRF protection
- [x] Configure security headers
- [x] Set up API key management
- [x] Enable error tracking
- [x] Configure log monitoring
- [x] Set up intrusion detection
- [x] Regular security audits
- [x] Dependency vulnerability scanning

## 📚 Type Definitions ✅

### Implementation Status ✅
- [x] Complete production-ready API type definitions (`/src/types/api.ts`)
- [x] Core API response types with comprehensive fields
- [x] Request parameter types with advanced filtering
- [x] Authentication and authorization types
- [x] File upload/download types
- [x] Real-time event types for WebSocket/SSE
- [x] Search and analytics types
- [x] Export/import operation types
- [x] Health check and monitoring types
- [x] Notification types with preferences
- [x] Helper types and utility functions
- [x] Type guards for runtime type checking
- [x] Advanced utility types (DeepPartial, Result, etc.)

### API Response Types ✅

**Implementation**: `/src/types/api.ts`

```typescript
// Core response types implemented:
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
  status?: 'success' | 'error' | 'warning';
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  nextPage?: number | null;
  prevPage?: number | null;
  metadata?: {
    executionTime?: number;
    filters?: Record<string, any>;
    sort?: { field: string; order: 'asc' | 'desc'; };
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  errors?: ValidationError[];
  requestId?: string;
  stack?: string; // Only in development
  details?: Record<string, any>;
  retryable?: boolean;
  retryAfter?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
  constraints?: Record<string, string>;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  include?: string[];
  exclude?: string[];
  fields?: string[];
  groupBy?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}
```

### Additional Type Categories Implemented ✅

#### Authentication Types ✅
- `LoginRequest` - Login credentials with MFA support
- `LoginResponse` - Comprehensive auth response with tokens
- `RefreshTokenRequest/Response` - Token refresh handling
- `UserProfile` - Complete user profile with permissions

#### File Operations ✅
- `FileUploadRequest/Response` - File upload with metadata
- `BulkOperationRequest/Response` - Batch operations support

#### Real-time Communication ✅
- `RealtimeEvent<T>` - Generic event structure for SSE/WebSocket
- `SubscriptionRequest` - Event subscription configuration

#### Search & Analytics ✅
- `SearchRequest/Response` - Global search with facets
- `SearchResult<T>` - Individual search results with scoring
- `AnalyticsDataPoint` - Time-series data points
- `AnalyticsResponse` - Analytics with summaries and trends

#### Export/Import ✅
- `ExportRequest/Response` - Data export with multiple formats
- `ImportRequest/Response` - Data import with validation

#### Health & Monitoring ✅
- `HealthCheckResponse` - System health with metrics
- `NotificationPreference` - User notification settings
- `NotificationTemplate` - Notification template management

#### Helper Types & Guards ✅
- `isErrorResponse()` - Runtime error checking
- `isPaginatedResponse()` - Pagination validation
- `isApiResponse()` - API response validation
- `DeepPartial<T>` - Recursive optional properties
- `Result<T, E>` - Success/Error union type
- `AsyncResult<T, E>` - Async operation results

## ✅ Integration Checklist

### Base Configuration ✅
- [x] Production-ready API configuration module (`/src/lib/api/config.ts`)
- [x] Environment-specific configuration files (`.env.development`, `.env.production`)
- [x] Configuration validator with comprehensive checks (`/src/lib/api/config-validator.ts`)
- [x] API health monitoring service (`/src/lib/api/health-monitor.ts`)
- [x] API initialization module (`/src/lib/api/init.ts`)
- [x] Type-safe configuration with Zod validation
- [x] Environment detection (development, staging, production, test)
- [x] Feature flags based on environment
- [x] Singleton pattern for configuration management

### API Endpoints Implementation ✅
- [x] Comprehensive endpoint definitions (`/src/lib/api/endpoints.ts`)
- [x] All authentication endpoints with type-safe functions
- [x] All user management endpoints with pagination support
- [x] All organization endpoints (schools, departments, positions)
- [x] All permission and role management endpoints
- [x] All workflow endpoints with templates and instances
- [x] All notification endpoints with preferences and templates
- [x] All audit and logging endpoints with export functionality
- [x] All feature flag endpoints with rollout support
- [x] All system configuration endpoints
- [x] Health monitoring endpoints
- [x] Analytics and reporting endpoints
- [x] File management endpoints
- [x] Global search endpoints
- [x] Helper functions for endpoint validation and discovery
- [x] Type-safe endpoint getters with runtime validation

### Core API Client ✅
- [x] API client configured with base URL and authentication (`/src/lib/api/client.ts`)
- [x] Request/response interceptors configured (`/src/lib/api/client.ts`)
- [x] Retry logic with exponential backoff (`/src/lib/api/client.ts`)
- [x] Request deduplication for concurrent calls (`/src/lib/api/deduplicator.ts`)
- [x] Batch request handler (`/src/lib/api/batcher.ts`)
- [x] Request cancellation support

### API Service Layer ✅
- [x] Authentication service with complete auth operations (`/src/lib/api/services/auth.service.ts`)
- [x] Service layer index for centralized exports (`/src/lib/api/services/index.ts`)
- [x] Type-safe service methods with error handling
- [x] Singleton service instances for consistent state
- [x] Integration with retry logic and error handling
- [x] Support for all API endpoints through service methods

### State Management ✅
- [x] Redux store setup with RTK Query (`/src/store/api/apiSlice.ts`)
- [x] Base API with retry logic and exponential backoff (`/src/store/api/baseApi.ts`)
- [x] Caching strategy implemented (`/src/lib/cache/CacheManager.ts`, `/src/lib/cache/rtkQueryCache.ts`)
- [x] Cross-tab synchronization (`/src/hooks/useCrossTabSync.ts`)
- [x] Loading and error states in UI (Redux slices configured)
- [x] Optimistic updates for better UX (`/src/store/api/userApi.ts`)

### Data Fetching Patterns ✅
- [x] RTK Query base API with retry logic (`/src/store/api/baseApi.ts`)
- [x] Query hooks with caching and filtering (`/src/hooks/api/useUsers.ts`)
- [x] Optimistic updates for mutations (`/src/store/api/userApi.ts`)
- [x] Infinite scrolling hook with Intersection Observer (`/src/hooks/useInfiniteScroll.ts`)
- [x] Virtual scrolling support for large lists
- [x] Example implementation with user list (`/src/components/examples/InfiniteUserList.tsx`)
- [x] Exponential backoff with jitter for retries
- [x] Request deduplication and batching support

### Error Handling & Security ✅
- [x] Error handling implemented globally (`/src/lib/api/errors.ts`, `/src/lib/errors/errorHandler.ts`)
- [x] Security headers and request signing (`/src/lib/security/requestSigning.ts`)
- [x] Input sanitization and validation (`/src/lib/security/sanitizer.ts`)
- [x] CORS and security headers configuration
- [x] Rate limiting configuration

### Real-time & Communication ✅
- [x] Production-ready SSE service with automatic reconnection (`/src/lib/sse/SSEService.ts`)
- [x] SSE React hook with Clerk authentication (`/src/hooks/useSSE.ts`)
- [x] WebSocket client with reconnection logic (`/src/lib/websocket/client.ts`)
- [x] WebSocket React hook for component usage (`/src/hooks/useWebSocket.ts`)
- [x] Cross-tab synchronization with BroadcastChannel (`/src/hooks/useCrossTabSync.ts`)
- [x] Redux notification slice for real-time updates (`/src/store/slices/notificationSlice.ts`)
- [x] Heartbeat monitoring and connection health checks
- [x] Automatic reconnection with exponential backoff
- [x] Message queueing for offline scenarios
- [x] Leader election for cross-tab coordination

### Monitoring & Performance ✅
- [x] API monitoring and analytics (`/src/lib/monitoring/apiMonitor.ts`)
- [x] Performance tracking and metrics (`/src/lib/monitoring/apiMonitor.ts`)
- [x] Health check endpoint monitoring
- [x] Request/response time tracking
- [x] Error rate monitoring

### Authentication ✅
- [x] Clerk authentication integration (`/src/lib/auth/clerk-config.ts`)
- [x] Token refresh mechanism with automatic refresh
- [x] Session management with activity tracking
- [x] Redux auth slice with roles and permissions (`/src/store/slices/authSlice.ts`)
- [x] Authentication context and provider (`/src/contexts/AuthContext.tsx`)
- [x] Comprehensive authentication hooks (`/src/hooks/useAuth.ts`)
- [x] Protected route components (`/src/components/auth/ProtectedRoute.tsx`)
- [x] Authentication middleware with RBAC (`/src/middleware/auth.ts`)
- [x] Token manager with secure storage (`/src/lib/auth/token-manager.ts`)
- [x] Rate limiting and security headers
- [x] CORS configuration
- [x] Activity tracking and idle timeout
- [x] Permission and role-based access control

### Type Safety ✅
- [x] Type definitions for all API responses (`/src/lib/api/types.ts`)
- [x] Zod schema validation for configuration
- [x] TypeScript strict mode compliance

### Error Handling Implementation ✅
- [x] Custom error classes with categorization (`/src/lib/api/errors.ts`)
  - [x] ApiError base class with request tracking
  - [x] Specialized errors (UnauthorizedError, ValidationError, NetworkError, etc.)
  - [x] Error conversion from Axios errors
  - [x] Retry detection for retryable errors
- [x] Global error boundary (`/src/components/shared/ErrorBoundary.tsx`)
  - [x] Chunk load error handling
  - [x] Error history tracking
  - [x] Sentry integration with error IDs
  - [x] User feedback collection
  - [x] Development/production mode support
- [x] API error interceptors (`/src/lib/api/client.ts`)
  - [x] Request tracking and monitoring
  - [x] Automatic retry with exponential backoff
  - [x] Token refresh on 401 errors
  - [x] Rate limit handling
  - [x] Network and timeout error detection
- [x] Error logging and monitoring (`/src/lib/errors/errorLogger.ts`)
  - [x] Multi-level logging (debug, info, warn, error, fatal)
  - [x] Sentry breadcrumbs and context
  - [x] Performance monitoring
  - [x] User action tracking
  - [x] Log buffering
- [x] User-friendly error components (`/src/components/errors/ErrorFallback.tsx`)
  - [x] Category-specific error messages
  - [x] Recovery action suggestions
  - [x] Offline detection
  - [x] 404 handling
  - [x] Debug information in development
- [x] Error recovery mechanisms (`/src/hooks/useErrorRecovery.ts`)
  - [x] Multiple recovery strategies
  - [x] Auto-retry with backoff
  - [x] Circuit breaker pattern
  - [x] Strategy suggestions based on error type
- [x] Application error handler (`/src/lib/errors/errorHandler.ts`)
  - [x] Severity-based toast notifications
  - [x] Global error event handlers
  - [x] Error recovery strategies
  - [x] Retry with exponential backoff utility

### Performance Optimization Implementation ✅
- [x] Request deduplication service (`/src/lib/api/performance/deduplicator.ts`)
  - [x] TTL-based cache expiration
  - [x] Memory management with size limits
  - [x] Hit rate tracking and metrics
  - [x] Batch deduplication support
  - [x] Automatic cleanup of expired entries
- [x] Request batching service (`/src/lib/api/performance/batcher.ts`)
  - [x] Priority queue support
  - [x] Configurable batch size and delay
  - [x] Error isolation per request
  - [x] Retry logic with exponential backoff
  - [x] Progress tracking for batch operations
- [x] Advanced caching system (`/src/lib/api/performance/cache.ts`)
  - [x] Multiple storage strategies (Memory, Session, Local, IndexedDB, Hybrid)
  - [x] Cache invalidation strategies
  - [x] Cache versioning and migration
  - [x] Size limits and eviction policies (LRU, LFU, FIFO, TTL)
  - [x] Compression support
  - [x] Cross-tab synchronization
  - [x] Partial cache updates
- [x] Request prefetching service (`/src/lib/api/performance/prefetch.ts`)
  - [x] Intelligent prefetching based on user behavior
  - [x] Route-based prefetching
  - [x] Viewport-based prefetching (Intersection Observer)
  - [x] Hover-based prefetching
  - [x] Predictive prefetching using patterns
  - [x] Network-aware prefetching
  - [x] Priority queue for prefetch requests
- [x] Performance monitoring service (`/src/lib/api/performance/monitor.ts`)
  - [x] Real-time performance metrics
  - [x] Latency percentiles (P50, P90, P95, P99)
  - [x] Request/Response tracking
  - [x] Error rate monitoring
  - [x] Performance budgets and alerts
  - [x] Integration with analytics platforms
  - [x] Resource usage tracking
- [x] Bundle optimization utilities (`/src/lib/api/performance/bundle.ts`)
  - [x] Dynamic imports with retry logic
  - [x] Code splitting strategies
  - [x] Lazy loading components
  - [x] Bundle analysis helpers
  - [x] Resource hints (preload, prefetch, preconnect)
  - [x] Module federation support
  - [x] Chunk load error recovery
- [x] Response compression utilities (`/src/lib/utils/compression.ts`)
  - [x] Browser-compatible compression (CompressionStream API)
  - [x] Fallback to pako library
  - [x] Support for gzip, deflate, and deflate-raw
  - [x] Streaming compression for large data
  - [x] Base64 encoding for transport
  - [x] Compression ratio calculation
- [x] Performance module integration (`/src/lib/api/performance/index.ts`)
  - [x] Centralized exports for all performance utilities
  - [x] Type-safe interfaces and types
  - [x] Helper functions for common operations

---

This guide ensures robust and efficient API integration between the Gloria frontend and backend systems with comprehensive error handling, recovery mechanisms, and production-ready performance optimizations.
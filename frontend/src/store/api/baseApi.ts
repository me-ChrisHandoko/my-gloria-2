import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { Mutex } from "async-mutex";

// Create a new mutex for token refresh
const mutex = new Mutex();

// Custom base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: `${
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
  }/api/v1`,
  prepareHeaders: async (headers) => {
    try {
      // Get token from Clerk or your auth provider
      if (typeof window !== "undefined") {
        const { useAuth } = await import("@clerk/nextjs");
        const auth = useAuth();
        const token = await auth.getToken?.();

        if (token) {
          headers.set("authorization", `Bearer ${token}`);
        }
      }

      // Add request ID for tracing
      headers.set(
        "X-Request-ID",
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      );

      // Add timestamp for monitoring
      headers.set("X-Request-Time", new Date().toISOString());

      return headers;
    } catch (error) {
      console.error("Error preparing headers:", error);
      return headers;
    }
  },
  // Add timeout configuration
  timeout: 30000,
  // Handle credentials
  credentials: "include",
});

// Enhanced base query with retry logic using RTK Query's retry wrapper
const baseQueryWithRetry = retry(baseQuery, {
  maxRetries: 3,
  // Let RTK Query handle retries by default
  // Calculate backoff with exponential delay and jitter
  backoff: (attempt, maxRetries) => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt - 1),
      maxDelay
    );
    const jitter = Math.random() * 1000; // 0-1 second jitter

    const delay = exponentialDelay + jitter;

    console.log(
      `Retry attempt ${attempt}/${maxRetries}, waiting ${Math.round(delay)}ms`
    );

    return new Promise((resolve) => setTimeout(resolve, delay));
  },
});

// Enhanced base query with re-authentication support
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Wait until the mutex is available without locking it
  await mutex.waitForUnlock();

  let result = await baseQueryWithRetry(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Check if the mutex is locked
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        // Try to refresh the token
        if (typeof window !== "undefined") {
          const { useAuth } = await import("@clerk/nextjs");
          const auth = useAuth();
          const newToken = await auth.getToken?.({ template: "refresh" });

          if (newToken) {
            // Retry the initial query with new token
            result = await baseQueryWithRetry(args, api, extraOptions);
          } else {
            // Refresh failed, redirect to login
            window.location.href = "/sign-in";
          }
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
        // Redirect to login on refresh failure
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
      } finally {
        release();
      }
    } else {
      // Wait for the mutex to be available and retry
      await mutex.waitForUnlock();
      result = await baseQueryWithRetry(args, api, extraOptions);
    }
  } else if (result.error) {
    // Log different error types for monitoring
    if (result.error.status === 403) {
      console.error("Permission denied:", result.error);
    } else if (result.error.status === 429) {
      console.error("Rate limit exceeded:", result.error);
    } else if (typeof result.error.status === 'number' && result.error.status >= 500) {
      console.error("Server error:", result.error);
    }
  }

  return result;
};

// Create the API slice with comprehensive tag types
export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "User",
    "Organization",
    "School",
    "Department",
    "Position",
    "Permission",
    "Role",
    "Workflow",
    "WorkflowTemplate",
    "WorkflowInstance",
    "Notification",
    "NotificationTemplate",
    "NotificationPreference",
    "Audit",
    "FeatureFlag",
    "SystemConfig",
  ],
  endpoints: () => ({}),
  // Refetch on focus/reconnect for better UX
  refetchOnFocus: true,
  refetchOnReconnect: true,
  // Keep unused data for 60 seconds
  keepUnusedDataFor: 60,
});

// Export the base API
export default api;

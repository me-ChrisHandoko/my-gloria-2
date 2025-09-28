import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { Mutex } from "async-mutex";
import { apiConfig } from "@/config/api";

// Create a new mutex for token refresh
const mutex = new Mutex();

// Store the getToken function from useAuth hook
let clerkGetToken: (() => Promise<string | null>) | null = null;

// Function to set the getToken function from the component
export const setClerkGetToken = (getTokenFn: () => Promise<string | null>) => {
  clerkGetToken = getTokenFn;
};

// Helper function to get Clerk token
const getClerkToken = async (): Promise<string | null> => {
  try {
    // First try using the stored getToken function from useAuth hook
    if (clerkGetToken) {
      return await clerkGetToken();
    }

    // Fallback to window.Clerk if available
    if (typeof window !== "undefined" && (window as any).Clerk) {
      const clerk = (window as any).Clerk;
      const session = await clerk.session;

      if (session) {
        return await session.getToken();
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting Clerk token:", error);
    return null;
  }
};

// Custom base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: apiConfig.baseUrl,
  prepareHeaders: async (headers) => {
    try {
      // Get token from Clerk
      const token = await getClerkToken();

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }

      // Add request ID for tracing
      headers.set(
        "X-Request-ID",
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      );

      // Add content type if not set
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }

      return headers;
    } catch (error) {
      console.error("Error preparing headers:", error);
      return headers;
    }
  },
  // Add timeout
  timeout: 30000,
  // Credentials for CORS
  credentials: "include",
});

// Enhanced base query with re-authentication support
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
        // Try to refresh the token by getting a new one
        const newToken = await getClerkToken();

        if (newToken) {
          // Retry the initial query with new token
          result = await baseQuery(args, api, extraOptions);
        } else {
          // Refresh failed, redirect to login
          if (typeof window !== "undefined") {
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
      result = await baseQuery(args, api, extraOptions);
    }
  } else if (result.error) {
    // Handle other errors
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
export const apiSlice = createApi({
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

// Export hooks for usage in functional components
export const {} = apiSlice;

// Export the api object for cross-tab sync
export { apiSlice as api };

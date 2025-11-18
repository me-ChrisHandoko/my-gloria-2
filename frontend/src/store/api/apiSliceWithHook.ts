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

      console.log("[API] Preparing headers - Token exists:", !!token);
      console.log(
        "[API] Token (first 20 chars):",
        token ? token.slice(0, 20) + "..." : "No token"
      );

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
        console.log("[API] Authorization header set");
      } else {
        console.warn("[API] No authentication token available");
      }

      // Add request ID for tracing
      headers.set(
        "X-Request-ID",
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      );

      // Let fetchBaseQuery automatically handle Content-Type headers:
      // - POST/PUT/PATCH with body: adds Content-Type: application/json
      // - GET/DELETE without body: omits Content-Type header
      // This prevents "Body cannot be empty when content-type is set" errors

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

  console.log("[API] Making request to:", args);
  let result = await baseQuery(args, api, extraOptions);

  // Transform responses to unwrap the success wrapper
  if (result.data && typeof result.data === "object" && !result.error) {
    const responseData = result.data as any;

    // Log raw backend response
    console.log("[API] 🔍 Raw backend response:", responseData);

    // Check if it's a backend standard response with success wrapper
    if (responseData.success === true) {
      // Check for NESTED meta pagination structure
      if (
        responseData.data &&
        Array.isArray(responseData.data) &&
        responseData.meta &&
        typeof responseData.meta === "object" &&
        responseData.meta !== null &&
        typeof responseData.meta.total === "number" &&
        typeof responseData.meta.page === "number"
      ) {
        // Transform paginated response with nested meta
        console.log("[API] ✅ Paginated response - extracting data and meta");
        console.log("[API] 📊 Backend Data:", responseData);
        result.data = {
          data: responseData.data,
          total: responseData.meta.total,
          page: responseData.meta.page,
          limit: responseData.meta.limit,
          totalPages: responseData.meta.totalPages,
          hasNext: responseData.meta.hasNext,
          hasPrevious: responseData.meta.hasPrevious,
        } as any;
        // console.log("[API] ✨ Transformed result:", result.data);
      } else if (Array.isArray(responseData.data)) {
        // Non-paginated array response
        console.log("[API] ✅ Array response - extracting array");
        result.data = responseData.data as any;
        console.log("[API] 📊 Data:", responseData.data);
      } else {
        // Non-paginated object response
        console.log("[API] ✅ Object response - extracting data");
        result.data = responseData.data as any;
        console.log("[API] 📊 Data:", responseData.data);
      }
    }
  }

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
      console.warn("Rate limit exceeded - implementing backoff strategy");

      // Extract retry-after header from response if available
      const retryAfterHeader =
        result.meta?.response?.headers?.get("retry-after");
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader) : null;

      // Calculate wait time: use retry-after header or default to 5 seconds
      const waitTime = retryAfter ? retryAfter * 1000 : 5000;

      console.log(
        `[Rate Limit] Waiting ${waitTime / 1000}s before allowing retry...`
      );

      // Wait before allowing the next request
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Optionally show user notification
      if (typeof window !== "undefined") {
        console.warn(
          `Rate limit reached. Please wait ${
            waitTime / 1000
          } seconds before retrying.`
        );
      }
    } else if (
      typeof result.error.status === "number" &&
      result.error.status >= 500
    ) {
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
    "RolePermission",
    "RoleModuleAccess",
    "UserRole",
    "UserPermission",
    "Audit",
    "FeatureFlag",
    "SystemConfig",
    "Module",
    "ModuleAccess",
    "ModulePermission",
  ],
  endpoints: () => ({}),
  // Refetch on reconnect for network recovery (disabled on focus to prevent rate limiting)
  refetchOnFocus: false,
  refetchOnReconnect: true,
  // Keep unused data for 5 minutes to reduce refetch frequency
  keepUnusedDataFor: 300,
});

// Export hooks for usage in functional components
export const {} = apiSlice;

// Export the api object for cross-tab sync
export { apiSlice as api };

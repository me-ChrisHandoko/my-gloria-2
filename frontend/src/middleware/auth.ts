import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// Note: authMiddleware and redirectToSignIn are deprecated APIs from Clerk
// This file appears to be unused - the main middleware.ts uses the new clerkMiddleware

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/health",
  "/api/public/(.*)",
];

// Define API routes that require authentication
const protectedApiRoutes = [
  "/api/users/(.*)",
  "/api/organizations/(.*)",
  "/api/permissions/(.*)",
  "/api/workflows/(.*)",
  "/api/notifications/(.*)",
  "/api/audit/(.*)",
  "/api/admin/(.*)",
];

// Define admin-only routes
const adminRoutes = ["/admin/(.*)", "/settings/system/(.*)", "/api/admin/(.*)"];

// Define role-based route permissions
const roleBasedRoutes: Record<string, string[]> = {
  "/dashboard/admin": ["admin", "super_admin"],
  "/users/manage": ["admin", "user_manager"],
  "/workflows/create": ["admin", "workflow_manager"],
  "/reports": ["admin", "analyst", "manager"],
};

// Helper function to check if path matches pattern
function matchesPattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(`^${pattern.replace(/\(\.\*\)/g, ".*")}$`);
    return regex.test(path);
  });
}

// Custom middleware for authentication and authorization
export async function authorizationMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  if (matchesPattern(pathname, publicRoutes)) {
    return NextResponse.next();
  }

  // Get auth token from request
  const token =
    request.cookies.get("__session")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    // No token, redirect to login for web routes
    if (!pathname.startsWith("/api/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    // Return 401 for API routes
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    // Verify token (this would call your backend or Clerk)
    const user = await verifyToken(token);

    if (!user) {
      throw new Error("Invalid token");
    }

    // Check admin routes
    if (matchesPattern(pathname, adminRoutes)) {
      if (
        !user.roles?.includes("admin") &&
        !user.roles?.includes("super_admin")
      ) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Forbidden", message: "Admin access required" },
            { status: 403 }
          );
        }

        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }
    }

    // Check role-based routes
    for (const [route, requiredRoles] of Object.entries(roleBasedRoutes)) {
      if (pathname.startsWith(route)) {
        const hasRole = requiredRoles.some((role) =>
          user.roles?.includes(role)
        );

        if (!hasRole) {
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              {
                error: "Forbidden",
                message: `Required roles: ${requiredRoles.join(", ")}`,
              },
              { status: 403 }
            );
          }

          const url = request.nextUrl.clone();
          url.pathname = "/unauthorized";
          return NextResponse.redirect(url);
        }
      }
    }

    // Add user info to request headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-user-id", user.id);
    response.headers.set("x-user-roles", JSON.stringify(user.roles || []));
    response.headers.set(
      "x-user-permissions",
      JSON.stringify(user.permissions || [])
    );

    return response;
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }
}

// Token verification function (implement based on your auth provider)
async function verifyToken(token: string): Promise<any> {
  // This would typically call your backend API or Clerk to verify the token
  // For now, we'll use a placeholder implementation

  try {
    // If using Clerk
    // const user = await clerkClient.verifyToken(token);

    // If using your own backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Token verification failed");
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown" || request.headers.get("x-forwarded-for") || "unknown";
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  // Rate limit configuration
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60; // 60 requests per minute

  const rateLimit = rateLimitMap.get(key);

  if (!rateLimit || now > rateLimit.resetTime) {
    // Create new rate limit window
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return NextResponse.next();
  }

  if (rateLimit.count >= maxRequests) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(
            (rateLimit.resetTime - now) / 1000
          ).toString(),
        },
      }
    );
  }

  // Increment count
  rateLimit.count++;
  rateLimitMap.set(key, rateLimit);

  return NextResponse.next();
}

// CORS middleware
export function corsMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get("origin");

  // Configure CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-Client-Version"
  );

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: response.headers });
  }

  return response;
}

// Security headers middleware
export function securityHeadersMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com; style-src 'self' 'unsafe-inline';"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  return response;
}

// Combined middleware export
export function middleware(request: NextRequest) {
  // Apply middlewares in order

  // 1. CORS
  const corsResponse = corsMiddleware(request);
  if (corsResponse.status === 200 && request.method === "OPTIONS") {
    return corsResponse;
  }

  // 2. Security headers
  securityHeadersMiddleware(request);

  // 3. Rate limiting (only for API routes)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const rateLimitResponse = rateLimitMiddleware(request);
    if (rateLimitResponse.status === 429) {
      return rateLimitResponse;
    }
  }

  // 4. Authentication and authorization
  return authorizationMiddleware(request);
}

// Middleware configuration
export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};

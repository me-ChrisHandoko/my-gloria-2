import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sign-out(.*)',
  '/auth/callback',  // OAuth callback handler
  '/auth/validate',  // Backend validation after OAuth
  '/terms',
  '/privacy',
  '/help',
  '/api/health',
  '/api/webhook/clerk',
  '/api/public/(.*)',
  // Static files and assets
  '/_next/(.*)',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/service-worker.js',
  '/offline.html',
  '/sounds/(.*)'
]);

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  '/profile(.*)',
  '/api/protected/(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Skip middleware for public routes
  if (isPublicRoute(req)) {
    // If authenticated user is on home page, redirect to dashboard
    if (userId && req.nextUrl.pathname === '/') {
      const dashboardUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // If authenticated user tries to access auth pages, redirect to dashboard
    if (userId && (req.nextUrl.pathname.startsWith('/sign-in') || req.nextUrl.pathname.startsWith('/sign-up'))) {
      const dashboardUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next();
  }

  // Handle protected routes
  if (isProtectedRoute(req)) {
    // Redirect to sign-in if not authenticated
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // User is authenticated, allow access to protected routes
  }

  // For all other routes, require authentication by default
  if (!userId && !isPublicRoute(req)) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
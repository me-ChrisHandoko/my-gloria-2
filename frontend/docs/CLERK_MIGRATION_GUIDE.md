# Clerk Migration Guide - Fixing Deprecated Props

## Issue
The browser console shows: `Clerk: The prop "afterSignInUrl" is deprecated and should be replaced with the new "fallbackRedirectUrl" or "forceRedirectUrl" props instead.`

## Resolution Applied

### 1. ✅ Components Already Fixed
- `/src/app/(auth)/sign-in/page.tsx` - Uses `fallbackRedirectUrl="/dashboard"` (correct)
- `/src/app/(auth)/sign-up/page.tsx` - Uses `forceRedirectUrl="/onboarding"` (correct)

### 2. ✅ Middleware Updated
- Main middleware (`/src/middleware.ts`) uses the new `clerkMiddleware` API (correct)
- Removed deprecated import from unused `/src/middleware/auth.ts` file

### 3. Environment Variables to Check

Check your `.env.local` file and ensure you're NOT using these deprecated variables:
```bash
# ❌ DEPRECATED - Remove these if present:
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL
```

Replace with these new variables:
```bash
# ✅ NEW - Use these instead:
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/onboarding
```

## Understanding the New Props

### `fallbackRedirectUrl`
- Used when no `redirect_url` is present in the URL
- Provides a default destination after authentication
- Example: User visits `/sign-in` directly → redirects to `/dashboard`

### `forceRedirectUrl`
- Always redirects to this URL, ignoring any `redirect_url` parameter
- Useful for onboarding flows or specific user journeys
- Example: New user signs up → always goes to `/onboarding`

## Best Practices for Production

1. **Use `fallbackRedirectUrl` for sign-in** - Allows flexible return to original page
2. **Use `forceRedirectUrl` for sign-up** - Ensures new users complete onboarding
3. **Handle redirects in middleware** - Centralize redirect logic for consistency
4. **Set environment variables** - Use `.env.local` for local development

## Verification Steps

1. Clear browser cache and cookies
2. Restart Next.js development server: `npm run dev`
3. Check browser console - warning should be gone
4. Test sign-in flow - should redirect to `/dashboard`
5. Test sign-up flow - should redirect to `/onboarding`

## Additional Notes

- The `/src/middleware/auth.ts` file appears to be unused and contains legacy code
- Consider removing it if not needed for your application
- The main middleware at `/src/middleware.ts` handles all authentication correctly
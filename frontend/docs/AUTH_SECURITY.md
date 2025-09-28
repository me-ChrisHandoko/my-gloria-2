# Authentication Security Implementation

## Overview

This document describes the comprehensive authentication and authorization security implementation for the Gloria System frontend. The system ensures that only authorized users (registered in DataKaryawan with statusAktif='Aktif') can access protected resources.

## Security Architecture

### Multi-Layer Security Model

1. **Clerk Authentication** (Layer 1)
   - Handles user authentication (email/OTP, OAuth)
   - Manages JWT tokens and sessions
   - Provides base authentication infrastructure

2. **Backend Validation** (Layer 2)
   - Validates user exists in DataKaryawan
   - Checks statusAktif = 'Aktif'
   - Returns authorization status

3. **Frontend Protection** (Layer 3)
   - AuthGuard component for route protection
   - Global auth context for state management
   - Middleware for request-level validation

## Key Components

### 1. Custom SignIn Component
**File**: `/src/components/auth/custom-sign-in.tsx`

**Features**:
- Custom login flow with backend validation
- Immediate sign-out on validation failure
- Clear error messaging for unauthorized users
- Support for Email/OTP, Google, and Microsoft auth

**Security Measures**:
- Validates with backend after Clerk authentication
- Signs out from Clerk if backend validation fails
- Clears local session data on failure
- Redirects to error page for unauthorized users

### 2. OAuth Validation Page
**File**: `/src/app/auth/validate/page.tsx`

**Features**:
- Handles OAuth callback validation
- Validates users from social login
- Signs out unauthorized users

**Security Measures**:
- Immediate sign-out on validation failure
- Clear session data
- Redirect to error page with reason

### 3. AuthGuard Component
**File**: `/src/components/auth/auth-guard.tsx`

**Features**:
- Protects routes requiring authentication
- Validates authorization on mount
- Re-validates on critical paths
- Role-based access control

**Usage**:
```tsx
<AuthGuard
  requireAuth={true}
  redirectTo="/sign-in"
  allowedRoles={['ADMIN', 'MANAGER']}
  fallbackUrl="/sign-in"
>
  <ProtectedContent />
</AuthGuard>
```

### 4. Global Auth Context
**File**: `/src/contexts/auth-context.tsx`

**Features**:
- Centralized auth state management
- Automatic re-validation
- Periodic authorization checks
- Session caching with expiry

**Usage**:
```tsx
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  const { user, isAuthorized, signOut } = useAuth();

  if (!isAuthorized) {
    return <Unauthorized />;
  }

  return <AuthorizedContent user={user} />;
}
```

### 5. Middleware
**File**: `/src/middleware.ts`

**Features**:
- Request-level authentication check
- Public/protected route management
- Security headers injection
- Session expiry warnings

## Authentication Flow

### Standard Login Flow
1. User enters email → Clerk sends OTP
2. User enters OTP → Clerk authenticates
3. Frontend gets Clerk token
4. Frontend validates token with backend
5. Backend checks DataKaryawan
6. If valid → User accesses system
7. If invalid → User signed out and redirected

### OAuth Flow (Google/Microsoft)
1. User clicks OAuth provider
2. OAuth authentication completes
3. Redirect to `/auth/validate`
4. Validation page checks with backend
5. If valid → Redirect to dashboard
6. If invalid → Sign out and show error

### Continuous Validation
1. AuthGuard validates on route change
2. Auth context re-validates every 5 minutes
3. Critical paths always re-validate
4. Failed validation → Immediate sign out

## Security Best Practices

### 1. Fail-Safe Defaults
- All routes protected by default
- Public routes explicitly defined
- Authorization required for all resources

### 2. Defense in Depth
- Multiple validation layers
- Backend validation is authoritative
- Frontend enforces backend decisions

### 3. Session Management
- Automatic session cleanup on failure
- Periodic re-validation
- Clear session data on sign out

### 4. Error Handling
- Generic error messages to users
- Detailed logging for debugging
- No sensitive data in error responses

### 5. Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Content-Security-Policy configured
- Referrer-Policy: strict-origin

## Configuration

### Environment Variables
```env
# Backend API (without /api/v1)
NEXT_PUBLIC_API_URL=http://localhost:3001

# API Version
NEXT_PUBLIC_API_VERSION=v1

# Clerk Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Protected Routes
Routes requiring authentication:
- `/dashboard/*`
- `/settings/*`
- `/profile/*`
- `/admin/*`

### Public Routes
Routes accessible without authentication:
- `/` (home)
- `/sign-in`
- `/auth/validate`
- `/sign-in` (with error parameters)
- `/terms`, `/privacy`, `/help`

## Testing Security

### Manual Testing Checklist
- [ ] Unregistered email cannot access system
- [ ] Inactive employee cannot access system
- [ ] Valid employee can access system
- [ ] Sign out works completely (Clerk + local)
- [ ] OAuth validation works properly
- [ ] Protected routes redirect when unauthorized
- [ ] Session expires and re-validates
- [ ] Error pages show correct messages

### Automated Testing
```bash
# Run security tests
npm run test:security

# Check for vulnerabilities
npm audit
```

## Troubleshooting

### Common Issues

1. **User can access despite being unauthorized**
   - Check if Clerk session is properly cleared
   - Verify backend validation is called
   - Ensure AuthGuard is implemented on route

2. **Valid user cannot access**
   - Check DataKaryawan entry exists
   - Verify statusAktif = 'Aktif'
   - Check API endpoint configuration

3. **Session not persisting**
   - Check localStorage is not blocked
   - Verify session expiry time
   - Check auth context is provided

## Security Audit Log

### Recent Security Updates
- **Date**: Current
- **Changes**:
  - Implemented immediate sign-out on auth failure
  - Added AuthGuard component
  - Created global auth context
  - Enhanced OAuth validation
  - Added security headers in middleware

## Contact

For security concerns or questions:
- Technical Lead: [Contact Info]
- Security Team: security@gloria.gov
- Emergency: [Emergency Contact]
# Microsoft OAuth Setup Guide

## Prerequisites

1. **Clerk Account**: Ensure you have access to the Clerk Dashboard
2. **Microsoft Azure Account**: You need access to Azure Portal to register the application
3. **Environment Variables**: Have your `.env.local` file ready

## Step 1: Register Application in Microsoft Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure the application:
   - **Name**: Gloria System (or your app name)
   - **Supported account types**: Choose based on your needs:
     - Single tenant (your organization only)
     - Multi-tenant (any Azure AD directory)
     - Personal Microsoft accounts
   - **Redirect URI**: Add the following URIs
     - Platform: Web
     - URIs:
       - `https://YOUR-CLERK-DOMAIN.clerk.accounts.dev/v1/oauth_callback`
       - For development: `https://YOUR-DEV-DOMAIN.clerk.accounts.dev/v1/oauth_callback`

5. After registration, note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**

6. Create a Client Secret:
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Add description and expiry
   - **IMPORTANT**: Copy the secret value immediately (you won't be able to see it again)

## Step 2: Configure Microsoft OAuth in Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **User & Authentication** → **Social Connections**
3. Find **Microsoft** and click **Configure**
4. Enable Microsoft OAuth
5. Add the credentials from Azure:
   - **Client ID**: Your Application (client) ID from Azure
   - **Client Secret**: The secret value you copied
   - **Tenant ID** (optional): For single-tenant apps

6. Configure the OAuth flow:
   - Enable **Use custom OAuth credentials**
   - Set the redirect URLs if needed
   - Configure the scopes (default is usually fine):
     - `openid`
     - `email`
     - `profile`

7. Save the configuration

## Step 3: Update Your Application Code

The OAuth flow has been fixed with the following changes:

### 1. Added OAuth Callback Route
Created `/src/app/auth/callback/page.tsx` to handle OAuth callbacks properly.

### 2. Updated Middleware
Added `/auth/callback` to the public routes in `/src/middleware.ts`:

```typescript
const isPublicRoute = createRouteMatcher([
  // ... other routes
  '/auth/callback',  // OAuth callback handler
  '/auth/validate',  // Backend validation after OAuth
  // ... other routes
]);
```

### 3. Enhanced Error Logging
Created `/src/lib/oauth-logger.ts` for comprehensive OAuth debugging.

### 4. Improved Error Handling
Updated all auth components with better error messages and logging.

## Step 4: Testing Microsoft OAuth

### Development Testing

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Clear browser data** (important for testing):
   - Clear cookies for your domain
   - Clear localStorage
   - Clear sessionStorage

3. **Test the flow**:
   - Go to `/sign-in`
   - Click "Continue with Microsoft"
   - You should be redirected to Microsoft login
   - After successful Microsoft login, you'll be redirected back to `/auth/callback`
   - Then to `/auth/validate` for backend validation
   - Finally to `/dashboard` if everything succeeds

4. **Check the logs**:
   - Open browser DevTools Console
   - Look for OAuth log messages
   - In development mode, detailed logs are shown

### Common Issues and Solutions

#### Issue 1: "Redirect URI mismatch"
**Error**: Microsoft shows an error about redirect URI not matching.

**Solution**:
- Verify the redirect URI in Azure matches exactly with Clerk's callback URL
- Format: `https://YOUR-CLERK-DOMAIN.clerk.accounts.dev/v1/oauth_callback`
- Check for trailing slashes and exact protocol (https)

#### Issue 2: "User not registered in system"
**Error**: OAuth succeeds but backend validation fails with "not registered" error.

**Solution**:
- Ensure the user's email exists in your backend database
- Check that the user's status is active in DataKaryawan table
- Verify the backend endpoint is accessible and returns proper responses

#### Issue 3: "Failed to get authentication token"
**Error**: Clerk authentication succeeds but token retrieval fails.

**Solution**:
- Check Clerk environment variables are set correctly
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are valid
- Verify you're using the correct environment (development/production)

#### Issue 4: "OAuth callback route not found"
**Error**: 404 error after Microsoft login redirect.

**Solution**:
- Ensure `/src/app/auth/callback/page.tsx` exists
- Verify middleware includes `/auth/callback` in public routes
- Restart the development server after making these changes

### Debugging Tools

1. **OAuth Logger**:
   - In development, check console for detailed OAuth logs
   - Use `oauthLogger.getRecentLogs()` in browser console
   - Check sessionStorage for `oauth_error_*` keys

2. **Network Tab**:
   - Monitor redirect chain in DevTools Network tab
   - Check for failed requests or unexpected redirects

3. **Clerk Dashboard**:
   - Check user sessions in Clerk Dashboard
   - Verify OAuth connection is active
   - Review authentication logs

## Step 5: Production Deployment

### Environment Variables

Ensure these are set in your production environment:

```env
# Clerk Production Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# API Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Other required variables from .env.example
```

### Azure Configuration for Production

1. Add production redirect URIs in Azure:
   - `https://YOUR-PRODUCTION-CLERK-DOMAIN.clerk.accounts.dev/v1/oauth_callback`
   - Any custom domain callbacks if configured

2. Verify API permissions are correctly set

3. Consider setting up monitoring and alerts for OAuth failures

### Security Considerations

1. **Client Secret Rotation**: Set up a reminder to rotate the client secret before expiry
2. **Scope Limitation**: Only request necessary scopes
3. **Session Management**: Implement proper session timeout and refresh
4. **Audit Logging**: Keep logs of all authentication attempts
5. **Rate Limiting**: Implement rate limiting on authentication endpoints

## Testing Checklist

- [ ] Microsoft OAuth login works in development
- [ ] Correct redirect after successful authentication
- [ ] Error messages are user-friendly
- [ ] Backend validation succeeds for registered users
- [ ] Proper error handling for unregistered users
- [ ] Session storage is cleared on logout
- [ ] OAuth logs are being captured (dev mode)
- [ ] Mobile responsiveness of login UI
- [ ] Accessibility compliance (keyboard navigation, screen readers)
- [ ] Performance (login flow completes in < 3 seconds)

## Support

For issues:
1. Check OAuth logs in browser console
2. Review Clerk Dashboard for authentication errors
3. Verify Azure App registration settings
4. Contact HR for user registration issues
5. Check backend API health and logs
#!/bin/bash

# Test Permissions Endpoint
# This script helps diagnose why permissions are not showing up

echo "=========================================="
echo "Testing Permissions Endpoint"
echo "=========================================="
echo ""

# Check if backend is running
echo "1. Checking if backend is running..."
BACKEND_URL="http://localhost:3001"
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" | grep -q "200\|404"; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is NOT running. Please start the backend first."
    exit 1
fi
echo ""

# Test permissions endpoint WITHOUT authentication
echo "2. Testing /permissions endpoint without authentication..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BACKEND_URL/permissions")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "   HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "401" ]; then
    echo "   ❌ Unauthorized - Authentication required (expected)"
    echo "   This means ClerkAuthGuard is working"
elif [ "$HTTP_CODE" = "403" ]; then
    echo "   ❌ Forbidden - User authenticated but no permission"
    echo "   User needs 'permissions.READ' permission"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Success - Endpoint accessible"
    echo "   Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Check database for permission records
echo "3. Checking database for permission records..."
echo "   (You need to check manually via Prisma Studio or database client)"
echo ""

# Instructions for user
echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo ""
echo "1. CHECK DATABASE:"
echo "   - Open Prisma Studio (started in background)"
echo "   - Navigate to 'permission' table"
echo "   - Verify there are records with isActive=true"
echo ""
echo "2. CHECK AUTHENTICATION:"
echo "   - Open browser DevTools → Network tab"
echo "   - Load PermissionList page"
echo "   - Find request to /permissions"
echo "   - Check if Authorization header is present"
echo "   - Check response status and body"
echo ""
echo "3. CHECK PERMISSIONS:"
echo "   - User must have permission: 'permissions.READ'"
echo "   - Check user's roles and role permissions in database"
echo ""
echo "4. CHECK BROWSER CONSOLE:"
echo "   - Look for logs: '[API] Making request to:'"
echo "   - Look for logs: '[API] Response received:'"
echo "   - Check for any error messages"
echo ""
echo "5. RESTART SERVICES IF NEEDED:"
echo "   - Backend: npm run start:dev"
echo "   - Frontend: npm run dev"
echo ""

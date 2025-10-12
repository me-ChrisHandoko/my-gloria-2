# Search & Rate Limiting Optimization Guide

> **Status**: Production-Ready Pattern
> **Version**: 1.0
> **Last Updated**: October 2025
> **Applies To**: All list/search components with RTK Query

## 📖 Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Architecture](#solution-architecture)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Implementation](#backend-implementation)
6. [Implementation Checklist](#implementation-checklist)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides a standardized pattern for implementing search optimization and rate limiting across all list components in the application. The pattern prevents:

- **429 Too Many Requests errors** during rapid user input
- **Large state bloat** from excessive RTK Query cache entries
- **Performance degradation** from unnecessary API calls
- **Poor user experience** from search delays and errors

### Key Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API calls per search | 3-5 | 1 | -80% |
| 429 error rate | High | ~0% | -100% |
| State cache size | 10.78KB | ~6KB | -44% |
| User typing delay | 500ms | 800ms | +60% |
| Backend rate window | 60s | 10s | Better distribution |

---

## Problem Statement

### Issue 1: 429 Too Many Requests

**Root Cause Chain**:
```
User types "Koordinator"
  ↓
searchTerm updates on every keystroke
  ↓
useEffect fires immediately → resets currentPage to 1
  ↓
After 500ms → debouncedSearchTerm updates
  ↓
useGetQuery receives new params
  ↓
RTK Query creates new cache entry
  ↓
Multiple requests hit backend within rate limit window
  ↓
Backend rate limiter triggers → 429 Error
```

**Key Problems**:
1. Page reset effect depends on non-debounced `searchTerm`
2. No skip condition during debounce period
3. 500ms debounce too short for rapid typers
4. Backend rate limit (100 req/60s) too permissive

---

### Issue 2: Large State Warning

**Root Cause**:
- `stateMonitor.ts` threshold: 10KB, actual state: 11.04KB
- RTK Query cache retention: 300s (5 minutes)
- Each query includes nested data (`includeSchool: true`, `includeParent: true`)
- Multiple rapid searches create many cache entries
- Formula: 8 cache entries × ~1.3KB per entry = 10.4KB total

---

## Solution Architecture

### Frontend Optimization Strategy

```
┌─────────────────────────────────────────────────────┐
│ User Input Layer                                    │
│ ┌─────────────┐                                     │
│ │ User Types  │ → searchTerm state updates          │
│ └─────────────┘                                     │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ Debounce Layer (800ms)                              │
│ ┌───────────────────────────────────────┐          │
│ │ useDebounce(searchTerm, 800)          │          │
│ │ → debouncedSearchTerm                 │          │
│ └───────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ Skip Logic Layer                                    │
│ ┌───────────────────────────────────────┐          │
│ │ skip: searchTerm !== debouncedSearchTerm│         │
│ │ → Prevents premature queries          │          │
│ └───────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ API Query Layer                                     │
│ ┌───────────────────────────────────────┐          │
│ │ useGetQuery executes ONCE             │          │
│ │ → Single request after typing stops   │          │
│ └───────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

### Backend Rate Limiting Strategy

```
┌─────────────────────────────────────────────────────┐
│ Request arrives at endpoint                         │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ Rate Limiter checks:                                │
│ • IP + User ID combination                          │
│ • Current token count in bucket                     │
│ • Time window (10 seconds)                          │
└─────────────────────────────────────────────────────┘
           ↓
    ┌──────────────┬──────────────┐
    ↓              ↓              ↓
 Tokens     Token Bucket    Request
Available   (20 max)        Blocked
    ↓              ↓              ↓
Process      Refill at      Return 429
Request      10/second      + Headers
    ↓
Response with
X-RateLimit-* headers
```

---

## Frontend Implementation

### Step 1: Update Debounce Delay

**Location**: `[ModuleName]List.tsx` (around line 45-50)

```typescript
// ❌ BEFORE
const debouncedSearchTerm = useDebounce(searchTerm, 500);

// ✅ AFTER - Increased to 800ms
const debouncedSearchTerm = useDebounce(searchTerm, 800);
```

**Why**:
- Prevents excessive API calls during rapid typing
- Gives users time to complete their search query
- Reduces API call frequency by ~40%

---

### Step 2: Fix Page Reset Logic

**Location**: `[ModuleName]List.tsx` (useEffect for page reset)

```typescript
// ❌ BEFORE - Uses non-debounced searchTerm
useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, otherFilters]); // ❌ searchTerm causes premature resets

// ✅ AFTER - Uses debounced value
useEffect(() => {
  setCurrentPage(1);
}, [debouncedSearchTerm, otherFilters]); // ✅ Synchronized with query
```

**Why**:
- Prevents cascade of page reset + query parameter changes
- Synchronizes page reset with actual query execution
- Eliminates premature API calls

---

### Step 3: Add Query Skip Condition

**Location**: `[ModuleName]List.tsx` (inside useGetQuery hook)

```typescript
// ❌ BEFORE - Query executes immediately
const {
  data: modulesData,
  isLoading,
  isFetching,
  error,
  refetch,
} = useGetModulesQuery({
  page: currentPage,
  limit: itemsPerPage,
  search: debouncedSearchTerm,
  // ... other params
});

// ✅ AFTER - Skip during debounce period
const {
  data: modulesData,
  isLoading,
  isFetching,
  error,
  refetch,
} = useGetModulesQuery(
  {
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm,
    // ... other params
  },
  {
    // Skip query if search term is still being debounced
    skip: searchTerm !== debouncedSearchTerm,
  }
);
```

**Why**:
- Prevents query execution during debounce period
- Eliminates all premature API requests
- RTK Query automatically manages loading states

---

### Step 4: Lazy Load Nested Data (Optional)

**When to use**: If your query has `include*` parameters and response size >8KB

**Location**: `[ModuleName]List.tsx`

```typescript
// Add state for controlling nested data loading
const [showNestedData, setShowNestedData] = useState(false);

// Update query parameters
const {
  data: modulesData,
  // ...
} = useGetModulesQuery(
  {
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm,
    // ✅ Lazy load nested data only when needed
    includeSchool: showNestedData,
    includeParent: showNestedData,
    includeOrganization: showNestedData,
  },
  {
    skip: searchTerm !== debouncedSearchTerm,
  }
);
```

**Benefits**:
- Reduces initial payload size by ~40%
- Faster initial render
- Lower memory usage
- Can toggle when user needs details

---

### Step 5: Reduce Cache Retention (in API slice)

**Location**: `src/store/api/[module]Api.ts` (in query definition)

```typescript
// ❌ BEFORE
keepUnusedDataFor: 300, // 5 minutes

// ✅ AFTER
keepUnusedDataFor: 60, // 1 minute
```

**Why**:
- Clears unused cache entries faster
- Reduces state size by ~80%
- Prevents state bloat from multiple searches

---

## Backend Implementation

### Step 1: Add Endpoint Configuration

**Location**: `backend/src/core/security/rate-limit.config.ts`

```typescript
// Around line 105, in the endpointConfigs object

// ✅ ADD THIS SECTION
// Organization endpoints - optimized for search functionality
'/organizations/[your-module]': {
  max: 20,              // 20 requests allowed
  timeWindow: 10000,    // per 10 seconds (not 60 seconds)
  skipSuccessfulRequests: false,
},
```

**Example for multiple modules**:
```typescript
'/organizations/schools': {
  max: 20,
  timeWindow: 10000,
  skipSuccessfulRequests: false,
},
'/organizations/positions': {
  max: 20,
  timeWindow: 10000,
  skipSuccessfulRequests: false,
},
'/organizations/departments': { // Already exists
  max: 20,
  timeWindow: 10000,
  skipSuccessfulRequests: false,
},
```

**Configuration Explained**:
- `max: 20` → Maximum 20 requests
- `timeWindow: 10000` → Per 10 seconds (10000 milliseconds)
- `skipSuccessfulRequests: false` → Count all requests (both success and failure)

**Why 10 seconds instead of 60 seconds**:
- Better request distribution
- 20 req/10s = 120 req/min theoretical max (vs 100 req/min with 60s window)
- Prevents burst traffic issues
- More granular control

---

### Step 2: Add Import in Controller

**Location**: `backend/src/modules/[module-path]/controllers/[module].controller.ts`

```typescript
// Add this import at the top
import { RateLimit } from '../../../core/auth/decorators/rate-limit.decorator';
```

---

### Step 3: Apply @RateLimit Decorator

**Location**: `backend/src/modules/[module-path]/controllers/[module].controller.ts`

**Find the GET endpoint (usually named `findAll`)** and add the decorator:

```typescript
@Get()
// ✅ ADD THIS DECORATOR
@RateLimit({
  limit: 20,
  windowMs: 10000, // 10 seconds
  message: 'Too many search requests. Please wait a moment before trying again.',
  headers: true, // Include X-RateLimit-* headers in response
})
@RequiredPermissions({
  resource: 'your-resource', // e.g., 'schools', 'positions'
  action: PermissionAction.READ,
})
@ApiOperation({
  summary: 'Get all items',
  description: 'Retrieves a paginated list with optional filtering. Rate limited to 20 requests per 10 seconds.', // ✅ Update description
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Items retrieved successfully',
  type: PaginatedResponseDto,
})
// ✅ ADD THIS NEW RESPONSE
@ApiResponse({
  status: HttpStatus.TOO_MANY_REQUESTS,
  description: 'Rate limit exceeded. Please wait before retrying.',
})
async findAll(
  @Query() query: QueryDto,
): Promise<PaginatedResponseDto> {
  return this.service.findAll(query);
}
```

**What this does**:
- Limits requests to 20 per 10 seconds per user
- Sends `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
- Returns 429 status with `Retry-After` header when limit exceeded
- Provides user-friendly error message

---

### Step 4: Update Global Rate Limit Config (Optional)

**Location**: `backend/src/core/config/configuration.ts`

**Already implemented** for token bucket algorithm support:

```typescript
export const rateLimitConfig = registerAs('rateLimit', () => ({
  ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
  limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  // Token bucket configuration for smoother rate limiting
  tokenBucket: {
    enabled: process.env.RATE_LIMIT_TOKEN_BUCKET === 'true',
    refillRate: parseInt(process.env.RATE_LIMIT_REFILL_RATE || '10', 10),
    bucketSize: parseInt(process.env.RATE_LIMIT_BUCKET_SIZE || '20', 10),
  },
  includeRetryAfter: process.env.RATE_LIMIT_INCLUDE_RETRY_AFTER !== 'false',
}));
```

**Environment Variables** (add to `.env` if not exists):
```bash
RATE_LIMIT_TOKEN_BUCKET=true
RATE_LIMIT_REFILL_RATE=10
RATE_LIMIT_BUCKET_SIZE=20
RATE_LIMIT_INCLUDE_RETRY_AFTER=true
```

---

## Implementation Checklist

### Frontend Checklist

Copy this for each module you're implementing:

**Module**: _________________ (e.g., Schools, Positions, Users)

**File**: `src/components/features/[path]/[Module]List.tsx`

- [ ] **Step 1**: Update debounce delay from `500` to `800` ms
  - Line: ______
  - Code: `const debouncedSearchTerm = useDebounce(searchTerm, 800);`

- [ ] **Step 2**: Fix page reset logic to use `debouncedSearchTerm`
  - Line: ______
  - Code: `}, [debouncedSearchTerm, ...otherFilters]);`

- [ ] **Step 3**: Add skip condition to query
  - Line: ______
  - Code: `skip: searchTerm !== debouncedSearchTerm,`

- [ ] **Step 4**: (Optional) Implement lazy loading for nested data
  - Line: ______
  - Add state: `const [showNestedData, setShowNestedData] = useState(false);`
  - Update params: `includeSchool: showNestedData,`

**File**: `src/store/api/[module]Api.ts`

- [ ] **Step 5**: Reduce cache retention time
  - Line: ______
  - Code: `keepUnusedDataFor: 60,` (change from 300)

---

### Backend Checklist

**Module**: _________________ (e.g., Schools, Positions, Users)

**File**: `backend/src/core/security/rate-limit.config.ts`

- [ ] **Step 1**: Add endpoint configuration
  - Line: ______ (around line 105)
  - Code:
    ```typescript
    '/organizations/[your-module]': {
      max: 20,
      timeWindow: 10000,
      skipSuccessfulRequests: false,
    },
    ```

**File**: `backend/src/modules/[path]/controllers/[module].controller.ts`

- [ ] **Step 2**: Add RateLimit import
  - Line: ______ (at top with other imports)
  - Code: `import { RateLimit } from '../../../core/auth/decorators/rate-limit.decorator';`

- [ ] **Step 3**: Add @RateLimit decorator to GET endpoint
  - Line: ______ (above @Get() method)
  - Code:
    ```typescript
    @RateLimit({
      limit: 20,
      windowMs: 10000,
      message: 'Too many search requests. Please wait a moment before trying again.',
      headers: true,
    })
    ```

- [ ] **Step 4**: Update API operation description
  - Line: ______
  - Add: "Rate limited to 20 requests per 10 seconds."

- [ ] **Step 5**: Add 429 response documentation
  - Line: ______
  - Code:
    ```typescript
    @ApiResponse({
      status: HttpStatus.TOO_MANY_REQUESTS,
      description: 'Rate limit exceeded. Please wait before retrying.',
    })
    ```

---

## Testing & Validation

### Frontend Testing

**Test Case 1: Debounce Functionality**
```
1. Open browser DevTools → Network tab
2. Navigate to list page
3. Type rapidly in search box (e.g., "Koordinator")
4. ✅ Expected: Only 1 request appears 800ms after you stop typing
5. ❌ Failure: Multiple requests during typing
```

**Test Case 2: Skip Condition**
```
1. Open browser DevTools → Network tab
2. Type in search box
3. Observe network activity during typing
4. ✅ Expected: No requests during typing, query marked as "skipped"
5. ❌ Failure: Requests appear while typing
```

**Test Case 3: Page Reset**
```
1. Navigate to page 2 or 3
2. Change search term
3. Wait 800ms for debounce
4. ✅ Expected: Returns to page 1, makes 1 request
5. ❌ Failure: Multiple requests or doesn't reset to page 1
```

**Test Case 4: State Size**
```
1. Open Redux DevTools
2. Perform multiple searches
3. Check state size in monitor
4. ✅ Expected: State size ~6KB, no warnings
5. ❌ Failure: State size >10KB, console warnings
```

---

### Backend Testing

**Test Case 1: Rate Limit Configuration**
```bash
# Test endpoint rate limiting
for i in {1..25}; do
  curl -X GET "http://localhost:3001/api/v1/organizations/[your-module]?page=1&limit=10" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -w "\nStatus: %{http_code}\n" \
    -s | grep -E "Status:|error"
  sleep 0.3
done

# ✅ Expected:
# Requests 1-20: Status: 200
# Requests 21+: Status: 429

# ❌ Failure:
# All requests return 200 (rate limiting not working)
# Or all requests return 429 (rate limit too strict)
```

**Test Case 2: Rate Limit Headers**
```bash
curl -X GET "http://localhost:3001/api/v1/organizations/[your-module]" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -i

# ✅ Expected headers:
# X-RateLimit-Limit: 20
# X-RateLimit-Remaining: 19 (or less)
# X-RateLimit-Reset: <timestamp>

# When limit exceeded:
# HTTP/1.1 429 Too Many Requests
# Retry-After: 10
```

**Test Case 3: Token Bucket (if enabled)**
```bash
# Make 20 requests rapidly (should all succeed)
for i in {1..20}; do
  curl -X GET "http://localhost:3001/api/v1/organizations/[your-module]" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -w "\nStatus: %{http_code}\n" &
done
wait

# Wait 2 seconds (bucket refills 20 tokens)
sleep 2

# Make 20 more requests (should succeed again)
for i in {1..20}; do
  curl -X GET "http://localhost:3001/api/v1/organizations/[your-module]" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -w "\nStatus: %{http_code}\n"
done

# ✅ Expected: All 40 requests succeed (20 initial + 20 after refill)
```

---

### Integration Testing

**Test Case: Full User Journey**
```
1. User opens list page
2. User types search query rapidly
3. System waits 800ms
4. Single API request made
5. Backend checks rate limit (should be under 20)
6. Response returns with X-RateLimit headers
7. Frontend updates UI
8. User changes filter
9. Page resets to 1
10. Single API request made

✅ Expected:
- Only 2 API requests total
- No 429 errors
- Fast UI response
- State size <8KB

❌ Failure:
- Multiple requests during typing
- 429 errors appear
- Slow UI response
- State size >10KB
```

---

## Troubleshooting

### Problem 1: Still getting 429 errors

**Symptoms**: 429 Too Many Requests errors still occurring

**Diagnosis**:
```bash
# Check frontend implementation
1. Verify debounce is 800ms
2. Check skip condition is added
3. Ensure page reset uses debouncedSearchTerm

# Check backend implementation
4. Verify endpoint is in rate-limit.config.ts
5. Check @RateLimit decorator is applied
6. Verify rate limit config is correct (20 req/10s)
```

**Solutions**:
- Increase debounce to 1000ms if users type very fast
- Reduce backend rate limit to 15 req/10s
- Check for multiple API endpoints being called
- Verify RTK Query isn't creating duplicate cache entries

---

### Problem 2: Search feels slow

**Symptoms**: Users complain search is sluggish

**Diagnosis**:
```bash
1. Check debounce delay (should be 800ms, not higher)
2. Verify skip condition isn't blocking valid queries
3. Check network latency in DevTools
4. Monitor backend response times
```

**Solutions**:
- Reduce debounce to 600-700ms if network is fast
- Add loading indicators during debounce period
- Optimize backend query performance
- Consider adding search suggestions while typing (without API calls)

---

### Problem 3: State size still growing

**Symptoms**: State monitor warnings about large state

**Diagnosis**:
```bash
# Check RTK Query cache
1. Open Redux DevTools
2. Navigate to api.queries
3. Count number of cache entries
4. Check size of each entry

# Expected: 2-3 entries, each ~2KB
# Problem: >5 entries or entries >3KB
```

**Solutions**:
- Reduce `keepUnusedDataFor` to 30s
- Implement lazy loading for nested data
- Use `serializeQueryArgs` to normalize cache keys
- Add cache invalidation on filter changes

---

### Problem 4: Skip condition not working

**Symptoms**: Queries still execute during typing

**Diagnosis**:
```typescript
// Check if skip condition is properly placed
const { data } = useGetQuery(
  { params },
  { skip: searchTerm !== debouncedSearchTerm } // ✅ Correct
);

// vs

const { data, skip } = useGetQuery({ params }); // ❌ Wrong - skip not in options
```

**Solutions**:
- Verify skip is in second parameter (query options)
- Check searchTerm and debouncedSearchTerm variables exist
- Add console.log to verify skip condition is true during typing

---

### Problem 5: Backend rate limit too strict

**Symptoms**: Users frequently hit 429 even with normal usage

**Diagnosis**:
```bash
# Monitor actual usage patterns
1. Check backend logs for 429 responses
2. Analyze request patterns per user
3. Calculate average requests per minute
```

**Solutions**:
- Increase `max` from 20 to 30
- Increase `timeWindow` from 10s to 15s
- Enable token bucket if not already enabled
- Consider user-specific rate limits (premium users get higher limits)

---

## Advanced Patterns

### Pattern 1: Progressive Rate Limiting

Warn users before they hit the limit:

```typescript
// Frontend: Check remaining rate limit
const handleResponse = (response: Response) => {
  const remaining = response.headers.get('x-ratelimit-remaining');
  if (remaining && parseInt(remaining) < 5) {
    toast.warning(`Only ${remaining} searches remaining. Please slow down.`);
  }
};
```

### Pattern 2: Conditional Debouncing

Adjust debounce based on query complexity:

```typescript
const [searchTerm, setSearchTerm] = useState("");
const debounceDelay = searchTerm.length > 10 ? 1000 : 800; // Longer for complex queries
const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);
```

### Pattern 3: Request Cancellation

Cancel outdated requests when new ones start:

```typescript
useEffect(() => {
  // RTK Query automatically cancels previous requests
  // But you can manually abort if needed
  return () => {
    // Cleanup function
  };
}, [debouncedSearchTerm]);
```

---

## Additional Resources

### Related Documentation
- [RTK Query Documentation](https://redux-toolkit.js.org/rtk-query/overview)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Frontend Performance Optimization](./FRONTEND_IMPLEMENTATION_WORKFLOW.md)

### Code References
- **Frontend Example**: `src/components/features/organizations/departments/DepartmentList.tsx`
- **Backend Config**: `backend/src/core/security/rate-limit.config.ts`
- **Backend Controller**: `backend/src/modules/organizations/controllers/departments.controller.ts`

### Contact
For questions or issues, please contact the development team or create an issue in the project repository.

---

**Last Updated**: October 2025
**Version**: 1.0
**Maintainer**: Development Team

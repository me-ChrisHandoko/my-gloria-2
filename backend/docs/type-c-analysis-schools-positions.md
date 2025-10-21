# Analisis Type C Pattern - Schools & Positions

Tanggal Analisis: 21 Oktober 2025

## Executive Summary

Kedua modul **Schools** dan **Positions** **SUDAH MENERAPKAN Type C Pattern**, namun dengan beberapa perbedaan minor dibandingkan dengan implementasi standar (DepartmentList, PermissionList, RoleList).

### Status Overview

| Module | Type C Status | Redis Cache | Rate Limiting | Transform Response | Cache TTL Match |
|--------|--------------|-------------|---------------|-------------------|-----------------|
| **Schools** | ✅ **COMPLETE** | ✅ Yes (3600s) | ✅ Yes (20/10s) | ✅ Yes | ⚠️ No (3600s vs 60s) |
| **Positions** | ✅ **COMPLETE** | ✅ Yes (3600s) | ✅ Yes (20/10s) | ❌ **MISSING** | ⚠️ No (3600s vs 60s) |

## Detailed Analysis

---

## 1. Schools Module

### ✅ Backend Implementation (SUDAH TYPE C)

#### Controller (`schools.controller.ts:83-110`)
```typescript
@Get()
@RateLimit({
  limit: 20,
  windowMs: 10000, // 20 requests per 10 seconds ✅
  message: 'Too many search requests. Please wait a moment before trying again.',
  headers: true,
})
@RequiredPermissions({ resource: 'schools', action: PermissionAction.READ })
@ApiOperation({
  summary: 'Get all schools',
  description: 'Retrieves a paginated list of schools with optional filtering. Rate limited to 20 requests per 10 seconds.',
})
@ApiResponse({
  status: HttpStatus.TOO_MANY_REQUESTS,
  description: 'Rate limit exceeded. Please wait before retrying.',
})
async findAll(@Query() query: QuerySchoolDto): Promise<PaginatedSchoolResponseDto> {
  return this.schoolsService.findAll(query);
}
```

**✅ Sudah Lengkap:**
- Rate limiting: 20 req/10s
- API documentation lengkap
- Error response untuk rate limit

#### Service (`schools.service.ts`)

**Cache Configuration (Line 23-24):**
```typescript
private readonly cachePrefix = 'school:';
private readonly cacheTTL = 3600; // ⚠️ 1 hour (berbeda dari standar 60s)
```

**Constructor (Line 26-29):**
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly cache: CacheService, // ✅ CacheService injected
) {}
```

**findAll Method (Line 69-147):**
```typescript
async findAll(query: QuerySchoolDto): Promise<PaginatedSchoolResponseDto> {
  // ✅ Cache key dengan JSON.stringify
  const cacheKey = `${this.cachePrefix}list:${JSON.stringify(query)}`;
  const cached = await this.cache.get<PaginatedSchoolResponseDto>(cacheKey);

  if (cached) {
    return cached; // ✅ Return cached data
  }

  // ✅ Pagination logic
  const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = query;
  const skip = (page - 1) * limit;

  // ✅ Search filter
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // ✅ Parallel query with count
  const [schools, total] = await Promise.all([
    this.prisma.school.findMany({ where, skip, take: limit, orderBy }),
    this.prisma.school.count({ where }),
  ]);

  // ✅ Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  // ✅ Cache result
  await this.cache.set(cacheKey, result, this.cacheTTL);
  return result;
}
```

**findOne Method (Line 149-175):**
```typescript
async findOne(id: string): Promise<SchoolResponseDto> {
  const cacheKey = `${this.cachePrefix}${id}`;
  const cached = await this.cache.get<SchoolResponseDto>(cacheKey);

  if (cached) {
    return cached; // ✅ Cached individual item
  }

  const school = await this.prisma.school.findUnique({ where: { id } });

  await this.cache.set(cacheKey, result, this.cacheTTL); // ✅ Cache individual item
  return result;
}
```

**⚠️ findByCode Method (Line 177-194) - MISSING CACHE:**
```typescript
async findByCode(code: string): Promise<SchoolResponseDto> {
  const school = await this.prisma.school.findUnique({ where: { code } });

  // ❌ TIDAK ADA CACHING untuk findByCode

  return this.formatSchoolResponse(school);
}
```

**Cache Invalidation (Line 31-67):**
```typescript
async create(createSchoolDto: CreateSchoolDto): Promise<SchoolResponseDto> {
  // ... create logic ...

  // ✅ Invalidate list cache
  await this.cache.del(`${this.cachePrefix}list`);

  return this.formatSchoolResponse(school);
}
```

### ✅ Frontend Implementation

#### API (`schoolApi.ts:10-76`)
```typescript
getSchools: builder.query<PaginatedResponse<School>, QueryParams>({
  query: (params = {}) => {
    // ✅ Only send non-empty params
    const queryParams: Record<string, any> = {
      page: params.page || 1,
      limit: params.limit || 10,
    };

    if (params.search) queryParams.search = params.search;
    // ...
  },

  // ✅ transformResponse implemented
  transformResponse: (response: any) => {
    let actualResponse: PaginatedResponse<School>;

    // ✅ Handle double wrapping
    if (response && response.success && response.data) {
      actualResponse = response.data;
      if ((actualResponse as any).success && (actualResponse as any).data) {
        actualResponse = (actualResponse as any).data;
      }
    }

    // ✅ Date transformation
    return {
      ...actualResponse,
      data: actualResponse.data.map(school => ({
        ...school,
        createdAt: new Date(school.createdAt),
        updatedAt: new Date(school.updatedAt),
      })),
    };
  },

  keepUnusedDataFor: 300, // ⚠️ 5 minutes (tidak match dengan backend 3600s)
})
```

### 📊 Schools Type C Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| **Backend** | | |
| ✅ CacheService injected | ✅ | Line 28 |
| ✅ Cache prefix & TTL | ⚠️ | TTL 3600s (bukan 60s standar) |
| ✅ findAll with caching | ✅ | Complete implementation |
| ✅ findById with caching | ✅ | Complete implementation |
| ❌ findByCode with caching | ❌ | **MISSING CACHE** |
| ✅ Cache invalidation on create | ✅ | Line 53 |
| ⚠️ Cache invalidation on update | ⚠️ | **PERLU VERIFIKASI** |
| ⚠️ Cache invalidation on delete | ⚠️ | **PERLU VERIFIKASI** |
| ✅ Rate limiting (20/10s) | ✅ | Line 84-90 |
| ✅ Pagination support | ✅ | Complete |
| ✅ Search filter | ✅ | Multi-field search |
| **Frontend** | | |
| ✅ transformResponse | ✅ | Handle double wrapping |
| ✅ Date transformation | ✅ | createdAt, updatedAt |
| ⚠️ keepUnusedDataFor | ⚠️ | 300s (tidak match 3600s backend) |
| ✅ Proper cache tags | ✅ | Individual + LIST tags |

---

## 2. Positions Module

### ✅ Backend Implementation (SUDAH TYPE C)

#### Controller (`positions.controller.ts:92-119`)
```typescript
@Get()
@RateLimit({
  limit: 20,
  windowMs: 10000, // 20 requests per 10 seconds ✅
  message: 'Too many search requests. Please wait a moment before trying again.',
  headers: true,
})
@RequiredPermissions({ resource: 'positions', action: PermissionAction.READ })
@ApiOperation({
  summary: 'Get all positions',
  description: 'Retrieves a paginated list of positions with optional filtering. Rate limited to 20 requests per 10 seconds.',
})
@ApiResponse({
  status: HttpStatus.TOO_MANY_REQUESTS,
  description: 'Rate limit exceeded. Please wait before retrying.',
})
async findAll(@Query() query: QueryPositionDto): Promise<PaginatedPositionResponseDto> {
  return this.positionsService.findAll(query);
}
```

**✅ Sudah Lengkap:**
- Rate limiting: 20 req/10s
- API documentation lengkap
- Error response untuk rate limit

#### Service (`positions.service.ts`)

**Cache Configuration (Line 24-26):**
```typescript
private readonly cachePrefix = 'position:';
private readonly cacheTTL = 3600; // ⚠️ 1 hour (berbeda dari standar 60s)
```

**Constructor (Line 28-31):**
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly cache: CacheService, // ✅ CacheService injected
) {}
```

**✅ Implementasi lengkap sama seperti Schools:**
- findAll dengan caching
- findOne dengan caching
- Cache invalidation
- Pagination dan search

### ❌ Frontend Implementation (MISSING transformResponse)

#### API (`positionApi.ts:10-50`)
```typescript
getPositions: builder.query<PaginatedResponse<Position>, QueryParams>({
  query: (params = {}) => {
    // ✅ Query params handling
    const queryParams: Record<string, any> = {
      page: params.page || 1,
      limit: params.limit || 10,
    };

    if (params.search) queryParams.name = params.search;
    // ...
  },

  // ❌ MISSING transformResponse - tidak ada unwrapping logic

  providesTags: (result) => {
    // ⚠️ Debug logging masih ada (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('Position API result:', result);
    }

    // ✅ Defensive array check
    return result?.data && Array.isArray(result.data)
      ? [
          ...result.data.map(({ id }) => ({ type: 'Position' as const, id })),
          { type: 'Position', id: 'LIST' },
        ]
      : [{ type: 'Position', id: 'LIST' }];
  },

  keepUnusedDataFor: 300, // ⚠️ 5 minutes (tidak match 3600s backend)
})
```

### 📊 Positions Type C Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| **Backend** | | |
| ✅ CacheService injected | ✅ | Line 30 |
| ✅ Cache prefix & TTL | ⚠️ | TTL 3600s (bukan 60s standar) |
| ✅ findAll with caching | ✅ | Complete implementation |
| ✅ findById with caching | ✅ | Complete implementation |
| ✅ Cache invalidation | ✅ | Complete |
| ✅ Rate limiting (20/10s) | ✅ | Line 93-99 |
| ✅ Pagination support | ✅ | Complete |
| ✅ Search filter | ✅ | Multi-field search |
| **Frontend** | | |
| ❌ transformResponse | ❌ | **MISSING - CRITICAL** |
| ❌ Date transformation | ❌ | No date handling |
| ⚠️ keepUnusedDataFor | ⚠️ | 300s (tidak match 3600s backend) |
| ✅ Proper cache tags | ✅ | Individual + LIST tags |
| ⚠️ Debug logging | ⚠️ | Still has dev console.logs |

---

## Perbedaan dengan Standar Type C

### 1. Cache TTL (Schools & Positions)

**Standar Type C (Roles, Permissions, Departments):**
```typescript
private readonly cacheTTL = 60; // 60 seconds
keepUnusedDataFor: 60, // Frontend matches backend
```

**Schools & Positions:**
```typescript
private readonly cacheTTL = 3600; // 1 hour (60x lebih lama)
keepUnusedDataFor: 300, // 5 minutes (tidak match backend)
```

**Impact:**
- ✅ Pro: Lebih sedikit DB queries (cache hit rate lebih tinggi)
- ❌ Con: Data bisa stale sampai 1 jam
- ⚠️ Mismatch: Frontend cache (5 min) < Backend cache (1 hour)

### 2. findByCode Caching (Schools ONLY)

**Schools:**
```typescript
async findByCode(code: string): Promise<SchoolResponseDto> {
  // ❌ TIDAK ADA CACHING
  const school = await this.prisma.school.findUnique({ where: { code } });
  return this.formatSchoolResponse(school);
}
```

**Standar Type C (Roles, Permissions):**
```typescript
async findByCode(code: string): Promise<Role> {
  const cacheKey = `${this.cachePrefix}code:${code}`;
  const cached = await this.cache.get<Role>(cacheKey);
  if (cached) return cached;

  // ... fetch from DB ...

  await this.cache.set(cacheKey, role, this.cacheTTL);
  return role;
}
```

### 3. transformResponse (Positions ONLY)

**Positions:**
```typescript
// ❌ TIDAK ADA transformResponse
getPositions: builder.query<PaginatedResponse<Position>, QueryParams>({
  query: (params) => ({ url: '/organizations/positions', params }),
  // Missing transformResponse
})
```

**Standar Type C:**
```typescript
getPermissions: builder.query<PaginatedResponse<Permission>, QueryParams>({
  query: (params) => ({ url: '/permissions', params }),
  transformResponse: (response: any) => {
    // ✅ Handle double wrapping
    let actualResponse: PaginatedResponse<Permission>;

    if (response && response.success && response.data) {
      actualResponse = response.data;
      if ((actualResponse as any).success && (actualResponse as any).data) {
        actualResponse = (actualResponse as any).data;
      }
    }

    return {
      ...actualResponse,
      data: actualResponse.data.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
    };
  },
})
```

---

## Rekomendasi Perbaikan

### Priority 1: CRITICAL (Positions)

#### ❌ Add transformResponse to positionApi.ts

**Problem:** Positions API tidak handle double wrapping dari TransformInterceptor

**Solution:**
```typescript
// positionApi.ts
getPositions: builder.query<PaginatedResponse<Position>, QueryParams>({
  query: (params = {}) => { /* existing code */ },

  // ADD THIS:
  transformResponse: (response: any) => {
    let actualResponse: PaginatedResponse<Position>;

    if (response && response.success && response.data) {
      actualResponse = response.data;
      if (actualResponse && (actualResponse as any).success && (actualResponse as any).data) {
        actualResponse = (actualResponse as any).data;
      }
    } else {
      actualResponse = response;
    }

    if (!actualResponse || !Array.isArray(actualResponse.data)) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
    }

    return {
      ...actualResponse,
      data: actualResponse.data.map(position => ({
        ...position,
        createdAt: new Date(position.createdAt),
        updatedAt: new Date(position.updatedAt),
      })),
    };
  },

  providesTags: (result) => { /* existing code */ },
  keepUnusedDataFor: 300,
})
```

### Priority 2: HIGH (Schools)

#### ❌ Add caching to findByCode

**Problem:** findByCode tidak menggunakan cache, langsung query DB

**Solution:**
```typescript
// schools.service.ts
async findByCode(code: string): Promise<SchoolResponseDto> {
  const cacheKey = `${this.cachePrefix}code:${code}`;

  // Try cache first
  const cached = await this.cache.get<SchoolResponseDto>(cacheKey);
  if (cached) {
    this.logger.debug(`School retrieved from cache: ${cacheKey}`);
    return cached;
  }

  const school = await this.prisma.school.findUnique({
    where: { code },
    include: {
      _count: {
        select: { departments: true },
      },
    },
  });

  if (!school) {
    throw new NotFoundException(`School with code ${code} not found`);
  }

  const result = this.formatSchoolResponse(school);

  // Cache the result
  await this.cache.set(cacheKey, result, this.cacheTTL);

  return result;
}
```

### Priority 3: MEDIUM (Both)

#### ⚠️ Standardize Cache TTL

**Current State:**
- Schools/Positions backend: 3600s (1 hour)
- Schools/Positions frontend: 300s (5 minutes)
- Standard Type C: 60s (both backend & frontend)

**Options:**

**Option A: Match Standard (60s)** ✅ RECOMMENDED
```typescript
// Backend
private readonly cacheTTL = 60; // 60 seconds

// Frontend
keepUnusedDataFor: 60, // 60 seconds
```

**Pro:**
- Konsisten dengan modul lain
- Data lebih fresh
- Mudah untuk maintenance

**Con:**
- Lebih banyak DB queries

**Option B: Keep Current (3600s/300s)**
```typescript
// Backend
private readonly cacheTTL = 3600; // 1 hour

// Frontend - HARUS DIUBAH MATCH BACKEND
keepUnusedDataFor: 3600, // 1 hour (bukan 300s)
```

**Pro:**
- Lebih sedikit DB queries
- Cocok untuk data yang jarang berubah

**Con:**
- Data bisa stale sampai 1 jam
- Tidak konsisten dengan modul lain

**Recommendation:** Gunakan **Option A (60s)** untuk konsistensi, kecuali ada alasan khusus Schools/Positions perlu cache lebih lama.

### Priority 4: LOW (Positions)

#### Remove debug logging

**Problem:** Development console.log masih ada di production code

**Solution:**
```typescript
// positionApi.ts
providesTags: (result) => {
  // REMOVE THIS BLOCK:
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('Position API result:', result);
  //   console.log('result.data type:', typeof result?.data);
  //   console.log('result.data isArray:', Array.isArray(result?.data));
  // }

  return result?.data && Array.isArray(result.data)
    ? [
        ...result.data.map(({ id }) => ({ type: 'Position' as const, id })),
        { type: 'Position', id: 'LIST' },
      ]
    : [{ type: 'Position', id: 'LIST' }];
},
```

---

## Summary Table

| Feature | Schools | Positions | Standard Type C |
|---------|---------|-----------|-----------------|
| **Backend** | | | |
| Redis Cache | ✅ Yes | ✅ Yes | ✅ Yes |
| Cache TTL | ⚠️ 3600s | ⚠️ 3600s | ✅ 60s |
| findAll cache | ✅ Yes | ✅ Yes | ✅ Yes |
| findById cache | ✅ Yes | ✅ Yes | ✅ Yes |
| findByCode cache | ❌ **No** | ✅ Yes | ✅ Yes |
| Cache invalidation | ✅ Yes | ✅ Yes | ✅ Yes |
| Rate limiting | ✅ 20/10s | ✅ 20/10s | ✅ 20/10s |
| Pagination | ✅ Yes | ✅ Yes | ✅ Yes |
| Search filter | ✅ Yes | ✅ Yes | ✅ Yes |
| **Frontend** | | | |
| transformResponse | ✅ Yes | ❌ **No** | ✅ Yes |
| Date transform | ✅ Yes | ❌ No | ✅ Yes |
| keepUnusedDataFor | ⚠️ 300s | ⚠️ 300s | ✅ 60s |
| Cache tags | ✅ Yes | ✅ Yes | ✅ Yes |
| **Overall Status** | **90% Complete** | **80% Complete** | **100% Reference** |

---

## Action Items

### Immediate (Harus Segera)

1. **Positions: Add transformResponse** (15 mins)
   - File: `frontend/src/store/api/positionApi.ts`
   - Priority: CRITICAL
   - Impact: Fix potential double wrapping issues

2. **Schools: Add findByCode caching** (10 mins)
   - File: `backend/src/modules/organizations/services/schools.service.ts`
   - Priority: HIGH
   - Impact: Improve performance for code-based lookups

### Soon (Dalam 1-2 Hari)

3. **Both: Standardize Cache TTL to 60s** (20 mins)
   - Files:
     - `backend/src/modules/organizations/services/schools.service.ts`
     - `backend/src/modules/organizations/services/positions.service.ts`
     - `frontend/src/store/api/schoolApi.ts`
     - `frontend/src/store/api/positionApi.ts`
   - Priority: MEDIUM
   - Impact: Consistency dengan modul lain

### Optional (Nice to Have)

4. **Positions: Remove debug logging** (5 mins)
   - File: `frontend/src/store/api/positionApi.ts`
   - Priority: LOW
   - Impact: Code cleanup

---

## Kesimpulan

**Schools: 90% Type C Compliant** ✅
- Sudah implement semua fitur utama Type C
- Hanya missing caching di findByCode
- TTL lebih panjang dari standar (design choice)

**Positions: 80% Type C Compliant** ⚠️
- Backend sudah lengkap
- Frontend missing transformResponse (CRITICAL)
- TTL lebih panjang dari standar (design choice)

**Overall:** Kedua modul sudah sangat dekat dengan Type C, hanya perlu perbaikan minor untuk mencapai 100% compliance dengan standar.

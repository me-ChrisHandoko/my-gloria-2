# NESTED Meta Pagination Pattern

## Overview

This document defines the standard NESTED meta pagination pattern used across all API endpoints in the Gloria backend system. This pattern ensures consistency and predictability in API responses.

## Pattern Structure

### Paginated Response Format

All paginated API endpoints MUST return responses in the following structure:

```typescript
{
  success: true,                    // Standard wrapper
  data: T[],                        // Array of items
  meta: {                           // NESTED pagination metadata
    total: number,                  // Total number of items across all pages
    page: number,                   // Current page number (1-indexed)
    limit: number,                  // Items per page
    totalPages: number,             // Total number of pages
    hasNext: boolean,               // Whether there is a next page
    hasPrevious: boolean            // Whether there is a previous page
  },
  timestamp: string,                // ISO 8601 timestamp
  path: string,                     // Request path
  requestId: string                 // Unique request identifier
}
```

### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "019a8c8b-3dc6-736b-83eb-fdeb683ef602",
      "name": "PG TK Kristen Gloria 1",
      "code": "PGTK1",
      "lokasi": "Timur",
      "address": null,
      "phone": null,
      "email": null,
      "isActive": true,
      "createdAt": "2024-08-15T08:30:45.000Z",
      "updatedAt": "2024-08-15T08:30:45.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "hasNext": true,
    "hasPrevious": false
  },
  "timestamp": "2025-11-18T17:12:01.609Z",
  "path": "/api/v1/organizations/schools?page=1&limit=10&sortBy=name&sortOrder=asc",
  "requestId": "1763485920873-p5xa3m2o7"
}
```

## Implementation Guide

### 1. Define DTO Structure

```typescript
// dto/entity.dto.ts
export class PaginatedEntityResponseDto {
  @ApiProperty({
    description: 'List of entities',
    type: [EntityResponseDto],
  })
  data: EntityResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 100,
      page: 1,
      limit: 10,
      totalPages: 10,
      hasNext: true,
      hasPrevious: false,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

### 2. Implement Service Method

```typescript
// services/entity.service.ts
async findAll(query: QueryEntityDto): Promise<PaginatedEntityResponseDto> {
  const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = query;
  const skip = (page - 1) * limit;

  // Build where clause based on query filters
  const where: Prisma.EntityWhereInput = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // Fetch data and count in parallel
  const [entities, total] = await Promise.all([
    this.prisma.entity.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    this.prisma.entity.count({ where }),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  // Return NESTED meta structure
  const result: PaginatedEntityResponseDto = {
    data: entities.map((entity) => this.formatEntityResponse(entity)),
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrevious,
    },
  };

  return result;
}
```

### 3. Controller Implementation

```typescript
// controllers/entity.controller.ts
@Get()
@ApiOperation({ summary: 'Get all entities with pagination' })
@ApiResponse({
  status: 200,
  description: 'List of entities with pagination metadata',
  type: PaginatedEntityResponseDto,
})
@RequiredPermission('entities', PermissionAction.READ)
async findAll(
  @Query() query: QueryEntityDto,
): Promise<PaginatedEntityResponseDto> {
  return this.entityService.findAll(query);
}
```

## Transform Interceptor Integration

The `TransformInterceptor` automatically wraps all responses with standard fields (`success`, `timestamp`, `path`, `requestId`). It is configured to detect and preserve the NESTED meta structure:

```typescript
// core/interceptors/transform.interceptor.ts
private isPaginatedResponse(response: any): boolean {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray(response.data) &&
    'meta' in response &&
    typeof response.meta === 'object' &&
    response.meta !== null &&
    'total' in response.meta &&
    'page' in response.meta &&
    'limit' in response.meta
  );
}

intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
  const request = context.switchToHttp().getRequest<FastifyRequest>();

  return next.handle().pipe(
    map((data) => {
      // Check if response has pagination structure (paginated response with NESTED meta)
      if (this.isPaginatedResponse(data)) {
        return {
          success: true,
          data: data.data,        // Extract the array
          meta: data.meta,        // Preserve nested meta object
          timestamp: new Date().toISOString(),
          path: request.url,
          requestId: request.id,
        };
      }

      // For non-paginated responses, wrap normally
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: request.id,
      };
    }),
  );
}
```

## Query DTO Pattern

All paginated endpoints should accept standardized query parameters:

```typescript
export class QueryEntityDto {
  @ApiPropertyOptional({
    description: 'Search term',
    example: 'search term',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['name', 'code', 'createdAt', 'updatedAt'],
    default: 'name',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'code', 'createdAt', 'updatedAt'])
  sortBy?: string = 'name';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
```

## Modules Using NESTED Meta Pattern

### ✅ Implemented
- **Organizations/Schools** - `/api/v1/organizations/schools`
- **Organizations/Departments** - `/api/v1/organizations/departments`
- **Permissions** - `/api/v1/permissions`

### 🔄 Migration Required
- **Roles** - `/api/v1/roles`
- **Modules** - `/api/v1/modules`
- **Users** - `/api/v1/users`

## Migration Checklist

When migrating an existing module to NESTED meta pattern:

- [ ] Update DTO to use NESTED meta structure
- [ ] Update service `findAll()` method to return NESTED meta
- [ ] Verify controller returns proper type
- [ ] Test with Postman/Thunder Client
- [ ] Update any frontend API calls if needed
- [ ] Update API documentation/Swagger
- [ ] Add unit tests for pagination logic

## Benefits

1. **Consistency**: All paginated endpoints follow the same structure
2. **Clarity**: Pagination metadata is clearly separated in `meta` object
3. **Extensibility**: Easy to add new metadata fields without breaking existing clients
4. **Type Safety**: TypeScript interfaces ensure correct structure
5. **Documentation**: Self-documenting through Swagger/OpenAPI

## Common Pitfalls

### ❌ Don't Use FLAT Structure

```typescript
// WRONG - FLAT structure (deprecated)
{
  data: [...],
  total: 100,
  page: 1,
  limit: 10,
  totalPages: 10,
  hasNext: true,
  hasPrevious: false
}
```

### ✅ Use NESTED Meta Structure

```typescript
// CORRECT - NESTED meta structure
{
  data: [...],
  meta: {
    total: 100,
    page: 1,
    limit: 10,
    totalPages: 10,
    hasNext: true,
    hasPrevious: false
  }
}
```

## Related Documentation

- [Transform Interceptor Fix](../TRANSFORM_INTERCEPTOR_FIX.md)
- [API Response Standards](./API_RESPONSE_STANDARDS.md)
- [NestJS Best Practices](./NESTJS_BEST_PRACTICES.md)

## Support

For questions or issues regarding the NESTED meta pattern, please:
1. Review this documentation
2. Check existing implementations (Schools, Departments, Permissions)
3. Consult the Transform Interceptor code
4. Contact the backend team lead

---

**Last Updated**: 2025-11-18
**Version**: 1.0.0
**Status**: Active Standard

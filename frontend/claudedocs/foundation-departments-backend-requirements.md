# Backend Requirements: Foundation-Level Departments

## Overview
Frontend telah diupdate untuk mendukung **foundation-level departments** (departments tanpa school affiliation). Backend perlu memastikan kompatibilitas dengan perubahan ini.

## Database Schema Requirements

### Department Table

```sql
-- Schema update untuk schoolId menjadi nullable
ALTER TABLE departments
MODIFY COLUMN schoolId VARCHAR(255) NULL;

-- Atau untuk PostgreSQL
ALTER TABLE departments
ALTER COLUMN "schoolId" DROP NOT NULL;
```

**Current Schema Assumption**:
- `schoolId`: VARCHAR, **NULLABLE** (was required, now optional)
- `null` value = Foundation-level department
- Non-null value = School-specific department

## API Endpoint Requirements

### 1. `POST /organizations/departments`

**Request DTO**:
```typescript
{
  name: string;           // Required
  code: string;           // Required
  schoolId?: string;      // OPTIONAL (null = foundation level)
  parentId?: string;      // Optional
  description?: string;   // Optional
  isActive?: boolean;     // Optional (default: true)
}
```

**Validation Rules**:
- ✅ `schoolId` can be `null` or `undefined` (foundation-level)
- ✅ `schoolId` can be valid school ID (school-specific)
- ⚠️ If `parentId` is provided with non-null `schoolId`:
  - Parent must be foundation-level OR same school
  - Reject if parent is from different school

**Example Requests**:

```json
// Foundation-level department
{
  "name": "Human Resources",
  "code": "HR",
  "schoolId": null,
  "description": "Foundation-wide HR department"
}

// School-specific department
{
  "name": "Mathematics Department",
  "code": "MATH",
  "schoolId": "school-abc-123",
  "parentId": "dept-hr-456",
  "description": "Math department for School A"
}
```

### 2. `GET /organizations/departments`

**Query Parameters**:
```typescript
{
  page?: number;
  limit?: number;
  name?: string;              // Partial match
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  schoolId?: string;          // OPTIONAL filter
  isActive?: boolean;
  includeSchool?: boolean;    // Include school info
  includeParent?: boolean;    // Include parent info
}
```

**Behavior Changes**:
- ⚠️ **When `schoolId` is NOT provided**: Return ALL departments (foundation + all schools)
- ✅ **When `schoolId` is provided**: Filter by specific school only
- ✅ **When `schoolId=null` explicitly**: Return only foundation-level departments

**Example Frontend Calls**:

```typescript
// Get ALL departments (foundation + schools)
GET /organizations/departments?limit=100&includeSchool=true&includeParent=true

// Get only foundation-level departments
GET /organizations/departments?schoolId=null&limit=100

// Get school-specific departments
GET /organizations/departments?schoolId=school-123&limit=100
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "dept-1",
        "name": "HR Department",
        "code": "HR",
        "schoolId": null,                    // Foundation level
        "organizationId": "org-123",
        "parentId": null,
        "isActive": true,
        "school": null,                      // includeSchool
        "parent": null,                      // includeParent
        "createdAt": "2025-01-10T...",
        "updatedAt": "2025-01-10T..."
      },
      {
        "id": "dept-2",
        "name": "Math Department",
        "code": "MATH",
        "schoolId": "school-abc",            // School-specific
        "organizationId": "org-123",
        "parentId": "dept-1",
        "isActive": true,
        "school": {                          // includeSchool
          "id": "school-abc",
          "name": "School A",
          "code": "SCH-A"
        },
        "parent": {                          // includeParent
          "id": "dept-1",
          "name": "HR Department",
          "code": "HR"
        },
        "createdAt": "2025-01-10T...",
        "updatedAt": "2025-01-10T..."
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 100,
    "totalPages": 1
  }
}
```

### 3. `PATCH /organizations/departments/:id`

**Request DTO**:
```typescript
{
  name?: string;
  code?: string;
  parentId?: string;
  description?: string;
  isActive?: boolean;
}
```

**Business Rules**:
- ⚠️ `schoolId` **CANNOT** be changed after creation (immutable)
- ✅ Foundation department can change to any parent
- ⚠️ School department can only have foundation or same-school parent

## Validation Rules

### Parent-Child Relationship Validation

**Server-Side Validation** (MUST implement):

```typescript
function validateParentChildRelationship(child: Department, parent: Department): boolean {
  // Case 1: Child is foundation-level → Any parent allowed
  if (!child.schoolId) return true;

  // Case 2: Parent is foundation-level → Always allowed
  if (!parent.schoolId) return true;

  // Case 3: Both have schoolId → Must match
  if (child.schoolId !== parent.schoolId) {
    throw new Error(
      'School-specific department can only have foundation-level parent or parent from the same school'
    );
  }

  return true;
}
```

**Validation Matrix**:

| Child Level | Parent Level | Valid? | Reason |
|-------------|--------------|--------|--------|
| Foundation | Foundation | ✅ Yes | Both foundation-level |
| Foundation | School A | ✅ Yes | Foundation can have any parent |
| School A | Foundation | ✅ Yes | Foundation parent allowed |
| School A | School A | ✅ Yes | Same school |
| School A | School B | ❌ No | Different schools |

### Code Uniqueness Validation

**Current Assumption**: Department code must be unique per school

**Updated Logic**:
```typescript
// Check for duplicate code
async function checkDuplicateCode(code: string, schoolId?: string): Promise<boolean> {
  if (schoolId) {
    // School-specific: code unique within school
    return Department.exists({ code, schoolId });
  } else {
    // Foundation-level: code unique within foundation
    return Department.exists({ code, schoolId: null });
  }
}
```

**Validation Rules**:
- Foundation department code must be unique among foundation departments
- School department code must be unique within that school
- Foundation "HR" and School A "HR" can coexist (different scopes)

## Migration Guide

### Step 1: Database Migration

```sql
-- 1. Make schoolId nullable
ALTER TABLE departments
MODIFY COLUMN schoolId VARCHAR(255) NULL;

-- 2. Add index for foundation-level queries
CREATE INDEX idx_departments_foundation ON departments(organizationId)
WHERE schoolId IS NULL;

-- 3. Verify existing data
SELECT COUNT(*) FROM departments WHERE schoolId IS NULL;
-- Should be 0 initially

-- 4. Create sample foundation departments (optional)
INSERT INTO departments (id, name, code, schoolId, organizationId, isActive)
VALUES
  (UUID(), 'Human Resources', 'HR', NULL, 'your-org-id', true),
  (UUID(), 'Finance', 'FIN', NULL, 'your-org-id', true),
  (UUID(), 'IT Department', 'IT', NULL, 'your-org-id', true);
```

### Step 2: Update API Validation

**File**: `src/organizations/departments/dto/create-department.dto.ts`

```typescript
export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()  // ✅ Add this
  @IsUUID()
  schoolId?: string;  // ✅ Make optional

  @IsString()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

### Step 3: Update Business Logic

**File**: `src/organizations/departments/departments.service.ts`

```typescript
async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
  const { parentId, schoolId, ...rest } = createDepartmentDto;

  // Validate parent-child relationship if parent provided
  if (parentId) {
    const parent = await this.findOne(parentId);
    this.validateParentChildRelationship(
      { schoolId } as Department,
      parent
    );
  }

  // Check code uniqueness within scope
  await this.checkDuplicateCode(rest.code, schoolId);

  return this.departmentRepository.create({
    ...rest,
    schoolId: schoolId || null,  // ✅ Explicitly set null for foundation
    parentId: parentId || null,
  });
}

async findAll(query: QueryDepartmentDto): Promise<PaginatedResponse<Department>> {
  const { schoolId, ...restQuery } = query;

  const where: any = { ...restQuery };

  // ✅ Handle schoolId filter properly
  if (schoolId === 'null' || schoolId === null) {
    // Explicitly requesting foundation-level only
    where.schoolId = null;
  } else if (schoolId) {
    // Filter by specific school
    where.schoolId = schoolId;
  }
  // If schoolId not provided, return ALL (no filter)

  return this.departmentRepository.findAndCount({
    where,
    relations: query.includeSchool ? ['school'] : [],
    // ...pagination
  });
}

private validateParentChildRelationship(child: Department, parent: Department): void {
  // Foundation child → Any parent allowed
  if (!child.schoolId) return;

  // Foundation parent → Always allowed
  if (!parent.schoolId) return;

  // Both have schoolId → Must match
  if (child.schoolId !== parent.schoolId) {
    throw new BadRequestException(
      'School-specific department can only have foundation-level parent or parent from the same school'
    );
  }
}

private async checkDuplicateCode(code: string, schoolId?: string): Promise<void> {
  const existing = await this.departmentRepository.findOne({
    where: {
      code,
      schoolId: schoolId || null,
    },
  });

  if (existing) {
    throw new ConflictException(
      schoolId
        ? 'Department code already exists in this school'
        : 'Department code already exists at foundation level'
    );
  }
}
```

## Testing Checklist

### Backend API Tests

**Create Department**:
- [ ] ✅ Create foundation-level department (schoolId = null)
- [ ] ✅ Create school-specific department (schoolId = value)
- [ ] ❌ Create school dept with parent from different school (should fail)
- [ ] ✅ Create school dept with foundation parent (should succeed)
- [ ] ❌ Duplicate code in same scope (should fail)
- [ ] ✅ Same code in different scopes (foundation vs school, should succeed)

**Get Departments**:
- [ ] ✅ Get all departments (no filter) → returns foundation + all schools
- [ ] ✅ Get foundation-only (schoolId=null) → returns only foundation
- [ ] ✅ Get school-specific (schoolId=value) → returns only that school
- [ ] ✅ Include school relation works correctly
- [ ] ✅ Include parent relation works correctly

**Update Department**:
- [ ] ✅ Update foundation department
- [ ] ✅ Update school department
- [ ] ❌ Change schoolId (should fail - immutable)
- [ ] ❌ Change parent to invalid school (should fail)

### Integration Tests

- [ ] Frontend can create foundation department
- [ ] Frontend can create school department with foundation parent
- [ ] Frontend validation prevents invalid parent selection
- [ ] Modal loads all departments on open
- [ ] Grouping displays foundation vs school correctly

## Deployment Checklist

1. [ ] Run database migration (make schoolId nullable)
2. [ ] Deploy backend with updated validation
3. [ ] Verify API endpoints return correct data
4. [ ] Test create/update operations
5. [ ] Deploy frontend with new features
6. [ ] Verify end-to-end flow in production
7. [ ] Create sample foundation departments (HR, Finance, IT)
8. [ ] Update user documentation

## Rollback Plan

If issues arise:

1. **Database**: Re-add NOT NULL constraint (requires data cleanup first)
2. **Backend**: Revert API validation changes
3. **Frontend**: Revert to conditional schoolId-based loading

```sql
-- Rollback: Make schoolId required again
-- WARNING: Only if no foundation departments exist
UPDATE departments SET schoolId = 'default-school-id' WHERE schoolId IS NULL;
ALTER TABLE departments MODIFY COLUMN schoolId VARCHAR(255) NOT NULL;
```

## Support & Questions

**Contact**: Development Team
**Documentation**: This file + frontend implementation changes
**Related Files**:
- Frontend: `CreateDepartmentModal.tsx`, `EditDepartmentModal.tsx`
- Types: `/frontend/src/types/index.ts`
- API: `/frontend/src/store/api/departmentApi.ts`

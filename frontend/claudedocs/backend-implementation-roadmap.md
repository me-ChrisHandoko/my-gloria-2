# Backend Implementation Roadmap: Foundation-Level Departments

## Executive Summary

**Status**: Backend is **95% ready** for foundation-level departments.

**Key Findings**:
- ✅ Database schema already supports optional `schoolId`
- ✅ DTOs already have proper validation decorators
- ⚠️ Service layer has 4 validation issues that need fixing
- ⚠️ No database migration needed

**Estimated Implementation Time**: 2-3 hours

---

## Issue Analysis & Solutions

### 🔴 **Critical Issue #1: Parent Validation Too Restrictive**

**File**: `/backend/src/modules/organizations/services/departments.service.ts`
**Lines**: 66-82
**Priority**: CRITICAL

**Current Code**:
```typescript
// Verify parent department if provided
if (createDepartmentDto.parentId) {
  const parentWhere: any = { id: createDepartmentDto.parentId };
  if (createDepartmentDto.schoolId) {
    parentWhere.schoolId = createDepartmentDto.schoolId; // ❌ TOO STRICT
  }

  const parentDept = await this.prisma.department.findFirst({
    where: parentWhere,
  });

  if (!parentDept) {
    const errorMsg = createDepartmentDto.schoolId
      ? `Parent department with ID ${createDepartmentDto.parentId} not found in the same school`
      : `Parent department with ID ${createDepartmentDto.parentId} not found`;
    throw new NotFoundException(errorMsg);
  }
}
```

**Problem**:
- School departments **cannot** select foundation-level parents
- Violates requirement: "School dept can have foundation parent OR same-school parent"

**Solution**:
```typescript
// Verify parent department if provided
if (createDepartmentDto.parentId) {
  const parentDept = await this.prisma.department.findUnique({
    where: { id: createDepartmentDto.parentId },
  });

  if (!parentDept) {
    throw new NotFoundException(
      `Parent department with ID ${createDepartmentDto.parentId} not found`
    );
  }

  // Validate parent-child relationship
  await this.validateParentChildRelationship(
    createDepartmentDto.schoolId,
    parentDept.schoolId,
    createDepartmentDto.parentId
  );
}
```

**New Validation Method**:
```typescript
/**
 * Validates parent-child department relationship
 * Rules:
 * - Foundation child → Any parent allowed
 * - School child + Foundation parent → Allowed
 * - School child + Same school parent → Allowed
 * - School child + Different school parent → BLOCKED
 */
private async validateParentChildRelationship(
  childSchoolId: string | undefined,
  parentSchoolId: string | undefined,
  parentId: string
): Promise<void> {
  // Foundation-level child → Any parent allowed
  if (!childSchoolId) {
    return;
  }

  // Foundation-level parent → Always allowed
  if (!parentSchoolId) {
    return;
  }

  // Both have schoolId → Must match
  if (childSchoolId !== parentSchoolId) {
    throw new BadRequestException(
      'School-specific department can only have foundation-level parent or parent from the same school'
    );
  }
}
```

---

### 🔴 **Critical Issue #2: Update Validation Has Same Problem**

**File**: `/backend/src/modules/organizations/services/departments.service.ts`
**Lines**: 319-336
**Priority**: CRITICAL

**Current Code**:
```typescript
// Verify parent department if provided
if (updateDepartmentDto.parentId) {
  if (updateDepartmentDto.parentId === id) {
    throw new BadRequestException('Department cannot be its own parent');
  }

  const parentDept = await this.prisma.department.findFirst({
    where: {
      id: updateDepartmentDto.parentId,
      schoolId: existingDepartment.schoolId, // ❌ BLOCKS foundation parent
    },
  });

  if (!parentDept) {
    throw new NotFoundException(
      `Parent department with ID ${updateDepartmentDto.parentId} not found in the same school`,
    );
  }

  // Check for circular reference
  if (existingDepartment.schoolId) {
    await this.checkCircularReference(
      updateDepartmentDto.parentId,
      id,
      existingDepartment.schoolId,
    );
  }
}
```

**Solution**:
```typescript
// Verify parent department if provided
if (updateDepartmentDto.parentId) {
  if (updateDepartmentDto.parentId === id) {
    throw new BadRequestException('Department cannot be its own parent');
  }

  const parentDept = await this.prisma.department.findUnique({
    where: { id: updateDepartmentDto.parentId },
  });

  if (!parentDept) {
    throw new NotFoundException(
      `Parent department with ID ${updateDepartmentDto.parentId} not found`
    );
  }

  // Validate parent-child relationship
  await this.validateParentChildRelationship(
    existingDepartment.schoolId,
    parentDept.schoolId,
    updateDepartmentDto.parentId
  );

  // Check for circular reference (works for both foundation and school)
  await this.checkCircularReference(
    updateDepartmentDto.parentId,
    id,
  );
}
```

---

### 🟡 **Important Issue #3: Circular Reference Check Needs Update**

**File**: `/backend/src/modules/organizations/services/departments.service.ts`
**Lines**: 505-533
**Priority**: IMPORTANT

**Current Code**:
```typescript
private async checkCircularReference(
  parentId: string,
  departmentId: string,
  schoolId: string, // ❌ Assumes always has schoolId
): Promise<void> {
  const visited = new Set<string>();
  let currentId: string | null = parentId;

  while (currentId) {
    if (visited.has(currentId)) {
      throw new BadRequestException(
        'Circular reference detected in department hierarchy',
      );
    }
    if (currentId === departmentId) {
      throw new BadRequestException(
        'Setting this parent would create a circular reference',
      );
    }
    visited.add(currentId);

    const parent = await this.prisma.department.findFirst({
      where: { id: currentId, schoolId }, // ❌ Only checks within school
      select: { parentId: true },
    });

    currentId = parent?.parentId || null;
  }
}
```

**Problem**:
- Circular check fails for foundation departments (schoolId = null)
- Could cause infinite loops in hierarchy

**Solution**:
```typescript
/**
 * Checks for circular references in department hierarchy
 * Works for both foundation and school-specific departments
 */
private async checkCircularReference(
  parentId: string,
  departmentId: string,
): Promise<void> {
  const visited = new Set<string>();
  let currentId: string | null = parentId;

  while (currentId) {
    if (visited.has(currentId)) {
      throw new BadRequestException(
        'Circular reference detected in department hierarchy',
      );
    }
    if (currentId === departmentId) {
      throw new BadRequestException(
        'Setting this parent would create a circular reference',
      );
    }
    visited.add(currentId);

    // Check across ALL departments (foundation + schools)
    const parent = await this.prisma.department.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    currentId = parent?.parentId || null;
  }
}
```

---

### 🟡 **Important Issue #4: Code Uniqueness Check Needs Clarity**

**File**: `/backend/src/modules/organizations/services/departments.service.ts`
**Lines**: 48-63 (create), 299-317 (update)
**Priority**: IMPORTANT

**Current Create Logic**:
```typescript
// Check for duplicate code
const where: any = { code: createDepartmentDto.code };
if (createDepartmentDto.schoolId) {
  where.schoolId = createDepartmentDto.schoolId;
}

const existingDepartment = await this.prisma.department.findFirst({
  where,
});

if (existingDepartment) {
  const errorMsg = createDepartmentDto.schoolId
    ? `Department with code ${createDepartmentDto.code} already exists in this school`
    : `Department with code ${createDepartmentDto.code} already exists`;
  throw new ConflictException(errorMsg);
}
```

**Issue**: Logic is **correct** but could be more explicit about foundation vs school scope

**Improved Solution** (for clarity):
```typescript
/**
 * Checks for duplicate department code within appropriate scope
 * - Foundation departments: code unique among foundation departments
 * - School departments: code unique within that school
 * - Foundation "HR" and School A "HR" can coexist (different scopes)
 */
private async checkDuplicateCode(
  code: string,
  schoolId: string | undefined,
  excludeId?: string
): Promise<void> {
  const where: Prisma.DepartmentWhereInput = {
    code,
    schoolId: schoolId || null, // Explicit null for foundation level
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existingDepartment = await this.prisma.department.findFirst({
    where,
  });

  if (existingDepartment) {
    const scope = schoolId ? 'in this school' : 'at foundation level';
    throw new ConflictException(
      `Department code ${code} already exists ${scope}`
    );
  }
}
```

**Usage in create()**:
```typescript
// Check for duplicate code
await this.checkDuplicateCode(
  createDepartmentDto.code,
  createDepartmentDto.schoolId
);
```

**Usage in update()**:
```typescript
// Check for duplicate code if code is being updated
if (
  updateDepartmentDto.code &&
  updateDepartmentDto.code !== existingDepartment.code
) {
  await this.checkDuplicateCode(
    updateDepartmentDto.code,
    existingDepartment.schoolId,
    id // exclude current department
  );
}
```

---

## Implementation Checklist

### Phase 1: Add New Validation Method (30 min)
- [ ] Add `validateParentChildRelationship()` private method
- [ ] Add `checkDuplicateCode()` private method (optional refactor)
- [ ] Add comprehensive JSDoc comments

### Phase 2: Update Create Method (30 min)
- [ ] Replace parent validation logic (lines 66-82)
- [ ] Call new `validateParentChildRelationship()` method
- [ ] Update duplicate code check (optional)
- [ ] Test with Postman/curl

### Phase 3: Update Update Method (30 min)
- [ ] Replace parent validation logic (lines 319-336)
- [ ] Call new `validateParentChildRelationship()` method
- [ ] Remove schoolId parameter from circular check call
- [ ] Update duplicate code check (optional)
- [ ] Test with Postman/curl

### Phase 4: Fix Circular Reference Check (15 min)
- [ ] Remove `schoolId` parameter from method signature
- [ ] Change `findFirst` to `findUnique`
- [ ] Remove schoolId filter from query
- [ ] Test circular reference detection

### Phase 5: Testing (30-60 min)
- [ ] Test foundation department creation
- [ ] Test school department with foundation parent
- [ ] Test school department with same-school parent
- [ ] Test rejection of different-school parent
- [ ] Test code uniqueness (foundation vs school scopes)
- [ ] Test circular reference prevention
- [ ] Test update operations
- [ ] Run existing test suite

---

## Complete Implementation Code

### New Private Methods to Add

```typescript
/**
 * Validates parent-child department relationship
 * @param childSchoolId - School ID of the child department (undefined = foundation)
 * @param parentSchoolId - School ID of the parent department (undefined = foundation)
 * @param parentId - ID of the parent department
 * @throws BadRequestException if relationship is invalid
 *
 * Rules:
 * - Foundation child → Any parent allowed
 * - School child + Foundation parent → Allowed
 * - School child + Same school parent → Allowed
 * - School child + Different school parent → BLOCKED
 */
private async validateParentChildRelationship(
  childSchoolId: string | undefined,
  parentSchoolId: string | undefined,
  parentId: string
): Promise<void> {
  // Foundation-level child → Any parent allowed
  if (!childSchoolId) {
    this.logger.debug(
      `Foundation-level department can have any parent (parent: ${parentId})`
    );
    return;
  }

  // Foundation-level parent → Always allowed for school children
  if (!parentSchoolId) {
    this.logger.debug(
      `School department can have foundation-level parent (parent: ${parentId})`
    );
    return;
  }

  // Both have schoolId → Must match
  if (childSchoolId !== parentSchoolId) {
    this.logger.warn(
      `Rejected cross-school parent assignment: child school ${childSchoolId}, parent school ${parentSchoolId}`
    );
    throw new BadRequestException(
      'School-specific department can only have foundation-level parent or parent from the same school'
    );
  }

  this.logger.debug(
    `Same-school parent relationship validated (school: ${childSchoolId})`
  );
}

/**
 * Checks for duplicate department code within appropriate scope
 * @param code - Department code to check
 * @param schoolId - School ID (undefined = foundation level)
 * @param excludeId - Department ID to exclude from check (for updates)
 * @throws ConflictException if duplicate code found
 *
 * Scope Rules:
 * - Foundation departments: code unique among foundation departments only
 * - School departments: code unique within that school only
 * - Foundation "HR" and School A "HR" can coexist (different scopes)
 */
private async checkDuplicateCode(
  code: string,
  schoolId: string | undefined,
  excludeId?: string
): Promise<void> {
  const where: Prisma.DepartmentWhereInput = {
    code,
    schoolId: schoolId || null, // Explicit null for foundation level
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existingDepartment = await this.prisma.department.findFirst({
    where,
  });

  if (existingDepartment) {
    const scope = schoolId ? 'in this school' : 'at foundation level';
    this.logger.warn(
      `Duplicate code detected: ${code} ${scope} (existing: ${existingDepartment.id})`
    );
    throw new ConflictException(
      `Department code ${code} already exists ${scope}`
    );
  }
}

/**
 * Checks for circular references in department hierarchy
 * Works for both foundation and school-specific departments
 * @param parentId - ID of the proposed parent department
 * @param departmentId - ID of the current department
 * @throws BadRequestException if circular reference detected
 */
private async checkCircularReference(
  parentId: string,
  departmentId: string,
): Promise<void> {
  const visited = new Set<string>();
  let currentId: string | null = parentId;

  while (currentId) {
    if (visited.has(currentId)) {
      this.logger.error(
        `Circular reference detected in hierarchy: visited ${visited.size} departments`
      );
      throw new BadRequestException(
        'Circular reference detected in department hierarchy',
      );
    }
    if (currentId === departmentId) {
      this.logger.error(
        `Circular reference: parent chain leads back to department ${departmentId}`
      );
      throw new BadRequestException(
        'Setting this parent would create a circular reference',
      );
    }
    visited.add(currentId);

    // Check across ALL departments (foundation + schools)
    const parent = await this.prisma.department.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    currentId = parent?.parentId || null;
  }

  this.logger.debug(
    `Circular reference check passed (checked ${visited.size} departments)`
  );
}
```

### Updated create() Method

```typescript
import { v7 as uuidv7 } from 'uuid';

async create(
  createDepartmentDto: CreateDepartmentDto,
): Promise<DepartmentResponseDto> {
  try {
    // Verify school exists if provided
    if (createDepartmentDto.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: createDepartmentDto.schoolId },
      });

      if (!school) {
        throw new NotFoundException(
          `School with ID ${createDepartmentDto.schoolId} not found`,
        );
      }
    }

    // Check for duplicate code
    await this.checkDuplicateCode(
      createDepartmentDto.code,
      createDepartmentDto.schoolId
    );

    // Verify parent department if provided
    if (createDepartmentDto.parentId) {
      const parentDept = await this.prisma.department.findUnique({
        where: { id: createDepartmentDto.parentId },
      });

      if (!parentDept) {
        throw new NotFoundException(
          `Parent department with ID ${createDepartmentDto.parentId} not found`
        );
      }

      // Validate parent-child relationship
      await this.validateParentChildRelationship(
        createDepartmentDto.schoolId,
        parentDept.schoolId,
        createDepartmentDto.parentId
      );
    }

    const department = await this.prisma.department.create({
      data: {
        id: uuidv7(),
        ...createDepartmentDto,
        isActive: createDepartmentDto.isActive ?? true,
      },
      include: {
        school: {
          select: { id: true, name: true, code: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Invalidate cache
    await this.cache.del(`${this.cachePrefix}list`);
    await this.cache.del(
      `${this.cachePrefix}hierarchy:${department.schoolId}`,
    );

    this.logger.log(
      `Created department: ${department.name} (${department.code}) - ${department.schoolId ? 'School-specific' : 'Foundation-level'}`,
    );
    return this.formatDepartmentResponse(department);
  } catch (error) {
    if (
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    this.logger.error(
      `Failed to create department: ${error.message}`,
      error.stack,
    );
    throw new BadRequestException('Failed to create department');
  }
}
```

### Updated update() Method

```typescript
async update(
  id: string,
  updateDepartmentDto: UpdateDepartmentDto,
): Promise<DepartmentResponseDto> {
  try {
    // Check if department exists
    const existingDepartment = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Check for duplicate code if code is being updated
    if (
      updateDepartmentDto.code &&
      updateDepartmentDto.code !== existingDepartment.code
    ) {
      await this.checkDuplicateCode(
        updateDepartmentDto.code,
        existingDepartment.schoolId,
        id
      );
    }

    // Verify parent department if provided
    if (updateDepartmentDto.parentId) {
      if (updateDepartmentDto.parentId === id) {
        throw new BadRequestException('Department cannot be its own parent');
      }

      const parentDept = await this.prisma.department.findUnique({
        where: { id: updateDepartmentDto.parentId },
      });

      if (!parentDept) {
        throw new NotFoundException(
          `Parent department with ID ${updateDepartmentDto.parentId} not found`
        );
      }

      // Validate parent-child relationship
      await this.validateParentChildRelationship(
        existingDepartment.schoolId,
        parentDept.schoolId,
        updateDepartmentDto.parentId
      );

      // Check for circular reference
      await this.checkCircularReference(
        updateDepartmentDto.parentId,
        id,
      );
    }

    const department = await this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
      include: {
        school: {
          select: { id: true, name: true, code: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: {
            positions: true,
            children: true,
          },
        },
      },
    });

    // Get user count through positions
    const userCount = await this.prisma.userPosition.count({
      where: {
        position: {
          departmentId: id,
        },
        isActive: true,
      },
    });

    // Invalidate cache
    await this.cache.del(`${this.cachePrefix}${id}`);
    await this.cache.del(`${this.cachePrefix}list`);
    await this.cache.del(
      `${this.cachePrefix}hierarchy:${department.schoolId}`,
    );

    this.logger.log(
      `Updated department: ${department.name} (${department.id})`,
    );
    return this.formatDepartmentResponse(department, userCount);
  } catch (error) {
    if (
      error instanceof NotFoundException ||
      error instanceof ConflictException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    this.logger.error(
      `Failed to update department: ${error.message}`,
      error.stack,
    );
    throw new BadRequestException('Failed to update department');
  }
}
```

---

## Testing Guide

### Test Scenarios

#### 1. Create Foundation Department
```bash
curl -X POST http://localhost:3000/api/v1/organizations/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Human Resources",
    "code": "HR",
    "description": "Foundation-wide HR department",
    "isActive": true
  }'
```

**Expected**: ✅ Success, department created with `schoolId: null`

#### 2. Create School Department with Foundation Parent
```bash
curl -X POST http://localhost:3000/api/v1/organizations/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Mathematics Department",
    "code": "MATH",
    "schoolId": "school-abc-123",
    "parentId": "foundation-hr-dept-id",
    "description": "Math department for School A"
  }'
```

**Expected**: ✅ Success, school department created with foundation parent

#### 3. Create School Department with Same-School Parent
```bash
curl -X POST http://localhost:3000/api/v1/organizations/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Advanced Mathematics",
    "code": "ADV_MATH",
    "schoolId": "school-abc-123",
    "parentId": "math-dept-school-a-id",
    "description": "Advanced math sub-department"
  }'
```

**Expected**: ✅ Success, school department created with same-school parent

#### 4. Try Creating School Department with Different-School Parent
```bash
curl -X POST http://localhost:3000/api/v1/organizations/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Science Department",
    "code": "SCI",
    "schoolId": "school-abc-123",
    "parentId": "dept-from-school-xyz-789",
    "description": "Science department"
  }'
```

**Expected**: ❌ 400 Bad Request
**Message**: "School-specific department can only have foundation-level parent or parent from the same school"

#### 5. Code Uniqueness - Same Code Different Scopes
```bash
# Create foundation HR
curl -X POST ... -d '{"name": "HR", "code": "HR"}'

# Create School A HR (should succeed - different scope)
curl -X POST ... -d '{"name": "HR School A", "code": "HR", "schoolId": "school-a"}'
```

**Expected**: ✅ Both succeed (different scopes)

#### 6. Code Uniqueness - Duplicate in Same Scope
```bash
# Create foundation HR
curl -X POST ... -d '{"name": "HR", "code": "HR"}'

# Try creating another foundation HR (should fail)
curl -X POST ... -d '{"name": "HR 2", "code": "HR"}'
```

**Expected**: ❌ 409 Conflict
**Message**: "Department code HR already exists at foundation level"

#### 7. Circular Reference Prevention
```bash
# Update dept A to have dept B as parent
curl -X PATCH .../dept-a -d '{"parentId": "dept-b"}'

# Try updating dept B to have dept A as parent (should fail)
curl -X PATCH .../dept-b -d '{"parentId": "dept-a"}'
```

**Expected**: ❌ 400 Bad Request
**Message**: "Circular reference detected in department hierarchy"

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code review by team lead
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Postman/curl manual testing complete
- [ ] Update API documentation (Swagger)
- [ ] Update changelog

### Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests in staging
- [ ] Verify existing departments still work
- [ ] Create test foundation departments
- [ ] Verify frontend integration
- [ ] Deploy to production
- [ ] Monitor error logs for 24 hours

### Post-Deployment
- [ ] Create sample foundation departments (HR, Finance, IT)
- [ ] Update user documentation
- [ ] Notify frontend team of completion
- [ ] Archive this implementation roadmap

---

## Rollback Plan

If critical issues arise:

1. **Code Rollback**:
   - Revert service file to previous version
   - Frontend will continue to work (backend was already compatible)

2. **Data Cleanup** (if needed):
   ```sql
   -- Find foundation departments created after deployment
   SELECT * FROM gloria_ops.departments
   WHERE "schoolId" IS NULL
   AND "createdAt" > 'DEPLOYMENT_TIMESTAMP';

   -- If needed, assign to default school
   UPDATE gloria_ops.departments
   SET "schoolId" = 'default-school-id'
   WHERE "schoolId" IS NULL;
   ```

3. **Communication**:
   - Notify frontend team immediately
   - Document issues in incident report
   - Schedule postmortem meeting

---

## Contact & Support

**Implementation Owner**: Backend Team
**Frontend Integration**: [Your Team]
**Documentation**: This file + `foundation-departments-backend-requirements.md`
**Testing Guide**: `/frontend/claudedocs/foundation-departments-testing-guide.md`

**Related Files**:
- Service: `/backend/src/modules/organizations/services/departments.service.ts`
- DTOs: `/backend/src/modules/organizations/dto/department.dto.ts`
- Controller: `/backend/src/modules/organizations/controllers/departments.controller.ts`
- Schema: `/backend/prisma/schema.prisma`

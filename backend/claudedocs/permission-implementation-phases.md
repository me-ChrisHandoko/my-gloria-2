# Permission System Implementation Phases

## Overview
Roadmap untuk melengkapi implementasi permission system berdasarkan analisis schema.prisma vs permissions.controller.ts.

**Current Coverage:** 27% (4/15 models)
**Target Coverage:** 100% (15/15 models)

---

## Phase 1: Foundation - Core Permission Assignment (Week 1-2)
**Priority:** 🔴 CRITICAL
**Objective:** Enable basic RBAC functionality

### 1.1 RolePermission Management
**File:** `src/modules/permissions/controllers/role-permissions.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /roles/:roleId/permissions              // Assign permission to role
DELETE /roles/:roleId/permissions/:permId     // Remove permission from role
GET    /roles/:roleId/permissions              // List role permissions (with pagination)
PUT    /roles/:roleId/permissions/:permId     // Update conditions/validity
GET    /roles/:roleId/permissions/effective   // Get effective permissions with inheritance
POST   /roles/:roleId/permissions/bulk-assign // Bulk assign multiple permissions
POST   /roles/:roleId/permissions/bulk-remove // Bulk remove multiple permissions
```

**DTOs Required:**
- `AssignRolePermissionDto` (roleId, permissionId, isGranted, conditions, validFrom, validUntil, grantReason)
- `UpdateRolePermissionDto` (conditions, validFrom, validUntil, isGranted)
- `BulkRolePermissionDto` (roleId, permissionIds[], isGranted, grantReason)

**Service Methods:**
- `assignPermissionToRole(roleId, permissionId, dto, grantedBy)`
- `removePermissionFromRole(roleId, permissionId, userId)`
- `getRolePermissions(roleId, filters, page, limit)`
- `updateRolePermission(roleId, permissionId, dto, userId)`
- `getEffectiveRolePermissions(roleId)` - includes role hierarchy inheritance
- `bulkAssignRolePermissions(roleId, permissionIds[], dto, userId)`

**Validation:**
- Role exists and is active
- Permission exists and is active
- No duplicate assignments (handle unique constraint)
- Check permission dependencies before assignment
- Validate conditions JSON schema
- Track changes in PermissionChangeHistory

---

### 1.2 UserPermission Management
**File:** `src/modules/permissions/controllers/user-permissions.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /users/:userId/permissions                  // Grant permission to user
DELETE /users/:userId/permissions/:permId         // Revoke user permission
GET    /users/:userId/permissions                  // List user permissions (with pagination)
PUT    /users/:userId/permissions/:permId         // Update priority/validity/conditions
GET    /users/:userId/permissions/effective       // Compute effective permissions (user + roles)
GET    /users/:userId/permissions/temporary       // List temporary permissions
POST   /users/:userId/permissions/bulk-assign     // Bulk assign multiple permissions
POST   /users/:userId/permissions/bulk-remove     // Bulk remove multiple permissions
PUT    /users/:userId/permissions/:permId/priority // Update priority for conflict resolution
```

**DTOs Required:**
- `AssignUserPermissionDto` (userProfileId, permissionId, isGranted, conditions, validFrom, validUntil, grantReason, priority, isTemporary)
- `UpdateUserPermissionDto` (conditions, validFrom, validUntil, isGranted, priority)
- `BulkUserPermissionDto` (userProfileId, permissionIds[], isGranted, grantReason, isTemporary)

**Service Methods:**
- `assignPermissionToUser(userId, permissionId, dto, grantedBy)`
- `revokeUserPermission(userId, permissionId, userId)`
- `getUserPermissions(userId, filters, page, limit)`
- `updateUserPermission(userId, permissionId, dto, userId)`
- `getEffectiveUserPermissions(userId)` - resolves user + role permissions with priority
- `getTemporaryPermissions(userId)`
- `bulkAssignUserPermissions(userId, permissionIds[], dto, grantedBy)`

**Validation:**
- User profile exists and is active
- Permission exists and is active
- Validate priority (1-1000 range)
- Check isTemporary requires validUntil
- Validate conditions JSON schema
- Handle priority conflicts (explicit deny > explicit grant > role permissions)
- Track changes in PermissionChangeHistory

---

### 1.3 Fix Bulk Assign Implementation
**File:** `src/modules/permissions/controllers/permissions.controller.ts` (UPDATE)

**Current Issue:** Lines 228-248 have placeholder implementation

**Required Changes:**
```typescript
async bulkAssignPermissions(
  @Body() dto: BulkAssignPermissionsDto,
  @CurrentUser() user: any,
) {
  // Route to appropriate service based on targetType
  switch (dto.targetType) {
    case 'user':
      return this.userPermissionsService.bulkAssign(
        dto.targetId,
        dto.permissionIds,
        { grantReason: dto.grantReason, validUntil: dto.validUntil },
        user.id
      );

    case 'role':
      return this.rolePermissionsService.bulkAssign(
        dto.targetId,
        dto.permissionIds,
        { grantReason: dto.grantReason, validUntil: dto.validUntil },
        user.id
      );

    case 'position':
      throw new BadRequestException(
        'Position-based permissions not supported. Use role-based or user-based assignments.'
      );

    default:
      throw new BadRequestException('Invalid targetType');
  }
}
```

**Validation:**
- Implement actual assignment logic
- Use transaction for atomicity
- Validate all permissions exist before starting
- Create audit logs for each assignment
- Invalidate permission cache for affected users
- Return detailed results (success count, failed items with reasons)

---

### 1.4 Testing & Documentation
- Unit tests for new controllers and services
- Integration tests for permission assignment workflows
- API documentation with Swagger examples
- Update CLAUDE.md with new endpoints

**Success Criteria:**
- ✅ Can assign/revoke permissions to roles
- ✅ Can assign/revoke permissions to users
- ✅ Can query effective permissions (user + role inheritance)
- ✅ Priority and conflict resolution working
- ✅ Bulk operations functional and transactional
- ✅ All changes tracked in audit history

---

## Phase 2: Fine-Grained Access Control (Week 3-4)
**Priority:** 🔴 CRITICAL
**Objective:** Enable resource-level permissions

### 2.1 ResourcePermission Management
**File:** `src/modules/permissions/controllers/resource-permissions.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /resource-permissions                               // Grant resource permission
DELETE /resource-permissions/:id                           // Revoke resource permission
GET    /resource-permissions                               // List resource permissions (admin)
GET    /resources/:resourceType/:resourceId/permissions   // List permissions for specific resource
POST   /resources/permissions/check                        // Check resource-level access
GET    /users/:userId/resources/:resourceType/accessible  // List accessible resources for user
POST   /users/:userId/resources/:resourceType/:resourceId/grant // Grant resource access
POST   /users/:userId/resources/:resourceType/:resourceId/revoke // Revoke resource access
POST   /resources/permissions/bulk-grant                   // Bulk grant resource permissions
GET    /resources/permissions/expiring                     // List expiring resource permissions
```

**DTOs Required:**
- `GrantResourcePermissionDto` (userProfileId, permissionId, resourceType, resourceId, isGranted, validFrom, validUntil, grantReason)
- `CheckResourcePermissionDto` (userId, permissionId, resourceType, resourceId, context?)
- `BulkGrantResourcePermissionDto` (userProfileIds[], permissionId, resourceType, resourceIds[], grantReason)

**Service Methods:**
- `grantResourcePermission(userId, permissionId, resourceType, resourceId, dto, grantedBy)`
- `revokeResourcePermission(resourcePermissionId, userId)`
- `checkResourcePermission(userId, permissionId, resourceType, resourceId, context?)`
- `getUserAccessibleResources(userId, resourceType, action, filters)`
- `getResourcePermissions(resourceType, resourceId, filters)`
- `bulkGrantResourcePermissions(dto, grantedBy)`
- `getExpiringResourcePermissions(daysThreshold)`

**Validation:**
- User profile exists and is active
- Permission exists and is active
- Resource type is valid (from defined list or dynamic)
- Resource ID format validation
- No duplicate resource permissions (unique constraint)
- Check general permission before granting resource permission
- Track changes in PermissionChangeHistory

**Integration:**
- Update PermissionsGuard to check resource-level permissions
- Add `@RequiredResourcePermission(resource, action, resourceIdParam)` decorator
- Cache resource permissions per user

---

### 2.2 Permission Dependency Management
**File:** `src/modules/permissions/controllers/permission-dependencies.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /permission-dependencies                      // Create dependency
GET    /permission-dependencies                      // List all dependencies
GET    /permissions/:permissionId/dependencies      // Get permission dependencies
DELETE /permission-dependencies/:id                 // Remove dependency
GET    /permission-dependencies/tree                // View full dependency tree
POST   /permission-dependencies/validate            // Validate permission assignment chain
```

**DTOs Required:**
- `CreatePermissionDependencyDto` (permissionId, dependsOnId, isRequired)
- `ValidateDependencyDto` (targetType, targetId, permissionIds[])

**Service Methods:**
- `createDependency(permissionId, dependsOnId, isRequired, userId)`
- `getDependencies(permissionId)`
- `removeDependency(dependencyId, userId)`
- `getDependencyTree()`
- `validatePermissionAssignment(targetType, targetId, permissionIds[])`
- `checkCircularDependencies(permissionId, dependsOnId)`

**Validation:**
- Permissions exist and are active
- No circular dependencies
- Validate before all permission assignments (Phase 1 update)
- Prevent deletion if used in assignments

---

### 2.3 Testing & Documentation
- Unit tests for resource permissions and dependencies
- Integration tests for resource access checks
- Performance tests for resource permission queries
- Update guards and decorators documentation

**Success Criteria:**
- ✅ Can grant/revoke resource-specific permissions
- ✅ Can check access to specific resources
- ✅ Can list all accessible resources for a user
- ✅ Permission dependencies enforced on all assignments
- ✅ No circular dependencies possible
- ✅ Resource permission caching working

---

## Phase 3: Enterprise Features - Delegation & Templates (Week 5-6)
**Priority:** 🟡 HIGH
**Objective:** Enable business continuity and standardization

### 3.1 Permission Delegation Management
**File:** `src/modules/permissions/controllers/permission-delegations.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /permission-delegations                     // Create delegation
GET    /permission-delegations/sent                // List delegations I created
GET    /permission-delegations/received            // List delegations I received
GET    /permission-delegations/active              // List all active delegations
GET    /permission-delegations/expiring            // List expiring soon (7 days)
PUT    /permission-delegations/:id/revoke          // Revoke delegation early
GET    /permission-delegations/:id                 // Get delegation details
PUT    /permission-delegations/:id/extend          // Extend expiration date
GET    /users/:userId/delegations/summary          // Delegation summary for user
```

**DTOs Required:**
- `CreatePermissionDelegationDto` (delegateId, permissions (JSON), reason, validFrom, validUntil)
- `RevokeDelegationDto` (revokedReason)
- `ExtendDelegationDto` (newValidUntil, reason)

**Service Methods:**
- `createDelegation(delegatorId, dto, userId)`
- `revokeDelegation(delegationId, reason, userId)`
- `getSentDelegations(delegatorId, filters)`
- `getReceivedDelegations(delegateId, filters)`
- `getActiveDelegations(filters)`
- `getExpiringDelegations(daysThreshold)`
- `extendDelegation(delegationId, newValidUntil, reason, userId)`
- `autoExpireDelegations()` - scheduled job

**Validation:**
- Delegate user exists and is active
- Delegator and delegate are different users
- Permissions JSON structure is valid
- validUntil is in the future
- No overlapping active delegations for same permissions
- Track changes in PermissionChangeHistory
- Notify both parties (delegator and delegate)

**Integration:**
- Update permission resolution to include active delegations
- Add scheduled job to auto-expire delegations
- Send notifications 24h before expiry

---

### 3.2 Permission Template Management
**File:** `src/modules/permissions/controllers/permission-templates.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /permission-templates                       // Create template
GET    /permission-templates                       // List templates
GET    /permission-templates/:id                   // Get template details
PUT    /permission-templates/:id                   // Update template
DELETE /permission-templates/:id                   // Delete template
POST   /permission-templates/:id/apply             // Apply template to target
POST   /permission-templates/:id/preview           // Preview permissions
GET    /permission-templates/:id/applications      // List template applications
POST   /permission-templates/:id/applications/:appId/revoke // Revoke application
GET    /permission-templates/categories            // List template categories
POST   /permission-templates/:id/version           // Create new version
GET    /permission-templates/:id/versions          // List template versions
```

**DTOs Required:**
- `CreatePermissionTemplateDto` (code, name, description, category, permissions (JSON), moduleAccess (JSON), isSystem)
- `UpdatePermissionTemplateDto` (name, description, permissions, moduleAccess, isActive)
- `ApplyTemplateDto` (targetType (ROLE, USER, DEPARTMENT, POSITION), targetId, appliedBy, notes)
- `RevokeTemplateApplicationDto` (revokedReason)

**Service Methods:**
- `createTemplate(dto, userId)`
- `updateTemplate(templateId, dto, userId)`
- `deleteTemplate(templateId, userId)` - soft delete if has applications
- `getTemplates(filters, page, limit)`
- `getTemplateById(templateId)`
- `applyTemplate(templateId, dto, userId)` - creates permissions based on targetType
- `previewTemplate(templateId, targetType, targetId)` - simulate application
- `getTemplateApplications(templateId, filters)`
- `revokeTemplateApplication(applicationId, dto, userId)` - removes granted permissions
- `getTemplateCategories()`
- `createTemplateVersion(templateId, userId)` - increment version

**Validation:**
- Template code is unique
- Permissions JSON structure is valid
- All permission codes in template exist
- Cannot delete system templates
- Cannot modify template if applications exist (create new version instead)
- Track template changes with versioning
- Track applications in PermissionTemplateApplication

**Integration:**
- Create RolePermission or UserPermission records when applying
- Link to original template for tracking
- Support revocation by template (remove all permissions from template)

---

### 3.3 Role Template Management
**File:** `src/modules/permissions/controllers/role-templates.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /role-templates                             // Create role template
GET    /role-templates                             // List role templates
GET    /role-templates/:id                         // Get template details
PUT    /role-templates/:id                         // Update template
DELETE /role-templates/:id                         // Delete template
POST   /role-templates/:id/instantiate             // Create role from template
```

**DTOs Required:**
- `CreateRoleTemplateDto` (code, name, description, category, permissions (JSON), isActive)
- `InstantiateRoleDto` (name, description, schoolId?, departmentId?, hierarchyLevel)

**Service Methods:**
- `createRoleTemplate(dto, userId)`
- `getRoleTemplates(filters)`
- `instantiateRole(templateId, dto, userId)` - creates Role + RolePermissions
- `updateRoleTemplate(templateId, dto, userId)`
- `deleteRoleTemplate(templateId, userId)`

---

### 3.4 Testing & Documentation
- Unit tests for delegations and templates
- Integration tests for template application workflows
- Scheduled job tests for auto-expiry
- Documentation for template structure

**Success Criteria:**
- ✅ Can create and manage permission delegations
- ✅ Delegations auto-expire correctly
- ✅ Can create and apply permission templates
- ✅ Template versioning working
- ✅ Template applications tracked and revocable
- ✅ Role templates create complete roles

---

## Phase 4: Advanced Security - Policies & Analytics (Week 7-8)
**Priority:** 🟡 HIGH
**Objective:** Enable context-aware access control and security monitoring

### 4.1 Permission Policy Management
**File:** `src/modules/permissions/controllers/permission-policies.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /permission-policies                        // Create policy
GET    /permission-policies                        // List policies
GET    /permission-policies/:id                    // Get policy details
PUT    /permission-policies/:id                    // Update policy
DELETE /permission-policies/:id                    // Delete policy
POST   /permission-policies/:id/test               // Test policy evaluation
POST   /permission-policies/:id/activate           // Activate policy
POST   /permission-policies/:id/deactivate         // Deactivate policy
GET    /permission-policies/types                  // List policy types
POST   /permission-policies/evaluate               // Evaluate policies for context
```

**Policy Types (from schema):**
- `TIME_BASED`: Business hours, specific days, time ranges
- `LOCATION_BASED`: IP ranges, geofencing, allowed locations
- `ATTRIBUTE_BASED`: User attributes, department, position level
- `CONTEXTUAL`: Device type, MFA status, risk score
- `HIERARCHICAL`: Position hierarchy, department hierarchy

**DTOs Required:**
- `CreatePermissionPolicyDto` (code, name, description, policyType, rules (JSON), priority, isActive)
- `UpdatePermissionPolicyDto` (name, description, rules, priority, isActive)
- `TestPolicyDto` (userId, resource, action, context (timestamp, ip, location, device, etc.))
- `EvaluatePoliciesDto` (userId, resource, action, scope, resourceId?, context)

**Service Methods:**
- `createPolicy(dto, userId)`
- `updatePolicy(policyId, dto, userId)`
- `deletePolicy(policyId, userId)`
- `getPolicies(filters, page, limit)`
- `getPolicyById(policyId)`
- `activatePolicy(policyId, userId)`
- `deactivatePolicy(policyId, userId)`
- `testPolicy(policyId, dto)` - simulate policy evaluation
- `evaluatePolicies(dto)` - evaluate all active policies for request
- `getPolicyTypes()`

**Rules JSON Structure Examples:**
```json
// TIME_BASED
{
  "allowedDays": ["MON", "TUE", "WED", "THU", "FRI"],
  "allowedHours": "09:00-17:00",
  "timezone": "Asia/Jakarta",
  "excludeHolidays": true
}

// LOCATION_BASED
{
  "allowedIpRanges": ["10.0.0.0/8", "172.16.0.0/12"],
  "allowedCountries": ["ID"],
  "blockedCountries": [],
  "requireVPN": true
}

// ATTRIBUTE_BASED
{
  "requiredAttributes": {
    "department": ["HR", "Finance"],
    "minPositionLevel": 5,
    "employmentType": "PERMANENT"
  }
}

// CONTEXTUAL
{
  "requireMFA": true,
  "allowedDeviceTypes": ["desktop", "laptop"],
  "maxRiskScore": 50,
  "requireApprovedDevice": true
}

// HIERARCHICAL
{
  "minHierarchyLevel": 3,
  "allowedDepartments": ["HQ", "IT"],
  "requireDirectReport": false
}
```

**Validation:**
- Policy code is unique
- Rules JSON matches policyType schema
- Priority is positive integer
- Cannot delete if has active assignments
- Track changes in PermissionChangeHistory

---

### 4.2 Policy Assignment Management
**File:** `src/modules/permissions/controllers/policy-assignments.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /policy-assignments                         // Assign policy to entity
DELETE /policy-assignments/:id                     // Remove assignment
GET    /policy-assignments                         // List all assignments (admin)
GET    /policies/:policyId/assignments             // List policy assignments
GET    /users/:userId/policies                     // User's active policies
GET    /roles/:roleId/policies                     // Role's active policies
GET    /departments/:deptId/policies               // Department's active policies
GET    /positions/:positionId/policies             // Position's active policies
POST   /policy-assignments/bulk-assign             // Bulk assign policy
```

**DTOs Required:**
- `AssignPolicyDto` (policyId, assigneeType (ROLE, USER, DEPARTMENT, POSITION), assigneeId, conditions (JSON), validFrom, validUntil)
- `BulkAssignPolicyDto` (policyId, assigneeType, assigneeIds[], validFrom, validUntil)

**Service Methods:**
- `assignPolicy(dto, userId)`
- `removeAssignment(assignmentId, userId)`
- `getPolicyAssignments(policyId, filters)`
- `getUserPolicies(userId)`
- `getRolePolicies(roleId)`
- `getDepartmentPolicies(deptId)`
- `getPositionPolicies(positionId)`
- `bulkAssignPolicy(dto, userId)`

**Validation:**
- Policy exists and is active
- Assignee exists based on assigneeType
- No duplicate assignments (unique constraint)
- Conditions JSON is valid
- Track changes in PermissionChangeHistory

**Integration:**
- Update permission validation to include policy evaluation
- Policies evaluated in priority order (highest first)
- Policy DENY overrides permission GRANT
- Cache policy assignments per user

---

### 4.3 Permission Analytics & Monitoring
**File:** `src/modules/permissions/controllers/permission-analytics.controller.ts` (NEW)

**Endpoints:**
```typescript
GET    /permission-analytics/usage                     // Permission usage statistics
GET    /permission-analytics/anomalies                 // Detected anomalies
GET    /permission-analytics/users/:userId/patterns    // User access patterns
GET    /permission-analytics/permissions/:code/usage   // Permission utilization
GET    /permission-analytics/performance               // Permission check performance
GET    /permission-analytics/trends                    // Usage trends over time
GET    /permission-analytics/top-users                 // Most active users
GET    /permission-analytics/top-permissions           // Most used permissions
GET    /permission-analytics/denied                    // Most denied permissions
POST   /permission-analytics/export                    // Export analytics data
```

**DTOs Required:**
- `AnalyticsFilterDto` (startDate, endDate, userProfileId?, permissionCode?, resource?, minAnomalyScore?)
- `TrendFilterDto` (period (DAY, WEEK, MONTH), startDate, endDate, groupBy?)

**Service Methods:**
- `getUsageStatistics(filters)` - aggregate permission checks
- `getAnomalies(filters)` - filter by anomalyScore > threshold
- `getUserAccessPatterns(userId, filters)`
- `getPermissionUsage(permissionCode, filters)`
- `getPerformanceMetrics(filters)` - average responseTime, slow checks
- `getTrends(filters)` - time-series data
- `getTopUsers(filters, limit)`
- `getTopPermissions(filters, limit)`
- `getMostDenied(filters, limit)`
- `exportAnalytics(filters, format)` - CSV/JSON export

**Background Job:**
- `recordPermissionCheck(userId, permissionCode, action, resource, resourceId, result, duration, context)`
- Calculate anomaly score based on:
  - Unusual access time
  - Unusual resource access
  - High frequency in short time
  - Access from unusual location

**Validation:**
- Date ranges are valid
- Aggregate data for performance (don't query raw logs directly)
- Cache analytics results for common queries

---

### 4.4 Testing & Documentation
- Unit tests for policies and analytics
- Integration tests for policy evaluation
- Performance tests for policy evaluation overhead
- Security tests for policy bypass attempts
- Analytics dashboard documentation

**Success Criteria:**
- ✅ Can create and assign policies
- ✅ Policies correctly evaluated in permission checks
- ✅ Policy priorities working correctly
- ✅ Anomalies detected and recorded
- ✅ Analytics data available and performant
- ✅ Export functionality working

---

## Phase 5: Compliance & Audit (Week 9-10)
**Priority:** 🟡 HIGH
**Objective:** Enable compliance auditing and change management

### 5.1 Permission Change History
**File:** `src/modules/permissions/controllers/permission-history.controller.ts` (NEW)

**Endpoints:**
```typescript
GET    /permission-history                          // List all permission changes
GET    /permission-history/:entityType/:entityId    // Entity change history
GET    /permission-history/users/:userId            // Changes by user
GET    /permission-history/date-range               // Changes in date range
POST   /permission-history/:changeId/rollback       // Rollback a change
GET    /permission-history/compare/:id1/:id2        // Compare two states
GET    /permission-history/rollbacks                // List rollback history
POST   /permission-history/export                   // Export for compliance
```

**DTOs Required:**
- `HistoryFilterDto` (entityType?, entityId?, performedBy?, startDate?, endDate?, operation?, page, limit)
- `RollbackDto` (reason, confirmedBy)
- `CompareStatesDto` (changeId1, changeId2)

**Service Methods:**
- `getChangeHistory(filters, page, limit)`
- `getEntityHistory(entityType, entityId, filters)`
- `getUserChanges(userId, filters)`
- `getChangesByDateRange(startDate, endDate, filters)`
- `rollbackChange(changeId, dto, userId)` - reverses the change
- `compareStates(changeId1, changeId2)` - shows differences
- `getRollbackHistory(filters)`
- `exportHistory(filters, format)` - CSV/JSON export

**Auto-Recording:**
Update all permission services to automatically create PermissionChangeHistory records:
- Record before and after state for all modifications
- Include metadata (IP, user agent, request context)
- Mark isRollbackable based on operation type
- Link rollbacks to original change via rollbackOf

**Validation:**
- Only rollbackable changes can be rolled back
- Rollback creates new history entry
- Cannot rollback a rollback
- Require admin permission for rollback
- Validate state consistency before rollback

---

### 5.2 Permission Check Logs
**File:** `src/modules/permissions/controllers/permission-check-logs.controller.ts` (NEW)

**Endpoints:**
```typescript
GET    /permission-check-logs                       // List permission checks (admin)
GET    /permission-check-logs/denied                // List denied access attempts
GET    /permission-check-logs/users/:userId         // User's access history
GET    /permission-check-logs/resources/:resource   // Resource access history
GET    /permission-check-logs/slow                  // Slow permission checks (>100ms)
GET    /permission-check-logs/summary               // Access summary statistics
POST   /permission-check-logs/export                // Export for compliance
GET    /permission-check-logs/users/:userId/denied  // User's denied attempts
```

**DTOs Required:**
- `CheckLogFilterDto` (userProfileId?, resource?, action?, scope?, isAllowed?, startDate?, endDate?, minDuration?, page, limit)
- `ExportCheckLogsDto` (filters, format (CSV, JSON), includeMetadata)

**Service Methods:**
- `getCheckLogs(filters, page, limit)`
- `getDeniedAccessAttempts(filters, page, limit)`
- `getUserAccessHistory(userId, filters, page, limit)`
- `getResourceAccessHistory(resource, filters, page, limit)`
- `getSlowChecks(minDuration, filters, page, limit)`
- `getAccessSummary(filters)` - aggregate statistics
- `exportCheckLogs(filters, format)`
- `getUserDeniedAttempts(userId, filters)`

**Auto-Recording:**
Update PermissionsGuard and PermissionValidationService to log every check:
- Log after permission evaluation
- Include full context (resource, action, scope, resourceId)
- Record result (allowed/denied) and reason if denied
- Track check duration for performance monitoring
- Include metadata (IP, user agent, timestamp)

**Background Job:**
- Archive old logs (>90 days) to separate table
- Aggregate daily statistics for reporting
- Clean up logs older than retention period

**Validation:**
- Date ranges are valid
- Implement pagination for large datasets
- Index optimization for common queries
- Cache summary statistics

---

### 5.3 Testing & Documentation
- Unit tests for history and logging
- Integration tests for rollback operations
- Compliance report generation tests
- Performance tests for log queries
- Documentation for audit procedures

**Success Criteria:**
- ✅ All permission changes tracked in history
- ✅ Rollback operations working correctly
- ✅ All permission checks logged
- ✅ Can query denied access attempts
- ✅ Can generate compliance reports
- ✅ Export functionality working
- ✅ Performance acceptable for large datasets

---

## Phase 6: UI & Completion (Week 11-12)
**Priority:** 🟢 MEDIUM
**Objective:** Complete remaining endpoints and optimize

### 6.1 Complete PermissionGroup CRUD
**File:** `src/modules/permissions/controllers/permissions.controller.ts` (UPDATE)

**Missing Endpoints:**
```typescript
GET    /groups/:id                                  // Get group by ID
DELETE /groups/:id                                  // Delete permission group
```

**Service Methods:**
- `getPermissionGroupById(groupId)`
- `deletePermissionGroup(groupId, userId)` - soft delete or restrict if has permissions

---

### 6.2 Bulk Operations Enhancement
**File:** `src/modules/permissions/controllers/bulk-operations.controller.ts` (NEW)

**Endpoints:**
```typescript
POST   /bulk-operations/permissions/assign          // Bulk assign (fixed implementation)
POST   /bulk-operations/permissions/revoke          // Bulk revoke
POST   /bulk-operations/permissions/update-validity // Bulk update validity dates
POST   /bulk-operations/permissions/transfer        // Transfer permissions between users
GET    /bulk-operations/progress/:operationId       // Check operation progress
GET    /bulk-operations/history                     // List bulk operations history
```

**DTOs Required:**
- `BulkRevokeDto` (targetType, targetIds[], permissionIds[], reason)
- `BulkUpdateValidityDto` (targetType, targetIds[], permissionIds[], validFrom, validUntil)
- `TransferPermissionsDto` (fromUserId, toUserId, permissionIds[], reason)

**Service Methods:**
- Track progress in BulkOperationProgress table
- Run operations asynchronously for large datasets
- Implement transaction and rollback on error
- Return operation ID for progress tracking

---

### 6.3 Performance Optimization
**Tasks:**
- Add Redis caching for frequently accessed permissions
- Optimize permission resolution queries (reduce N+1)
- Add database query performance monitoring
- Implement permission computation caching
- Optimize policy evaluation performance
- Add indexes for common query patterns

**Cache Strategy:**
```typescript
// User effective permissions cache (5 minutes)
cache:permissions:user:{userId}:effective

// Role permissions cache (10 minutes)
cache:permissions:role:{roleId}:effective

// Policy evaluation cache (1 minute)
cache:policies:evaluation:{userId}:{resource}:{action}

// Resource permissions cache (5 minutes)
cache:permissions:resource:{resourceType}:{resourceId}
```

---

### 6.4 Admin UI Support Endpoints
**File:** `src/modules/permissions/controllers/permission-admin.controller.ts` (NEW)

**Endpoints:**
```typescript
GET    /admin/permissions/overview                  // System-wide permission overview
GET    /admin/permissions/conflicts                 // Detect permission conflicts
GET    /admin/permissions/orphaned                  // Find orphaned permissions
GET    /admin/permissions/unused                    // Find unused permissions
POST   /admin/permissions/health-check              // System health check
POST   /admin/permissions/optimize                  // Optimize permission cache
GET    /admin/permissions/statistics/detailed       // Detailed statistics dashboard
```

---

### 6.5 Testing & Documentation
- End-to-end tests for complete workflows
- Load testing for permission checks
- Security penetration testing
- Complete API documentation
- Admin guide and user guide
- Architecture documentation

**Success Criteria:**
- ✅ All 15 permission models have full API coverage
- ✅ Performance meets SLA (<50ms permission checks)
- ✅ Cache hit rate >80%
- ✅ All tests passing with >80% coverage
- ✅ Documentation complete
- ✅ Security audit passed

---

## Implementation Guidelines

### Code Organization
```
src/modules/permissions/
├── controllers/
│   ├── permissions.controller.ts              (existing - update)
│   ├── role-permissions.controller.ts         (new - Phase 1)
│   ├── user-permissions.controller.ts         (new - Phase 1)
│   ├── resource-permissions.controller.ts     (new - Phase 2)
│   ├── permission-dependencies.controller.ts  (new - Phase 2)
│   ├── permission-delegations.controller.ts   (new - Phase 3)
│   ├── permission-templates.controller.ts     (new - Phase 3)
│   ├── role-templates.controller.ts           (new - Phase 3)
│   ├── permission-policies.controller.ts      (new - Phase 4)
│   ├── policy-assignments.controller.ts       (new - Phase 4)
│   ├── permission-analytics.controller.ts     (new - Phase 4)
│   ├── permission-history.controller.ts       (new - Phase 5)
│   ├── permission-check-logs.controller.ts    (new - Phase 5)
│   ├── bulk-operations.controller.ts          (new - Phase 6)
│   └── permission-admin.controller.ts         (new - Phase 6)
├── services/
│   ├── permissions.service.ts                 (existing - update)
│   ├── role-permissions.service.ts            (new - Phase 1)
│   ├── user-permissions.service.ts            (new - Phase 1)
│   ├── resource-permissions.service.ts        (new - Phase 2)
│   ├── permission-dependencies.service.ts     (new - Phase 2)
│   ├── permission-delegations.service.ts      (new - Phase 3)
│   ├── permission-templates.service.ts        (new - Phase 3)
│   ├── role-templates.service.ts              (new - Phase 3)
│   ├── permission-policies.service.ts         (new - Phase 4)
│   ├── policy-assignments.service.ts          (new - Phase 4)
│   ├── policy-evaluator.service.ts            (new - Phase 4)
│   ├── permission-analytics.service.ts        (new - Phase 4)
│   ├── permission-history.service.ts          (new - Phase 5)
│   ├── permission-check-logs.service.ts       (new - Phase 5)
│   └── permission-cache.service.ts            (existing - update)
├── dto/
│   ├── permission.dto.ts                      (existing - update)
│   ├── role-permission.dto.ts                 (new - Phase 1)
│   ├── user-permission.dto.ts                 (new - Phase 1)
│   ├── resource-permission.dto.ts             (new - Phase 2)
│   ├── permission-dependency.dto.ts           (new - Phase 2)
│   ├── permission-delegation.dto.ts           (new - Phase 3)
│   ├── permission-template.dto.ts             (new - Phase 3)
│   ├── permission-policy.dto.ts               (new - Phase 4)
│   ├── policy-assignment.dto.ts               (new - Phase 4)
│   ├── permission-analytics.dto.ts            (new - Phase 4)
│   └── permission-history.dto.ts              (new - Phase 5)
├── guards/
│   └── permissions.guard.ts                   (existing - update with policies)
├── decorators/
│   ├── permissions.decorator.ts               (existing - update)
│   └── resource-permissions.decorator.ts      (new - Phase 2)
└── jobs/
    ├── expire-delegations.job.ts              (new - Phase 3)
    ├── cleanup-permissions.job.ts             (new - Phase 3)
    └── aggregate-analytics.job.ts             (new - Phase 4)
```

### Best Practices

1. **Transactions:** Use Prisma transactions for all multi-step operations
2. **Audit Trail:** Every change must create PermissionChangeHistory record
3. **Cache Invalidation:** Invalidate affected caches after any permission change
4. **Error Handling:** Provide clear error messages with actionable guidance
5. **Validation:** Validate all inputs with class-validator
6. **Authorization:** All endpoints require appropriate permissions
7. **Rate Limiting:** Apply rate limits to prevent abuse
8. **Logging:** Log all permission-related operations
9. **Testing:** Write tests before implementation (TDD)
10. **Documentation:** Update Swagger and CLAUDE.md with each new endpoint

### Testing Strategy

**Unit Tests:**
- Service methods with mocked Prisma
- DTO validation
- Policy evaluation logic
- Dependency checking logic

**Integration Tests:**
- Controller endpoints with test database
- Permission resolution workflows
- Cache behavior
- Transaction rollback

**E2E Tests:**
- Complete user workflows
- Permission inheritance
- Policy enforcement
- Bulk operations

**Performance Tests:**
- Permission check latency (<50ms target)
- Bulk operations throughput
- Cache hit rate (>80% target)
- Database query performance

---

## Timeline Summary

| Phase | Duration | Models | Priority | Status |
|-------|----------|--------|----------|--------|
| Phase 1: Core Permission Assignment | Week 1-2 | RolePermission, UserPermission | 🔴 CRITICAL | 📋 Planned |
| Phase 2: Fine-Grained Access Control | Week 3-4 | ResourcePermission, PermissionDependency | 🔴 CRITICAL | 📋 Planned |
| Phase 3: Delegation & Templates | Week 5-6 | PermissionDelegation, PermissionTemplate, RoleTemplate | 🟡 HIGH | 📋 Planned |
| Phase 4: Policies & Analytics | Week 7-8 | PermissionPolicy, PolicyAssignment, PermissionAnalytics | 🟡 HIGH | 📋 Planned |
| Phase 5: Compliance & Audit | Week 9-10 | PermissionChangeHistory, PermissionCheckLog | 🟡 HIGH | 📋 Planned |
| Phase 6: UI & Completion | Week 11-12 | Bulk Operations, Admin Tools, Optimization | 🟢 MEDIUM | 📋 Planned |

**Total Duration:** 12 weeks (3 months)
**Coverage Improvement:** 27% → 100% (15/15 models)

---

## Risk Mitigation

### Technical Risks
- **Performance degradation:** Implement caching and optimize queries early
- **Data inconsistency:** Use transactions and validation
- **Breaking changes:** Version API endpoints if needed
- **Cache complexity:** Implement gradual cache strategy

### Business Risks
- **Feature delay:** Prioritize critical features first
- **User confusion:** Provide clear documentation and examples
- **Migration complexity:** Create migration scripts for existing data
- **Training needed:** Prepare admin training materials

---

## Success Metrics

### Coverage Metrics
- ✅ 100% of schema models have API endpoints
- ✅ All CRUD operations implemented
- ✅ All relationships queryable

### Performance Metrics
- ✅ Permission checks <50ms (p95)
- ✅ Cache hit rate >80%
- ✅ API response time <200ms (p95)
- ✅ Bulk operations handle 1000+ items

### Quality Metrics
- ✅ Test coverage >80%
- ✅ Zero security vulnerabilities
- ✅ API documentation 100% complete
- ✅ All audit trails working

---

## Post-Implementation

### Monitoring
- Permission check latency
- Cache hit/miss rates
- Denied access attempts
- Anomaly detection alerts
- Policy evaluation performance

### Maintenance
- Regular cache cleanup
- Log archival
- Performance optimization
- Security audit reviews
- Update documentation

### Future Enhancements
- Machine learning for anomaly detection
- Automated permission recommendations
- Permission simulation/sandbox mode
- Visual permission hierarchy editor
- Real-time permission updates via WebSocket

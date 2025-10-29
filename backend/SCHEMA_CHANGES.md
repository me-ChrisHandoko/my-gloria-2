# Schema.prisma Changes Required

## Models to REMOVE

Remove the following model definitions from `prisma/schema.prisma`:

### 1. PermissionTemplate (lines ~435-455)
```prisma
model PermissionTemplate {
  id                   String                          @id
  code                 String                          @unique
  name                 String
  description          String?
  category             String
  permissions          Json
  moduleAccess         Json?                           @map("module_access")
  isSystem             Boolean                         @default(false) @map("is_system")
  isActive             Boolean                         @default(true) @map("is_active")
  createdAt            DateTime                        @default(now()) @map("created_at")
  updatedAt            DateTime                        @updatedAt @map("updated_at")
  createdBy            String?                         @map("created_by")
  version              Int                             @default(0)
  templateApplications PermissionTemplateApplication[]

  @@index([category, isActive])
  @@index([id, version])
  @@map("permission_templates")
  @@schema("gloria_ops")
}
```

### 2. PermissionTemplateApplication (lines ~457-474)
```prisma
model PermissionTemplateApplication {
  id         String             @id
  templateId String             @map("template_id")
  targetType String             @map("target_type")
  targetId   String             @map("target_id")
  appliedBy  String             @map("applied_by")
  appliedAt  DateTime           @default(now()) @map("applied_at")
  revokedBy  String?            @map("revoked_by")
  revokedAt  DateTime?          @map("revoked_at")
  isActive   Boolean            @default(true) @map("is_active")
  notes      String?
  template   PermissionTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, targetType, targetId])
  @@index([targetType, targetId, isActive])
  @@map("permission_template_applications")
  @@schema("gloria_ops")
}
```

### 3. PermissionDependency (lines ~383-394)
```prisma
model PermissionDependency {
  id           String     @id
  permissionId String     @map("permission_id")
  dependsOnId  String     @map("depends_on_id")
  isRequired   Boolean    @default(true) @map("is_required")
  dependsOn    Permission @relation("DependentRelation", fields: [dependsOnId], references: [id], onDelete: Cascade)
  permission   Permission @relation("PermissionRelation", fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([permissionId, dependsOnId])
  @@map("permission_dependencies")
  @@schema("gloria_ops")
}
```

### 4. RoleTemplate (lines ~419-433) - ORPHANED
```prisma
model RoleTemplate {
  id          String   @id
  code        String   @unique
  name        String
  description String?
  category    String
  permissions Json
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  createdBy   String?  @map("created_by")

  @@map("role_templates")
  @@schema("gloria_ops")
}
```

### 5. PermissionAnalytics (lines ~522-541) - UNUSED
```prisma
model PermissionAnalytics {
  id             String   @id
  userProfileId  String   @map("user_profile_id")
  permissionCode String   @map("permission_code")
  action         String
  resource       String?
  resourceId     String?  @map("resource_id")
  result         String?
  responseTime   Int?     @map("response_time")
  context        Json?
  anomalyScore   Float?   @map("anomaly_score")
  anomalyReasons Json?    @map("anomaly_reasons")
  timestamp      DateTime @default(now())

  @@index([userProfileId, timestamp])
  @@index([permissionCode, timestamp])
  @@index([anomalyScore])
  @@map("permission_analytics")
  @@schema("gloria_ops")
}
```

### 6. PermissionPolicy (lines ~543-560)
```prisma
model PermissionPolicy {
  id                String             @id
  code              String             @unique
  name              String
  description       String?
  policyType        PolicyType         @map("policy_type")
  rules             Json
  priority          Int                @default(100)
  isActive          Boolean            @default(true) @map("is_active")
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  createdBy         String?            @map("created_by")
  policyAssignments PolicyAssignment[]

  @@index([policyType, isActive])
  @@map("permission_policies")
  @@schema("gloria_ops")
}
```

### 7. PolicyAssignment (lines ~562-579)
```prisma
model PolicyAssignment {
  id           String           @id
  policyId     String           @map("policy_id")
  assigneeType AssigneeType     @map("assignee_type")
  assigneeId   String           @map("assignee_id")
  conditions   Json?
  validFrom    DateTime         @default(now()) @map("valid_from")
  validUntil   DateTime?        @map("valid_until")
  assignedBy   String           @map("assigned_by")
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")
  policy       PermissionPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)

  @@unique([policyId, assigneeType, assigneeId])
  @@index([assigneeType, assigneeId])
  @@map("policy_assignments")
  @@schema("gloria_ops")
}
```

---

## Relationships to UPDATE

### Permission model - Remove dependency relations
```prisma
model Permission {
  // ... keep existing fields ...

  // ❌ REMOVE these lines:
  dependentOn         PermissionDependency[] @relation("DependentRelation")
  dependencies        PermissionDependency[] @relation("PermissionRelation")

  // ✅ Keep all other relationships
}
```

### UserProfile model - No changes needed
The PermissionDelegation relation should be kept as delegation is still a valid feature.

---

## Enums to POTENTIALLY REMOVE

Check if these enums are only used by deleted models:

```prisma
enum PolicyType {
  TIME_BASED
  LOCATION_BASED
  ATTRIBUTE_BASED
  CONTEXTUAL
  HIERARCHICAL

  @@schema("gloria_ops")
}

enum AssigneeType {
  ROLE
  USER
  DEPARTMENT
  POSITION

  @@schema("gloria_ops")
}
```

**Action**:
- If `PolicyType` is ONLY used by PermissionPolicy → **REMOVE**
- If `AssigneeType` is used elsewhere → **KEEP**
- Check usage with: `grep -r "PolicyType\|AssigneeType" src/`

---

## After Schema Changes

1. **Format schema**:
   ```bash
   npx prisma format
   ```

2. **Validate schema**:
   ```bash
   npx prisma validate
   ```

3. **Generate migration**:
   ```bash
   npx prisma migrate dev --name remove_over_engineered_permission_features --create-only
   ```

4. **Review migration file** before applying

5. **Apply migration**:
   ```bash
   npx prisma migrate dev
   ```

6. **Regenerate client**:
   ```bash
   npx prisma generate
   ```

---

## Line Numbers Reference

Use these approximate line numbers to locate models in schema.prisma:

- **PermissionDependency**: ~383-394
- **RoleTemplate**: ~419-433
- **PermissionTemplate**: ~435-455
- **PermissionTemplateApplication**: ~457-474
- **PermissionAnalytics**: ~522-541
- **PermissionPolicy**: ~543-560
- **PolicyAssignment**: ~562-579

**Note**: Line numbers may shift as you delete models. Start from bottom to top to maintain accuracy.

---

## Verification Checklist

After making changes:

- [ ] All 7 models removed from schema.prisma
- [ ] Permission model updated (dependency relations removed)
- [ ] Unused enums removed (if applicable)
- [ ] `npx prisma format` runs without errors
- [ ] `npx prisma validate` passes
- [ ] Migration generated successfully
- [ ] Migration file reviewed and correct
- [ ] Migration applied successfully
- [ ] `npx prisma generate` completes
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors related to Prisma client

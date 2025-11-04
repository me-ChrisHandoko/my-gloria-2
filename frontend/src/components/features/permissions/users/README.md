# Users Permission Management Components

Phase 3 & 4 implementation for user role and permission management.

## Overview

This directory contains 6 components for comprehensive user permission management:

1. **UserAssignmentTabs.tsx** - Main tabbed interface
2. **UserRolesList.tsx** - User role assignments management
3. **UserPermissionsList.tsx** - User direct permissions management
4. **UserRoleAssignment.tsx** - Role assignment dialog
5. **UserPermissionAssignment.tsx** - Permission assignment dialog
6. **UserPermissionAudit.tsx** - Comprehensive permission audit view

## Component Details

### 1. UserAssignmentTabs

Main page component with three tabs: Roles | Permissions | Audit

**Props:**
- `userId: string` - Required. The user's ID
- `userName?: string` - Optional. Display name
- `userEmail?: string` - Optional. User email for display
- `defaultTab?: 'roles' | 'permissions' | 'audit'` - Optional. Default tab to open

**Usage:**
```tsx
import { UserAssignmentTabs } from '@/components/features/permissions/users';

<UserAssignmentTabs
  userId="user-123"
  userName="John Doe"
  userEmail="john@example.com"
  defaultTab="roles"
/>
```

### 2. UserRolesList

Displays and manages user's assigned roles with temporal support.

**Features:**
- List all roles assigned to user
- View role hierarchy level
- Temporal role indicators (scheduled, active, expired)
- Assign new role button
- Revoke role action
- Empty state handling

**API Hooks:**
- `useGetUserRolesQuery` - Fetch user roles
- `useRevokeUserRoleMutation` - Revoke a role

**Props:**
- `userId: string` - Required. The user's ID

### 3. UserPermissionsList

Displays and manages user's direct permissions.

**Features:**
- List direct permissions with grant/deny status
- Resource-specific permission indicators
- Temporal permission indicators
- Priority display
- Assign new permission button
- Revoke permission action
- Filter by status

**API Hooks:**
- `useGetUserPermissionsQuery` - Fetch user permissions
- `useRevokeUserPermissionMutation` - Revoke a permission

**Props:**
- `userId: string` - Required. The user's ID

### 4. UserRoleAssignment

Dialog for assigning roles to users with temporal settings.

**Features:**
- Role selection dropdown
- Temporal settings (effectiveFrom/To)
- Form validation
- Loading and error states
- Success callback

**API Hooks:**
- `useAssignUserRoleMutation` - Assign role to user
- `useGetRolesQuery` - Load available roles

**Props:**
- `userId: string` - Required. The user's ID
- `open: boolean` - Required. Dialog open state
- `onOpenChange: (open: boolean) => void` - Required. Dialog state handler
- `onSuccess?: () => void` - Optional. Success callback

**Usage:**
```tsx
const [dialogOpen, setDialogOpen] = useState(false);

<UserRoleAssignment
  userId="user-123"
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  onSuccess={() => {
    setDialogOpen(false);
    refetch();
  }}
/>
```

### 5. UserPermissionAssignment

Dialog for assigning direct permissions to users.

**Features:**
- Permission selection dropdown
- Grant/Deny toggle
- Resource-specific permissions (resourceType, resourceId)
- Temporal settings (effectiveFrom/To)
- Priority setting (0-100)
- Form validation
- Loading and error states

**API Hooks:**
- `useGrantUserPermissionMutation` - Grant/deny permission to user
- `useGetPermissionsQuery` - Load available permissions

**Props:**
- `userId: string` - Required. The user's ID
- `open: boolean` - Required. Dialog open state
- `onOpenChange: (open: boolean) => void` - Required. Dialog state handler
- `onSuccess?: () => void` - Optional. Success callback

**Usage:**
```tsx
const [dialogOpen, setDialogOpen] = useState(false);

<UserPermissionAssignment
  userId="user-123"
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  onSuccess={() => {
    setDialogOpen(false);
    refetch();
  }}
/>
```

### 6. UserPermissionAudit

Comprehensive audit view of all user permissions.

**Features:**
- Statistics summary (total roles, permissions, module accesses)
- Direct roles display with status badges
- Direct permissions display
- Inherited permissions from roles
- All effective permissions (resolved)
- Module accesses list
- Export to JSON functionality
- Last updated timestamp

**API Hooks:**
- `useGetUserPermissionAuditQuery` - Fetch comprehensive audit data

**Props:**
- `userId: string` - Required. The user's ID

**Export Format:**
```json
{
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "roles": [...],
  "directPermissions": [...],
  "inheritedPermissions": [...],
  "effectivePermissions": [...],
  "moduleAccesses": [...],
  "statistics": {
    "totalRoles": 3,
    "totalPermissions": 25,
    "totalModuleAccesses": 10
  },
  "exportedAt": "2025-11-02T10:30:00Z"
}
```

## Supporting Components

### TemporalDatePickerAdapter

Adapter component that wraps the shared `TemporalDatePicker` to provide a simplified API with separate onChange handlers.

**Props:**
- `effectiveFrom?: Date`
- `effectiveTo?: Date`
- `onEffectiveFromChange: (date?: Date) => void`
- `onEffectiveToChange: (date?: Date) => void`
- `disabled?: boolean`
- `className?: string`

## API Integration

### Phase 3: User Roles API

From `@/store/api/userRolesApi`:
- `useGetUserRolesQuery` - GET /api/v1/permissions/users/:userId/roles
- `useAssignUserRoleMutation` - POST /api/v1/permissions/users/:userId/roles
- `useBulkAssignUserRolesMutation` - POST /api/v1/permissions/users/:userId/roles/bulk
- `useRevokeUserRoleMutation` - DELETE /api/v1/permissions/users/:userId/roles/:roleId

### Phase 4: User Permissions API

From `@/store/api/userPermissionsApi`:
- `useGetUserPermissionsQuery` - GET /api/v1/permissions/users/:userId/permissions
- `useGetUserPermissionQuery` - GET /api/v1/permissions/users/:userId/permissions/:permissionId
- `useGrantUserPermissionMutation` - POST /api/v1/permissions/users/:userId/permissions
- `useBulkGrantUserPermissionsMutation` - POST /api/v1/permissions/users/:userId/permissions/bulk
- `useRevokeUserPermissionMutation` - DELETE /api/v1/permissions/users/:userId/permissions/:permissionId

### Phase 6: Analytics API

From `@/store/api/analyticsApi`:
- `useGetUserPermissionAuditQuery` - GET /api/v1/permissions/users/permission-audit/:userId

## Type Definitions

From `@/types/permissions/`:
- `user-role.types.ts` - User role assignment types
- `user-permission.types.ts` - User permission types
- `analytics.types.ts` - Audit and analytics types

## UI Components

From `@/components/ui/`:
- Tabs, TabsList, TabsTrigger, TabsContent
- Card, CardHeader, CardTitle, CardDescription, CardContent
- Badge
- Button
- Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
- Select, SelectTrigger, SelectValue, SelectContent, SelectItem
- Input, Label, Switch
- AlertDialog (for confirmation dialogs)
- Separator

## Icons

From `lucide-react`:
- Shield (roles)
- Key (permissions)
- FileText (audit)
- User (user)
- Calendar (temporal)
- CheckCircle, XCircle, Clock (status)
- Plus, Trash2 (actions)
- Download (export)
- AlertCircle (errors)
- Database (resource-specific)
- TrendingUp (priority)
- Tag (category)

## Features

### Temporal Support
All role and permission assignments support temporal settings:
- **effectiveFrom**: Start date for assignment
- **effectiveTo**: End date for assignment
- **Permanent**: Leave both dates empty

Status indicators:
- **Scheduled**: Future effectiveFrom date
- **Active**: Currently effective
- **Active (Temporary)**: Has effectiveTo date
- **Expired**: Past effectiveTo date

### Resource-Specific Permissions
Direct permissions can be scoped to specific resources:
- **resourceType**: Type of resource (e.g., "document", "project")
- **resourceId**: Specific resource ID
- **Global**: No resource specified = applies to all

### Permission Priorities
Direct permissions support priority (0-100):
- Higher priority = takes precedence in conflict resolution
- Default: 0 (lowest)
- Useful for grant/deny conflicts

### Audit Trail
Complete audit view shows:
1. **Direct Roles**: Roles explicitly assigned to user
2. **Direct Permissions**: Permissions explicitly assigned to user
3. **Inherited Permissions**: Permissions from assigned roles
4. **Effective Permissions**: Final resolved permissions after combining all sources
5. **Module Accesses**: Modules accessible by user

## Error Handling

All components include:
- Loading states with spinners
- Error states with retry buttons
- Form validation
- Toast notifications for success/error feedback
- Empty states with helpful messages

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management in dialogs
- Screen reader friendly status indicators

## Performance

- RTK Query caching (60s for roles/permissions)
- Optimistic updates support
- Automatic cache invalidation
- Request deduplication
- Pagination support (permissions list)

## Example Integration

```tsx
// In a user management page
import { UserAssignmentTabs } from '@/components/features/permissions/users';

export default function UserPermissionsPage({ params }: { params: { userId: string } }) {
  const { data: user } = useGetUserByIdQuery(params.userId);

  return (
    <div className="container mx-auto py-6">
      <UserAssignmentTabs
        userId={params.userId}
        userName={user?.name}
        userEmail={user?.email}
        defaultTab="roles"
      />
    </div>
  );
}
```

## Testing Considerations

### Unit Tests
- Component rendering
- User interactions (clicks, form inputs)
- API hook integration
- State management
- Form validation

### Integration Tests
- Role assignment flow
- Permission assignment flow
- Temporal settings
- Resource-specific permissions
- Audit data display
- Export functionality

### E2E Tests
- Complete user permission management workflow
- Role assignment with temporal settings
- Permission grant/revoke
- Audit export
- Error scenarios

## Future Enhancements

Potential improvements:
1. Bulk role/permission assignment UI
2. Permission conflict resolution UI
3. Advanced filtering and search
4. Permission comparison between users
5. Permission inheritance visualization
6. Audit log export formats (CSV, PDF)
7. Real-time permission updates
8. Permission templates/presets

## Related Documentation

- `/docs/PERMISSION_IMPLEMENTATION_PLAN.md` - Overall implementation plan
- `/docs/PHASE1_IMPLEMENTATION_SUMMARY.md` - Phase 1 summary
- Backend API documentation
- Type definitions in `/src/types/permissions/`

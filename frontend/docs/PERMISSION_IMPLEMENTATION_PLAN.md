# Permission System - Frontend Implementation Plan

## Executive Summary

Rencana implementasi frontend untuk mengintegrasikan sistem permission yang telah dibuat di backend. Backend memiliki 6 controllers dengan fitur lengkap, sementara frontend baru memiliki sebagian kecil dari API integration. Dokumen ini menyediakan roadmap implementasi tanpa mengubah backend.

**Status Saat Ini:**

- ✅ Backend: 6 controllers lengkap dengan 60+ endpoints
- ⚠️ Frontend: Hanya 2 service files dengan fitur terbatas
- 📋 Gap: 80% fitur backend belum terintegrasi di frontend
- ❌ UI: Belum ada halaman permission management

**Estimasi Waktu:** 14-16 hari kerja (3-4 minggu)

- Phase 1-6 (API Integration dengan RTK Query): 5-6 hari
- Phase 7 (UI Layer): 5-6 hari
- Testing & QA: 3-4 hari

**Teknologi Stack:**

- RTK Query (dengan fetchBaseQuery) - API state management & HTTP client
- TypeScript - Type safety
- Next.js App Router - Routing
- shadcn/ui + Tailwind CSS - UI components

**⚠️ PENTING - API Path Structure:**

Semua endpoint paths dalam dokumen ini ditampilkan sebagai **full backend routes** untuk referensi. Namun dalam **implementasi frontend RTK Query**, jangan sertakan `/v1` prefix karena `apiConfig.baseUrl` sudah include `/api/v1`.

```typescript
// ❌ SALAH - Jangan tulis ini di frontend
url: '/v1/permissions/roles'

// ✅ BENAR - Tulis ini di frontend
url: '/permissions/roles'

// Hasil: baseUrl (/api/v1) + path (/permissions/roles) = /api/v1/permissions/roles ✅
```

---

## 1. Backend API Analysis

### 1.1 Controllers Overview

Backend memiliki 6 controllers dalam `/backend/src/modules/permissions/controllers/`:

| Controller                        | Backend Route (Full Path)                   | Frontend Path (RTK Query)                | Endpoints | Purpose                                                |
| --------------------------------- | ------------------------------------------- | ---------------------------------------- | --------- | ------------------------------------------------------ |
| **PermissionsController**         | `/permissions`                           | `/permissions`                           | 12        | CRUD permissions, check access, grouped permissions    |
| **RolesController**               | `/permissions/roles`                     | `/permissions/roles`                     | 18        | CRUD roles, role permissions, module access, hierarchy |
| **ModulesController**             | `/permissions/modules`                   | `/permissions/modules`                   | 8         | CRUD modules, tree structure, module permissions       |
| **UserPermissionsController**     | `/permissions/users/:userId/permissions` | `/permissions/users/:userId/permissions` | 5         | Direct user permission management                      |
| **UserRolesController**           | `/permissions/users/:userId/roles`       | `/permissions/users/:userId/roles`       | 4         | User role assignments                                  |
| **PermissionAnalyticsController** | `/permissions`                           | `/permissions`                           | 8         | Analytics, bulk operations, export/import              |

### 1.2 Key Features per Controller

#### PermissionsController

- ✅ Create, read, update, delete permissions
- ✅ Get permissions grouped by resource/category
- ✅ Get permission by code
- ✅ Restore soft-deleted permissions
- ✅ Check user permission (single & bulk)
- ✅ Get all user effective permissions

#### RolesController

- ✅ CRUD operations for roles
- ✅ Assign/revoke permissions to roles (single & bulk)
- ✅ Grant/revoke module access to roles (single & bulk)
- ✅ Role hierarchy management (parent-child relationships)
- ✅ Get inherited permissions from parent roles
- ✅ Get role hierarchy tree structure

#### ModulesController

- ✅ CRUD operations for modules
- ✅ Get module tree structure (hierarchical)
- ✅ Get module permissions
- ✅ Restore soft-deleted modules

#### UserPermissionsController

- ✅ Grant/revoke direct permissions to users (single & bulk)
- ✅ Get user direct permissions with filtering
- ✅ Resource-specific permissions (with resourceType & resourceId)
- ✅ Temporal restrictions (effectiveFrom, effectiveTo)

#### UserRolesController

- ✅ Assign/revoke roles to users (single & bulk)
- ✅ Get user roles with effective dates
- ✅ Temporal role assignments

#### PermissionAnalyticsController

- ✅ Permission usage statistics
- ✅ Role usage statistics
- ✅ User permission audit (comprehensive)
- ✅ Bulk assign roles to users
- ✅ Bulk assign permissions to role
- ✅ Bulk revoke roles from users
- ✅ Export permissions data (backup)
- ✅ Import permissions data (restore/migration)

---

## 2. Frontend Gap Analysis

### 2.1 Current Frontend Implementation

**Existing Files:**

```
src/lib/api/services/
  ├── permissions.service.ts        ⚠️ Partial (hanya check permission)
  └── module-permissions.service.ts ✅ Complete

src/store/api/
  ├── permissionApi.ts              ⚠️ Partial (basic CRUD only)
  └── modulePermissionsApi.ts       ✅ Complete

src/hooks/
  └── usePermissions.ts             ✅ Complete (client-side checking)

src/components/features/organizations/positions/
  └── ManagePermissionsModal.tsx    ⚠️ May need updates
```

### 2.2 Missing Integrations

| Feature                | Backend | Frontend | Gap                                |
| ---------------------- | ------- | -------- | ---------------------------------- |
| **Permissions CRUD**   | ✅ Full | ⚠️ Basic | Missing: grouped, by-code, restore |
| **Roles Management**   | ✅ Full | ❌ None  | 100% missing                       |
| **Role Permissions**   | ✅ Full | ❌ None  | 100% missing                       |
| **Role Module Access** | ✅ Full | ❌ None  | 100% missing                       |
| **Role Hierarchy**     | ✅ Full | ❌ None  | 100% missing                       |
| **User Permissions**   | ✅ Full | ❌ None  | 100% missing                       |
| **User Roles**         | ✅ Full | ❌ None  | 100% missing                       |
| **Analytics**          | ✅ Full | ❌ None  | 100% missing                       |
| **Bulk Operations**    | ✅ Full | ❌ None  | 100% missing                       |
| **Export/Import**      | ✅ Full | ❌ None  | 100% missing                       |

**Total Coverage: 20%** (hanya 2 dari 10 feature areas)

---

## 3. Implementation Phases

### Overview

Implementasi dibagi menjadi 7 phase, dimana Phase 1-6 fokus pada API integration dan data layer, sedangkan Phase 7 fokus pada UI implementation yang menggunakan semua API dari phase sebelumnya.

---

### Phase 1: Core Role Management (Foundation)

**Priority:** Critical | **Time:** 0.5 day | **Complexity:** Low

**Deliverables:**

- `src/types/permissions/role.types.ts` - Role type definitions
- `src/store/api/rolesApi.ts` - RTK Query endpoints for roles (using fetchBaseQuery)

**Endpoints to Implement:**

- `POST /permissions/roles` - Create role
- `GET /permissions/roles` - List roles (paginated)
- `GET /permissions/roles/:id` - Get role by ID
- `PATCH /permissions/roles/:id` - Update role
- `DELETE /permissions/roles/:id` - Soft delete role
- `POST /permissions/roles/:id/restore` - Restore role

**Implementation:**

```typescript
// src/store/api/rolesApi.ts
import { apiSlice } from "./apiSliceWithHook";
import type {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  PaginatedResponse,
} from "@/types";

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query<PaginatedResponse<Role>, QueryParams | void>({
      query: (params = {}) => ({
        url: "/permissions/roles",
        params: { page: 1, limit: 10, ...params },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Role" as const, id })),
              { type: "Role", id: "LIST" },
            ]
          : [{ type: "Role", id: "LIST" }],
    }),

    getRoleById: builder.query<Role, string>({
      query: (id) => `/permissions/roles/${id}`,
      providesTags: (result, error, id) => [{ type: "Role", id }],
    }),

    createRole: builder.mutation<Role, CreateRoleDto>({
      query: (data) => ({
        url: "/permissions/roles",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Role", id: "LIST" }],
    }),

    updateRole: builder.mutation<Role, { id: string; data: UpdateRoleDto }>({
      query: ({ id, data }) => ({
        url: `/permissions/roles/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),

    deleteRole: builder.mutation<Role, string>({
      query: (id) => ({
        url: `/permissions/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),

    restoreRole: builder.mutation<Role, string>({
      query: (id) => ({
        url: `/permissions/roles/${id}/restore`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useRestoreRoleMutation,
} = rolesApi;
```

**Key Features:**

- ✅ Automatic caching dengan RTK Query
- ✅ Automatic cache invalidation saat create/update/delete
- ✅ Type-safe hooks auto-generated
- ✅ No service layer needed - langsung dari RTK Query ke backend

---

### Phase 2: Role Permissions Assignment

**Priority:** Critical | **Time:** 0.5 day | **Complexity:** Low

**Deliverables:**

- Extend `src/types/permissions/role.types.ts` - Add RolePermission types
- Extend `src/store/api/rolesApi.ts` - Add role permission endpoints

**Endpoints to Implement:**

- `POST /permissions/roles/:id/permissions` - Assign permission to role
- `POST /permissions/roles/:id/permissions/bulk` - Bulk assign permissions
- `GET /permissions/roles/:id/permissions` - Get role permissions
- `DELETE /permissions/roles/:id/permissions/:permissionId` - Revoke permission

**Implementation:**

```typescript
// Extend src/store/api/rolesApi.ts
export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ... existing endpoints from Phase 1 ...

    getRolePermissions: builder.query<RolePermission[], string>({
      query: (roleId) => `/permissions/roles/${roleId}/permissions`,
      providesTags: (result, error, roleId) => [
        { type: "RolePermission", id: roleId },
      ],
    }),

    assignRolePermission: builder.mutation<
      RolePermission,
      AssignRolePermissionDto
    >({
      query: ({ roleId, ...data }) => ({
        url: `/permissions/roles/${roleId}/permissions`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: "RolePermission", id: roleId },
        { type: "Role", id: roleId },
      ],
    }),

    bulkAssignRolePermissions: builder.mutation<
      void,
      BulkAssignRolePermissionsDto
    >({
      query: ({ roleId, permissionIds }) => ({
        url: `/permissions/roles/${roleId}/permissions/bulk`,
        method: "POST",
        body: { permissionIds },
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: "RolePermission", id: roleId },
        { type: "Role", id: roleId },
      ],
    }),

    revokeRolePermission: builder.mutation<
      void,
      { roleId: string; permissionId: string }
    >({
      query: ({ roleId, permissionId }) => ({
        url: `/permissions/roles/${roleId}/permissions/${permissionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: "RolePermission", id: roleId },
        { type: "Role", id: roleId },
      ],
    }),
  }),
});

export const {
  // ... existing hooks ...
  useGetRolePermissionsQuery,
  useAssignRolePermissionMutation,
  useBulkAssignRolePermissionsMutation,
  useRevokeRolePermissionMutation,
} = rolesApi;
```

**Key Features:**

- ✅ Smart cache invalidation - role permissions update triggers role cache refresh
- ✅ Bulk operations support untuk assign multiple permissions
- ✅ Type-safe dengan TypeScript generics

---

### Phase 3: User Role Management

**Priority:** High | **Time:** 0.5 day | **Complexity:** Low

**Deliverables:**

- `src/types/permissions/user-role.types.ts` - UserRole type definitions
- `src/store/api/userRolesApi.ts` - RTK Query endpoints (no service layer)

**Endpoints to Implement:**

- `POST /permissions/users/:userId/roles` - Assign role to user
- `POST /permissions/users/:userId/roles/bulk` - Bulk assign roles
- `GET /permissions/users/:userId/roles` - Get user roles
- `DELETE /permissions/users/:userId/roles/:roleId` - Revoke role

**Implementation:** Direct RTK Query endpoints (similar pattern to Phase 1 & 2)

---

### Phase 4: User Direct Permissions

**Priority:** High | **Time:** 0.5 day | **Complexity:** Low

**Deliverables:**

- `src/types/permissions/user-permission.types.ts` - UserPermission type definitions
- `src/store/api/userPermissionsApi.ts` - RTK Query endpoints (no service layer)

**Endpoints to Implement:**

- `POST /permissions/users/:userId/permissions` - Grant permission to user
- `POST /permissions/users/:userId/permissions/bulk` - Bulk grant permissions
- `GET /permissions/users/:userId/permissions` - Get user permissions (with filters)
- `GET /permissions/users/:userId/permissions/:permissionId` - Get specific permission
- `DELETE /permissions/users/:userId/permissions/:permissionId` - Revoke permission

**Files:**

```typescript
// src/lib/api/services/user-permissions.service.ts
export interface UserPermission { ... }
export interface GrantUserPermissionDto { ... }
export interface QueryUserPermissionDto { ... }
export class UserPermissionsService { ... }

// src/store/api/userPermissionsApi.ts
export const userPermissionsApi = apiSlice.injectEndpoints({ ... })
export const {
  useGrantUserPermissionMutation,
  useBulkGrantUserPermissionsMutation,
  useGetUserPermissionsQuery,
  useGetUserPermissionQuery,
  useRevokeUserPermissionMutation,
} = userPermissionsApi;
```

---

### Phase 5: Role Module Access & Hierarchy

**Priority:** Medium | **Time:** 1 day | **Complexity:** Medium

**Deliverables:**

- Extend `src/types/permissions/role.types.ts` - Add RoleModuleAccess & RoleHierarchy types
- Extend `src/store/api/rolesApi.ts` - Add module access and hierarchy endpoints

**Endpoints to Implement:**

**Module Access:**

- `POST /permissions/roles/:id/modules` - Grant module access
- `POST /permissions/roles/:id/modules/bulk` - Bulk grant module access
- `GET /permissions/roles/:id/modules` - Get role module accesses
- `DELETE /permissions/roles/:id/modules/:moduleAccessId` - Revoke module access

**Hierarchy:**

- `POST /permissions/roles/:id/hierarchy` - Create hierarchy (set parent)
- `GET /permissions/roles/:id/hierarchy/tree` - Get hierarchy tree
- `GET /permissions/roles/:id/hierarchy/inherited-permissions` - Get inherited permissions
- `DELETE /permissions/roles/:id/hierarchy` - Remove hierarchy

**Implementation:** Extend rolesApi dengan module access & hierarchy endpoints (similar pattern)

---

### Phase 6: Analytics & Bulk Operations

**Priority:** Medium | **Time:** 1 day | **Complexity:** Medium

**Deliverables:**

- `src/types/permissions/analytics.types.ts` - Analytics type definitions
- `src/store/api/analyticsApi.ts` - RTK Query endpoints (no service layer)

**Endpoints to Implement:**

- `GET /permissions/usage-statistics` - Permission usage stats
- `GET /permissions/roles/usage-statistics` - Role usage stats
- `GET /permissions/users/permission-audit/:userId` - User permission audit
- `POST /permissions/bulk/assign-roles` - Bulk assign roles to users
- `POST /permissions/bulk/assign-permissions` - Bulk assign permissions to role
- `POST /permissions/bulk/revoke-roles` - Bulk revoke roles
- `GET /permissions/export` - Export permissions data
- `POST /permissions/import` - Import permissions data

**Implementation:** Direct RTK Query endpoints untuk analytics & bulk operations (similar pattern)

---

### Phase 7: UI Implementation & Integration (Complete User Interface)

**Priority:** Critical | **Time:** 4-5 days | **Complexity:** High

**Purpose:**
Membuat complete user interface untuk permission management system yang mengintegrasikan semua API services dari Phase 1-6. Phase ini menghasilkan production-ready UI dengan UX yang baik dan accessibility compliance.

**Prerequisites:**

- ✅ Phase 1-6 completed (All API services and RTK Query hooks available)
- ✅ All type definitions created
- ✅ API integration tested and working

**Deliverables:**

#### 7.1 App Sidebar Navigation Structure

**File to Update:** `src/components/app-sidebar.tsx`

```typescript
// Add to sidebar menu items
{
  title: "Permission Management",
  icon: Shield,
  items: [
    {
      title: "Dashboard",
      href: "/permissions",
      icon: LayoutDashboard,
    },
    {
      title: "Roles",
      href: "/permissions/roles",
      icon: Users,
    },
    {
      title: "Permissions",
      href: "/permissions/permissions",
      icon: Key,
    },
    {
      title: "Modules",
      href: "/permissions/modules",
      icon: Package,
    },
    {
      title: "User Assignments",
      href: "/permissions/users",
      icon: UserCheck,
    },
    {
      title: "Analytics",
      href: "/permissions/analytics",
      icon: BarChart3,
    },
  ],
}
```

**Navigation Tree:**

```
Permission Management (Parent Menu)
├── Dashboard                    // Overview & statistics (Phase 6 API)
├── Roles                       // Role CRUD dengan Tabs (Phase 1, 2, 5 API)
│   └── Tabs: List | Hierarchy Tree
├── Permissions                 // Permission CRUD (Existing + updates)
│   └── List view dengan filtering
├── Modules                     // Module management dengan Tabs (Existing)
│   └── Tabs: List | Tree View
├── User Assignments           // User-specific (Phase 3, 4 API)
│   └── User role & permission assignment
└── Analytics & Reports        // Analytics (Phase 6 API)
    └── Stats, audit, bulk operations
```

#### 7.2 Route Structure

**Routes to Create:**

```typescript
// app/(dashboard)/permissions/
permissions/
├── page.tsx                           // Dashboard overview (Phase 6 API)
├── layout.tsx                         // Layout wrapper
├── roles/
│   ├── page.tsx                       // Roles page with Tabs: List | Hierarchy (Phase 1, 5 API)
│   ├── [id]/
│   │   └── page.tsx                   // Role details with Tabs: Info | Permissions | Modules (Phase 1, 2, 5 API)
│   └── new/page.tsx                   // Create role modal/page (Phase 1 API)
├── permissions/
│   ├── page.tsx                       // Permissions list (Existing API)
│   ├── [id]/page.tsx                  // Permission details (Existing API)
│   └── new/page.tsx                   // Create permission (Existing API)
├── modules/
│   ├── page.tsx                       // Modules page with Tabs: List | Tree (Existing API)
│   ├── [id]/page.tsx                  // Module details (Existing API)
│   └── new/page.tsx                   // Create module (Existing API)
├── users/
│   └── [userId]/
│       └── page.tsx                   // User assignments with Tabs: Roles | Permissions (Phase 3, 4 API)
└── analytics/
    └── page.tsx                       // Analytics dashboard with sections (Phase 6 API)
```

**Total Routes:** 11 pages (reduced from 15+ by using tabs)

#### 7.3 UI Components to Create

**Component Structure:**

```
src/components/features/permissions/
├── dashboard/                         [Uses Phase 6 API]
│   ├── PermissionDashboard.tsx        // Main dashboard
│   ├── StatisticsCards.tsx            // Stats overview (usage stats API)
│   └── RecentActivities.tsx           // Activity feed
│
├── roles/                             [Uses Phase 1, 2, 5 API]
│   ├── RolesPageTabs.tsx              // Main page dengan Tabs: List | Hierarchy
│   ├── RoleList.tsx                   // Data table (useGetRolesQuery)
│   ├── RoleHierarchyTree.tsx          // Hierarchy tree (useGetRoleHierarchyTreeQuery)
│   ├── RoleDetailTabs.tsx             // Detail page dengan Tabs: Info | Permissions | Modules
│   ├── RoleInfo.tsx                   // Role information view
│   ├── RoleForm.tsx                   // Create/Edit (useCreateRoleMutation, useUpdateRoleMutation)
│   ├── RolePermissionsTab.tsx         // Permission assignment tab (useAssignRolePermissionMutation)
│   ├── RoleModulesTab.tsx             // Module access tab (useGrantRoleModuleAccessMutation)
│   └── DeleteRoleDialog.tsx           // Delete (useDeleteRoleMutation)
│
├── permissions/                       [Uses Existing API]
│   ├── PermissionList.tsx             // Data table (useGetPermissionsQuery)
│   ├── PermissionForm.tsx             // Create/Edit form
│   ├── PermissionGroupView.tsx        // Grouped view (useGetGroupedPermissionsQuery)
│   ├── PermissionCard.tsx             // Display card
│   └── DeletePermissionDialog.tsx     // Delete confirmation
│
├── modules/                           [Uses Existing API]
│   ├── ModulesPageTabs.tsx            // Main page dengan Tabs: List | Tree
│   ├── ModuleList.tsx                 // Data table (useGetModulesQuery)
│   ├── ModuleTree.tsx                 // Tree visualization (useGetModuleTreeQuery)
│   ├── ModuleForm.tsx                 // Create/Edit form
│   └── ModulePermissionsView.tsx      // Module permissions
│
├── users/                             [Uses Phase 3, 4 API]
│   ├── UserAssignmentTabs.tsx         // User page dengan Tabs: Roles | Permissions
│   ├── UserRolesList.tsx              // User's roles tab (useGetUserRolesQuery)
│   ├── UserPermissionsList.tsx        // User's permissions tab (useGetUserPermissionsQuery)
│   ├── UserRoleAssignment.tsx         // Assign roles (useAssignUserRoleMutation)
│   ├── UserPermissionAssignment.tsx   // Assign permissions (useGrantUserPermissionMutation)
│   └── UserPermissionAudit.tsx        // Audit view (useGetUserPermissionAuditQuery)
│
├── analytics/                         [Uses Phase 6 API]
│   ├── AnalyticsDashboard.tsx         // Analytics overview with sections
│   ├── UsageStatistics.tsx            // Stats (useGetPermissionUsageStatisticsQuery)
│   ├── RoleUsageChart.tsx             // Role usage (useGetRoleUsageStatisticsQuery)
│   ├── PermissionUsageChart.tsx       // Permission usage visualization
│   ├── BulkAssignRolesDialog.tsx      // Bulk assign (useBulkAssignRolesToUsersMutation)
│   ├── BulkAssignPermissionsDialog.tsx// Bulk assign (useBulkAssignPermissionsToRoleMutation)
│   └── BulkRevokeRolesDialog.tsx      // Bulk revoke (useBulkRevokeRolesFromUsersMutation)
│
└── shared/                            [Utility Components]
    ├── PermissionBadge.tsx            // Status badge
    ├── RoleBadge.tsx                  // Status badge
    ├── TemporalDatePicker.tsx         // Date range picker
    └── HierarchyLevelIndicator.tsx    // Level indicator
```

**Total Components:** 41 components (lebih terorganisir dengan tab structure)

#### 7.4 UI/UX Design System

**Technology Stack:**

- **shadcn/ui** - Component library for consistency
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **@tanstack/react-table** - Data tables with sorting, filtering, pagination
- **recharts** - Charts and graphs for analytics
- **date-fns** - Date manipulation for temporal features

**UI Patterns:**

1. **List Views:**

   - Data tables with server-side pagination
   - Search, filter, sort capabilities
   - Bulk action checkboxes
   - Row actions (edit, delete, view)

2. **Tab-Based Views:**

   - **Roles Page Tabs:**
     - Tab 1: List - Data table dengan CRUD operations
     - Tab 2: Hierarchy - Tree visualization dengan parent-child relationships
   - **Modules Page Tabs:**
     - Tab 1: List - Data table dengan CRUD operations
     - Tab 2: Tree - Hierarchical tree visualization
   - **Role Detail Tabs:**
     - Tab 1: Info - Role information dan properties
     - Tab 2: Permissions - Permission assignment interface
     - Tab 3: Modules - Module access management
   - **User Assignment Tabs:**
     - Tab 1: Roles - User's assigned roles
     - Tab 2: Permissions - User's direct permissions

3. **Detail Views:**

   - Card-based layout with sections
   - Tab navigation dengan URL state sync
   - Action buttons (Edit, Delete, Clone)
   - Breadcrumb navigation

4. **Forms:**

   - Modal dialogs for Create/Edit operations
   - React Hook Form for validation
   - Zod schemas for type-safe validation
   - Error handling and user feedback

5. **Hierarchy Views:**

   - Tree component with expand/collapse
   - Drag-and-drop for reordering (optional)
   - Visual hierarchy indicators
   - Parent-child relationship display

6. **Bulk Operations:**

   - Multi-select with checkboxes
   - Bulk action dropdown/buttons
   - Confirmation dialogs
   - Progress indicators for long operations

7. **Analytics:**
   - Chart components (bar, pie, line)
   - Statistics cards with icons
   - Data export functionality
   - Date range filters

**Tab Implementation Details:**

- Use shadcn/ui `Tabs` component
- URL state sync dengan `useSearchParams` atau `useRouter`
- Lazy loading tab content untuk performance
- Keyboard navigation (Arrow keys untuk switch tabs)
- Tab state persistence di URL (e.g., `/roles?tab=hierarchy`)

**Accessibility Standards:**

- ✅ WCAG 2.1 AA compliance
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader support (ARIA labels)
- ✅ Focus management in modals
- ✅ Color contrast ratios
- ✅ Error message announcements

**Responsive Design:**

- Mobile (320px - 767px): Stacked layout, mobile-optimized tables
- Tablet (768px - 1023px): 2-column layout where applicable
- Desktop (1024px+): Full feature layout with sidebars

#### 7.5 Component Implementation Details

**Example 1: RolesPageTabs Component (Main Page dengan Tabs)**

```typescript
// src/app/(dashboard)/permissions/roles/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleList } from "@/components/features/permissions/roles/RoleList";
import { RoleHierarchyTree } from "@/components/features/permissions/roles/RoleHierarchyTree";
import { useSearchParams, useRouter } from "next/navigation";

export default function RolesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'list';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.push(`/permissions/roles?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Role Management</h1>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy Tree</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <RoleList />
        </TabsContent>

        <TabsContent value="hierarchy" className="mt-4">
          <RoleHierarchyTree />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Example 2: RoleList Component (Tab Content)**

```typescript
// src/components/features/permissions/roles/RoleList.tsx
import { useGetRolesQuery, useDeleteRoleMutation } from "@/store/api/rolesApi";
import { DataTable } from "@/components/ui/data-table";
import { RoleBadge } from "../shared/RoleBadge";

export function RoleList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Phase 1 API Integration
  const { data, isLoading, error } = useGetRolesQuery({
    page,
    limit: 10,
    search,
  });

  const [deleteRole] = useDeleteRoleMutation();

  const columns = [
    { header: "Name", accessorKey: "name" },
    { header: "Code", accessorKey: "code" },
    { header: "Level", accessorKey: "hierarchyLevel" },
    {
      header: "Status",
      cell: ({ row }) => <RoleBadge isActive={row.original.isActive} />,
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <ActionMenu
          onEdit={() => router.push(`/permissions/roles/${row.id}`)}
          onDelete={() => deleteRole(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <SearchInput value={search} onChange={setSearch} />
        <Button onClick={() => router.push("/permissions/roles/new")}>
          Create Role
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        pagination={{ page, onPageChange: setPage, total: data?.totalPages }}
        isLoading={isLoading}
      />
    </div>
  );
}
```

**Example 3: RoleDetailTabs Component (Detail Page dengan Tabs)**

```typescript
// src/app/(dashboard)/permissions/roles/[id]/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleInfo } from "@/components/features/permissions/roles/RoleInfo";
import { RolePermissionsTab } from "@/components/features/permissions/roles/RolePermissionsTab";
import { RoleModulesTab } from "@/components/features/permissions/roles/RoleModulesTab";
import { useGetRoleByIdQuery } from "@/store/api/rolesApi";
import { useSearchParams, useRouter } from "next/navigation";

export default function RoleDetailPage({ params }: { params: { id: string } }) {
  const { data: role, isLoading } = useGetRoleByIdQuery(params.id);
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'info';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.push(`/permissions/roles/${params.id}?${params.toString()}`);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{role?.name}</h1>
        <Button variant="outline" onClick={() => router.push('/permissions/roles')}>
          Back to List
        </Button>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <RoleInfo role={role} />
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <RolePermissionsTab roleId={params.id} />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <RoleModulesTab roleId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### 7.6 Integration Checklist

**For Each Component Category:**

- [ ] **Dashboard (3 components)**

  - [ ] Integrate Phase 6 analytics APIs
  - [ ] Display usage statistics in cards
  - [ ] Show recent activities/audit logs
  - [ ] Add navigation to detail pages

- [ ] **Roles (9 components dengan Tab Structure)**

  - [ ] RolesPageTabs - Main page dengan 2 tabs (List, Hierarchy)
  - [ ] RoleList Tab - Integrate Phase 1 CRUD APIs
  - [ ] RoleHierarchyTree Tab - Integrate Phase 5 hierarchy APIs dengan tree visualization
  - [ ] RoleDetailTabs - Detail page dengan 3 tabs (Info, Permissions, Modules)
  - [ ] RoleInfo Tab - Display role information
  - [ ] RolePermissionsTab - Integrate Phase 2 permission assignment APIs
  - [ ] RoleModulesTab - Integrate Phase 5 module access APIs
  - [ ] RoleForm - Create/Edit modal
  - [ ] DeleteRoleDialog - Delete confirmation

- [ ] **Permissions (5 components)**

  - [ ] Use existing permission APIs
  - [ ] Implement grouped view
  - [ ] Add permission code search
  - [ ] Implement restore functionality

- [ ] **Modules (5 components dengan Tab Structure)**

  - [ ] ModulesPageTabs - Main page dengan 2 tabs (List, Tree)
  - [ ] ModuleList Tab - Use existing module APIs dengan CRUD
  - [ ] ModuleTree Tab - Implement hierarchical tree visualization
  - [ ] ModuleForm - Create/Edit form
  - [ ] ModulePermissionsView - Show module permissions

- [ ] **Users (6 components dengan Tab Structure)**

  - [ ] UserAssignmentTabs - User page dengan 2 tabs (Roles, Permissions)
  - [ ] UserRolesList Tab - Integrate Phase 3 user-role APIs
  - [ ] UserPermissionsList Tab - Integrate Phase 4 user-permission APIs
  - [ ] UserRoleAssignment - Assignment interface
  - [ ] UserPermissionAssignment - Assignment interface
  - [ ] UserPermissionAudit - Audit view

- [ ] **Analytics (4 components)**

  - [ ] Integrate Phase 6 analytics APIs
  - [ ] Create charts with recharts
  - [ ] Implement data export
  - [ ] Add filtering options

- [ ] **Bulk Operations (3 components)**

  - [ ] Integrate Phase 6 bulk APIs
  - [ ] Implement multi-select
  - [ ] Add progress indicators
  - [ ] Handle partial failures

- [ ] **Shared (4 components)**
  - [ ] Create reusable badge components
  - [ ] Implement date picker with temporal support
  - [ ] Create hierarchy level indicators

#### 7.7 Testing Requirements

**Component Testing:**

```typescript
// Example: RoleList.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { RoleList } from "./RoleList";

describe("RoleList", () => {
  it("should display roles from API", async () => {
    const mockRoles = [
      { id: "1", name: "Admin", code: "ADMIN", hierarchyLevel: 1 },
    ];

    mockUseGetRolesQuery.mockReturnValue({
      data: { data: mockRoles, total: 1 },
      isLoading: false,
    });

    render(<RoleList />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  it("should handle delete action", async () => {
    // Test implementation
  });

  it("should navigate to create page", async () => {
    // Test implementation
  });
});
```

**Testing Checklist:**

- [ ] Unit tests for all components (>80% coverage)
- [ ] Integration tests for API interactions
- [ ] E2E tests for critical user flows
- [ ] Accessibility testing with axe-devtools
- [ ] Responsive design testing (mobile, tablet, desktop)
- [ ] Performance testing (load time, render performance)

#### 7.8 Dependencies to Install

```bash
npm install @tanstack/react-table
npm install recharts
npm install date-fns
npm install react-hook-form @hookform/resolvers zod
npm install lucide-react
```

**shadcn/ui components to add:**

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add badge
npx shadcn@latest add calendar
npx shadcn@latest add checkbox
npx shadcn@latest add form
```

#### 7.9 Success Criteria

**Functionality:**

- ✅ All 15+ pages functional and accessible via navigation
- ✅ All 39+ components rendering correctly
- ✅ All Phase 1-6 APIs integrated and working
- ✅ CRUD operations working for all entities
- ✅ Bulk operations working with proper feedback
- ✅ Analytics dashboard showing real-time data
- ✅ User assignment workflows functional

**Quality:**

- ✅ Unit test coverage >80%
- ✅ E2E tests for critical flows
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Responsive on all device sizes
- ✅ No console errors or warnings
- ✅ Proper error handling and user feedback
- ✅ Loading states for all async operations

**Performance:**

- ✅ Initial page load <3s
- ✅ Component render time <100ms
- ✅ Data table pagination working smoothly
- ✅ Charts rendering without lag

**Documentation:**

- ✅ Component storybook documentation
- ✅ JSDoc comments for all components
- ✅ README with setup instructions
- ✅ User guide for permission management

---

## 4. File Structure

### 4.1 New Files to Create

```
frontend/
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── permissions/                          [NEW - Phase 0]
│   │           ├── page.tsx                          [Dashboard]
│   │           ├── layout.tsx                        [Layout wrapper]
│   │           ├── roles/
│   │           │   ├── page.tsx                      [Roles list]
│   │           │   ├── [id]/
│   │           │   │   ├── page.tsx                  [Role detail]
│   │           │   │   ├── permissions/page.tsx      [Role permissions]
│   │           │   │   ├── modules/page.tsx          [Role modules]
│   │           │   │   └── hierarchy/page.tsx        [Role hierarchy]
│   │           │   └── new/page.tsx                  [Create role]
│   │           ├── permissions/
│   │           │   ├── page.tsx                      [Permissions list]
│   │           │   ├── [id]/page.tsx                 [Permission detail]
│   │           │   └── new/page.tsx                  [Create permission]
│   │           ├── modules/
│   │           │   ├── page.tsx                      [Modules list]
│   │           │   ├── [id]/page.tsx                 [Module detail]
│   │           │   └── tree/page.tsx                 [Module tree]
│   │           ├── users/
│   │           │   └── [userId]/
│   │           │       ├── roles/page.tsx            [User roles]
│   │           │       └── permissions/page.tsx      [User permissions]
│   │           └── analytics/
│   │               ├── page.tsx                      [Analytics dashboard]
│   │               ├── usage/page.tsx                [Usage stats]
│   │               └── audit/[userId]/page.tsx       [User audit]
│   │
│   ├── components/
│   │   └── features/
│   │       └── permissions/                          [NEW - Phase 0]
│   │           ├── dashboard/
│   │           │   ├── PermissionDashboard.tsx
│   │           │   ├── StatisticsCards.tsx
│   │           │   └── RecentActivities.tsx
│   │           ├── roles/
│   │           │   ├── RoleList.tsx
│   │           │   ├── RoleForm.tsx
│   │           │   ├── RoleCard.tsx
│   │           │   ├── RoleHierarchyTree.tsx
│   │           │   ├── RolePermissionsManager.tsx
│   │           │   ├── RoleModuleAccessManager.tsx
│   │           │   └── DeleteRoleDialog.tsx
│   │           ├── permissions/
│   │           │   ├── PermissionList.tsx
│   │           │   ├── PermissionForm.tsx
│   │           │   ├── PermissionGroupView.tsx
│   │           │   ├── PermissionCard.tsx
│   │           │   └── DeletePermissionDialog.tsx
│   │           ├── modules/
│   │           │   ├── ModuleList.tsx
│   │           │   ├── ModuleForm.tsx
│   │           │   ├── ModuleTree.tsx
│   │           │   └── ModulePermissionsView.tsx
│   │           ├── users/
│   │           │   ├── UserRoleAssignment.tsx
│   │           │   ├── UserPermissionAssignment.tsx
│   │           │   ├── UserRolesList.tsx
│   │           │   ├── UserPermissionsList.tsx
│   │           │   └── UserPermissionAudit.tsx
│   │           ├── analytics/
│   │           │   ├── AnalyticsDashboard.tsx
│   │           │   ├── UsageStatistics.tsx
│   │           │   ├── RoleUsageChart.tsx
│   │           │   └── PermissionUsageChart.tsx
│   │           ├── bulk-operations/
│   │           │   ├── BulkAssignRolesDialog.tsx
│   │           │   ├── BulkAssignPermissionsDialog.tsx
│   │           │   └── BulkRevokeRolesDialog.tsx
│   │           └── shared/
│   │               ├── PermissionBadge.tsx
│   │               ├── RoleBadge.tsx
│   │               ├── TemporalDatePicker.tsx
│   │               └── HierarchyLevelIndicator.tsx
│   │
│   │
│   ├── store/
│   │   └── api/
│   │       ├── rolesApi.ts                          [NEW - Phase 1, 2, 5]
│   │       ├── userRolesApi.ts                      [NEW - Phase 3]
│   │       ├── userPermissionsApi.ts                [NEW - Phase 4]
│   │       └── analyticsApi.ts                      [NEW - Phase 6]
│   │
│   ├── types/
│   │   └── permissions/                             [NEW - All Phases]
│   │       ├── role.types.ts
│   │       ├── user-role.types.ts
│   │       ├── user-permission.types.ts
│   │       └── analytics.types.ts
│   │
│   │
│   └── docs/
│       └── PERMISSION_IMPLEMENTATION_PLAN.md        [THIS FILE]
```

### 4.2 Files to Update

```
frontend/
├── src/
│   ├── components/
│   │   └── app-sidebar.tsx                          [UPDATE - Phase 7: Add permission menu items]
│   │
│   ├── store/
│   │   └── api/
│   │       └── permissionApi.ts                     [UPDATE - Add missing endpoints]
│   │
│   └── components/
│       └── features/
│           └── organizations/
│               └── positions/
│                   └── ManagePermissionsModal.tsx    [UPDATE - Use new RTK Query APIs]
```

---

## 5. Type Definitions

### 5.1 Role Types (`src/types/permissions/role.types.ts`)

```typescript
// ==========================================
// Core Role Types
// ==========================================

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  hierarchyLevel: number;
  parentRoleId?: string;
  parentRole?: Role;
  childRoles?: Role[];
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateRoleDto {
  code: string;
  name: string;
  description?: string;
  hierarchyLevel?: number;
  parentRoleId?: string;
  isSystemRole?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  hierarchyLevel?: number;
  parentRoleId?: string;
  isActive?: boolean;
}

export interface QueryRoleDto {
  page?: number;
  limit?: number;
  search?: string;
  hierarchyLevel?: number;
  isSystemRole?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface RoleResponseDto extends Role {}

export interface PaginatedRoleResponseDto {
  data: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Role Permission Types
// ==========================================

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  role?: Role;
  permission?: any; // Reference to Permission type
  isGranted: boolean;
  conditions?: Record<string, any>;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority: number;
  createdAt: string;
  createdBy: string;
}

export interface AssignRolePermissionDto {
  roleId: string;
  permissionId: string;
  isGranted?: boolean;
  conditions?: Record<string, any>;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority?: number;
}

export interface BulkAssignRolePermissionsDto {
  roleId: string;
  permissionIds: string[];
  isGranted?: boolean;
  conditions?: Record<string, any>;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority?: number;
}

export interface RolePermissionResponseDto extends RolePermission {}

// ==========================================
// Role Module Access Types
// ==========================================

export interface RoleModuleAccess {
  id: string;
  roleId: string;
  moduleId: string;
  role?: Role;
  module?: any; // Reference to Module type
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExecute: boolean;
  canApprove: boolean;
  canManage: boolean;
  createdAt: string;
  createdBy: string;
  version: number;
}

export interface GrantRoleModuleAccessDto {
  roleId: string;
  moduleId: string;
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canExecute?: boolean;
  canApprove?: boolean;
  canManage?: boolean;
}

export interface BulkGrantRoleModuleAccessDto {
  roleId: string;
  moduleIds: string[];
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canExecute?: boolean;
  canApprove?: boolean;
  canManage?: boolean;
}

export interface RoleModuleAccessResponseDto extends RoleModuleAccess {}

// ==========================================
// Role Hierarchy Types
// ==========================================

export interface RoleHierarchyTree {
  role: Role;
  parent?: RoleHierarchyTree;
  children: RoleHierarchyTree[];
  depth: number;
  path: string[];
}
```

### 5.2 User Role Types (`src/types/permissions/user-role.types.ts`)

```typescript
export interface UserRole {
  id: string;
  userProfileId: string;
  roleId: string;
  role?: any; // Reference to Role type
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  createdBy?: string;
}

export interface AssignUserRoleDto {
  userProfileId: string;
  roleId: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface BulkAssignUserRolesDto {
  userProfileId: string;
  roleIds: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UserRoleResponseDto extends UserRole {}
```

### 5.3 User Permission Types (`src/types/permissions/user-permission.types.ts`)

```typescript
export interface UserPermission {
  id: string;
  userProfileId: string;
  permissionId: string;
  permission?: any; // Reference to Permission type
  isGranted: boolean;
  resourceType?: string;
  resourceId?: string;
  conditions?: Record<string, any>;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority: number;
  createdAt: string;
  createdBy: string;
}

export interface GrantUserPermissionDto {
  userProfileId: string;
  permissionId: string;
  isGranted?: boolean;
  resourceType?: string;
  resourceId?: string;
  conditions?: Record<string, any>;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority?: number;
}

export interface BulkGrantUserPermissionsDto {
  userProfileId: string;
  permissionIds: string[];
  isGranted?: boolean;
  resourceType?: string;
  resourceId?: string;
  conditions?: Record<string, any>;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority?: number;
}

export interface QueryUserPermissionDto {
  isGranted?: boolean;
  resourceType?: string;
  resourceId?: string;
  includeExpired?: boolean;
  includeDenied?: boolean;
}

export interface UserPermissionResponseDto extends UserPermission {}
```

### 5.4 Analytics Types (`src/types/permissions/analytics.types.ts`)

```typescript
export interface PermissionUsageStatistics {
  totalPermissions: number;
  activePermissions: number;
  systemPermissions: number;
  permissionsByAction: Record<string, number>;
  permissionsByScope: Record<string, number>;
  mostUsedPermissions: Array<{
    permissionId: string;
    permissionCode: string;
    usageCount: number;
  }>;
  leastUsedPermissions: Array<{
    permissionId: string;
    permissionCode: string;
    usageCount: number;
  }>;
}

export interface RoleUsageStatistics {
  totalRoles: number;
  activeRoles: number;
  systemRoles: number;
  rolesByHierarchyLevel: Record<number, number>;
  mostAssignedRoles: Array<{
    roleId: string;
    roleCode: string;
    assignmentCount: number;
  }>;
  rolesWithMostPermissions: Array<{
    roleId: string;
    roleCode: string;
    permissionCount: number;
  }>;
}

export interface UserPermissionAudit {
  userProfileId: string;
  directPermissions: Array<{
    permissionId: string;
    permissionCode: string;
    isGranted: boolean;
    source: "DIRECT";
  }>;
  roleBasedPermissions: Array<{
    permissionId: string;
    permissionCode: string;
    roleId: string;
    roleCode: string;
    source: "ROLE";
  }>;
  moduleAccesses: Array<{
    moduleId: string;
    moduleCode: string;
    accessLevel: Record<string, boolean>;
  }>;
  effectivePermissions: Array<{
    permissionId: string;
    permissionCode: string;
    resource: string;
    action: string;
    scope: string;
    sources: string[];
  }>;
  roles: Array<{
    roleId: string;
    roleCode: string;
    hierarchyLevel: number;
  }>;
}

export interface BulkOperationResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

export interface ExportedPermissionsData {
  permissions: any[];
  roles: any[];
  rolePermissions: any[];
  modules: any[];
  exportedAt: string;
  version: string;
}
```

---

## 6. API Endpoint Mapping

### 6.1 Complete Backend to Frontend Mapping

| Backend Endpoint                                            | HTTP   | RTK Query Hook                             | Status    |
| ----------------------------------------------------------- | ------ | ------------------------------------------ | --------- |
| **PERMISSIONS**                                             |
| `/permissions`                                           | GET    | `useGetPermissionsQuery()`                 | Existing  |
| `/permissions`                                           | POST   | `useCreatePermissionMutation()`            | Existing  |
| `/permissions/grouped`                                   | GET    | `useGetGroupedPermissionsQuery()`          | ✨ NEW    |
| `/permissions/by-code/:code`                             | GET    | `useGetPermissionByCodeQuery()`            | ✨ UPDATE |
| `/permissions/:id`                                       | GET    | `useGetPermissionByIdQuery()`              | Existing  |
| `/permissions/:id`                                       | PATCH  | `useUpdatePermissionMutation()`            | Existing  |
| `/permissions/:id`                                       | DELETE | `useDeletePermissionMutation()`            | Existing  |
| `/permissions/:id/restore`                               | POST   | `useRestorePermissionMutation()`           | ✨ NEW    |
| `/permissions/check`                                     | POST   | `useCheckPermissionMutation()`             | ✨ UPDATE |
| `/permissions/check/bulk`                                | POST   | `useBulkCheckPermissionsMutation()`        | ✨ NEW    |
| `/permissions/user/:userId`                              | GET    | `useGetUserEffectivePermissionsQuery()`    | ✨ NEW    |
| **ROLES**                                                   |
| `/permissions/roles`                                     | GET    | `useGetRolesQuery()`                       | ✨ NEW    |
| `/permissions/roles`                                     | POST   | `useCreateRoleMutation()`                  | ✨ NEW    |
| `/permissions/roles/:id`                                 | GET    | `useGetRoleByIdQuery()`                    | ✨ NEW    |
| `/permissions/roles/:id`                                 | PATCH  | `useUpdateRoleMutation()`                  | ✨ NEW    |
| `/permissions/roles/:id`                                 | DELETE | `useDeleteRoleMutation()`                  | ✨ NEW    |
| `/permissions/roles/:id/restore`                         | POST   | `useRestoreRoleMutation()`                 | ✨ NEW    |
| **ROLE PERMISSIONS**                                        |
| `/permissions/roles/:id/permissions`                     | POST   | `useAssignRolePermissionMutation()`        | ✨ NEW    |
| `/permissions/roles/:id/permissions/bulk`                | POST   | `useBulkAssignRolePermissionsMutation()`   | ✨ NEW    |
| `/permissions/roles/:id/permissions`                     | GET    | `useGetRolePermissionsQuery()`             | ✨ NEW    |
| `/permissions/roles/:id/permissions/:permissionId`       | DELETE | `useRevokeRolePermissionMutation()`        | ✨ NEW    |
| **ROLE MODULE ACCESS**                                      |
| `/permissions/roles/:id/modules`                         | POST   | `useGrantRoleModuleAccessMutation()`       | ✨ NEW    |
| `/permissions/roles/:id/modules/bulk`                    | POST   | `useBulkGrantRoleModuleAccessMutation()`   | ✨ NEW    |
| `/permissions/roles/:id/modules`                         | GET    | `useGetRoleModuleAccessesQuery()`          | ✨ NEW    |
| `/permissions/roles/:id/modules/:moduleAccessId`         | DELETE | `useRevokeRoleModuleAccessMutation()`      | ✨ NEW    |
| **ROLE HIERARCHY**                                          |
| `/permissions/roles/:id/hierarchy`                       | POST   | `useCreateRoleHierarchyMutation()`         | ✨ NEW    |
| `/permissions/roles/:id/hierarchy/tree`                  | GET    | `useGetRoleHierarchyTreeQuery()`           | ✨ NEW    |
| `/permissions/roles/:id/hierarchy/inherited-permissions` | GET    | `useGetInheritedPermissionsQuery()`        | ✨ NEW    |
| `/permissions/roles/:id/hierarchy`                       | DELETE | `useRemoveRoleHierarchyMutation()`         | ✨ NEW    |
| **USER ROLES**                                              |
| `/permissions/users/:userId/roles`                       | POST   | `useAssignUserRoleMutation()`              | ✨ NEW    |
| `/permissions/users/:userId/roles/bulk`                  | POST   | `useBulkAssignUserRolesMutation()`         | ✨ NEW    |
| `/permissions/users/:userId/roles`                       | GET    | `useGetUserRolesQuery()`                   | ✨ NEW    |
| `/permissions/users/:userId/roles/:roleId`               | DELETE | `useRevokeUserRoleMutation()`              | ✨ NEW    |
| **USER PERMISSIONS**                                        |
| `/permissions/users/:userId/permissions`                 | POST   | `useGrantUserPermissionMutation()`         | ✨ NEW    |
| `/permissions/users/:userId/permissions/bulk`            | POST   | `useBulkGrantUserPermissionsMutation()`    | ✨ NEW    |
| `/permissions/users/:userId/permissions`                 | GET    | `useGetUserPermissionsQuery()`             | ✨ NEW    |
| `/permissions/users/:userId/permissions/:permissionId`   | GET    | `useGetUserPermissionQuery()`              | ✨ NEW    |
| `/permissions/users/:userId/permissions/:permissionId`   | DELETE | `useRevokeUserPermissionMutation()`        | ✨ NEW    |
| **ANALYTICS & BULK**                                        |
| `/permissions/usage-statistics`                          | GET    | `useGetPermissionUsageStatisticsQuery()`   | ✨ NEW    |
| `/permissions/roles/usage-statistics`                    | GET    | `useGetRoleUsageStatisticsQuery()`         | ✨ NEW    |
| `/permissions/users/permission-audit/:userId`            | GET    | `useGetUserPermissionAuditQuery()`         | ✨ NEW    |
| `/permissions/bulk/assign-roles`                         | POST   | `useBulkAssignRolesToUsersMutation()`      | ✨ NEW    |
| `/permissions/bulk/assign-permissions`                   | POST   | `useBulkAssignPermissionsToRoleMutation()` | ✨ NEW    |
| `/permissions/bulk/revoke-roles`                         | POST   | `useBulkRevokeRolesFromUsersMutation()`    | ✨ NEW    |
| `/permissions/export`                                    | GET    | `useExportPermissionsQuery()`              | ✨ NEW    |
| `/permissions/import`                                    | POST   | `useImportPermissionsMutation()`           | ✨ NEW    |

**Legend:**

- ✨ NEW: Endpoint belum ada di frontend
- ✨ UPDATE: Endpoint ada tapi perlu diperbaiki/diperlengkapi

---

## 7. Implementation Details

### 7.1 RTK Query Setup dengan fetchBaseQuery

**Base API Configuration (`src/store/api/apiSliceWithHook.ts`):**

```typescript
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    prepareHeaders: (headers, { getState }) => {
      // Add authentication token
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }

      // Add default headers
      headers.set("Content-Type", "application/json");

      return headers;
    },
    credentials: "include", // Include cookies for sessions
  }),
  tagTypes: [
    "Permission",
    "PermissionGroup",
    "Role",
    "RolePermission",
    "RoleModuleAccess",
    "Module",
    "ModulePermission",
    "UserRole",
    "UserPermission",
    "Analytics",
  ],
  endpoints: () => ({}), // Endpoints will be injected
});
```

### 7.2 RTK Query Endpoint Pattern

**Template untuk semua API endpoint files:**

```typescript
import { apiSlice } from "./apiSliceWithHook";
import type {
  ResourceType,
  CreateDto,
  UpdateDto,
  QueryParams,
  PaginatedResponse,
} from "@/types/permissions";

export const resourceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    getResources: builder.query<
      PaginatedResponse<ResourceType>,
      QueryParams | void
    >({
      query: (params = {}) => ({
        url: "/permissions/resource",
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          ...params,
        },
      }),
      transformResponse: (response: any) => {
        // Handle backend response wrapping if needed
        if (response?.success && response?.data) {
          return response.data;
        }
        return response;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({
                type: "Resource" as const,
                id,
              })),
              { type: "Resource" as const, id: "LIST" },
            ]
          : [{ type: "Resource" as const, id: "LIST" }],
    }),

    getResourceById: builder.query<ResourceType, string>({
      query: (id) => `/permissions/resource/${id}`,
      transformResponse: (response: any) =>
        response?.success ? response.data : response,
      providesTags: (result, error, id) => [{ type: "Resource", id }],
    }),

    // ===== MUTATIONS =====

    createResource: builder.mutation<ResourceType, CreateDto>({
      query: (data) => ({
        url: "/permissions/resource",
        method: "POST",
        body: data,
      }),
      transformResponse: (response: any) =>
        response?.success ? response.data : response,
      invalidatesTags: [{ type: "Resource", id: "LIST" }],

      // Optional: Optimistic update
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          resourceApi.util.updateQueryData(
            "getResources",
            undefined,
            (draft) => {
              // Add optimistic data to cache
              const tempId = `temp-${Date.now()}`;
              draft.data.unshift({ id: tempId, ...arg } as ResourceType);
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo(); // Rollback on error
        }
      },
    }),

    updateResource: builder.mutation<
      ResourceType,
      { id: string; data: UpdateDto }
    >({
      query: ({ id, data }) => ({
        url: `/permissions/resource/${id}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (response: any) =>
        response?.success ? response.data : response,
      invalidatesTags: (result, error, { id }) => [
        { type: "Resource", id },
        { type: "Resource", id: "LIST" },
      ],
    }),

    deleteResource: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/resource/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Resource", id },
        { type: "Resource", id: "LIST" },
      ],
    }),

    restoreResource: builder.mutation<ResourceType, string>({
      query: (id) => ({
        url: `/permissions/resource/${id}/restore`,
        method: "POST",
      }),
      transformResponse: (response: any) =>
        response?.success ? response.data : response,
      invalidatesTags: (result, error, id) => [
        { type: "Resource", id },
        { type: "Resource", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export auto-generated hooks
export const {
  useGetResourcesQuery,
  useGetResourceByIdQuery,
  useCreateResourceMutation,
  useUpdateResourceMutation,
  useDeleteResourceMutation,
  useRestoreResourceMutation,
} = resourceApi;
```

### 7.3 Error Handling Pattern

**RTK Query handles errors automatically. Display in components:**

```typescript
const { data, isLoading, isError, error } = useGetResourcesQuery();

if (isError) {
  // RTK Query error format
  const message =
    "error" in error
      ? error.error
      : "status" in error
      ? `Error ${error.status}: ${JSON.stringify(error.data)}`
      : "An error occurred";

  return <ErrorAlert message={message} />;
}

if (isLoading) {
  return <LoadingSpinner />;
}

return <DataDisplay data={data} />;
```

**Custom error handling in mutations:**

```typescript
const [createResource, { isLoading }] = useCreateResourceMutation();

const handleSubmit = async (data: CreateDto) => {
  try {
    const result = await createResource(data).unwrap();
    toast.success("Resource created successfully");
  } catch (error) {
    const message =
      "data" in error ? error.data.message : "Failed to create resource";
    toast.error(message);
  }
};
```

### 7.4 Cache Tags Strategy

**RTK Query cache tags organization:**

```typescript
// Define all tags in apiSlice
export const apiSlice = createApi({
  tagTypes: [
    "Permission",
    "PermissionGroup",
    "Role",
    "RolePermission",
    "RoleModuleAccess",
    "Module",
    "ModulePermission",
    "UserRole",
    "UserPermission",
    "Analytics",
  ],
  // ...
});
```

**Invalidation strategy:**

- List queries: `{ type: 'Resource', id: 'LIST' }`
- Detail queries: `{ type: 'Resource', id: resourceId }`
- Mutations: Invalidate both LIST and specific ID
- Related entities: Invalidate parent/child relationships

---

## 8. Testing Strategy

### 8.1 Unit Tests

**RTK Query Hook Tests:**

```typescript
// rolesApi.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useGetRolesQuery, useCreateRoleMutation } from "./rolesApi";
import { setupApiStore } from "@/test/utils";

describe("rolesApi", () => {
  it("should fetch roles with pagination", async () => {
    const storeRef = setupApiStore();
    const { result } = renderHook(
      () => useGetRolesQuery({ page: 1, limit: 10 }),
      {
        wrapper: storeRef.wrapper,
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.data).toBeInstanceOf(Array);
  });

  it("should create role and invalidate cache", async () => {
    const storeRef = setupApiStore();
    const { result } = renderHook(() => useCreateRoleMutation(), {
      wrapper: storeRef.wrapper,
    });

    const [createRole] = result.current;

    const newRole = await createRole({
      code: "test_role",
      name: "Test Role",
    }).unwrap();

    expect(newRole.id).toBeDefined();
    expect(newRole.code).toBe("test_role");
  });
});
```

**Component Tests with RTK Query:**

```typescript
// RoleList.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { RoleList } from "./RoleList";
import { setupApiStore } from "@/test/utils";

describe("RoleList", () => {
  it("should display roles from RTK Query", async () => {
    const storeRef = setupApiStore();

    render(<RoleList />, { wrapper: storeRef.wrapper });

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Manager")).toBeInTheDocument();
    });
  });
});
```

### 8.2 Integration Tests

**RTK Query Integration:**

```typescript
// roles.integration.test.ts
import { setupApiStore } from "@/test/utils";
import { rolesApi } from "./rolesApi";

describe("Roles API Integration", () => {
  it("should create, update, and delete role", async () => {
    const storeRef = setupApiStore();
    const { store } = storeRef;

    // Create
    const createResult = await store.dispatch(
      rolesApi.endpoints.createRole.initiate({
        code: "test_role",
        name: "Test Role",
      })
    );
    expect(createResult.data?.id).toBeDefined();
    const roleId = createResult.data!.id;

    // Update
    const updateResult = await store.dispatch(
      rolesApi.endpoints.updateRole.initiate({
        id: roleId,
        data: { name: "Updated Role" },
      })
    );
    expect(updateResult.data?.name).toBe("Updated Role");

    // Delete
    const deleteResult = await store.dispatch(
      rolesApi.endpoints.deleteRole.initiate(roleId)
    );
    expect(deleteResult.isSuccess).toBe(true);
  });
});
```

### 8.3 E2E Tests (Optional)

**User flow testing:**

```typescript
// permission-management.e2e.test.ts
describe("Permission Management Flow", () => {
  it("should allow admin to manage role permissions", async () => {
    // 1. Login as admin
    await loginAsAdmin();

    // 2. Navigate to roles page
    await navigateTo("/settings/roles");

    // 3. Create new role
    await createRole({ code: "manager", name: "Manager" });

    // 4. Assign permissions
    await assignPermissionsToRole("manager", ["read_users", "update_users"]);

    // 5. Verify permissions
    const permissions = await getRolePermissions("manager");
    expect(permissions).toHaveLength(2);
  });
});
```

---

## 9. Dependencies

### 9.1 Required Packages

**Already Installed (Verify):**

```json
{
  "@reduxjs/toolkit": "^2.0.x or ^1.9.x",
  "react-redux": "^8.0.x or ^9.0.x"
}
```

**NO Additional Installation Needed:**

- ❌ Axios tidak diperlukan (RTK Query menggunakan fetchBaseQuery)
- ❌ Service layer libraries tidak diperlukan
- ✅ RTK Query sudah included dalam @reduxjs/toolkit

**Testing Dependencies:**

```bash
# For testing RTK Query
npm install --save-dev @testing-library/react @testing-library/react-hooks
npm install --save-dev jest @types/jest
```

### 9.2 RTK Query Best Practices

**fetchBaseQuery Configuration:**

```typescript
// src/store/api/apiSliceWithHook.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    prepareHeaders: (headers, { getState }) => {
      // Add auth token
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("authorization", `Bearer ${token}`);

      headers.set("Content-Type", "application/json");
      return headers;
    },
    credentials: "include",
  }),
  // ... rest of config
});
```

**Cache Optimization:**

- Use `providesTags` and `invalidatesTags` for automatic cache invalidation
- Implement optimistic updates with `onQueryStarted` for better UX
- Use `transformResponse` to normalize backend data structure
- Enable `refetchOnMountOrArgChange` for critical data

**Error Handling:**

- RTK Query automatically handles network errors
- Use `.unwrap()` in mutations for try-catch error handling
- Implement custom error display with `isError` and `error` from hooks

### 9.3 Project Structure Dependencies

**Verify these exist:**

- `src/store/api/apiSliceWithHook.ts` - RTK Query base configuration
- `src/types/index.ts` - Common types
- `src/store/index.ts` - Redux store configuration
- `src/types/permissions/` - Permission-related type definitions

---

## 10. Implementation Checklist

### Phase 0: UI Design & Navigation Setup ✅

#### 3.1 Navigation & Routes

- [ ] Update app sidebar
  - [ ] Add Permission Management menu section
  - [ ] Add all submenu items (Roles, Permissions, Modules, Users, Analytics)
  - [ ] Import required icons (Shield, LayoutDashboard, Users, Key, Package, UserCheck, BarChart3)
- [ ] Create route structure
  - [ ] `app/(dashboard)/permissions/page.tsx` - Dashboard
  - [ ] `app/(dashboard)/permissions/layout.tsx` - Layout wrapper
  - [ ] Create roles routes (list, detail, new)
  - [ ] Create permissions routes (list, detail, new)
  - [ ] Create modules routes (list, detail, tree)
  - [ ] Create users assignment routes
  - [ ] Create analytics routes

#### 3.2 Dashboard Components

- [ ] Create dashboard components
  - [ ] `PermissionDashboard.tsx` - Main dashboard
  - [ ] `StatisticsCards.tsx` - Overview cards
  - [ ] `RecentActivities.tsx` - Activity feed

#### 3.3 Roles Components

- [ ] Create roles components
  - [ ] `RoleList.tsx` - Data table with filtering/sorting
  - [ ] `RoleForm.tsx` - Create/Edit form
  - [ ] `RoleCard.tsx` - Display card
  - [ ] `RoleHierarchyTree.tsx` - Tree visualization
  - [ ] `RolePermissionsManager.tsx` - Permission assignment
  - [ ] `RoleModuleAccessManager.tsx` - Module access assignment
  - [ ] `DeleteRoleDialog.tsx` - Confirmation dialog

#### 3.4 Permissions Components

- [ ] Create permissions components
  - [ ] `PermissionList.tsx` - Data table
  - [ ] `PermissionForm.tsx` - Create/Edit form
  - [ ] `PermissionGroupView.tsx` - Grouped view
  - [ ] `PermissionCard.tsx` - Display card
  - [ ] `DeletePermissionDialog.tsx` - Confirmation dialog

#### 3.5 Modules Components

- [ ] Create modules components
  - [ ] `ModuleList.tsx` - Data table
  - [ ] `ModuleForm.tsx` - Create/Edit form
  - [ ] `ModuleTree.tsx` - Tree visualization
  - [ ] `ModulePermissionsView.tsx` - Module permissions

#### 3.6 User Assignment Components

- [ ] Create user assignment components
  - [ ] `UserRoleAssignment.tsx` - Assign roles
  - [ ] `UserPermissionAssignment.tsx` - Assign permissions
  - [ ] `UserRolesList.tsx` - User's roles
  - [ ] `UserPermissionsList.tsx` - User's permissions
  - [ ] `UserPermissionAudit.tsx` - Audit view

#### 3.7 Analytics Components

- [ ] Create analytics components
  - [ ] `AnalyticsDashboard.tsx` - Analytics overview
  - [ ] `UsageStatistics.tsx` - Usage stats
  - [ ] `RoleUsageChart.tsx` - Role usage charts
  - [ ] `PermissionUsageChart.tsx` - Permission usage charts

#### 3.8 Bulk Operations Components

- [ ] Create bulk operation dialogs
  - [ ] `BulkAssignRolesDialog.tsx`
  - [ ] `BulkAssignPermissionsDialog.tsx`
  - [ ] `BulkRevokeRolesDialog.tsx`

#### 3.9 Shared Components

- [ ] Create shared components
  - [ ] `PermissionBadge.tsx` - Status badge
  - [ ] `RoleBadge.tsx` - Status badge
  - [ ] `TemporalDatePicker.tsx` - Date picker
  - [ ] `HierarchyLevelIndicator.tsx` - Level indicator

#### 3.10 Testing & QA

- [ ] Component unit tests
  - [ ] Test all components with React Testing Library
  - [ ] Test user interactions and state changes
- [ ] Navigation testing
  - [ ] Test all route transitions
  - [ ] Test sidebar menu interactions
- [ ] Accessibility audit
  - [ ] Run axe-devtools on all pages
  - [ ] Fix WCAG 2.1 AA violations
  - [ ] Test keyboard navigation
- [ ] Responsive design testing
  - [ ] Test mobile (320px - 767px)
  - [ ] Test tablet (768px - 1023px)
  - [ ] Test desktop (1024px+)

---

### Phase 1: Core Role Management ✅

- [ ] Create type definitions
  - [ ] `src/types/permissions/role.types.ts`
- [ ] Create RTK Query API
  - [ ] `src/store/api/rolesApi.ts`
  - [ ] Define endpoints: `getRoles`, `getRoleById`, `createRole`, `updateRole`, `deleteRole`, `restoreRole`
  - [ ] Implement proper cache tags (`providesTags`, `invalidatesTags`)
  - [ ] Export auto-generated hooks
- [ ] Write tests
  - [ ] RTK Query hook tests
  - [ ] Component integration tests with mocked API
- [ ] Update documentation
  - [ ] Add JSDoc comments
  - [ ] Update README if needed

### Phase 2: Role Permissions Assignment ✅

- [ ] Extend type definitions
  - [ ] Add `RolePermission` types to `role.types.ts`
- [ ] Extend RTK Query API
  - [ ] Add endpoints to `rolesApi.ts`
  - [ ] Implement: `assignRolePermission`, `bulkAssignRolePermissions`, `getRolePermissions`, `revokeRolePermission`
  - [ ] Implement cache invalidation for both Role and Permission tags
- [ ] Write tests
  - [ ] Test permission assignment flows with RTK Query
  - [ ] Test bulk operations and cache updates
- [ ] Integration testing
  - [ ] Test with real backend using `setupApiStore`

### Phase 3: User Role Management ✅

- [ ] Create type definitions
  - [ ] `src/types/permissions/user-role.types.ts`
- [ ] Create RTK Query API
  - [ ] `src/store/api/userRolesApi.ts`
  - [ ] Define endpoints: `assignUserRole`, `bulkAssignUserRoles`, `getUserRoles`, `revokeUserRole`
  - [ ] Export auto-generated hooks
- [ ] Write tests
  - [ ] RTK Query hook tests
  - [ ] Integration tests with store
- [ ] Integration testing
  - [ ] Test user role flows with backend

### Phase 4: User Direct Permissions ✅

- [ ] Create type definitions
  - [ ] `src/types/permissions/user-permission.types.ts`
- [ ] Create RTK Query API
  - [ ] `src/store/api/userPermissionsApi.ts`
  - [ ] Define endpoints: `grantUserPermission`, `bulkGrantUserPermissions`, `getUserPermissions`, `getUserPermission`, `revokeUserPermission`
  - [ ] Implement filtering support with query parameters
  - [ ] Export auto-generated hooks
- [ ] Write tests
  - [ ] Test permission granting with RTK Query
  - [ ] Test filtering and pagination
- [ ] Integration testing
  - [ ] Test with backend using `setupApiStore`

### Phase 5: Role Module Access & Hierarchy ✅

- [ ] Extend type definitions
  - [ ] Add `RoleModuleAccess` and `RoleHierarchy` types
- [ ] Extend RTK Query API
  - [ ] Add module access endpoints to `rolesApi.ts`
  - [ ] Implement: `grantRoleModuleAccess`, `bulkGrantRoleModuleAccess`, `getRoleModuleAccesses`, `revokeRoleModuleAccess`
  - [ ] Add hierarchy endpoints: `createRoleHierarchy`, `getRoleHierarchyTree`, `getInheritedPermissions`, `removeRoleHierarchy`
- [ ] Write tests
  - [ ] Test module access flows with RTK Query
  - [ ] Test hierarchy operations and cache invalidation
- [ ] Integration testing
  - [ ] Test complex hierarchy scenarios

### Phase 6: Analytics & Bulk Operations ✅

- [ ] Create type definitions
  - [ ] `src/types/permissions/analytics.types.ts`
- [ ] Create RTK Query API
  - [ ] `src/store/api/analyticsApi.ts`
  - [ ] Implement analytics endpoints: `getPermissionUsageStatistics`, `getRoleUsageStatistics`, `getUserPermissionAudit`
  - [ ] Implement bulk endpoints: `bulkAssignRolesToUsers`, `bulkAssignPermissionsToRole`, `bulkRevokeRolesFromUsers`
  - [ ] Implement export/import: `exportPermissions`, `importPermissions`
- [ ] Write tests
  - [ ] Test statistics retrieval with RTK Query
  - [ ] Test bulk operations and cache updates
  - [ ] Test export/import functionality
- [ ] Integration testing
  - [ ] Full system test with all APIs

### Phase 7: UI Implementation & Integration ✅

#### 7.1 Navigation & Routes

- [ ] Update app sidebar
  - [ ] Add Permission Management menu section
  - [ ] Add all submenu items (Roles, Permissions, Modules, Users, Analytics)
  - [ ] Import required icons (Shield, LayoutDashboard, Users, Key, Package, UserCheck, BarChart3)
- [ ] Create route structure
  - [ ] `app/(dashboard)/permissions/page.tsx` - Dashboard
  - [ ] `app/(dashboard)/permissions/layout.tsx` - Layout wrapper
  - [ ] Create roles routes (list, detail, new, permissions, modules, hierarchy)
  - [ ] Create permissions routes (list, detail, new)
  - [ ] Create modules routes (list, detail, tree)
  - [ ] Create users assignment routes (roles, permissions)
  - [ ] Create analytics routes (dashboard, usage, audit)

#### 7.2 Dashboard Components

- [ ] Create dashboard components
  - [ ] `PermissionDashboard.tsx` - Integrate Phase 6 analytics APIs
  - [ ] `StatisticsCards.tsx` - Display usage statistics
  - [ ] `RecentActivities.tsx` - Activity feed

#### 7.3 Roles Components

- [ ] Create roles components
  - [ ] `RoleList.tsx` - Data table (Phase 1 API: useGetRolesQuery)
  - [ ] `RoleForm.tsx` - Create/Edit (Phase 1 API: useCreateRoleMutation, useUpdateRoleMutation)
  - [ ] `RoleCard.tsx` - Display card
  - [ ] `RoleHierarchyTree.tsx` - Tree visualization (Phase 5 API: useGetRoleHierarchyTreeQuery)
  - [ ] `RolePermissionsManager.tsx` - Permission assignment (Phase 2 API)
  - [ ] `RoleModuleAccessManager.tsx` - Module access (Phase 5 API)
  - [ ] `DeleteRoleDialog.tsx` - Confirmation dialog (Phase 1 API: useDeleteRoleMutation)

#### 7.4 Permissions Components

- [ ] Create permissions components
  - [ ] `PermissionList.tsx` - Data table (useGetPermissionsQuery)
  - [ ] `PermissionForm.tsx` - Create/Edit form
  - [ ] `PermissionGroupView.tsx` - Grouped view (useGetGroupedPermissionsQuery)
  - [ ] `PermissionCard.tsx` - Display card
  - [ ] `DeletePermissionDialog.tsx` - Confirmation dialog

#### 7.5 Modules Components

- [ ] Create modules components
  - [ ] `ModuleList.tsx` - Data table (useGetModulesQuery)
  - [ ] `ModuleForm.tsx` - Create/Edit form
  - [ ] `ModuleTree.tsx` - Tree visualization (useGetModuleTreeQuery)
  - [ ] `ModulePermissionsView.tsx` - Module permissions

#### 7.6 User Assignment Components

- [ ] Create user assignment components
  - [ ] `UserRoleAssignment.tsx` - Assign roles (Phase 3 API: useAssignUserRoleMutation)
  - [ ] `UserPermissionAssignment.tsx` - Assign permissions (Phase 4 API: useGrantUserPermissionMutation)
  - [ ] `UserRolesList.tsx` - User's roles (Phase 3 API: useGetUserRolesQuery)
  - [ ] `UserPermissionsList.tsx` - User's permissions (Phase 4 API: useGetUserPermissionsQuery)
  - [ ] `UserPermissionAudit.tsx` - Audit view (Phase 6 API: useGetUserPermissionAuditQuery)

#### 7.7 Analytics Components

- [ ] Create analytics components
  - [ ] `AnalyticsDashboard.tsx` - Analytics overview (Phase 6 API)
  - [ ] `UsageStatistics.tsx` - Usage stats (useGetPermissionUsageStatisticsQuery)
  - [ ] `RoleUsageChart.tsx` - Role usage charts (useGetRoleUsageStatisticsQuery)
  - [ ] `PermissionUsageChart.tsx` - Permission usage visualization

#### 7.8 Bulk Operations Components

- [ ] Create bulk operation dialogs
  - [ ] `BulkAssignRolesDialog.tsx` - Phase 6 API (useBulkAssignRolesToUsersMutation)
  - [ ] `BulkAssignPermissionsDialog.tsx` - Phase 6 API (useBulkAssignPermissionsToRoleMutation)
  - [ ] `BulkRevokeRolesDialog.tsx` - Phase 6 API (useBulkRevokeRolesFromUsersMutation)

#### 7.9 Shared Components

- [ ] Create shared components
  - [ ] `PermissionBadge.tsx` - Status badge
  - [ ] `RoleBadge.tsx` - Status badge
  - [ ] `TemporalDatePicker.tsx` - Date picker with temporal support
  - [ ] `HierarchyLevelIndicator.tsx` - Level indicator

#### 7.10 Dependencies & Setup

- [ ] Install required packages
  - [ ] `@tanstack/react-table`, `recharts`, `date-fns`
  - [ ] `react-hook-form`, `@hookform/resolvers`, `zod`
  - [ ] `lucide-react`
- [ ] Add shadcn/ui components
  - [ ] button, card, dialog, dropdown-menu, input, label
  - [ ] select, table, tabs, toast, badge, calendar, checkbox, form

#### 7.11 Testing & QA

- [ ] Component unit tests
  - [ ] Test all components with React Testing Library (>80% coverage)
  - [ ] Test user interactions and state changes
  - [ ] Test API integration with mock data
- [ ] Navigation testing
  - [ ] Test all route transitions
  - [ ] Test sidebar menu interactions
  - [ ] Test breadcrumb navigation
- [ ] Accessibility audit
  - [ ] Run axe-devtools on all pages
  - [ ] Fix WCAG 2.1 AA violations
  - [ ] Test keyboard navigation
  - [ ] Test screen reader compatibility
- [ ] Responsive design testing
  - [ ] Test mobile (320px - 767px)
  - [ ] Test tablet (768px - 1023px)
  - [ ] Test desktop (1024px+)
- [ ] E2E testing
  - [ ] Test critical user flows (role creation, permission assignment)
  - [ ] Test bulk operations
  - [ ] Test analytics dashboard
- [ ] Performance testing
  - [ ] Measure initial page load (<3s)
  - [ ] Test component render time (<100ms)
  - [ ] Test data table pagination performance

---

### Additional Tasks ✅

- [ ] Update existing files
  - [ ] Update `permissions.service.ts` with missing endpoints
  - [ ] Update `permissionApi.ts` with missing endpoints
- [ ] Create custom hooks (optional)
  - [ ] `src/hooks/useRoles.ts`
  - [ ] `src/hooks/useUserRoles.ts`
  - [ ] `src/hooks/useUserPermissions.ts`
  - [ ] `src/hooks/usePermissionAnalytics.ts`
- [ ] Update components
  - [ ] Update `ManagePermissionsModal.tsx` to use new APIs
- [ ] Documentation
  - [ ] Add API documentation
  - [ ] Create usage examples
  - [ ] Update project README

---

## 11. Best Practices & Recommendations

### 11.1 Code Organization

1. **Consistent File Structure**

   - Keep service files in `src/lib/api/services/`
   - Keep RTK Query files in `src/store/api/`
   - Keep types in `src/types/permissions/`
   - Keep hooks in `src/hooks/`

2. **Naming Conventions**

   - Services: `resource.service.ts`
   - RTK Query: `resourceApi.ts`
   - Types: `resource.types.ts`
   - Hooks: `useResource.ts`

3. **Import Organization**

   ```typescript
   // 1. External libraries
   import { useState, useEffect } from "react";

   // 2. Internal utilities
   import apiClient from "../client";

   // 3. Types
   import type { Resource } from "@/types";

   // 4. Local files
   import { helper } from "./helper";
   ```

### 11.2 Performance Optimization

1. **RTK Query Caching**

   - Use appropriate `keepUnusedDataFor` values
   - Implement selective cache invalidation
   - Use `providesTags` and `invalidatesTags` correctly

2. **Code Splitting**

   - Lazy load permission management components
   - Split large service files if needed

3. **API Optimization**
   - Use pagination for large datasets
   - Implement debouncing for search
   - Cache frequently accessed data

### 11.3 Error Handling

1. **Graceful Degradation**

   - Show fallback UI on errors
   - Provide retry mechanisms
   - Log errors for debugging

2. **User Feedback**
   - Show loading states
   - Display error messages clearly
   - Provide success confirmations

### 11.4 Security Considerations

1. **Authentication**

   - Ensure all API calls include auth headers
   - Handle token refresh properly
   - Redirect on auth failures

2. **Authorization**

   - Implement client-side permission checks
   - Hide unauthorized UI elements
   - Validate on backend (never trust client)

3. **Data Validation**
   - Validate form inputs
   - Sanitize user inputs
   - Use TypeScript strict mode

---

## 12. Timeline & Milestones

### Week 1: API Integration with RTK Query

- **Day 0.5**: Phase 1 - Core Role Management (types, RTK Query endpoints)
- **Day 0.5**: Phase 2 - Role Permissions Assignment (extend RTK Query)
- **Day 0.5**: Phase 3 - User Role Management (RTK Query endpoints)
- **Day 0.5**: Phase 4 - User Direct Permissions (RTK Query endpoints)
- **Day 1**: Phase 5 - Role Module Access & Hierarchy (RTK Query endpoints)
- **Day 1**: Phase 6 - Analytics & Bulk Operations (RTK Query endpoints)

### Week 2: API Testing & UI Preparation

- **Day 1**: RTK Query Integration Testing & Bug Fixes
- **Day 1**: RTK Query hook testing & documentation
- **Day 1**: Prepare UI foundation (navigation, routes, shared components)
- **Day 2**: Reserve for unexpected issues or buffer

### Week 3: UI Implementation (Phase 7 - Part 1)

- **Day 1**: Navigation setup, route structure, layout components
- **Day 1**: Dashboard & Analytics components (integrate Phase 6 APIs)
- **Day 1**: Roles components - List, Form, Card (Phase 1-2 APIs)
- **Day 1**: Roles components - Hierarchy, Permissions, Modules (Phase 5 APIs)
- **Day 1**: Permissions & Modules components (9 components)

### Week 4: UI Completion & Testing (Phase 7 - Part 2)

- **Day 1**: Users & Bulk Operations components (8 components)
- **Day 1**: Component integration testing & bug fixes
- **Day 1**: E2E testing & user flow validation
- **Day 1**: Accessibility audit & responsive design fixes
- **Day 1**: Performance optimization & final review

### Updated Timeline Summary (RTK Query Only)

- **Total Duration:** 14-16 working days (3-4 weeks)
- **Phases 1-6 (RTK Query Integration):** 5-6 days (50% faster than service layer approach)
- **Phase 7 (UI Layer):** 5-6 days
- **Testing & QA:** 3-4 days
- **Buffer:** Built into each week

### Efficiency Gains from RTK Query Only

- ✅ **50% less code** - No service layer duplication
- ✅ **50% faster Phase 1-6** - Direct RTK Query endpoints (10 days → 5-6 days)
- ✅ **Auto-generated hooks** - No manual hook creation needed
- ✅ **Built-in caching** - Automatic cache invalidation reduces boilerplate
- ✅ **Simpler testing** - Single layer to test instead of service + API
- ✅ **Better DX** - TypeScript inference works better with RTK Query

### Success Criteria

- ✅ All navigation routes functional and accessible
- ✅ Complete UI component library for permission management
- ✅ All 60+ backend endpoints have frontend integration
- ✅ 100% type coverage for all DTOs
- ✅ RTK Query hooks for all operations
- ✅ Unit tests coverage > 80%
- ✅ Integration tests for critical flows
- ✅ E2E tests for user workflows (REQUIRED)
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Mobile-responsive design
- ✅ Documentation complete
- ✅ No backend changes required

---

## 13. Support & References

### 13.1 Internal Documentation

- Backend Controllers: `/backend/src/modules/permissions/controllers/`
- Backend DTOs: `/backend/src/modules/permissions/dto/`
- Backend Services: `/backend/src/modules/permissions/services/`
- Prisma Schema: `/backend/prisma/schema.prisma`

### 13.2 External Resources

- [RTK Query Documentation](https://redux-toolkit.js.org/rtk-query/overview)
- [RTK Query fetchBaseQuery](https://redux-toolkit.js.org/rtk-query/api/fetchBaseQuery)
- [RTK Query Code Generation](https://redux-toolkit.js.org/rtk-query/usage/code-generation)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [RTK Query Testing Guide](https://redux-toolkit.js.org/rtk-query/usage/testing)

### 13.3 Team Contacts

- Backend Team: For API questions and clarifications
- QA Team: For testing strategy and test cases
- DevOps Team: For deployment and environment setup

---

## Appendix A: Quick Start Guide

### For Developers Starting Implementation

1. **Setup Environment**

   ```bash
   cd frontend
   npm install
   # Verify @reduxjs/toolkit is installed (RTK Query included)
   ```

2. **Start with Phase 1**

   ```bash
   # Create type file
   touch src/types/permissions/role.types.ts

   # Create RTK Query API file
   touch src/store/api/rolesApi.ts
   ```

3. **Follow the Templates**

   - Copy RTK Query fetchBaseQuery setup from Section 7.1
   - Copy RTK Query endpoint template from Section 7.2
   - Copy type definitions from Section 5.1

4. **Test As You Go**

   - Write RTK Query hook tests with `setupApiStore`
   - Test with Postman/Thunder Client to verify backend
   - Verify cache invalidation works with `providesTags` and `invalidatesTags`
   - Test optimistic updates if implemented

5. **Move to Next Phase**
   - Complete checklist for current phase
   - Update progress in this document
   - Proceed to next phase

### RTK Query Workflow

1. **Create Types** - Define TypeScript types
2. **Create Endpoints** - Use `apiSlice.injectEndpoints()`
3. **Export Hooks** - RTK Query auto-generates hooks
4. **Use in Components** - Import and use hooks directly
5. **Test** - Test hooks with `renderHook` and `setupApiStore`

**No Service Layer Needed!** RTK Query handles everything:

### Common Commands

```bash
# Run tests
npm test

# Run specific test file
npm test roles.service.test.ts

# Run in watch mode
npm test -- --watch

# Build for production
npm run build

# Type check
npm run type-check
```

---

## Appendix B: Troubleshooting

### Common Issues

1. **API Client Not Found**

   - Verify `src/lib/api/client.ts` exists
   - Check import path is correct

2. **RTK Query Not Working**

   - Verify `apiSliceWithHook.ts` is configured
   - Check store configuration
   - Ensure provider wraps app

3. **Type Errors**

   - Run `npm run type-check`
   - Verify all types are exported
   - Check for circular dependencies

4. **Cache Not Invalidating**
   - Check tag names match
   - Verify `invalidatesTags` is correct
   - Clear browser cache if needed

---

## Document History

| Version | Date       | Author      | Changes                            |
| ------- | ---------- | ----------- | ---------------------------------- |
| 1.0     | 2025-01-XX | Claude Code | Initial comprehensive plan created |

---

**End of Implementation Plan**

Untuk pertanyaan atau klarifikasi, silakan hubungi tim development.

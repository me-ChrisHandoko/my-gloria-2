# Phase 6: UI Components - Roles Management (Optional)

Comprehensive UI component specifications and implementation guide untuk memanfaatkan 7 endpoints baru dari Phase 3-4.

## 📋 Table of Contents
- [Overview](#overview)
- [Component Architecture](#component-architecture)
- [Role Template Management UI](#role-template-management-ui)
- [User Role Temporal Assignment UI](#user-role-temporal-assignment-ui)
- [Role Hierarchy Visualization](#role-hierarchy-visualization)
- [Role Users Dashboard](#role-users-dashboard)
- [Role Modules Access UI](#role-modules-access-ui)
- [Implementation Guide](#implementation-guide)
- [Best Practices](#best-practices)

---

## Overview

### Phase 6 Scope (Optional)
Phase 6 provides UI components untuk memanfaatkan backend functionality yang sudah aligned di Phase 1-5. Semua komponen menggunakan RTK Query hooks dari Phase 4.

### Component Priorities
**P1 (High Priority)**:
- Role Template List & Detail viewer
- User Role Temporal date picker
- Role Users list with pagination

**P2 (Medium Priority)**:
- Role Template creation/deletion
- Role Hierarchy visualization
- Role Modules access dashboard

**P3 (Low Priority)**:
- Template application wizard
- Bulk temporal updates
- Advanced hierarchy editor

---

## Component Architecture

### Design System Integration
Semua komponen menggunakan existing design system dari `@/components/ui`:
- `Dialog` - Modal dialogs
- `Button` - Primary actions
- `Input` - Form inputs
- `Table` - Data tables
- `Card` - Content containers
- `Badge` - Status indicators
- `DatePicker` - Date/time selection
- `Select` - Dropdown selections

### RTK Query Integration Pattern
```typescript
// Standard pattern untuk semua UI components
import { useGetRoleTemplatesQuery } from '@/store/api/rolesApi';

function MyComponent() {
  const { data, isLoading, error } = useGetRoleTemplatesQuery({ page: 1 });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return <DataDisplay data={data} />;
}
```

### File Structure
```
src/components/features/permissions/roles/
├── templates/
│   ├── RoleTemplateList.tsx          # P1 - Template list view
│   ├── RoleTemplateDetail.tsx        # P1 - Template detail modal
│   ├── RoleTemplateCreateModal.tsx   # P2 - Create template
│   └── RoleTemplateDeleteDialog.tsx  # P2 - Delete confirmation
├── temporal/
│   ├── UserRoleTemporalModal.tsx     # P1 - Temporal settings editor
│   ├── TemporalDatePicker.tsx        # P1 - Date range selector
│   └── TemporalCalendar.tsx          # P3 - Timeline visualization
├── hierarchy/
│   ├── RoleHierarchyTree.tsx         # P2 - Tree visualization
│   ├── HierarchyNode.tsx             # P2 - Single node component
│   └── HierarchyDeleteDialog.tsx     # P2 - Delete relationship
├── users/
│   ├── RoleUsersList.tsx             # P1 - Users with role
│   ├── RoleUsersTable.tsx            # P1 - Paginated table
│   └── UserRoleCard.tsx              # P1 - User card display
└── modules/
    ├── RoleModulesGrid.tsx           # P2 - Modules grid view
    ├── ModuleAccessCard.tsx          # P2 - Single module card
    └── ModulePermissionBadge.tsx     # P2 - Permission indicator
```

---

## Role Template Management UI

### 1. RoleTemplateList Component (P1)

**Purpose**: Display paginated list of role templates dengan search dan filtering

**RTK Query Hook**: `useGetRoleTemplatesQuery()`

**Component Specification**:
```typescript
// src/components/features/permissions/roles/templates/RoleTemplateList.tsx
"use client";

import { useState } from "react";
import { useGetRoleTemplatesQuery } from "@/store/api/rolesApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, Eye } from "lucide-react";
import RoleTemplateDetail from "./RoleTemplateDetail";
import RoleTemplateCreateModal from "./RoleTemplateCreateModal";
import RoleTemplateDeleteDialog from "./RoleTemplateDeleteDialog";

export default function RoleTemplateList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const { data, isLoading, error } = useGetRoleTemplatesQuery({
    page,
    limit: 10,
    search: search || undefined,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        Error loading templates: {error.toString()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Role Templates</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{template.code}</p>
                </div>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {template.description || "No description"}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {template.permissions.length} permissions
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTemplateId(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {data?.data.length || 0} of {data?.total || 0} templates
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!data || page >= (data.totalPages || 1)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modals */}
      {selectedTemplate && (
        <RoleTemplateDetail
          templateId={selectedTemplate}
          open={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}

      {showCreateModal && (
        <RoleTemplateCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // RTK Query auto-refetches due to cache invalidation
          }}
        />
      )}

      {deleteTemplateId && (
        <RoleTemplateDeleteDialog
          templateId={deleteTemplateId}
          open={!!deleteTemplateId}
          onClose={() => setDeleteTemplateId(null)}
          onSuccess={() => {
            setDeleteTemplateId(null);
            // RTK Query auto-refetches
          }}
        />
      )}
    </div>
  );
}
```

**Features**:
- ✅ Paginated template list dengan search
- ✅ Grid layout responsive (1/2/3 columns)
- ✅ Active/Inactive status badges
- ✅ Quick actions (View, Delete)
- ✅ Create new template button
- ✅ Auto-refresh on mutations (RTK Query cache invalidation)

**Usage**:
```typescript
// In parent component or page
import RoleTemplateList from "@/components/features/permissions/roles/templates/RoleTemplateList";

export default function RoleTemplatesPage() {
  return <RoleTemplateList />;
}
```

---

### 2. RoleTemplateDetail Component (P1)

**Purpose**: Display detailed template information dalam modal

**RTK Query Hook**: `useGetRoleTemplateByIdQuery()`

**Component Specification**:
```typescript
// src/components/features/permissions/roles/templates/RoleTemplateDetail.tsx
"use client";

import { useGetRoleTemplateByIdQuery } from "@/store/api/rolesApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Calendar } from "lucide-react";

interface RoleTemplateDetailProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
}

export default function RoleTemplateDetail({
  templateId,
  open,
  onClose,
}: RoleTemplateDetailProps) {
  const { data: template, isLoading } = useGetRoleTemplateByIdQuery(templateId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Template Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : template ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{template.name}</h3>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Code: {template.code}</p>
              <p className="text-sm">{template.description}</p>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Category</p>
                <p className="text-sm text-muted-foreground">{template.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Created By</p>
                <p className="text-sm text-muted-foreground">{template.createdBy}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Created At</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(template.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Updated At</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(template.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <Separator />

            {/* Permissions List */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5" />
                <h4 className="font-semibold">
                  Permissions ({template.permissions.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {template.permissions.map((permissionId) => (
                  <Badge key={permissionId} variant="outline">
                    {permissionId}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Template not found
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Features**:
- ✅ Modal dialog dengan detail lengkap
- ✅ Status badge (Active/Inactive)
- ✅ Metadata grid (Category, Created By, Dates)
- ✅ Permissions list dengan badges
- ✅ Responsive layout
- ✅ Loading state

---

### 3. RoleTemplateDeleteDialog Component (P2)

**Purpose**: Confirmation dialog untuk delete template

**RTK Query Hook**: `useDeleteRoleTemplateMutation()`

**Component Specification**:
```typescript
// src/components/features/permissions/roles/templates/RoleTemplateDeleteDialog.tsx
"use client";

import { useState } from "react";
import { useDeleteRoleTemplateMutation } from "@/store/api/rolesApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RoleTemplateDeleteDialogProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoleTemplateDeleteDialog({
  templateId,
  open,
  onClose,
  onSuccess,
}: RoleTemplateDeleteDialogProps) {
  const [deleteTemplate, { isLoading }] = useDeleteRoleTemplateMutation();

  const handleDelete = async () => {
    try {
      await deleteTemplate(templateId).unwrap();
      toast.success("Template deleted successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete template:", error);
      toast.error(error?.data?.message || "Failed to delete template");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Role Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this template? This action cannot be
            undone. Roles using this template will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Features**:
- ✅ Confirmation dialog dengan warning message
- ✅ Loading state durante deletion
- ✅ Error handling dengan toast notifications
- ✅ Auto-close on success
- ✅ Disabled buttons during loading

---

## User Role Temporal Assignment UI

### 1. UserRoleTemporalModal Component (P1)

**Purpose**: Edit validFrom dan validUntil untuk user role assignment

**RTK Query Hook**: `useUpdateUserRoleTemporalMutation()`

**Component Specification**:
```typescript
// src/components/features/permissions/roles/temporal/UserRoleTemporalModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useUpdateUserRoleTemporalMutation } from "@/store/api/rolesApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Calendar } from "lucide-react";
import type { UserRole, UpdateUserRoleTemporalDto } from "@/lib/api/services/roles.service";
import TemporalDatePicker from "./TemporalDatePicker";

interface UserRoleTemporalModalProps {
  userRole: UserRole;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserRoleTemporalModal({
  userRole,
  open,
  onClose,
  onSuccess,
}: UserRoleTemporalModalProps) {
  const [formData, setFormData] = useState<UpdateUserRoleTemporalDto>({
    validFrom: userRole.validFrom,
    validUntil: userRole.validUntil || undefined,
  });

  const [updateTemporal, { isLoading }] = useUpdateUserRoleTemporalMutation();

  // Reset form when userRole changes
  useEffect(() => {
    setFormData({
      validFrom: userRole.validFrom,
      validUntil: userRole.validUntil || undefined,
    });
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.validFrom) {
      toast.error("Valid From date is required");
      return;
    }

    if (formData.validUntil && formData.validFrom > formData.validUntil) {
      toast.error("Valid Until must be after Valid From");
      return;
    }

    try {
      await updateTemporal({
        userProfileId: userRole.userProfileId,
        roleId: userRole.roleId,
        data: formData,
      }).unwrap();

      toast.success("Temporal settings updated successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to update temporal settings:", error);
      toast.error(error?.data?.message || "Failed to update temporal settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Update Temporal Settings</DialogTitle>
            <DialogDescription>
              Set the validity period for this role assignment
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Valid From */}
            <div className="space-y-2">
              <Label htmlFor="validFrom">
                Valid From <span className="text-red-500">*</span>
              </Label>
              <TemporalDatePicker
                value={formData.validFrom}
                onChange={(date) =>
                  setFormData({ ...formData, validFrom: date })
                }
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Role becomes active from this date
              </p>
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until (Optional)</Label>
              <TemporalDatePicker
                value={formData.validUntil}
                onChange={(date) =>
                  setFormData({ ...formData, validUntil: date })
                }
                disabled={isLoading}
                clearable
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent assignment
              </p>
            </div>

            {/* Preview */}
            <div className="bg-muted p-3 rounded-md space-y-1">
              <p className="text-sm font-medium">Assignment Period:</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formData.validFrom ? (
                  <>
                    {new Date(formData.validFrom).toLocaleDateString()}
                    {" → "}
                    {formData.validUntil
                      ? new Date(formData.validUntil).toLocaleDateString()
                      : "Permanent"}
                  </>
                ) : (
                  "Not set"
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Features**:
- ✅ Date range picker untuk validFrom/validUntil
- ✅ Validation (validUntil > validFrom)
- ✅ Optional validUntil (permanent assignment)
- ✅ Preview assignment period
- ✅ Error handling dengan toast
- ✅ Auto-reset form on userRole change

---

### 2. TemporalDatePicker Component (P1)

**Purpose**: Reusable date picker untuk temporal date selection

**Component Specification**:
```typescript
// src/components/features/permissions/roles/temporal/TemporalDatePicker.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TemporalDatePickerProps {
  value?: string;
  onChange: (date: string | undefined) => void;
  disabled?: boolean;
  clearable?: boolean;
}

export default function TemporalDatePicker({
  value,
  onChange,
  disabled = false,
  clearable = false,
}: TemporalDatePickerProps) {
  const handleClear = () => {
    onChange(undefined);
  };

  // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
  const formatValue = (isoString?: string) => {
    if (!isoString) return "";
    return isoString.slice(0, 16); // Remove seconds and timezone
  };

  // Convert datetime-local format to ISO string
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      onChange(undefined);
      return;
    }
    onChange(new Date(e.target.value).toISOString());
  };

  return (
    <div className="relative">
      <Input
        type="datetime-local"
        value={formatValue(value)}
        onChange={handleChange}
        disabled={disabled}
        className="pr-10"
      />
      {clearable && value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

**Features**:
- ✅ Native datetime-local input
- ✅ ISO string conversion
- ✅ Optional clear button
- ✅ Disabled state
- ✅ Compact design

---

## Role Hierarchy Visualization

### 1. RoleHierarchyTree Component (P2)

**Purpose**: Visualisasi tree structure untuk role hierarchy

**RTK Query Hook**: `useGetRoleHierarchyQuery()`, `useDeleteRoleHierarchyMutation()`

**Component Specification**:
```typescript
// src/components/features/permissions/roles/hierarchy/RoleHierarchyTree.tsx
"use client";

import { useState } from "react";
import { useGetRoleHierarchyQuery } from "@/store/api/rolesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import HierarchyDeleteDialog from "./HierarchyDeleteDialog";

interface RoleHierarchyTreeProps {
  roleId: string;
}

export default function RoleHierarchyTree({ roleId }: RoleHierarchyTreeProps) {
  const { data: hierarchy, isLoading } = useGetRoleHierarchyQuery(roleId);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [deleteRelation, setDeleteRelation] = useState<{
    roleId: string;
    parentRoleId: string;
  } | null>(null);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!hierarchy) {
    return (
      <Card>
        <CardContent className="text-center text-muted-foreground py-8">
          No hierarchy data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Parent Roles */}
          {hierarchy.parents && hierarchy.parents.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Parent Roles:</p>
              <div className="space-y-2 pl-4">
                {hierarchy.parents.map((parent: any) => (
                  <div
                    key={parent.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{parent.code}</Badge>
                      <span className="text-sm">{parent.name}</span>
                      {parent.inheritPermissions && (
                        <Badge variant="secondary" className="text-xs">
                          Inherits Permissions
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDeleteRelation({
                          roleId,
                          parentRoleId: parent.id,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Child Roles */}
          {hierarchy.children && hierarchy.children.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Child Roles:</p>
              <div className="space-y-2 pl-4">
                {hierarchy.children.map((child: any) => (
                  <div key={child.id} className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleNode(child.id)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedNodes.has(child.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <Badge variant="outline">{child.code}</Badge>
                      <span className="text-sm flex-1">{child.name}</span>
                    </div>

                    {/* Recursive nesting can be added here if needed */}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No hierarchy */}
          {(!hierarchy.parents || hierarchy.parents.length === 0) &&
            (!hierarchy.children || hierarchy.children.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hierarchy relationships defined
              </p>
            )}
        </div>
      </CardContent>

      {/* Delete Dialog */}
      {deleteRelation && (
        <HierarchyDeleteDialog
          roleId={deleteRelation.roleId}
          parentRoleId={deleteRelation.parentRoleId}
          open={!!deleteRelation}
          onClose={() => setDeleteRelation(null)}
          onSuccess={() => {
            setDeleteRelation(null);
            // RTK Query auto-refetches
          }}
        />
      )}
    </Card>
  );
}
```

**Features**:
- ✅ Parent/Child role visualization
- ✅ Inheritance permission badges
- ✅ Expandable tree nodes
- ✅ Delete hierarchy relationship
- ✅ Auto-refresh on mutations

---

## Role Users Dashboard

### 1. RoleUsersList Component (P1)

**Purpose**: Display users assigned to specific role dengan pagination

**RTK Query Hook**: `useGetRoleUsersQuery()`

**Component Specification**:
```typescript
// src/components/features/permissions/roles/users/RoleUsersList.tsx
"use client";

import { useState } from "react";
import { useGetRoleUsersQuery } from "@/store/api/rolesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, User } from "lucide-react";
import UserRoleCard from "./UserRoleCard";

interface RoleUsersListProps {
  roleId: string;
}

export default function RoleUsersList({ roleId }: RoleUsersListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetRoleUsersQuery({
    roleId,
    params: {
      page,
      limit: 20,
      search: search || undefined,
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Users with this Role</CardTitle>
          <Badge>{data?.total || 0} users</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data && data.data.length > 0 ? (
          <div className="space-y-2">
            {data.data.map((userRole) => (
              <UserRoleCard key={userRole.id} userRole={userRole} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No users assigned to this role
          </p>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Features**:
- ✅ Paginated user list
- ✅ Search functionality
- ✅ Total count badge
- ✅ User cards dengan details
- ✅ Loading states

---

### 2. UserRoleCard Component (P1)

**Purpose**: Display single user role assignment card

**Component Specification**:
```typescript
// src/components/features/permissions/roles/users/UserRoleCard.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Clock } from "lucide-react";
import type { RoleUser } from "@/lib/api/services/roles.service";

interface UserRoleCardProps {
  userRole: RoleUser;
}

export default function UserRoleCard({ userRole }: UserRoleCardProps) {
  const isActive = userRole.isActive;
  const hasExpiry = !!userRole.validUntil;

  // Check if role is currently valid
  const now = new Date();
  const validFrom = new Date(userRole.validFrom);
  const validUntil = userRole.validUntil ? new Date(userRole.validUntil) : null;
  const isCurrentlyValid = now >= validFrom && (!validUntil || now <= validUntil);

  return (
    <div className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        {/* User Info */}
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {userRole.userProfile?.dataKaryawan?.nama || "Unknown User"}
            </p>
            <p className="text-sm text-muted-foreground">
              ID: {userRole.userProfileId}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
          {isCurrentlyValid && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Currently Valid
            </Badge>
          )}
        </div>
      </div>

      {/* Temporal Info */}
      <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>From: {new Date(userRole.validFrom).toLocaleDateString()}</span>
        </div>
        {hasExpiry && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Until: {new Date(userRole.validUntil!).toLocaleDateString()}</span>
          </div>
        )}
        {!hasExpiry && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Permanent</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Features**:
- ✅ User information display
- ✅ Active/Inactive status
- ✅ Currently Valid indicator
- ✅ Temporal dates (validFrom, validUntil)
- ✅ Permanent assignment indicator

---

## Role Modules Access UI

### 1. RoleModulesGrid Component (P2)

**Purpose**: Display modules accessible by role dalam grid layout

**RTK Query Hook**: `useGetRoleModulesQuery()`

**Component Specification**:
```typescript
// src/components/features/permissions/roles/modules/RoleModulesGrid.tsx
"use client";

import { useGetRoleModulesQuery } from "@/store/api/rolesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ModuleAccessCard from "./ModuleAccessCard";

interface RoleModulesGridProps {
  roleId: string;
}

export default function RoleModulesGrid({ roleId }: RoleModulesGridProps) {
  const { data: modules, isLoading } = useGetRoleModulesQuery(roleId);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Accessible Modules</CardTitle>
          <Badge>{modules?.length || 0} modules</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : modules && modules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module: any) => (
              <ModuleAccessCard key={module.id} module={module} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No modules accessible with current permissions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Features**:
- ✅ Grid layout responsive
- ✅ Module count badge
- ✅ Loading state
- ✅ Empty state message

---

### 2. ModuleAccessCard Component (P2)

**Purpose**: Single module card dengan access information

**Component Specification**:
```typescript
// src/components/features/permissions/roles/modules/ModuleAccessCard.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Unlock } from "lucide-react";

interface ModuleAccessCardProps {
  module: any; // Type based on backend module structure
}

export default function ModuleAccessCard({ module }: ModuleAccessCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{module.name}</CardTitle>
          <Badge variant={module.isActive ? "default" : "secondary"}>
            {module.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {module.description || "No description"}
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Required Permissions:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {module.requiredPermissions?.map((perm: string) => (
              <Badge key={perm} variant="outline" className="text-xs">
                {perm}
              </Badge>
            )) || <span className="text-xs text-muted-foreground">None</span>}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {module.hasAccess ? (
            <>
              <Unlock className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                Access Granted
              </span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600 font-medium">
                Access Denied
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Features**:
- ✅ Module information card
- ✅ Active/Inactive status
- ✅ Required permissions badges
- ✅ Access granted/denied indicator
- ✅ Responsive layout

---

## Implementation Guide

### Step 1: Install Dependencies (If Needed)
```bash
# Most components use existing UI components
# Only add if needed:
npm install date-fns  # For advanced date formatting
npm install recharts   # If adding charts to hierarchy visualization
```

### Step 2: Component Integration Priority

**Week 1** (P1 - High Priority):
1. RoleTemplateList - Template management
2. RoleTemplateDetail - Template viewer
3. UserRoleTemporalModal - Temporal editor
4. TemporalDatePicker - Date picker
5. RoleUsersList - Users with role

**Week 2** (P2 - Medium Priority):
1. RoleTemplateDeleteDialog - Delete confirmation
2. RoleHierarchyTree - Hierarchy visualization
3. HierarchyDeleteDialog - Delete hierarchy
4. RoleModulesGrid - Modules access view
5. ModuleAccessCard - Module card

**Week 3** (P3 - Low Priority):
1. RoleTemplateCreateModal - Create new template
2. TemporalCalendar - Timeline visualization
3. Advanced hierarchy editor
4. Bulk operations

### Step 3: Testing Strategy

**Unit Tests**:
```typescript
// Example: RoleTemplateList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import RoleTemplateList from './RoleTemplateList';

describe('RoleTemplateList', () => {
  it('renders template list', async () => {
    render(
      <Provider store={store}>
        <RoleTemplateList />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Role Templates')).toBeInTheDocument();
    });
  });
});
```

**Integration Tests**: See Phase 5 documentation

---

## Best Practices

### 1. RTK Query Cache Management
```typescript
// Always rely on cache invalidation, not manual refetch
const [deleteTemplate] = useDeleteRoleTemplateMutation();

// ✅ Good - cache invalidation automatic
await deleteTemplate(id).unwrap();
// Component auto-updates via RTK Query

// ❌ Bad - manual refetch
await deleteTemplate(id).unwrap();
refetch(); // Unnecessary, cache invalidation handles this
```

### 2. Error Handling Pattern
```typescript
// Consistent error handling across all components
try {
  await mutation(data).unwrap();
  toast.success("Success message");
  onSuccess();
} catch (error: any) {
  console.error("Operation failed:", error);
  toast.error(error?.data?.message || "Fallback error message");
}
```

### 3. Loading States
```typescript
// Always show loading indicators
const { data, isLoading, error } = useQuery();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorDisplay error={error} />;
return <DataDisplay data={data} />;
```

### 4. Accessibility
```typescript
// Always provide labels, aria-labels, and keyboard navigation
<Button
  aria-label="Delete template"
  onClick={handleDelete}
>
  <Trash2 className="h-4 w-4" />
</Button>
```

### 5. Responsive Design
```typescript
// Use Tailwind responsive utilities
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

---

## Summary

### Phase 6 Deliverables (Optional)

**UI Components** (17 total):
- 4 Template components (List, Detail, Create, Delete)
- 3 Temporal components (Modal, DatePicker, Calendar)
- 3 Hierarchy components (Tree, Node, Delete)
- 3 Users components (List, Table, Card)
- 3 Modules components (Grid, Card, Badge)
- 1 Reusable DatePicker component

**Integration Points**:
- ✅ All components use RTK Query hooks from Phase 4
- ✅ Consistent design system from existing UI components
- ✅ Type-safe with TypeScript interfaces from Phase 2
- ✅ Error handling dengan toast notifications
- ✅ Loading states and empty states

**Implementation Timeline**:
- Week 1: P1 components (5 components)
- Week 2: P2 components (5 components)
- Week 3: P3 components (3 components)
- Week 4: Testing and polish

**Ready for Production**:
- All components follow existing patterns
- RTK Query integration complete
- Accessibility compliant
- Responsive design
- Error handling comprehensive

---

**Document Version**: 1.0
**Last Updated**: Phase 6 Implementation Guide
**Status**: Ready for Implementation (Optional)

# Permissions Components Usage Examples

## Quick Start

### 1. Basic Permissions List Page

```tsx
// app/(dashboard)/permissions/page.tsx
import { PermissionList } from '@/components/features/permissions/permissions';

export default function PermissionsPage() {
  return (
    <div className="container mx-auto py-6">
      <PermissionList />
    </div>
  );
}
```

### 2. Grouped View Page

```tsx
// app/(dashboard)/permissions/grouped/page.tsx
import { PermissionGroupView } from '@/components/features/permissions/permissions';

export default function PermissionsGroupedPage() {
  return (
    <div className="container mx-auto py-6">
      <PermissionGroupView />
    </div>
  );
}
```

### 3. Tabbed Interface

```tsx
// app/(dashboard)/permissions/page.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionList, PermissionGroupView } from '@/components/features/permissions/permissions';

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div className="container mx-auto py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="grouped">Grouped View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
          <PermissionList />
        </TabsContent>
        
        <TabsContent value="grouped" className="mt-6">
          <PermissionGroupView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Advanced Usage

### 4. Standalone Form Component

```tsx
// components/custom/CreatePermissionButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PermissionForm } from "@/components/features/permissions/permissions";
import { toast } from "sonner";

export function CreatePermissionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Permission
      </Button>

      <PermissionForm
        open={isOpen}
        permission={null}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          setIsOpen(false);
          toast.success("Permission created successfully");
        }}
      />
    </>
  );
}
```

### 5. Permission Cards Grid

```tsx
// components/custom/PermissionsGrid.tsx
"use client";

import { useGetPermissionsQuery } from "@/store/api/permissionApi";
import { PermissionCard } from "@/components/features/permissions/permissions";

export function PermissionsGrid({ resource }: { resource?: string }) {
  const { data, isLoading } = useGetPermissionsQuery({
    page: 1,
    limit: 50,
    resource,
  });

  const permissions = data?.data || [];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {permissions.map((permission) => (
        <PermissionCard key={permission.id} permission={permission} />
      ))}
    </div>
  );
}
```

### 6. Custom Table with Additional Columns

```tsx
// components/custom/CustomPermissionTable.tsx
"use client";

import { useState } from "react";
import { useGetPermissionsQuery } from "@/store/api/permissionApi";
import { DataTable } from "@/components/ui/data-table";
import { createPermissionColumns } from "@/components/features/permissions/permissions";
import type { Permission } from "@/lib/api/services/permissions.service";
import { ColumnDef } from "@tanstack/react-table";

export function CustomPermissionTable() {
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data, isLoading } = useGetPermissionsQuery({
    page: currentPage,
    limit: 10,
  });

  const permissions = data?.data || [];
  const totalItems = data?.total || 0;

  // Create base columns
  const baseColumns = createPermissionColumns({
    onEdit: (permission) => console.log("Edit", permission),
    onDelete: (permission) => console.log("Delete", permission),
  });

  // Add custom columns
  const columns: ColumnDef<Permission>[] = [
    ...baseColumns,
    {
      id: "custom",
      header: "Custom Field",
      cell: ({ row }) => {
        // Custom cell rendering
        return <div>Custom data for {row.original.name}</div>;
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={permissions}
      pageCount={Math.ceil(totalItems / 10)}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      isLoading={isLoading}
    />
  );
}
```

## Integration with Other Features

### 7. Role Permissions Assignment

```tsx
// components/custom/RolePermissionManager.tsx
"use client";

import { useState } from "react";
import { useGetPermissionsQuery } from "@/store/api/permissionApi";
import { useAssignRolePermissionMutation } from "@/store/api/rolesApi";
import { PermissionCard } from "@/components/features/permissions/permissions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RolePermissionManagerProps {
  roleId: string;
  currentPermissions: string[]; // Array of permission IDs
}

export function RolePermissionManager({ 
  roleId, 
  currentPermissions 
}: RolePermissionManagerProps) {
  const { data } = useGetPermissionsQuery({ page: 1, limit: 100 });
  const [assignPermission] = useAssignRolePermissionMutation();

  const permissions = data?.data || [];
  const availablePermissions = permissions.filter(
    (p) => !currentPermissions.includes(p.id)
  );

  const handleAssign = async (permissionId: string) => {
    try {
      await assignPermission({
        roleId,
        permissionId,
      }).unwrap();
      toast.success("Permission assigned successfully");
    } catch (error) {
      toast.error("Failed to assign permission");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {availablePermissions.map((permission) => (
        <div key={permission.id} className="relative">
          <PermissionCard permission={permission} />
          <Button
            className="mt-2 w-full"
            size="sm"
            onClick={() => handleAssign(permission.id)}
          >
            Assign to Role
          </Button>
        </div>
      ))}
    </div>
  );
}
```

### 8. Permission Selector Component

```tsx
// components/custom/PermissionSelector.tsx
"use client";

import { useState } from "react";
import { useGetPermissionsQuery } from "@/store/api/permissionApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PermissionSelectorProps {
  selectedPermissions: string[];
  onSelectionChange: (permissionIds: string[]) => void;
}

export function PermissionSelector({
  selectedPermissions,
  onSelectionChange,
}: PermissionSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data } = useGetPermissionsQuery({ page: 1, limit: 500 });
  
  const permissions = data?.data || [];

  const togglePermission = (permissionId: string) => {
    if (selectedPermissions.includes(permissionId)) {
      onSelectionChange(selectedPermissions.filter((id) => id !== permissionId));
    } else {
      onSelectionChange([...selectedPermissions, permissionId]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedPermissions.length === 0
            ? "Select permissions..."
            : `${selectedPermissions.length} permission(s) selected`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search permissions..." />
          <CommandEmpty>No permission found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {permissions.map((permission) => (
              <CommandItem
                key={permission.id}
                value={permission.name}
                onSelect={() => togglePermission(permission.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedPermissions.includes(permission.id)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                <div className="flex-1">
                  <div className="font-medium">{permission.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {permission.code}
                  </div>
                </div>
                <Badge variant="outline" className="ml-2">
                  {permission.action}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

## Filtering Examples

### 9. Resource-Specific Permissions

```tsx
// components/custom/UserPermissions.tsx
import { PermissionGroupView } from '@/components/features/permissions/permissions';

export function UserPermissions() {
  // This will show all permissions grouped by resource
  // You can filter on the backend by passing resource parameter
  return <PermissionGroupView />;
}
```

### 10. Active Permissions Only

```tsx
// components/custom/ActivePermissions.tsx
"use client";

import { useGetPermissionsQuery } from "@/store/api/permissionApi";
import { PermissionCard } from "@/components/features/permissions/permissions";

export function ActivePermissions() {
  const { data, isLoading } = useGetPermissionsQuery({
    page: 1,
    limit: 100,
    isActive: true, // Only active permissions
  });

  const permissions = data?.data || [];

  if (isLoading) {
    return <div>Loading active permissions...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {permissions.map((permission) => (
        <PermissionCard key={permission.id} permission={permission} />
      ))}
    </div>
  );
}
```

## Error Handling

### 11. Component with Error Boundary

```tsx
// components/custom/PermissionsWithErrorBoundary.tsx
"use client";

import { ErrorBoundary } from "react-error-boundary";
import { PermissionList } from "@/components/features/permissions/permissions";
import { Button } from "@/components/ui/button";

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
      <h2 className="text-lg font-semibold text-destructive">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={resetErrorBoundary} className="mt-4">
        Try again
      </Button>
    </div>
  );
}

export function PermissionsWithErrorBoundary() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <PermissionList />
    </ErrorBoundary>
  );
}
```

## Testing Examples

### 12. Component Testing

```tsx
// __tests__/PermissionList.test.tsx
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { PermissionList } from '@/components/features/permissions/permissions';
import { store } from '@/store';

describe('PermissionList', () => {
  it('renders permission list', () => {
    render(
      <Provider store={store}>
        <PermissionList />
      </Provider>
    );
    
    expect(screen.getByText('Permissions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search permissions...')).toBeInTheDocument();
  });
});
```

## API Integration

All components automatically use RTK Query hooks for data fetching:

- `useGetPermissionsQuery` - Fetch permissions list
- `useCreatePermissionMutation` - Create new permission
- `useUpdatePermissionMutation` - Update permission
- `useDeletePermissionMutation` - Delete permission
- `useGetPermissionGroupsQuery` - Fetch permission groups

These hooks handle:
- Automatic caching
- Loading states
- Error handling
- Cache invalidation
- Optimistic updates

## TypeScript Support

All components are fully typed with TypeScript:

```typescript
import type { Permission } from '@/lib/api/services/permissions.service';

const permission: Permission = {
  id: "123",
  code: "USER_CREATE",
  name: "Create User",
  resource: "user",
  action: "CREATE",
  isActive: true,
  isSystemPermission: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

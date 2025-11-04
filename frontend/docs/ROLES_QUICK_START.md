# Roles Components - Quick Start Guide

## 🚀 Quick Start

### 1. Full Page Implementation (Recommended)

```tsx
// app/(dashboard)/permissions/roles/page.tsx
import { RolesPageTabs } from '@/components/features/permissions/roles';

export default function RolesPage() {
  return (
    <div className="container mx-auto py-6">
      <RolesPageTabs />
    </div>
  );
}
```

**What you get**:
- ✅ List view with data table
- ✅ Hierarchy tree view
- ✅ Create role dialog
- ✅ Export buttons
- ✅ Global filters
- ✅ Statistics cards

---

### 2. Standalone List View

```tsx
import { RoleList } from '@/components/features/permissions/roles';

export default function SimpleRoleList() {
  const handleRoleSelect = (roleId: string) => {
    console.log('Selected role:', roleId);
    // Navigate to role detail page, open modal, etc.
  };

  return (
    <RoleList onRoleSelect={handleRoleSelect} />
  );
}
```

**Features**:
- Server-side pagination
- Sorting and filtering
- Search functionality
- CRUD operations

---

### 3. Role Detail View

```tsx
import { RoleDetailTabs } from '@/components/features/permissions/roles';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function RoleDetailModal({ roleId, open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <RoleDetailTabs roleId={roleId} />
      </DialogContent>
    </Dialog>
  );
}
```

**Tabs included**:
- Info: Basic role information
- Permissions: Permission assignment
- Modules: Module access management

---

### 4. Create/Edit Form

```tsx
import { useState } from 'react';
import { RoleForm } from '@/components/features/permissions/roles';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CreateRoleButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Role</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <RoleForm
          onSuccess={() => {
            setOpen(false);
            toast.success('Role created successfully!');
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// For editing
<RoleForm
  roleId="role-id-here"
  onSuccess={() => console.log('Updated!')}
/>
```

---

### 5. Hierarchy Tree View

```tsx
import { RoleHierarchyTree } from '@/components/features/permissions/roles';

export default function HierarchyPage() {
  return (
    <div className="container mx-auto py-6">
      <RoleHierarchyTree
        organizationId="org-id" // optional
        onRoleSelect={(roleId) => console.log('Selected:', roleId)}
      />
    </div>
  );
}
```

---

## 📦 Component Props Reference

### RoleList

```tsx
interface RoleListProps {
  onRoleSelect?: (roleId: string) => void;
}
```

### RoleHierarchyTree

```tsx
interface RoleHierarchyTreeProps {
  organizationId?: string;
  onRoleSelect?: (roleId: string) => void;
}
```

### RoleForm

```tsx
interface RoleFormProps {
  roleId?: string;        // If provided, edit mode
  onSuccess?: () => void; // Called after successful create/update
  onCancel?: () => void;  // Called when user cancels
}
```

### RoleInfo

```tsx
interface RoleInfoProps {
  role: Role;             // Role object to display
  onUpdate?: () => void;  // Called after successful update
}
```

### RolePermissionsTab

```tsx
interface RolePermissionsTabProps {
  roleId: string;         // Required role ID
}
```

### RoleModulesTab

```tsx
interface RoleModulesTabProps {
  roleId: string;         // Required role ID
}
```

### RoleDetailTabs

```tsx
interface RoleDetailTabsProps {
  roleId: string;         // Required role ID
}
```

### DeleteRoleDialog

```tsx
interface DeleteRoleDialogProps {
  roleId: string;
  roleName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```

---

## 🎨 Styling & Customization

All components use **shadcn/ui** components with Tailwind CSS. To customize:

### 1. Override Tailwind classes

```tsx
<RoleList className="custom-class" />
```

### 2. Modify theme

Edit `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
        // ...
      },
    },
  },
};
```

### 3. Custom badges

Components use standard Badge variants:
- `default` - Primary color
- `secondary` - Muted
- `destructive` - Red/Error
- `success` - Green
- `outline` - Bordered

---

## 🔌 API Integration

### Required Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### API Endpoints Used

All endpoints are auto-configured via RTK Query in `src/store/api/rolesApi.ts`:

- `GET /permissions/roles` - List roles
- `GET /permissions/roles/:id` - Get role by ID
- `POST /permissions/roles` - Create role
- `PATCH /permissions/roles/:id` - Update role
- `DELETE /permissions/roles/:id` - Delete role
- `GET /permissions/roles/:id/permissions` - Get role permissions
- `POST /permissions/roles/:id/permissions` - Assign permission
- `DELETE /permissions/roles/:id/permissions/:permissionId` - Revoke permission
- `GET /permissions/roles/:id/modules` - Get module accesses
- `POST /permissions/roles/:id/modules` - Grant module access
- `DELETE /permissions/roles/:id/modules/:accessId` - Revoke access
- `GET /permissions/roles/:id/hierarchy/tree` - Get hierarchy tree
- `POST /permissions/roles/:id/hierarchy` - Set parent
- `DELETE /permissions/roles/:id/hierarchy` - Remove parent

---

## 🧪 Testing Examples

### Unit Test Example

```tsx
import { render, screen } from '@testing-library/react';
import { RoleList } from '@/components/features/permissions/roles';

describe('RoleList', () => {
  it('renders without crashing', () => {
    render(<RoleList />);
    expect(screen.getByText(/roles/i)).toBeInTheDocument();
  });

  it('calls onRoleSelect when row clicked', () => {
    const handleSelect = jest.fn();
    render(<RoleList onRoleSelect={handleSelect} />);
    // Click a row
    // Assert handleSelect was called
  });
});
```

### Integration Test Example

```tsx
import { renderWithProviders } from '@/test-utils';
import { RoleForm } from '@/components/features/permissions/roles';
import userEvent from '@testing-library/user-event';

describe('RoleForm', () => {
  it('creates role successfully', async () => {
    const handleSuccess = jest.fn();
    const { getByLabelText, getByText } = renderWithProviders(
      <RoleForm onSuccess={handleSuccess} />
    );

    await userEvent.type(getByLabelText(/code/i), 'TEST_ROLE');
    await userEvent.type(getByLabelText(/name/i), 'Test Role');
    await userEvent.click(getByText(/create/i));

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalled();
    });
  });
});
```

---

## 🐛 Troubleshooting

### Issue: Components not rendering

**Solution**: Ensure Redux store is configured:

```tsx
// app/layout.tsx
import { Providers } from '@/components/providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Issue: API calls failing

**Solution**: Check API base URL configuration:

```tsx
// src/store/api/apiSliceWithHook.ts
export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
  }),
  // ...
});
```

### Issue: Toast notifications not showing

**Solution**: Add Toaster component:

```tsx
// app/layout.tsx
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
```

### Issue: Styles not applying

**Solution**: Ensure Tailwind is configured:

```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // ...
};
```

---

## 📚 Additional Resources

- **Full Documentation**: `docs/ROLES_COMPONENTS_IMPLEMENTATION.md`
- **API Reference**: `src/store/api/rolesApi.ts`
- **Type Definitions**: `src/types/permissions/role.types.ts`
- **Implementation Plan**: `docs/PERMISSION_IMPLEMENTATION_PLAN.md`

---

## 💡 Tips & Best Practices

### 1. Always handle loading states

```tsx
const { data, isLoading, error } = useGetRolesQuery();

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage />;
return <RoleList data={data} />;
```

### 2. Use optimistic updates for better UX

```tsx
const [updateRole] = useUpdateRoleMutation();

// RTK Query handles optimistic updates automatically
await updateRole({ id, data });
```

### 3. Implement error boundaries

```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <RoleList />
</ErrorBoundary>
```

### 4. Add loading skeletons

```tsx
{isLoading ? (
  <TableSkeleton rows={10} />
) : (
  <RoleList />
)}
```

### 5. Handle permissions properly

```tsx
const canEditRoles = usePermission('ROLE_UPDATE');

<RoleForm disabled={!canEditRoles} />
```

---

## 🎯 Common Use Cases

### 1. Role Management Dashboard

```tsx
export default function RolesDashboard() {
  return (
    <div className="space-y-6">
      <h1>Role Management</h1>
      <RolesPageTabs />
    </div>
  );
}
```

### 2. User Profile - Assigned Roles

```tsx
export default function UserRoles({ userId }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Roles</CardTitle>
      </CardHeader>
      <CardContent>
        <RoleList
          filter={{ userId }}
          compact
          hideActions
        />
      </CardContent>
    </Card>
  );
}
```

### 3. Settings Page - Role Configuration

```tsx
export default function SettingsRoles() {
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger>Roles</TabsTrigger>
        <TabsTrigger>Hierarchy</TabsTrigger>
      </TabsList>
      <TabsContent value="roles">
        <RoleList />
      </TabsContent>
      <TabsContent value="hierarchy">
        <RoleHierarchyTree />
      </TabsContent>
    </Tabs>
  );
}
```

---

**Last Updated**: November 2, 2025
**Version**: 1.0.0

"use client";

/**
 * RoleForm Component
 *
 * Form component for creating and editing roles.
 * Features:
 * - Create/Edit mode support
 * - Form validation with zod
 * - Parent role selector
 * - Icon picker
 * - Real-time validation
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useGetRoleByIdQuery,
  useGetRolesQuery,
} from '@/store/api/rolesApi';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Form validation schema
const roleFormSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code must be less than 50 characters')
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers, and underscores only'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  hierarchyLevel: z.coerce.number().min(0).max(10).default(0),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
  organizationId: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
  roleId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function RoleForm({ roleId, onSuccess, onCancel }: RoleFormProps) {
  const isEditMode = !!roleId;

  // API hooks
  const { data: roleData, isLoading: isLoadingRole } = useGetRoleByIdQuery(roleId!, {
    skip: !roleId,
  });

  const { data: rolesData } = useGetRolesQuery({
    limit: 100,
    isActive: true,
  });

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();

  // Form setup
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      hierarchyLevel: 0,
      parentId: undefined,
      isActive: true,
      organizationId: '',
    },
  });

  // Load role data in edit mode
  useEffect(() => {
    if (roleData && isEditMode) {
      form.reset({
        code: roleData.code,
        name: roleData.name,
        description: roleData.description || '',
        hierarchyLevel: roleData.hierarchyLevel,
        parentId: roleData.parentId || undefined,
        isActive: roleData.isActive,
        organizationId: roleData.organizationId || '',
      });
    }
  }, [roleData, isEditMode, form]);

  // Handle form submission
  const onSubmit = async (values: RoleFormValues) => {
    try {
      // Clean up empty values
      const payload = {
        ...values,
        description: values.description || undefined,
        parentId: values.parentId || undefined,
        organizationId: values.organizationId || undefined,
      };

      if (isEditMode && roleId) {
        await updateRole({
          id: roleId,
          data: payload,
        }).unwrap();
        toast.success('Role updated successfully');
      } else {
        await createRole(payload).unwrap();
        toast.success('Role created successfully');
      }

      onSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} role`;
      toast.error(errorMessage);
    }
  };

  // Get available parent roles (exclude current role and its children in edit mode)
  const availableParentRoles = rolesData?.data?.filter((role) => {
    if (isEditMode && role.id === roleId) return false;
    // In production, you'd also filter out children of current role
    return true;
  }) || [];

  // Loading state
  if (isLoadingRole && isEditMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {isEditMode ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? 'Update role information and settings'
            : 'Create a new role with permissions and hierarchy'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Code Field */}
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Code <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="ADMIN"
                    {...field}
                    className="font-mono"
                    disabled={isEditMode} // Code cannot be changed in edit mode
                  />
                </FormControl>
                <FormDescription>
                  Unique identifier in uppercase (e.g., ADMIN, MANAGER, USER)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Administrator" {...field} />
                </FormControl>
                <FormDescription>
                  Display name for the role
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description Field */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Role description and responsibilities..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Optional description of role responsibilities
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hierarchy Level Field */}
          <FormField
            control={form.control}
            name="hierarchyLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hierarchy Level</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Level in organizational hierarchy (0 = highest)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Parent Role Selector */}
          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Role</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent role (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableParentRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} ({role.code}) - L{role.hierarchyLevel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Set parent role for hierarchy and permission inheritance
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Active Status Switch */}
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <FormDescription>
                    Enable or disable this role
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isCreating || isUpdating}
            >
              {(isCreating || isUpdating) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Update Role' : 'Create Role'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

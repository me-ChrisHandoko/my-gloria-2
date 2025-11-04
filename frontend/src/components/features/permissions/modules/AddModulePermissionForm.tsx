"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateModulePermissionMutation } from '@/store/api/modulePermissionsApi';
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
const permissionFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(100, 'Code must be less than 100 characters')
    .regex(
      /^[A-Z0-9_:.-]+$/,
      'Code must be uppercase letters, numbers, and :._- only'
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  description: z.string().optional(),
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

type PermissionFormValues = z.infer<typeof permissionFormSchema>;

interface AddModulePermissionFormProps {
  moduleId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddModulePermissionForm({
  moduleId,
  onSuccess,
  onCancel,
}: AddModulePermissionFormProps) {
  const [createPermission, { isLoading }] = useCreateModulePermissionMutation();

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      resource: '',
      action: 'READ',
      category: '',
      isActive: true,
    },
  });

  const onSubmit = async (data: PermissionFormValues) => {
    try {
      const cleanedData = {
        ...data,
        description: data.description || undefined,
        category: data.category || undefined,
      };

      await createPermission({
        moduleId,
        data: cleanedData,
      }).unwrap();

      onSuccess?.();
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error?.data?.message || 'Failed to add permission');
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Add Module Permission
        </DialogTitle>
        <DialogDescription>
          Create a new permission and associate it with this module.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., MODULE:READ"
                      {...field}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>Unique permission code</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action */}
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="READ">Read</SelectItem>
                      <SelectItem value="CREATE">Create</SelectItem>
                      <SelectItem value="UPDATE">Update</SelectItem>
                      <SelectItem value="DELETE">Delete</SelectItem>
                      <SelectItem value="EXECUTE">Execute</SelectItem>
                      <SelectItem value="MANAGE">Manage</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Permission action type</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Read Module Data" {...field} />
                </FormControl>
                <FormDescription>Human-readable permission name</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what this permission allows..."
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormDescription>Optional detailed description</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Resource */}
            <FormField
              control={form.control}
              name="resource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., module" {...field} />
                  </FormControl>
                  <FormDescription>Target resource type</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., module_management" {...field} />
                  </FormControl>
                  <FormDescription>Permission category</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Active Status */}
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active</FormLabel>
                  <FormDescription>Permission is active and can be assigned</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Add Permission
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

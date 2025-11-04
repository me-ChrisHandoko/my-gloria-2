"use client";

/**
 * ModuleForm Component
 *
 * Form component for creating and editing modules.
 * Features:
 * - Create/Edit mode support
 * - Form validation with zod
 * - Parent module selector
 * - Icon picker
 * - Category selector
 * - Real-time validation
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useGetModuleByIdQuery,
  useGetModulesQuery,
} from '@/store/api/modulesApi';
import { ModuleCategory } from '@/lib/api/services/modules.service';
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
import { Loader2, Save, Box } from 'lucide-react';
import { toast } from 'sonner';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Form validation schema
const moduleFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code must be less than 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, hyphens, and underscores only'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  description: z.string().optional(),
  category: z.nativeEnum(ModuleCategory, {
    errorMap: () => ({ message: 'Please select a valid category' }),
  }),
  icon: z.string().optional(),
  path: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
  isVisible: z.boolean().default(true),
});

type ModuleFormValues = z.infer<typeof moduleFormSchema>;

interface ModuleFormProps {
  moduleId?: string;
  parentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ModuleForm({ moduleId, parentId, onSuccess, onCancel }: ModuleFormProps) {
  const isEditMode = !!moduleId;

  // API hooks
  const { data: moduleData, isLoading: isLoadingModule } = useGetModuleByIdQuery(moduleId!, {
    skip: !moduleId,
  });

  const { data: modulesData } = useGetModulesQuery({
    limit: 100,
    isActive: true,
  });

  const [createModule, { isLoading: isCreating }] = useCreateModuleMutation();
  const [updateModule, { isLoading: isUpdating }] = useUpdateModuleMutation();

  // Form setup
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      category: ModuleCategory.SERVICE,
      icon: '',
      path: '',
      parentId: parentId || '',
      sortOrder: 0,
      isActive: true,
      isVisible: true,
    },
  });

  // Load existing module data for editing
  useEffect(() => {
    if (moduleData && isEditMode) {
      form.reset({
        code: moduleData.code,
        name: moduleData.name,
        description: moduleData.description || '',
        category: moduleData.category,
        icon: moduleData.icon || '',
        path: moduleData.path || '',
        parentId: moduleData.parentId || '',
        sortOrder: moduleData.sortOrder,
        isActive: moduleData.isActive,
        isVisible: moduleData.isVisible,
      });
    }
  }, [moduleData, isEditMode, form]);

  // Form submission
  const onSubmit = async (data: ModuleFormValues) => {
    try {
      // Clean up empty strings to undefined
      const cleanedData = {
        ...data,
        description: data.description || undefined,
        icon: data.icon || undefined,
        path: data.path || undefined,
        parentId: data.parentId || undefined,
      };

      if (isEditMode && moduleId) {
        await updateModule({
          id: moduleId,
          data: cleanedData,
        }).unwrap();
        toast.success('Module updated successfully');
      } else {
        await createModule(cleanedData).unwrap();
        toast.success('Module created successfully');
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error?.data?.message || 'Operation failed');
    }
  };

  const isLoading = isCreating || isUpdating || (isEditMode && isLoadingModule);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Box className="h-5 w-5" />
          {isEditMode ? 'Edit Module' : 'Create New Module'}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? 'Update module information and settings.'
            : 'Fill in the module details to create a new module.'}
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
                      placeholder="e.g., SERVICE_01"
                      {...field}
                      disabled={isEditMode}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>Unique module identifier (uppercase, numbers, -, _)</FormDescription>
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
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ModuleCategory.SERVICE}>Service</SelectItem>
                      <SelectItem value={ModuleCategory.PERFORMANCE}>Performance</SelectItem>
                      <SelectItem value={ModuleCategory.QUALITY}>Quality</SelectItem>
                      <SelectItem value={ModuleCategory.FEEDBACK}>Feedback</SelectItem>
                      <SelectItem value={ModuleCategory.TRAINING}>Training</SelectItem>
                      <SelectItem value={ModuleCategory.SYSTEM}>System</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Module category for organization</FormDescription>
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
                  <Input placeholder="e.g., Service Management" {...field} />
                </FormControl>
                <FormDescription>Display name for the module</FormDescription>
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
                    placeholder="Describe the purpose and features of this module..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>Optional detailed description</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Icon */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <Input placeholder="📊 or lucide-icon-name" {...field} />
                  </FormControl>
                  <FormDescription>Emoji or icon name</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Path */}
            <FormField
              control={form.control}
              name="path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path</FormLabel>
                  <FormControl>
                    <Input placeholder="/modules/service" {...field} className="font-mono" />
                  </FormControl>
                  <FormDescription>Frontend route path</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Parent Module */}
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Module</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!modulesData?.data.length}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No parent (root level)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No parent (root level)</SelectItem>
                      {modulesData?.data
                        .filter((m) => m.id !== moduleId) // Don't allow self as parent
                        .map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.name} ({module.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Optional parent for hierarchy</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sort Order */}
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormDescription>Display order (lower = first)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Status Switches */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>Module is active and functional</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isVisible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Visible</FormLabel>
                    <FormDescription>Show in navigation menus</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Update Module' : 'Create Module'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

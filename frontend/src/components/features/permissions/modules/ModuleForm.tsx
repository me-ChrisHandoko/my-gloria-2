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

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useGetModuleByIdQuery,
  useGetModulesQuery,
} from "@/store/api/modulesApi";
import { ModuleCategory } from "@/lib/api/services/modules.service";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Box, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { renderIcon } from "@/lib/utils/iconRenderer";

// Form validation schema
const moduleFormSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must be less than 50 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Code must be uppercase letters, numbers, hyphens, and underscores only"
    ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters"),
  description: z.string().optional(),
  category: z.nativeEnum(ModuleCategory),
  icon: z.string().optional(),
  path: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().min(0),
  isVisible: z.boolean(),
});

type ModuleFormValues = z.infer<typeof moduleFormSchema>;

interface ModuleFormProps {
  moduleId?: string;
  parentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ModuleForm({
  moduleId,
  parentId,
  onSuccess,
  onCancel,
}: ModuleFormProps) {
  const isEditMode = !!moduleId;
  const [openCategory, setOpenCategory] = useState(false);
  const [openParent, setOpenParent] = useState(false);

  // API hooks
  const { data: moduleData, isLoading: isLoadingModule } =
    useGetModuleByIdQuery(moduleId!, {
      skip: !moduleId,
    });

  const { data: modulesData } = useGetModulesQuery({
    limit: 100,
    isActive: true,
  });

  const [createModule, { isLoading: isCreating }] = useCreateModuleMutation();
  const [updateModule, { isLoading: isUpdating }] = useUpdateModuleMutation();

  // Category options
  const categories = [
    { value: ModuleCategory.SERVICE, label: "Service" },
    { value: ModuleCategory.PERFORMANCE, label: "Performance" },
    { value: ModuleCategory.QUALITY, label: "Quality" },
    { value: ModuleCategory.FEEDBACK, label: "Feedback" },
    { value: ModuleCategory.TRAINING, label: "Training" },
    { value: ModuleCategory.SYSTEM, label: "System" },
  ];

  // Parent module options
  const parentModules = [
    { value: "none", label: "No parent (root level)" },
    ...(modulesData?.data
      .filter((m) => m.id !== moduleId)
      .map((module) => ({
        value: module.id,
        label: `${module.name} (${module.code})`,
      })) || []),
  ];

  // Form setup
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category: ModuleCategory.SERVICE,
      icon: "",
      path: "",
      parentId: parentId || "none",
      sortOrder: 0,
      isVisible: true,
    },
  });

  // Load existing module data for editing
  useEffect(() => {
    if (moduleData && isEditMode) {
      form.reset({
        code: moduleData.code,
        name: moduleData.name,
        description: moduleData.description || "",
        category: moduleData.category,
        icon: moduleData.icon || "",
        path: moduleData.path || "",
        parentId: moduleData.parentId || "none",
        sortOrder: moduleData.sortOrder,
        isVisible: moduleData.isVisible,
      });
    }
  }, [moduleData, isEditMode, form]);

  // Form submission
  const onSubmit = async (data: ModuleFormValues) => {
    try {
      // Clean up empty strings and "none" values to undefined
      const cleanedData = {
        ...data,
        description: data.description || undefined,
        icon: data.icon || undefined,
        path: data.path || undefined,
        parentId:
          data.parentId === "none" || !data.parentId
            ? undefined
            : data.parentId,
      };

      if (isEditMode && moduleId) {
        await updateModule({
          id: moduleId,
          data: cleanedData,
        }).unwrap();
        toast.success("Module updated successfully");
      } else {
        await createModule(cleanedData).unwrap();
        toast.success("Module created successfully");
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("Form submission error:", error);
      toast.error(error?.data?.message || "Operation failed");
    }
  };

  const isLoading = isCreating || isUpdating || (isEditMode && isLoadingModule);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Box className="h-5 w-5" />
          {isEditMode ? "Edit Module" : "Create New Module"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Update module information and settings."
            : "Fill in the module details to create a new module."}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      onChange={(e) => {
                        const upperValue = e.target.value.toUpperCase();
                        field.onChange(upperValue);
                      }}
                      disabled={isEditMode}
                      className="font-mono uppercase"
                    />
                  </FormControl>
                  <FormDescription>
                    Unique module identifier (numbers, -, _)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Category *</FormLabel>
                  <Popover open={openCategory} onOpenChange={setOpenCategory}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCategory}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? categories.find(
                                (category) => category.value === field.value
                              )?.label
                            : "Select category"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search category..." />
                        <CommandList>
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            {categories.map((category) => (
                              <CommandItem
                                key={category.value}
                                value={category.label}
                                onSelect={() => {
                                  field.onChange(category.value);
                                  setOpenCategory(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    category.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {category.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Module category for organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Icon */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormControl>
                      <Input
                        placeholder="building-2, users, or 🏢"
                        {...field}
                        value={field.value || ""}
                        className="flex-1"
                      />
                    </FormControl>
                    {field.value && (
                      <div className="flex items-center justify-center w-10 h-10 rounded-md border bg-muted">
                        {renderIcon({ icon: field.value, size: 20 })}
                      </div>
                    )}
                  </div>
                  <FormDescription>
                    Lucide icon name (e.g., building-2, users) or emoji
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parent Module */}
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Parent Module</FormLabel>
                  <Popover open={openParent} onOpenChange={setOpenParent}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openParent}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? parentModules.find(
                                (parent) => parent.value === field.value
                              )?.label
                            : "No parent (root level)"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search parent module..." />
                        <CommandList>
                          <CommandEmpty>No module found.</CommandEmpty>
                          <CommandGroup>
                            {parentModules.map((parent) => (
                              <CommandItem
                                key={parent.value}
                                value={parent.label}
                                onSelect={() => {
                                  field.onChange(parent.value);
                                  setOpenParent(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    parent.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {parent.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Optional parent for hierarchy
                  </FormDescription>
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
                    <Input
                      placeholder="/modules/service"
                      {...field}
                      value={field.value || ""}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>Frontend route path</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Sort Order & Visible Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => {
                        const value =
                          e.target.value === ""
                            ? 0
                            : parseInt(e.target.value, 10);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Display order (lower = first)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isVisible"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Visible in UI</FormLabel>
                  <div className="flex flex-row items-center justify-between rounded-lg border p-2">
                    <FormDescription className="text-xs">
                      Show this module in the navigation menu
                    </FormDescription>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Description - Full Width */}
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
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>Optional detailed description</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? "Update Module" : "Create Module"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

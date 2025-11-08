"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
} from "@/store/api/permissionApi";
import type { Permission } from "@/lib/api/services/permissions.service";

const permissionActions = [
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "EXPORT",
  "IMPORT",
  "PRINT",
  "ASSIGN",
  "CLOSE",
] as const;

const permissionScopes = ["OWN", "DEPARTMENT", "SCHOOL", "ALL"] as const;

const formSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code must not exceed 50 characters")
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase with underscores only"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  description: z.string().optional(),
  resource: z
    .string()
    .min(2, "Resource must be at least 2 characters")
    .max(50, "Resource must not exceed 50 characters"),
  action: z.enum(permissionActions, {
    message: "Please select an action",
  }),
  scope: z.enum(permissionScopes).optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface PermissionFormProps {
  open: boolean;
  permission: Permission | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PermissionForm({
  open,
  permission,
  onClose,
  onSuccess,
}: PermissionFormProps) {
  const isEditMode = !!permission;

  const [createPermission, { isLoading: isCreating }] =
    useCreatePermissionMutation();
  const [updatePermission, { isLoading: isUpdating }] =
    useUpdatePermissionMutation();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      resource: "",
      action: "READ",
      scope: undefined,
      isActive: true,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (permission) {
      form.reset({
        code: permission.code,
        name: permission.name,
        description: permission.description || "",
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope || undefined,
        isActive: permission.isActive,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        resource: "",
        action: "READ",
        scope: undefined,
        isActive: true,
      });
    }
  }, [permission, form]);

  const handleSubmit = async (data: FormData) => {
    try {
      if (isEditMode) {
        // Update existing permission
        const updateData = {
          name: data.name,
          description: data.description || undefined,
          scope: data.scope || undefined,
          isActive: data.isActive,
        };

        await updatePermission({
          id: permission.id,
          data: updateData,
        }).unwrap();
      } else {
        // Create new permission
        const createData = {
          code: data.code,
          name: data.name,
          description: data.description || undefined,
          resource: data.resource,
          action: data.action,
          scope: data.scope || undefined,
        };

        await createPermission(createData).unwrap();
      }

      onSuccess();
    } catch (error: any) {
      console.error("Failed to save permission:", error);
      const errorMessage =
        error?.data?.message ||
        error?.error ||
        `Failed to ${isEditMode ? "update" : "create"} permission`;
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Permission" : "Create Permission"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the permission details below."
              : "Fill in the details to create a new permission."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Code */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="USER_CREATE"
                        {...field}
                        disabled={isEditMode}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      Unique identifier (uppercase, underscores only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Create User" {...field} />
                    </FormControl>
                    <FormDescription>Display name for the permission</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Resource */}
              <FormField
                control={form.control}
                name="resource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="user"
                        {...field}
                        disabled={isEditMode}
                      />
                    </FormControl>
                    <FormDescription>Resource type (e.g., user, role)</FormDescription>
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {permissionActions.map((action) => (
                          <SelectItem key={action} value={action}>
                            {action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Type of action for this permission
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Scope */}
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select scope (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OWN">Own</SelectItem>
                        <SelectItem value="DEPARTMENT">Department</SelectItem>
                        <SelectItem value="SCHOOL">School</SelectItem>
                        <SelectItem value="ALL">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Access scope for this permission
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

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
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of the permission's purpose
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            {isEditMode && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Enable or disable this permission
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
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

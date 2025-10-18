"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useCreatePermissionTemplateMutation } from "@/store/api/permissionTemplateApi";

interface CreateTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTemplateModal({
  open,
  onClose,
  onSuccess,
}: CreateTemplateModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "",
    description: "",
    permissions: "[]",
    moduleAccess: "[]",
  });

  const [createTemplate, { isLoading: isCreating }] =
    useCreatePermissionTemplateMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (!formData.code.trim()) {
      toast.error("Template code is required");
      return;
    }

    if (!formData.category) {
      toast.error("Category is required");
      return;
    }

    // Validate JSON
    let permissions;
    let moduleAccess;

    try {
      permissions = JSON.parse(formData.permissions);
    } catch {
      toast.error("Invalid permissions JSON format");
      return;
    }

    try {
      moduleAccess = formData.moduleAccess.trim()
        ? JSON.parse(formData.moduleAccess)
        : null;
    } catch {
      toast.error("Invalid module access JSON format");
      return;
    }

    try {
      await createTemplate({
        code: formData.code.toUpperCase(),
        name: formData.name,
        category: formData.category,
        description: formData.description || undefined,
        permissions,
        moduleAccess,
      }).unwrap();

      onSuccess();
      handleReset();
    } catch (error: any) {
      console.error("Failed to create permission template:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to create template";
      if (errorMessage.includes("already exists")) {
        toast.error("Template code already exists");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleReset = () => {
    setFormData({
      code: "",
      name: "",
      category: "",
      description: "",
      permissions: "[]",
      moduleAccess: "[]",
    });
  };

  const handleClose = () => {
    if (!isCreating) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Permission Template</DialogTitle>
            <DialogDescription>
              Create a reusable permission template that can be applied to users, roles, or positions
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Template Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Department Head Template"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  Template Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., DEPT_HEAD"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROLE_BASED">Role Based</SelectItem>
                  <SelectItem value="POSITION_BASED">Position Based</SelectItem>
                  <SelectItem value="DEPARTMENT_BASED">Department Based</SelectItem>
                  <SelectItem value="SCHOOL_BASED">School Based</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter template description..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permissions">
                Permissions JSON <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="permissions"
                value={formData.permissions}
                onChange={(e) =>
                  setFormData({ ...formData, permissions: e.target.value })
                }
                placeholder='[{"module": "users", "action": "READ", "scope": "ALL"}]'
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Format: Array of permission objects with module, action, and scope
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moduleAccess">Module Access JSON (Optional)</Label>
              <Textarea
                id="moduleAccess"
                value={formData.moduleAccess}
                onChange={(e) =>
                  setFormData({ ...formData, moduleAccess: e.target.value })
                }
                placeholder='[{"moduleId": "users", "canAccess": true}]'
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Format: Array of module access objects with moduleId and canAccess
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

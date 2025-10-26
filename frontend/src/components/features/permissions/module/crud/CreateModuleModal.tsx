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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  type CreateModuleDto,
  ModuleCategory,
} from "@/lib/api/services/modules.service";
import {
  useCreateModuleMutation,
  useGetModulesQuery,
} from "@/store/api/modulesApi";

interface CreateModuleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateModuleModal({
  open,
  onClose,
  onSuccess,
}: CreateModuleModalProps) {
  const [formData, setFormData] = useState<CreateModuleDto>({
    code: "",
    name: "",
    category: ModuleCategory.SERVICE,
    description: "",
    icon: "",
    path: "",
    parentId: undefined,
    sortOrder: 0,
    isActive: true,
    isVisible: true,
  });

  const [createModule, { isLoading: isCreating }] = useCreateModuleMutation();

  const { data: modulesData } = useGetModulesQuery(
    { limit: 100, isActive: true },
    { skip: !open }
  );
  const modules = modulesData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error("Module code is required");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Module name is required");
      return;
    }

    try {
      const submitData: CreateModuleDto = {
        ...formData,
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        icon: formData.icon?.trim() || undefined,
        path: formData.path?.trim() || undefined,
        parentId: formData.parentId || undefined,
      };

      await createModule(submitData).unwrap();
      toast.success("Module created successfully");
      onSuccess();
      resetForm();
    } catch (error: any) {
      console.error("Failed to create module:", error);
      toast.error(error?.data?.message || "Failed to create module");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      category: ModuleCategory.SERVICE,
      description: "",
      icon: "",
      path: "",
      parentId: undefined,
      sortOrder: 0,
      isActive: true,
      isVisible: true,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Module</DialogTitle>
          <DialogDescription>
            Add a new module to the system. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                Module Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="HR_LEAVE"
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as ModuleCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ModuleCategory.SERVICE}>Service</SelectItem>
                  <SelectItem value={ModuleCategory.PERFORMANCE}>Performance</SelectItem>
                  <SelectItem value={ModuleCategory.QUALITY}>Quality</SelectItem>
                  <SelectItem value={ModuleCategory.FEEDBACK}>Feedback</SelectItem>
                  <SelectItem value={ModuleCategory.TRAINING}>Training</SelectItem>
                  <SelectItem value={ModuleCategory.SYSTEM}>System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Module Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Leave Management"
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Manage employee leave requests and approvals"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="📚 emoji atau GraduationCap"
              />
              <p className="text-xs text-gray-500">
                Gunakan emoji (📚, 👥, 💰) atau Lucide icon (GraduationCap, Users)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="path">Path</Label>
              <Input
                id="path"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="/hr/leave"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Module</Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentId: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root Level)</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name} ({module.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
          </div>

          <div className="flex items-center justify-between space-x-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isVisible"
                checked={formData.isVisible}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isVisible: checked })
                }
              />
              <Label htmlFor="isVisible" className="cursor-pointer">
                Visible in UI
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
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
              Create Module
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState, useEffect } from "react";
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
  type Module,
  type UpdateModuleDto,
  ModuleCategory,
} from "@/lib/api/services/modules.service";
import {
  useUpdateModuleMutation,
  useGetModulesQuery,
} from "@/store/api/modulesApi";

interface EditModuleModalProps {
  open: boolean;
  module: Module;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditModuleModal({
  open,
  module,
  onClose,
  onSuccess,
}: EditModuleModalProps) {
  const [formData, setFormData] = useState<UpdateModuleDto>({});

  const [updateModule, { isLoading: isUpdating }] = useUpdateModuleMutation();

  const { data: modulesData } = useGetModulesQuery(
    { limit: 100, isActive: true },
    { skip: !open }
  );
  const modules = (modulesData?.data || []).filter((m) => m.id !== module.id);

  useEffect(() => {
    if (open && module) {
      setFormData({
        name: module.name,
        category: module.category,
        description: module.description || "",
        icon: module.icon || "",
        path: module.path || "",
        parentId: module.parentId || undefined,
        sortOrder: module.sortOrder,
        isActive: module.isActive,
        isVisible: module.isVisible,
      });
    }
  }, [open, module]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error("Module name is required");
      return;
    }

    try {
      const submitData: UpdateModuleDto = {
        name: formData.name?.trim(),
        category: formData.category,
        description: formData.description?.trim() || undefined,
        icon: formData.icon?.trim() || undefined,
        path: formData.path?.trim() || undefined,
        parentId: formData.parentId || undefined,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        isVisible: formData.isVisible,
      };

      await updateModule({ id: module.id, data: submitData }).unwrap();
      toast.success("Module updated successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to update module:", error);
      toast.error(error?.data?.message || "Failed to update module");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Module</DialogTitle>
          <DialogDescription>
            Update module information. Code cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Module Code (Read-only)</Label>
            <Input id="code" value={module.code} disabled className="bg-gray-100" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Module Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Leave Management"
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={formData.icon || ""}
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
                value={formData.path || ""}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
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
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.code})
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
                value={formData.sortOrder || 0}
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
                checked={formData.isActive ?? true}
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
                checked={formData.isVisible ?? true}
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
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Module
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

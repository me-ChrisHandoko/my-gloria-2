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
import { Switch } from "@/components/ui/switch";
import { useUpdatePositionMutation } from "@/store/api/positionApi";
import { Position } from "@/lib/api/services/positions.service";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { logRTKError } from "@/lib/utils/errorLogger";

interface EditPositionModalProps {
  open: boolean;
  position: Position;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPositionModal({
  open,
  position,
  onClose,
  onSuccess,
}: EditPositionModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    hierarchyLevel: "",
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [updatePosition, { isLoading }] = useUpdatePositionMutation();

  // Initialize form with position data
  useEffect(() => {
    if (position && open) {
      setFormData({
        name: position.name || "",
        code: position.code || "",
        description: position.description || "",
        hierarchyLevel: position.hierarchyLevel?.toString() || position.level?.toString() || "",
        isActive: position.isActive ?? true,
      });
      setErrors({});
    }
  }, [position, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must not exceed 100 characters";
    }

    if (!formData.hierarchyLevel) {
      newErrors.hierarchyLevel = "Hierarchy level is required";
    } else {
      const levelNum = parseInt(formData.hierarchyLevel);
      if (isNaN(levelNum) || levelNum < 1 || levelNum > 10) {
        newErrors.hierarchyLevel = "Hierarchy level must be between 1 and 10";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    try {
      await updatePosition({
        id: position.id,
        data: {
          name: formData.name.trim(),
          hierarchyLevel: parseInt(formData.hierarchyLevel),
          description: formData.description.trim() || undefined,
          isActive: formData.isActive,
        },
      }).unwrap();

      onSuccess();
    } catch (error: any) {
      logRTKError("Failed to update position", error);
      toast.error(error?.data?.message || "Failed to update position");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Position</DialogTitle>
            <DialogDescription>
              Update position information. Code, school, and department cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name & Code - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Senior Developer"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Code (Read-only) */}
              <div className="grid gap-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Cannot be changed
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Position description (optional)"
                rows={3}
              />
            </div>

            {/* School & Department - Side by Side (Read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* School (Read-only) */}
              <div className="grid gap-2">
                <Label htmlFor="school">School</Label>
                <Input
                  id="school"
                  value={position.school?.name || "N/A"}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Cannot be changed
                </p>
              </div>

              {/* Department (Read-only) */}
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={position.department?.name || "N/A"}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Cannot be changed
                </p>
              </div>
            </div>

            {/* Hierarchy Level */}
            <div className="grid gap-2">
              <Label htmlFor="hierarchyLevel">
                Hierarchy Level (1-10) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hierarchyLevel"
                type="number"
                min="1"
                max="10"
                value={formData.hierarchyLevel}
                onChange={(e) =>
                  setFormData({ ...formData, hierarchyLevel: e.target.value })
                }
                placeholder="e.g., 5"
                className={errors.hierarchyLevel ? "border-red-500" : ""}
              />
              {errors.hierarchyLevel && (
                <p className="text-sm text-red-500">{errors.hierarchyLevel}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Position level in organizational hierarchy (1=highest, 10=lowest)
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Set position as active or inactive
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Position
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { useCreatePositionMutation } from "@/store/api/positionApi";
import { useGetOrganizationsQuery } from "@/store/api/organizationApi";
import { useGetDepartmentsQuery } from "@/store/api/departmentApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreatePositionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePositionModal({
  open,
  onClose,
  onSuccess,
}: CreatePositionModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    schoolId: "",
    departmentId: "",
    hierarchyLevel: "",
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [createPosition, { isLoading }] = useCreatePositionMutation();

  // Fetch schools
  const { data: organizationsData } = useGetOrganizationsQuery({ limit: 100 });
  const schools = organizationsData?.data || [];

  // Fetch all departments (no filtering by school for flexibility)
  const { data: departmentsData, isLoading: isLoadingDepartments } =
    useGetDepartmentsQuery({
      limit: 100,
      isActive: true,
      includeSchool: true,
    });

  const departments = departmentsData?.data || [];

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        code: "",
        description: "",
        schoolId: "",
        departmentId: "",
        hierarchyLevel: "",
        isActive: true,
      });
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must not exceed 100 characters";
    }

    if (!formData.code.trim()) {
      newErrors.code = "Code is required";
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = "Code must be alphanumeric (letters, numbers, _, -)";
    }

    // School and Department are optional (nullable in schema)

    // Consistency check: warn if department belongs to different school
    if (formData.departmentId && formData.schoolId) {
      const selectedDept = departments.find(
        (d) => d.id === formData.departmentId
      );
      if (
        selectedDept?.schoolId &&
        selectedDept.schoolId !== formData.schoolId
      ) {
        newErrors.departmentId =
          "Warning: This department belongs to a different school";
      }
    }

    // Hierarchy Level is mandatory
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
      await createPosition({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        hierarchyLevel: parseInt(formData.hierarchyLevel),
        schoolId: formData.schoolId || undefined,
        departmentId: formData.departmentId || undefined,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      }).unwrap();

      onSuccess();
    } catch (error: any) {
      console.error("Failed to create position:", error);
      toast.error(error?.data?.message || "Failed to create position");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Position</DialogTitle>
            <DialogDescription>
              Add a new position to your organization. Fill in the required
              fields below.
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

              {/* Code */}
              <div className="grid gap-2">
                <Label htmlFor="code">
                  Code <span className="text-red-500">*</span>
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
                  placeholder="e.g., SR-DEV"
                  className={errors.code ? "border-red-500" : ""}
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code}</p>
                )}
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

            {/* School & Department - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* School */}
              <div className="grid gap-2">
                <Label htmlFor="school">School</Label>
                <Combobox
                  options={schools.map((school) => ({
                    value: school.id,
                    label: school.name,
                  }))}
                  value={formData.schoolId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, schoolId: value })
                  }
                  placeholder="Select school"
                  searchPlaceholder="Search schools..."
                  emptyMessage="No school found"
                  className={errors.schoolId ? "border-red-500" : ""}
                />
                {errors.schoolId && (
                  <p className="text-sm text-red-500">{errors.schoolId}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Optional - Can be selected independently from department
                </p>
              </div>

              {/* Department */}
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Combobox
                  options={departments.map((dept) => ({
                    value: dept.id,
                    label: `${dept.name}${
                      (dept as any).school
                        ? ` (${(dept as any).school.name})`
                        : " (No School)"
                    }`,
                  }))}
                  value={formData.departmentId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, departmentId: value })
                  }
                  placeholder="Select department"
                  searchPlaceholder="Search departments..."
                  emptyMessage="No department found"
                  disabled={isLoadingDepartments}
                  className={errors.departmentId ? "border-red-500" : ""}
                />
                {errors.departmentId && (
                  <p
                    className={`text-sm ${
                      errors.departmentId.startsWith("Warning")
                        ? "text-amber-600"
                        : "text-red-500"
                    }`}
                  >
                    {errors.departmentId}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Optional - Can be selected independently from school
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
                Position level in organizational hierarchy (1=highest,
                10=lowest)
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Set position as active or inactive
                </p>
              </div>
              <Switch
                id="isActive"
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
              Create Position
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

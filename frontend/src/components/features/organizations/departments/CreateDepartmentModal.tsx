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
import { toast } from "sonner";
import { Loader2, Building2, FolderTree, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CreateDepartmentDto,
  type Department as DepartmentExtended,
} from "@/lib/api/services/departments.service";
import {
  useCreateDepartmentMutation,
  useGetDepartmentsQuery,
  useGetDepartmentCodeOptionsQuery,
} from "@/store/api/departmentApi";
import { useGetOrganizationsQuery } from "@/store/api/organizationApi";

interface CreateDepartmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateDepartmentModal({
  open,
  onClose,
  onSuccess,
}: CreateDepartmentModalProps) {
  const [formData, setFormData] = useState<CreateDepartmentDto>({
    name: "",
    code: "",
    schoolId: undefined,
    parentId: undefined,
    description: "",
    isActive: true,
  });

  // RTK Query hooks
  const [createDepartment, { isLoading: isCreating }] =
    useCreateDepartmentMutation();

  const { data: organizationsData, isLoading: isLoadingSchools } =
    useGetOrganizationsQuery({ limit: 100 }, { skip: !open });
  const schools = organizationsData?.data || [];

  // Fetch ALL departments when modal opens (foundation + school levels)
  const { data: departmentsData, isLoading: isLoadingDepartments } =
    useGetDepartmentsQuery(
      { limit: 100, includeSchool: true, includeParent: true },
      { skip: !open }
    );
  const departments = departmentsData?.data || [];

  const { data: codeOptions, isLoading: isLoadingCodeOptions } =
    useGetDepartmentCodeOptionsQuery(undefined, { skip: !open });

  // Group departments by foundation level and school
  const groupedDepartments = React.useMemo(() => {
    const foundation = departments.filter((d) => !d.schoolId);
    const schoolDepts = departments.filter((d) => d.schoolId);

    return {
      foundation,
      bySchool: schools.reduce((acc, school) => {
        acc[school.id] = schoolDepts.filter((d) => d.schoolId === school.id);
        return acc;
      }, {} as Record<string, DepartmentExtended[]>),
    };
  }, [departments, schools]);

  // Validate parent-child school relationship
  useEffect(() => {
    if (formData.parentId && formData.schoolId) {
      const parent = departments.find((d) => d.id === formData.parentId);
      if (parent?.schoolId && parent.schoolId !== formData.schoolId) {
        toast.warning(
          "Warning: Parent department belongs to a different school. Consider selecting a foundation-level parent or a parent from the same school.",
          { duration: 5000 }
        );
      }
    }
  }, [formData.schoolId, formData.parentId, departments]);

  // Validate parent-child hierarchy
  const validateDepartmentHierarchy = (): boolean => {
    if (!formData.parentId || !formData.schoolId) return true;

    const parent = departments.find((d) => d.id === formData.parentId);

    // Foundation parent → Always allowed
    if (!parent?.schoolId) return true;

    // School-specific parent → Must match child school
    if (parent.schoolId !== formData.schoolId) {
      toast.error(
        "Cannot select parent from different school. Please choose a foundation-level parent or a parent from the same school."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    if (!formData.code.trim()) {
      toast.error("Department code is required");
      return;
    }

    // Validate hierarchy
    if (!validateDepartmentHierarchy()) {
      return;
    }

    try {
      await createDepartment(formData).unwrap();
      onSuccess();
      handleReset();
    } catch (error: any) {
      console.error("Failed to create department:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to create department";
      if (errorMessage.includes("already exists")) {
        toast.error("Department code already exists in this school");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      code: "",
      schoolId: undefined,
      parentId: undefined,
      description: "",
      isActive: true,
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
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
            <DialogDescription>
              Add a new department to the organizational structure
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Department Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Mathematics Department"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  Department Code <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={[
                    ...(codeOptions || []).map((code) => ({
                      value: code,
                      label: code,
                      searchLabel: code,
                    })),
                  ]}
                  value={formData.code}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      code: value.toUpperCase(),
                    })
                  }
                  placeholder={
                    isLoadingCodeOptions
                      ? "Loading codes..."
                      : "Select code"
                  }
                  searchPlaceholder="Search codes..."
                  emptyMessage="No matching codes found."
                  disabled={isLoadingCodeOptions}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school">School (Optional)</Label>
                <Combobox
                  options={[
                    { value: "none", label: "None", searchLabel: "none" },
                    ...schools.map((school) => ({
                      value: school.id,
                      label: school.name,
                      searchLabel: `${school.name} ${school.code}`,
                    })),
                  ]}
                  value={formData.schoolId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      schoolId: value === "none" ? undefined : value,
                    })
                  }
                  placeholder={
                    isLoadingSchools ? "Loading schools..." : "Select a school"
                  }
                  searchPlaceholder="Search schools..."
                  emptyMessage="No schools found."
                  disabled={isLoadingSchools}
                  renderOption={(option, isSelected) => {
                    if (option.value === "none") {
                      return (
                        <>
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground italic">
                            None
                          </span>
                        </>
                      );
                    }
                    const school = schools.find((s) => s.id === option.value);
                    if (!school) return null;
                    return (
                      <>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-start gap-2 w-full min-w-0">
                          <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <span
                              className="font-medium truncate"
                              title={school.name}
                            >
                              {school.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {school.code}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  }}
                  renderTrigger={(selectedOption) => {
                    if (!selectedOption) return null;
                    if (selectedOption.value === "none") {
                      return (
                        <span className="text-muted-foreground italic">
                          None
                        </span>
                      );
                    }
                    const school = schools.find(
                      (s) => s.id === selectedOption.value
                    );
                    if (!school) return <span>{selectedOption.label}</span>;
                    return (
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{school.name}</span>
                      </div>
                    );
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Department (Optional)</Label>
                <Combobox
                  options={[
                    { value: "none", label: "None", searchLabel: "none" },
                    // Foundation level departments
                    ...groupedDepartments.foundation.map((dept) => ({
                      value: dept.id,
                      label: `🏢 ${dept.name}`,
                      searchLabel: `${dept.name} ${dept.code} foundation`,
                      group: "Foundation Level",
                    })),
                    // School-specific departments grouped by school
                    ...Object.entries(groupedDepartments.bySchool).flatMap(
                      ([schoolId, depts]) => {
                        const school = schools.find((s) => s.id === schoolId);
                        return depts.map((dept) => ({
                          value: dept.id,
                          label: dept.name,
                          searchLabel: `${dept.name} ${dept.code} ${school?.name || ""}`,
                          group: school?.name || "Unknown School",
                        }));
                      }
                    ),
                  ]}
                  value={formData.parentId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parentId: value === "none" ? undefined : value,
                    })
                  }
                  placeholder={
                    isLoadingDepartments
                      ? "Loading departments..."
                      : "Select parent department"
                  }
                  searchPlaceholder="Search departments..."
                  emptyMessage="No departments found."
                  disabled={isLoadingDepartments}
                  renderOption={(option, isSelected) => {
                    if (option.value === "none") {
                      return (
                        <>
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground italic">
                            None
                          </span>
                        </>
                      );
                    }
                    const dept = departments.find((d) => d.id === option.value) as DepartmentExtended | undefined;
                    if (!dept) return null;
                    const isFoundation = !dept.schoolId;
                    return (
                      <>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-start gap-2 w-full min-w-0">
                          {isFoundation ? (
                            <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                          ) : (
                            <FolderTree className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          )}
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <span
                              className="font-medium truncate"
                              title={dept.name}
                            >
                              {dept.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dept.code}
                              {isFoundation
                                ? " • Foundation Level"
                                : dept.school
                                ? ` • ${dept.school.name}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  }}
                  renderTrigger={(selectedOption) => {
                    if (!selectedOption) return null;
                    if (selectedOption.value === "none") {
                      return (
                        <span className="text-muted-foreground italic">
                          None
                        </span>
                      );
                    }
                    const dept = departments.find(
                      (d) => d.id === selectedOption.value
                    );
                    if (!dept) return <span>{selectedOption.label}</span>;
                    const isFoundation = !dept.schoolId;
                    return (
                      <div className="flex items-center gap-2 w-full min-w-0">
                        {isFoundation ? (
                          <Building2 className="h-4 w-4 shrink-0 text-blue-500" />
                        ) : (
                          <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{dept.name}</span>
                      </div>
                    );
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter department description..."
                rows={3}
              />
            </div>

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
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

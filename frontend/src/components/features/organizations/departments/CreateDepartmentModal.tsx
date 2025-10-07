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
import { Loader2, Building2, FolderTree, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CreateDepartmentDto,
  type Department,
} from "@/lib/api/services/departments.service";
import {
  useCreateDepartmentMutation,
  useGetDepartmentsBySchoolQuery,
} from "@/store/api/departmentApi";
import { useGetOrganizationsQuery } from "@/store/api/organizationApi";
import { useGetUsersQuery } from "@/store/api/userApi";

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
    schoolId: "",
    parentId: undefined,
    headId: undefined,
    description: "",
    isActive: true,
  });

  // RTK Query hooks
  const [createDepartment, { isLoading: isCreating }] =
    useCreateDepartmentMutation();

  const { data: organizationsData, isLoading: isLoadingSchools } =
    useGetOrganizationsQuery({ limit: 100 }, { skip: !open });
  const schools = organizationsData?.data || [];

  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery(
    { limit: 100 },
    { skip: !open }
  );
  const users = usersData?.data || [];

  const { data: departmentsData, isLoading: isLoadingDepartments } =
    useGetDepartmentsBySchoolQuery(formData.schoolId, {
      skip: !formData.schoolId,
    });
  const departments = departmentsData || [];

  // Reset parent when school changes
  useEffect(() => {
    if (!formData.schoolId) {
      setFormData((prev) => ({ ...prev, parentId: undefined }));
    }
  }, [formData.schoolId]);

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

    if (!formData.schoolId) {
      toast.error("Please select a school");
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
      schoolId: "",
      parentId: undefined,
      headId: undefined,
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
                <Label htmlFor="name" className="required">
                  Department Name
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
                <Label htmlFor="code" className="required">
                  Department Code
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
                  placeholder="e.g., MATH001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school" className="required">
                School
              </Label>
              <Combobox
                options={schools.map((school) => ({
                  value: school.id,
                  label: school.name,
                  searchLabel: `${school.name} ${school.code}`,
                }))}
                value={formData.schoolId}
                onValueChange={(value) =>
                  setFormData({ ...formData, schoolId: value })
                }
                placeholder={
                  isLoadingSchools ? "Loading schools..." : "Select a school"
                }
                searchPlaceholder="Search schools..."
                emptyMessage="No schools found."
                disabled={isLoadingSchools}
                renderOption={(option, isSelected) => {
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Department (Optional)</Label>
                <Combobox
                  options={[
                    { value: "none", label: "None", searchLabel: "none" },
                    ...departments.map((dept) => ({
                      value: dept.id,
                      label: dept.name,
                      searchLabel: `${dept.name} ${dept.code}`,
                    })),
                  ]}
                  value={formData.parentId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parentId: value === "none" ? undefined : value,
                    })
                  }
                  placeholder={
                    !formData.schoolId
                      ? "Select school first"
                      : isLoadingDepartments
                      ? "Loading departments..."
                      : "Select parent department"
                  }
                  searchPlaceholder="Search departments..."
                  emptyMessage="No departments found."
                  disabled={!formData.schoolId || isLoadingDepartments}
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
                    const dept = departments.find((d) => d.id === option.value);
                    if (!dept) return null;
                    return (
                      <>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2 w-full min-w-0">
                          <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate flex-1" title={dept.name}>
                            {dept.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {dept.code}
                          </span>
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
                    return (
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{dept.name}</span>
                      </div>
                    );
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="head">Department Head (Optional)</Label>
                <Combobox
                  options={[
                    { value: "none", label: "None", searchLabel: "none" },
                    ...users.map((user) => ({
                      value: user.id,
                      label: user.name,
                      searchLabel: `${user.name} ${user.email}`,
                    })),
                  ]}
                  value={formData.headId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      headId: value === "none" ? undefined : value,
                    })
                  }
                  placeholder={
                    isLoadingUsers
                      ? "Loading users..."
                      : "Select department head"
                  }
                  searchPlaceholder="Search users..."
                  emptyMessage="No users found."
                  disabled={isLoadingUsers}
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
                    const user = users.find((u) => u.id === option.value);
                    if (!user) return null;
                    return (
                      <>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-start gap-2 w-full min-w-0">
                          <User className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <span
                              className="font-medium truncate"
                              title={user.name}
                            >
                              {user.name}
                            </span>
                            <span
                              className="text-xs text-muted-foreground truncate"
                              title={user.email}
                            >
                              {user.email}
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
                    const user = users.find(
                      (u) => u.id === selectedOption.value
                    );
                    if (!user) return <span>{selectedOption.label}</span>;
                    return (
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{user.name}</span>
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

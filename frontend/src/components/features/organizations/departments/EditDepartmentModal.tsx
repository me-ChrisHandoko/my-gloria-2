'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Building2, FolderTree, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type UpdateDepartmentDto,
  type Department,
  type Department as DepartmentExtended,
} from '@/lib/api/services/departments.service';
import {
  useUpdateDepartmentMutation,
  useGetDepartmentsQuery,
  useGetDepartmentCodeOptionsQuery
} from '@/store/api/departmentApi';
import { useGetOrganizationsQuery } from '@/store/api/organizationApi';

interface EditDepartmentModalProps {
  open: boolean;
  department: Department;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditDepartmentModal({
  open,
  department,
  onClose,
  onSuccess,
}: EditDepartmentModalProps) {
  const [formData, setFormData] = useState<UpdateDepartmentDto>({
    name: department.name,
    code: department.code,
    parentId: department.parentId,
    description: department.description,
    isActive: department.isActive,
  });

  // RTK Query hooks
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateDepartmentMutation();

  const { data: organizationsData, isLoading: isLoadingSchools } =
    useGetOrganizationsQuery({ limit: 100 }, { skip: !open });
  const schools = organizationsData?.data || [];

  // Fetch ALL departments (foundation + school levels) for parent selection
  const { data: departmentsData, isLoading: isLoadingDepartments } = useGetDepartmentsQuery(
    { limit: 100, includeSchool: true, includeParent: true },
    { skip: !open }
  );

  const { data: codeOptions, isLoading: isLoadingCodeOptions } = useGetDepartmentCodeOptionsQuery(
    undefined,
    { skip: !open }
  );

  // Filter out current department and its children to prevent circular references
  // For school-specific departments, optionally filter to show only same-school or foundation parents
  const departments = (departmentsData?.data || []).filter((dept: Department) => {
    // Exclude self and direct children
    if (dept.id === department.id || dept.parentId === department.id) return false;

    // If current department has schoolId, allow foundation parents or same-school parents
    if (department.schoolId) {
      return !dept.schoolId || dept.schoolId === department.schoolId;
    }

    // If current is foundation-level, allow all departments as potential parents
    return true;
  });

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

  // Reset form data when department changes
  useEffect(() => {
    setFormData({
      name: department.name,
      code: department.code,
      parentId: department.parentId,
      description: department.description,
      isActive: department.isActive,
    });
  }, [department]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name?.trim()) {
      toast.error('Department name is required');
      return;
    }

    if (!formData.code?.trim()) {
      toast.error('Department code is required');
      return;
    }

    // Check for changes
    const hasChanges = Object.keys(formData).some(
      (key) => formData[key as keyof UpdateDepartmentDto] !== department[key as keyof Department]
    );

    if (!hasChanges) {
      toast.info('No changes detected');
      return;
    }

    try {
      await updateDepartment({ id: department.id, data: formData }).unwrap();
      onSuccess();
    } catch (error: any) {
      console.error('Failed to update department:', error);
      const errorMessage = error?.data?.message || error?.error || 'Failed to update department';
      if (errorMessage.includes('already exists')) {
        toast.error('Department code already exists in this school');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information
              {department.school?.name ? ` for ${department.school.name}` : ' (Foundation Level)'}
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                <Label>School</Label>
                <Input
                  value={
                    department.school
                      ? `${department.school.name} (${department.school.code})`
                      : 'Foundation Level (No School)'
                  }
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {department.schoolId
                    ? 'School cannot be changed after creation'
                    : 'This is a foundation-level department'}
                </p>
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
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter department description..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Set department as active or inactive
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
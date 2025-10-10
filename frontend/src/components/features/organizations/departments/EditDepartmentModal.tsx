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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  type UpdateDepartmentDto,
  type Department,
} from '@/lib/api/services/departments.service';
import {
  useUpdateDepartmentMutation,
  useGetDepartmentsBySchoolQuery,
  useGetDepartmentCodeOptionsQuery
} from '@/store/api/departmentApi';

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

  const { data: departmentsData, isLoading: isLoadingDepartments } = useGetDepartmentsBySchoolQuery(
    department.schoolId,
    { skip: !open }
  );

  const { data: codeOptions, isLoading: isLoadingCodeOptions } = useGetDepartmentCodeOptionsQuery(
    undefined,
    { skip: !open }
  );

  // Filter out current department and its children to prevent circular references
  const departments = (departmentsData?.data || []).filter(
    (dept: Department) => dept.id !== department.id && dept.parentId !== department.id
  );

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
              Update department information for {department.school?.name}
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

            <div className="space-y-2">
              <Label>School</Label>
              <Input
                value={`${department.school?.name} (${department.school?.code})`}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">School cannot be changed after creation</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Department (Optional)</Label>
                <Select
                  value={formData.parentId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentId: value === 'none' ? undefined : value })
                  }
                  disabled={isLoadingDepartments}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={isLoadingDepartments ? 'Loading...' : 'Select parent department'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept: Department) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active Department</Label>
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
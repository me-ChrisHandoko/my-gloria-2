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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  type CreateDepartmentDto,
  type Department,
} from '@/lib/api/services/departments.service';
import {
  useCreateDepartmentMutation,
  useGetDepartmentsBySchoolQuery
} from '@/store/api/departmentApi';
import { useGetOrganizationsQuery } from '@/store/api/organizationApi';
import { useGetUsersQuery } from '@/store/api/userApi';

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
    name: '',
    code: '',
    schoolId: '',
    parentId: undefined,
    headId: undefined,
    description: '',
    isActive: true,
  });

  // RTK Query hooks
  const [createDepartment, { isLoading: isCreating }] = useCreateDepartmentMutation();

  const { data: organizationsData, isLoading: isLoadingSchools } = useGetOrganizationsQuery(
    { limit: 100 },
    { skip: !open }
  );
  const schools = organizationsData?.data || [];

  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery(
    { limit: 100 },
    { skip: !open }
  );
  const users = usersData?.data || [];

  const { data: departmentsData, isLoading: isLoadingDepartments } = useGetDepartmentsBySchoolQuery(
    formData.schoolId,
    { skip: !formData.schoolId }
  );
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
      toast.error('Department name is required');
      return;
    }

    if (!formData.code.trim()) {
      toast.error('Department code is required');
      return;
    }

    if (!formData.schoolId) {
      toast.error('Please select a school');
      return;
    }

    try {
      await createDepartment(formData).unwrap();
      onSuccess();
      handleReset();
    } catch (error: any) {
      console.error('Failed to create department:', error);
      const errorMessage = error?.data?.message || error?.error || 'Failed to create department';
      if (errorMessage.includes('already exists')) {
        toast.error('Department code already exists in this school');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      code: '',
      schoolId: '',
      parentId: undefined,
      headId: undefined,
      description: '',
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., MATH001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school" className="required">
                School
              </Label>
              <Select
                value={formData.schoolId}
                onValueChange={(value) => setFormData({ ...formData, schoolId: value })}
                disabled={isLoadingSchools}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingSchools ? 'Loading...' : 'Select a school'} />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name} ({school.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Department (Optional)</Label>
                <Select
                  value={formData.parentId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentId: value === 'none' ? undefined : value })
                  }
                  disabled={!formData.schoolId || isLoadingDepartments}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !formData.schoolId
                          ? 'Select school first'
                          : isLoadingDepartments
                          ? 'Loading...'
                          : 'Select parent department'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="head">Department Head (Optional)</Label>
                <Select
                  value={formData.headId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, headId: value === 'none' ? undefined : value })}
                  disabled={isLoadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingUsers ? 'Loading...' : 'Select department head'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
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
                value={formData.description}
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
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
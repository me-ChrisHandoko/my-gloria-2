'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { type Department } from '@/lib/api/services/departments.service';
import { useDeleteDepartmentMutation } from '@/store/api/departmentApi';

interface DeleteDepartmentModalProps {
  open: boolean;
  department: Department;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteDepartmentModal({
  open,
  department,
  onClose,
  onSuccess,
}: DeleteDepartmentModalProps) {
  const [deleteDepartment, { isLoading }] = useDeleteDepartmentMutation();

  const handleDelete = async () => {
    try {
      await deleteDepartment(department.id).unwrap();
      onSuccess();
    } catch (error: any) {
      console.error('Failed to delete department:', error);
      const errorMessage =
        error?.data?.message || error?.error || 'Failed to delete department. It may have associated data.';
      toast.error(errorMessage);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Department</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete the department <strong>{department.name}</strong> (
              {department.code})?
            </p>
            {(department.userCount || 0) > 0 && (
              <p className="text-destructive">
                ⚠️ This department has {department.userCount} user(s) assigned to it.
              </p>
            )}
            {(department.childDepartmentCount || 0) > 0 && (
              <p className="text-destructive">
                ⚠️ This department has {department.childDepartmentCount} child department(s).
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This action will mark the department as inactive. The department must not have any
              positions or child departments to be deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
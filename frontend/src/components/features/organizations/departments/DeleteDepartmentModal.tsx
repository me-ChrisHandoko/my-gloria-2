"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { type Department } from "@/lib/api/services/departments.service";
import { useDeleteDepartmentMutation } from "@/store/api/departmentApi";

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

  // Check if department can be deleted (no positions and no child departments)
  const canDelete =
    (department.positionCount || 0) === 0 &&
    (department.childDepartmentCount || 0) === 0;
  const hasBlockers = !canDelete;

  const handleDelete = async () => {
    try {
      await deleteDepartment(department.id).unwrap();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete department:", error);
      const errorMessage =
        error?.data?.message ||
        error?.error ||
        "Failed to delete department. It may have associated data.";
      toast.error(errorMessage);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Department</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the department{" "}
            <strong>{department.name}</strong> ({department.code})?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          {(department.positionCount || 0) > 0 && (
            <div className="text-destructive font-medium">
              ⚠️ This department has {department.positionCount} position(s).
              Please remove all positions first.
            </div>
          )}
          {(department.childDepartmentCount || 0) > 0 && (
            <div className="text-destructive font-medium">
              ⚠️ This department has {department.childDepartmentCount} child
              department(s). Please remove all child departments first.
            </div>
          )}
          {(department.userCount || 0) > 0 && (
            <div className="text-amber-600 dark:text-amber-500">
              ℹ️ Note: {department.userCount} user(s) are currently assigned to
              this department's positions.
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            {hasBlockers ? (
              <span>
                This department cannot be deleted until all positions and child
                departments are removed.
              </span>
            ) : (
              <span>
                This action will mark the department as inactive. This cannot be
                undone.
              </span>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading || hasBlockers}
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

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDeleteSchoolMutation } from "@/store/api/schoolApi";
import { School } from "@/types";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteSchoolModalProps {
  open: boolean;
  school: School;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteSchoolModal({
  open,
  school,
  onClose,
  onSuccess,
}: DeleteSchoolModalProps) {
  const [deleteSchool, { isLoading }] = useDeleteSchoolMutation();

  const handleDelete = async () => {
    try {
      await deleteSchool(school.id).unwrap();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete school:", error);
      toast.error(error?.data?.message || "Failed to delete school");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <DialogTitle>Delete School</DialogTitle>
              <DialogDescription>This action cannot be undone</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete the school{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              "{school.name}"
            </span>
            ?
          </p>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-4">
            <p className="text-sm text-red-800 dark:text-red-400">
              <strong>Warning:</strong> This will permanently delete the school and may affect
              related departments, positions, and other data. Please ensure this is what you
              intend to do.
            </p>
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete School
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

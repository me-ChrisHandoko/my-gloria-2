"use client";

import { useDeleteRoleHierarchyMutation } from "@/store/api/rolesApi";
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

interface HierarchyDeleteDialogProps {
  roleId: string;
  parentRoleId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HierarchyDeleteDialog({
  roleId,
  parentRoleId,
  open,
  onClose,
  onSuccess,
}: HierarchyDeleteDialogProps) {
  const [deleteHierarchy, { isLoading }] = useDeleteRoleHierarchyMutation();

  const handleDelete = async () => {
    try {
      await deleteHierarchy({ roleId, parentRoleId }).unwrap();
      toast.success("Hierarchy relationship deleted successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete hierarchy:", error);
      toast.error(error?.data?.message || "Failed to delete hierarchy");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Hierarchy Relationship</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this parent-child relationship?
            Permission inheritance will be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

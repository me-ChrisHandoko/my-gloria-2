"use client";

import { useDeleteRoleTemplateMutation } from "@/store/api/rolesApi";
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

interface RoleTemplateDeleteDialogProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoleTemplateDeleteDialog({
  templateId,
  open,
  onClose,
  onSuccess,
}: RoleTemplateDeleteDialogProps) {
  const [deleteTemplate, { isLoading }] = useDeleteRoleTemplateMutation();

  const handleDelete = async () => {
    try {
      await deleteTemplate(templateId).unwrap();
      toast.success("Template deleted successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete template:", error);
      toast.error(error?.data?.message || "Failed to delete template");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Role Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this template? This action cannot be
            undone. Roles using this template will not be affected.
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

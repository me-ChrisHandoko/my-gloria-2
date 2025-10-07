"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeletePositionMutation } from "@/store/api/positionApi";
import { Position } from "@/lib/api/services/positions.service";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeletePositionModalProps {
  open: boolean;
  position: Position;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeletePositionModal({
  open,
  position,
  onClose,
  onSuccess,
}: DeletePositionModalProps) {
  const [deletePosition, { isLoading }] = useDeletePositionMutation();

  const handleDelete = async () => {
    try {
      await deletePosition(position.id).unwrap();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete position:", error);
      toast.error(error?.data?.message || "Failed to delete position");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <DialogTitle>Delete Position</DialogTitle>
              <DialogDescription>
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this position? This will remove the position
            and may affect users currently assigned to it.
          </p>

          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-red-900 dark:text-red-400">
                Position:
              </span>
              <span className="text-sm font-semibold text-red-900 dark:text-red-300">
                {position.name}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-red-900 dark:text-red-400">
                Code:
              </span>
              <code className="text-sm font-mono text-red-900 dark:text-red-300">
                {position.code}
              </code>
            </div>
            {position.department && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-red-900 dark:text-red-400">
                  Department:
                </span>
                <span className="text-sm text-red-900 dark:text-red-300">
                  {position.department.name}
                </span>
              </div>
            )}
            {position.holderCount !== undefined && position.holderCount > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5" />
                <span className="text-sm font-medium text-red-900 dark:text-red-400">
                  Warning: {position.holderCount} user(s) currently assigned to this position
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            This position will be permanently deleted from the system. Make sure you have
            reassigned any users before proceeding.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

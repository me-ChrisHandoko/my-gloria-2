"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { type Module } from "@/lib/api/services/modules.service";
import { useDeleteModuleMutation } from "@/store/api/modulesApi";

interface DeleteModuleModalProps {
  open: boolean;
  module: Module;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteModuleModal({
  open,
  module,
  onClose,
  onSuccess,
}: DeleteModuleModalProps) {
  const [reason, setReason] = useState("");

  const [deleteModule, { isLoading: isDeleting }] = useDeleteModuleMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Deletion reason is required");
      return;
    }

    if (reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    if (reason.trim().length > 500) {
      toast.error("Reason must not exceed 500 characters");
      return;
    }

    try {
      await deleteModule({ id: module.id, reason: reason.trim() }).unwrap();
      toast.success("Module deleted successfully");
      onSuccess();
      setReason("");
    } catch (error: any) {
      console.error("Failed to delete module:", error);
      toast.error(error?.data?.message || "Failed to delete module");
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Module
          </DialogTitle>
          <DialogDescription>
            This action will soft delete the module. It can be recovered later if needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are about to delete module: <strong>{module.name}</strong> ({module.code})
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Deletion Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for deleting this module (10-500 characters)"
              rows={4}
              required
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {reason.length}/500 characters
            </p>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Note:</strong> This is a soft delete. The module will be marked as
              deleted but can be restored by system administrators if needed.
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isDeleting || reason.trim().length < 10}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Module
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

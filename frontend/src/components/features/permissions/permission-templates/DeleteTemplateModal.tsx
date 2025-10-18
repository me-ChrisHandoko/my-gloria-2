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
import { AlertTriangle } from "lucide-react";
import { type PermissionTemplate } from "./PermissionTemplateColumns";

interface DeleteTemplateModalProps {
  open: boolean;
  template: PermissionTemplate;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteTemplateModal({
  open,
  template,
  onClose,
  onSuccess,
}: DeleteTemplateModalProps) {
  const handleDelete = () => {
    // Note: Backend doesn't provide delete endpoint yet
    // This is a placeholder for future implementation
    console.warn("Delete functionality not implemented in backend yet");
    onSuccess();
  };

  if (template.isSystem) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Cannot Delete System Template
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              System templates are protected and cannot be deleted. These templates
              are essential for the system's permission structure.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Permission Template
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this template?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Template Name:</span>
              <span className="text-sm">{template.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Template Code:</span>
              <code className="text-xs bg-background px-2 py-1 rounded">
                {template.code}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Category:</span>
              <span className="text-sm">{template.category.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> This action cannot be undone. Deleting this
              template will not affect existing permissions that were applied using
              this template.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
          >
            Delete Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

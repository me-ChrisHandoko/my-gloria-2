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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { type PermissionTemplate } from "./PermissionTemplateColumns";
import { useApplyPermissionTemplateMutation } from "@/store/api/permissionTemplateApi";
import { Combobox } from "@/components/ui/combobox";

interface ApplyTemplateModalProps {
  open: boolean;
  template: PermissionTemplate;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApplyTemplateModal({
  open,
  template,
  onClose,
  onSuccess,
}: ApplyTemplateModalProps) {
  const [targetType, setTargetType] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");

  const [applyTemplate, { isLoading: isApplying }] =
    useApplyPermissionTemplateMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!targetType) {
      toast.error("Please select a target type");
      return;
    }

    if (!targetId) {
      toast.error("Please select a target");
      return;
    }

    try {
      await applyTemplate({
        templateId: template.id,
        targetType,
        targetId,
      }).unwrap();

      onSuccess();
      handleReset();
    } catch (error: any) {
      console.error("Failed to apply permission template:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to apply template";
      toast.error(errorMessage);
    }
  };

  const handleReset = () => {
    setTargetType("");
    setTargetId("");
  };

  const handleClose = () => {
    if (!isApplying) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Apply Permission Template
            </DialogTitle>
            <DialogDescription>
              Apply "{template.name}" template to a user, role, or position
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Template Info */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Template:
                </span>
                <span className="text-sm font-medium">{template.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Code:
                </span>
                <code className="text-xs bg-background px-2 py-1 rounded">
                  {template.code}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Category:
                </span>
                <span className="text-sm">{template.category.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {/* Target Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="targetType">
                Apply To <span className="text-red-500">*</span>
              </Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Selection */}
            {targetType && (
              <div className="space-y-2">
                <Label htmlFor="target">
                  Select {targetType.charAt(0).toUpperCase() + targetType.slice(1)}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={[
                    // Placeholder - in real implementation, fetch from API based on targetType
                    { value: "1", label: "Example Item 1", searchLabel: "Example Item 1" },
                    { value: "2", label: "Example Item 2", searchLabel: "Example Item 2" },
                  ]}
                  value={targetId}
                  onValueChange={setTargetId}
                  placeholder={`Select ${targetType}...`}
                  searchPlaceholder={`Search ${targetType}s...`}
                  emptyMessage={`No ${targetType}s found.`}
                />
                <p className="text-xs text-muted-foreground">
                  Note: This will grant the permissions defined in the template to the
                  selected {targetType}.
                </p>
              </div>
            )}

            {/* Permissions Preview */}
            {targetType && targetId && (
              <div className="space-y-2">
                <Label>Permissions to be Applied</Label>
                <div className="bg-muted p-3 rounded-lg max-h-40 overflow-y-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(template.permissions, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isApplying || !targetType || !targetId}>
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

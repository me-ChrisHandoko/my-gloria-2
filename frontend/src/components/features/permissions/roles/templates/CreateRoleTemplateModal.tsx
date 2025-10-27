"use client";

import { useState } from "react";
import { useCreateRoleTemplateMutation } from "@/store/api/rolesApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateRoleTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateRoleTemplateModal({
  open,
  onClose,
  onSuccess,
}: CreateRoleTemplateModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "",
    permissionIds: [] as string[],
  });

  const [createTemplate, { isLoading }] = useCreateRoleTemplateMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.code.trim() || !formData.name.trim() || !formData.category.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createTemplate(formData).unwrap();
      toast.success("Role template created successfully");
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create role template");
    }
  };

  const handleClose = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      category: "",
      permissionIds: [],
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Role Template</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="e.g., TPL_ADMIN"
              required
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for the template (uppercase, no spaces)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Administrator Template"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g., Management, Development, Support"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe what this template is for..."
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Permissions will be assigned after creating the
              template. You can add permissions using the "Apply Template" feature.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

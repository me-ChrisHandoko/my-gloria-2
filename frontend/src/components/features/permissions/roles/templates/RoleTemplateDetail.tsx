"use client";

import { useGetRoleTemplateByIdQuery } from "@/store/api/rolesApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Calendar } from "lucide-react";

interface RoleTemplateDetailProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
}

export default function RoleTemplateDetail({
  templateId,
  open,
  onClose,
}: RoleTemplateDetailProps) {
  const { data: template, isLoading } = useGetRoleTemplateByIdQuery(templateId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Template Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : template ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{template.name}</h3>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Code: {template.code}</p>
              <p className="text-sm">{template.description}</p>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Category</p>
                <p className="text-sm text-muted-foreground">{template.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Created By</p>
                <p className="text-sm text-muted-foreground">{template.createdBy}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Created At</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(template.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Updated At</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(template.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <Separator />

            {/* Permissions List */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5" />
                <h4 className="font-semibold">
                  Permissions ({template.permissions.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {template.permissions.map((permissionId) => (
                  <Badge key={permissionId} variant="outline">
                    {permissionId}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Template not found
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

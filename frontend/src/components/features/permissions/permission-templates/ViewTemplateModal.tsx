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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Calendar, User, Hash, Tag } from "lucide-react";
import { type PermissionTemplate } from "./PermissionTemplateColumns";
import { format } from "date-fns";

interface ViewTemplateModalProps {
  open: boolean;
  template: PermissionTemplate;
  onClose: () => void;
}

export default function ViewTemplateModal({
  open,
  template,
  onClose,
}: ViewTemplateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template.name}
            {template.isSystem && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                System Template
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Permission template details and configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Tag className="h-4 w-4" />
                Template Code
              </div>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {template.code}
              </code>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Hash className="h-4 w-4" />
                Category
              </div>
              <Badge variant="outline">
                {template.category.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Created At
              </div>
              <div className="text-sm">
                {format(new Date(template.createdAt), 'PPP p')}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Updated At
              </div>
              <div className="text-sm">
                {format(new Date(template.updatedAt), 'PPP p')}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Created By
              </div>
              <div className="text-sm">
                {template.createdBy || 'System'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Hash className="h-4 w-4" />
                Version
              </div>
              <div className="text-sm">
                v{template.version}
              </div>
            </div>
          </div>

          {/* Description */}
          {template.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Description
                </div>
                <p className="text-sm text-foreground">
                  {template.description}
                </p>
              </div>
            </>
          )}

          {/* Permissions */}
          <Separator />
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Permissions Configuration
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs font-mono overflow-x-auto">
                {JSON.stringify(template.permissions, null, 2)}
              </pre>
            </div>
          </div>

          {/* Module Access */}
          {template.moduleAccess && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Module Access Configuration
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs font-mono overflow-x-auto">
                    {JSON.stringify(template.moduleAccess, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Status */}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Status
            </div>
            <Badge
              variant={template.isActive ? 'success' : 'secondary'}
              className={template.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
            >
              {template.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
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

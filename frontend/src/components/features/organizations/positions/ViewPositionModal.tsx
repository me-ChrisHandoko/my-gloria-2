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
import { Position } from "@/lib/api/services/positions.service";
import {
  Building2,
  Layers,
  Hash,
  Calendar,
  FileText,
  Users,
  Shield
} from "lucide-react";

interface ViewPositionModalProps {
  open: boolean;
  position: Position;
  onClose: () => void;
}

export default function ViewPositionModal({
  open,
  position,
  onClose,
}: ViewPositionModalProps) {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Position Details
          </DialogTitle>
          <DialogDescription>
            View complete information about this position
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>

            <div className="grid gap-4">
              {/* Name */}
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-base font-semibold">{position.name}</p>
                </div>
              </div>

              {/* Code */}
              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Code</p>
                  <code className="text-base font-mono bg-muted px-2 py-1 rounded">
                    {position.code}
                  </code>
                </div>
              </div>

              {/* Description */}
              {position.description && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-base">{position.description}</p>
                  </div>
                </div>
              )}

              {/* Hierarchy Level */}
              <div className="flex items-start gap-3">
                <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Hierarchy Level</p>
                  <Badge variant="outline" className="font-mono text-base">
                    Level {position.hierarchyLevel || position.level || 0}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {position.hierarchyLevel <= 3 ? "Senior Level" :
                     position.hierarchyLevel <= 6 ? "Mid Level" : "Entry Level"}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge
                    variant={position.isActive ? "success" : "secondary"}
                    className={
                      position.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : ""
                    }
                  >
                    {position.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Organization
            </h3>

            <div className="grid gap-4">
              {/* School */}
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">School</p>
                  <p className="text-base font-medium">
                    {position.school?.name || "N/A"}
                  </p>
                  {position.school?.code && (
                    <code className="text-xs text-muted-foreground">
                      {position.school.code}
                    </code>
                  )}
                </div>
              </div>

              {/* Department */}
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-base font-medium">
                    {position.department?.name || "N/A"}
                  </p>
                  {position.department?.code && (
                    <code className="text-xs text-muted-foreground">
                      {position.department.code}
                    </code>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Statistics
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Holders Count */}
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Holders</p>
                  <p className="text-2xl font-bold">
                    {position.holderCount || 0}
                  </p>
                </div>
              </div>

              {/* Permissions Count */}
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                  <p className="text-2xl font-bold">
                    {position.permissionCount || position.permissions?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Metadata
            </h3>

            <div className="grid gap-3 text-sm">
              {/* Created At */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{formatDate(position.createdAt)}</span>
              </div>

              {/* Updated At */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">{formatDate(position.updatedAt)}</span>
              </div>

              {/* ID */}
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">ID:</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {position.id}
                </code>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  PermissionDelegation,
  getDelegationStatus,
  formatPermissions,
} from "@/lib/api/services/permission-delegation.service";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  User,
  Calendar,
  Shield,
  FileText,
  Ban,
  Clock,
} from "lucide-react";

interface ViewDelegationModalProps {
  open: boolean;
  delegation: PermissionDelegation | null;
  onClose: () => void;
}

export default function ViewDelegationModal({
  open,
  delegation,
  onClose,
}: ViewDelegationModalProps) {
  if (!delegation) return null;

  const status = getDelegationStatus(delegation);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permission Delegation Details</DialogTitle>
          <DialogDescription>
            View details of this permission delegation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
            <Badge
              variant={
                status === "active"
                  ? "success"
                  : status === "expired"
                  ? "secondary"
                  : "destructive"
              }
              className={cn(
                status === "active" &&
                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                status === "revoked" &&
                  "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>

          <Separator />

          {/* Delegator Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Delegated By</span>
            </div>
            <div className="pl-6">
              <p className="font-medium">
                {delegation.delegator?.dataKaryawan?.nama || "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground">
                NIP: {delegation.delegator?.nip || "-"}
              </p>
              {delegation.delegator?.dataKaryawan?.bagianKerja && (
                <p className="text-sm text-muted-foreground">
                  {delegation.delegator.dataKaryawan.bagianKerja}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Delegate Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Delegated To</span>
            </div>
            <div className="pl-6">
              <p className="font-medium">
                {delegation.delegate?.dataKaryawan?.nama || "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground">
                NIP: {delegation.delegate?.nip || "-"}
              </p>
              {delegation.delegate?.dataKaryawan?.bagianKerja && (
                <p className="text-sm text-muted-foreground">
                  {delegation.delegate.dataKaryawan.bagianKerja}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Delegated Permissions</span>
            </div>
            <div className="pl-6 space-y-2">
              {delegation.permissions.map((permission, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {permission.resource}.{permission.action}
                    </p>
                    {permission.scope && (
                      <p className="text-xs text-muted-foreground">
                        Scope: {permission.scope}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Validity Period */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Validity Period</span>
            </div>
            <div className="pl-6 space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">From:</span>{" "}
                  {format(delegation.validFrom, "PPP")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Until:</span>{" "}
                  <span
                    className={cn(
                      delegation.validUntil < new Date() &&
                        "text-destructive font-medium"
                    )}
                  >
                    {format(delegation.validUntil, "PPP")}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reason */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Reason</span>
            </div>
            <div className="pl-6">
              <p className="text-sm">{delegation.reason}</p>
            </div>
          </div>

          {/* Revocation Information (if revoked) */}
          {delegation.isRevoked && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <Ban className="h-4 w-4" />
                  <span>Revocation Information</span>
                </div>
                <div className="pl-6 space-y-1">
                  {delegation.revokedAt && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Revoked on:</span>{" "}
                      {format(delegation.revokedAt, "PPP")}
                    </p>
                  )}
                  {delegation.revokedReason && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Reason:</span>{" "}
                      {delegation.revokedReason}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {format(delegation.createdAt, "PPP p")}</p>
            <p>Last Updated: {format(delegation.updatedAt, "PPP p")}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

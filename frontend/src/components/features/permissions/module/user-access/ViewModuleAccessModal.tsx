"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { User2, Box, Calendar, Clock, Check, X } from "lucide-react";
import { type UserModuleAccess } from "@/lib/api/services/module-access.service";
import { format, isPast } from "date-fns";

interface ViewModuleAccessModalProps {
  open: boolean;
  access: UserModuleAccess;
  onClose: () => void;
  onEdit?: (access: UserModuleAccess) => void;
  onRevoke?: (access: UserModuleAccess) => void;
}

export default function ViewModuleAccessModal({
  open,
  access,
  onClose,
  onEdit,
  onRevoke,
}: ViewModuleAccessModalProps) {
  const userName = access.userProfile?.dataKaryawan?.nama || access.userProfile?.nip || "Unknown";
  const userNip = access.userProfile?.nip || "";
  const userEmail = access.userProfile?.dataKaryawan?.email || "";

  const moduleName = access.module?.name || "Unknown";
  const moduleCode = access.module?.code || "";
  const moduleCategory = access.module?.category || "";

  const grantedByName = access.grantedByUser?.dataKaryawan?.nama || "System";

  const isExpired = access.validUntil ? isPast(new Date(access.validUntil)) : false;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Module Access Details</DialogTitle>
          <DialogDescription>
            View complete information about this module access grant
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* User Information */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <User2 className="h-4 w-4" />
              User Information
            </Label>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="font-medium">{userName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">NIP</div>
                <div className="font-medium">{userNip || "-"}</div>
              </div>
              {userEmail && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium">{userEmail}</div>
                </div>
              )}
            </div>
          </div>

          {/* Module Information */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Box className="h-4 w-4" />
              Module Information
            </Label>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <div className="text-xs text-muted-foreground">Module Name</div>
                <div className="font-medium">{moduleName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Module Code</div>
                <code className="font-medium bg-background px-2 py-1 rounded">
                  {moduleCode || "-"}
                </code>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Category</div>
                <Badge variant="outline">{moduleCategory || "-"}</Badge>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Permissions</Label>
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {access.permissions.canRead ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Can Read</span>
              </div>
              <div className="flex items-center gap-2">
                {access.permissions.canWrite ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Can Write</span>
              </div>
              <div className="flex items-center gap-2">
                {access.permissions.canDelete ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Can Delete</span>
              </div>
              <div className="flex items-center gap-2">
                {access.permissions.canShare ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Can Share</span>
              </div>
            </div>
          </div>

          {/* Access Details */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Access Details
            </Label>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <div className="text-xs text-muted-foreground">Valid From</div>
                <div className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(access.validFrom), "PPP")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Valid Until</div>
                {access.validUntil ? (
                  <div className={`font-medium flex items-center gap-1 ${isExpired ? "text-destructive" : ""}`}>
                    <Clock className="h-3 w-3" />
                    {format(new Date(access.validUntil), "PPP")}
                    {isExpired && (
                      <Badge variant="destructive" className="ml-2">Expired</Badge>
                    )}
                  </div>
                ) : (
                  <div className="font-medium text-green-600">Permanent</div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Granted By</div>
                <div className="font-medium">{grantedByName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge
                  variant={access.isActive ? (isExpired ? "destructive" : "default") : "secondary"}
                  className={access.isActive && !isExpired ? "bg-green-100 text-green-800" : ""}
                >
                  {access.isActive ? (isExpired ? "Expired" : "Active") : "Revoked"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Reason */}
          {access.reason && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Reason</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{access.reason}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Metadata</Label>
            <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div>{format(new Date(access.createdAt), "PPp")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Updated</div>
                <div>{format(new Date(access.updatedAt), "PPp")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Version</div>
                <div>v{access.version}</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onEdit && access.isActive && !isExpired && (
            <Button onClick={() => onEdit(access)}>
              Edit Access
            </Button>
          )}
          {onRevoke && access.isActive && (
            <Button
              variant="destructive"
              onClick={() => onRevoke(access)}
            >
              Revoke Access
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

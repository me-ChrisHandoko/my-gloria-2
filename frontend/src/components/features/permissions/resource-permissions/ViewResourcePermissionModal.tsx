'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Shield, FileText, Calendar, Hash, Building2 } from 'lucide-react';
import { type ResourcePermission } from '@/lib/api/services/resource-permissions.service';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface ViewResourcePermissionModalProps {
  open: boolean;
  permission: ResourcePermission;
  onClose: () => void;
}

export default function ViewResourcePermissionModal({
  open,
  permission,
  onClose,
}: ViewResourcePermissionModalProps) {
  const isActive = !permission.validUntil || !isPast(new Date(permission.validUntil));
  const userName = permission.userProfile?.dataKaryawan?.nama || permission.userProfile?.nip || 'Unknown';
  const userNip = permission.userProfile?.nip;
  const permissionName = permission.permission?.name || 'Unknown Permission';
  const grantedByName = permission.grantedByUser?.dataKaryawan?.nama || permission.grantedBy || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resource Permission Details</DialogTitle>
          <DialogDescription>
            View detailed information about this resource permission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* User Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              User Information
            </h3>
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{userName}</p>
              </div>
              {userNip && (
                <div>
                  <p className="text-sm text-muted-foreground">NIP</p>
                  <p className="text-sm font-medium">{userNip}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Permission Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permission Information
            </h3>
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground">Permission</p>
                <p className="text-sm font-medium">{permissionName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Action</p>
                <Badge variant="outline">{permission.permission?.action || 'N/A'}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scope</p>
                <Badge variant="secondary">{permission.permission?.scope || 'N/A'}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resource</p>
                <Badge>{permission.permission?.resource || 'N/A'}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Resource Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Resource Information
            </h3>
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground">Resource Type</p>
                <p className="text-sm font-medium">{permission.resourceType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resource ID</p>
                <code className="text-sm bg-muted px-2 py-1 rounded">{permission.resourceId}</code>
              </div>
            </div>
          </div>

          <Separator />

          {/* Validity Period */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Validity Period
            </h3>
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground">Valid From</p>
                <p className="text-sm font-medium">
                  {format(new Date(permission.validFrom), 'PPP')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valid Until</p>
                {permission.validUntil ? (
                  <p className="text-sm font-medium">
                    {format(new Date(permission.validUntil), 'PPP')}
                  </p>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    Permanent
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={isActive ? 'success' : 'secondary'}
                  className={cn(
                    isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  )}
                >
                  {isActive ? 'Active' : 'Expired'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Grant Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Grant Details
            </h3>
            <div className="grid gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground">Granted By</p>
                <p className="text-sm font-medium">{grantedByName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Granted On</p>
                <p className="text-sm font-medium">
                  {format(new Date(permission.createdAt), 'PPP')}
                </p>
              </div>
              {permission.grantReason && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Grant Reason</p>
                  <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {permission.grantReason}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p>Created: {format(new Date(permission.createdAt), 'PPP p')}</p>
            </div>
            <div>
              <p>Updated: {format(new Date(permission.updatedAt), 'PPP p')}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

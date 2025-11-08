"use client";

/**
 * UserPermissionAssignment Component
 * Phase 4: User Direct Permissions
 *
 * Dialog for assigning a direct permission to a user.
 * Features:
 * - Permission selection from available permissions
 * - Grant/Deny toggle
 * - Resource-specific permissions (resourceType, resourceId)
 * - Temporal permission assignment (effectiveFrom/To)
 * - Priority setting
 * - Form validation
 * - Loading and error states
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 4
 */

import React, { useState } from 'react';
import { useGrantUserPermissionMutation } from '@/store/api/userPermissionsApi';
import { useGetPermissionsQuery } from '@/store/api/permissionApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Key, Calendar, Database, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import TemporalDatePickerAdapter from './TemporalDatePickerAdapter';

interface UserPermissionAssignmentProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function UserPermissionAssignment({
  userId,
  open,
  onOpenChange,
  onSuccess,
}: UserPermissionAssignmentProps) {
  const [selectedPermissionId, setSelectedPermissionId] = useState<string>('');
  const [isGranted, setIsGranted] = useState<boolean>(true);
  const [resourceType, setResourceType] = useState<string>('');
  const [resourceId, setResourceId] = useState<string>('');
  const [priority, setPriority] = useState<string>('0');
  const [effectiveFrom, setEffectiveFrom] = useState<Date | undefined>(undefined);
  const [effectiveTo, setEffectiveTo] = useState<Date | undefined>(undefined);

  const { data: permissionsResponse, isLoading: isLoadingPermissions } = useGetPermissionsQuery({
    page: 1,
    limit: 100,
    isActive: true,
  });

  const [grantPermission, { isLoading: isGranting }] = useGrantUserPermissionMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPermissionId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a permission to assign.',
      });
      return;
    }

    const priorityNum = parseInt(priority) || 0;
    if (priorityNum < 0 || priorityNum > 100) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Priority must be between 0 and 100.',
      });
      return;
    }

    try {
      await grantPermission({
        userId,
        permissionId: selectedPermissionId,
        isGranted,
        resourceType: resourceType || undefined,
        resourceId: resourceId || undefined,
        priority: priorityNum,
        effectiveFrom,
        effectiveTo,
      }).unwrap();

      toast({
        title: isGranted ? 'Permission granted' : 'Permission denied',
        description: `The permission has been successfully ${isGranted ? 'granted to' : 'denied for'} the user.`,
      });

      // Reset form
      setSelectedPermissionId('');
      setIsGranted(true);
      setResourceType('');
      setResourceId('');
      setPriority('0');
      setEffectiveFrom(undefined);
      setEffectiveTo(undefined);

      onSuccess?.();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to assign permission',
        description: err?.data?.message || 'An error occurred while assigning the permission.',
      });
    }
  };

  const handleCancel = () => {
    setSelectedPermissionId('');
    setIsGranted(true);
    setResourceType('');
    setResourceId('');
    setPriority('0');
    setEffectiveFrom(undefined);
    setEffectiveTo(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Assign Permission to User
            </DialogTitle>
            <DialogDescription>
              Grant or deny a direct permission to this user with optional resource and temporal settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Permission Selection */}
            <div className="space-y-2">
              <Label htmlFor="permission">
                Permission <span className="text-destructive">*</span>
              </Label>
              {isLoadingPermissions ? (
                <div className="flex items-center justify-center h-10 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={selectedPermissionId} onValueChange={setSelectedPermissionId}>
                  <SelectTrigger id="permission">
                    <SelectValue placeholder="Select a permission" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionsResponse?.data?.map((permission) => (
                      <SelectItem key={permission.id} value={permission.id}>
                        <div className="flex items-center gap-2">
                          <span>{permission.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {permission.code}
                          </Badge>
                          {permission.category && (
                            <Badge variant="secondary" className="text-xs">
                              {permission.category}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Grant/Deny Toggle */}
            <div className="flex items-center justify-between space-y-0 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isGranted" className="text-base">
                  Grant Permission
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toggle off to explicitly deny this permission
                </p>
              </div>
              <Switch
                id="isGranted"
                checked={isGranted}
                onCheckedChange={setIsGranted}
              />
            </div>

            {/* Resource-Specific Settings */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Database className="h-4 w-4" />
                Resource-Specific (Optional)
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="resourceType">Resource Type</Label>
                  <Input
                    id="resourceType"
                    placeholder="e.g., document, project"
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resourceId">Resource ID</Label>
                  <Input
                    id="resourceId"
                    placeholder="e.g., doc-123"
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Specify resource type and ID to restrict this permission to a specific resource
              </p>
            </div>

            {/* Priority Setting */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Priority
              </Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="100"
                placeholder="0-100 (higher = higher priority)"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Higher priority permissions take precedence (0-100, default: 0)
              </p>
            </div>

            {/* Temporal Settings */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Temporal Settings (Optional)
              </div>

              <TemporalDatePickerAdapter
                effectiveFrom={effectiveFrom}
                effectiveTo={effectiveTo}
                onEffectiveFromChange={setEffectiveFrom}
                onEffectiveToChange={setEffectiveTo}
              />

              <p className="text-xs text-muted-foreground">
                Leave dates empty for permanent permission assignment
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isGranting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGranting || !selectedPermissionId}>
              {isGranting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isGranted ? 'Granting...' : 'Denying...'}
                </>
              ) : (
                <>{isGranted ? 'Grant Permission' : 'Deny Permission'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

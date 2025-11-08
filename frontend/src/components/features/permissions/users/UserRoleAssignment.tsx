"use client";

/**
 * UserRoleAssignment Component
 * Phase 3: User Role Management
 *
 * Dialog for assigning a role to a user with temporal settings.
 * Features:
 * - Role selection from available roles
 * - Temporal role assignment (effectiveFrom/To)
 * - Form validation
 * - Loading and error states
 * - Success callback
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 3
 */

import React, { useState } from 'react';
import { useAssignUserRoleMutation } from '@/store/api/userRolesApi';
import { useGetRolesQuery } from '@/store/api/rolesApi';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import TemporalDatePickerAdapter from './TemporalDatePickerAdapter';

interface UserRoleAssignmentProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function UserRoleAssignment({
  userId,
  open,
  onOpenChange,
  onSuccess,
}: UserRoleAssignmentProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<Date | undefined>(undefined);
  const [effectiveTo, setEffectiveTo] = useState<Date | undefined>(undefined);

  const { data: rolesResponse, isLoading: isLoadingRoles } = useGetRolesQuery({
    page: 1,
    limit: 100,
    isActive: true,
  });

  const [assignRole, { isLoading: isAssigning }] = useAssignUserRoleMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoleId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a role to assign.',
      });
      return;
    }

    try {
      await assignRole({
        userId,
        roleId: selectedRoleId,
        effectiveFrom,
        effectiveTo,
      }).unwrap();

      toast({
        title: 'Role assigned',
        description: 'The role has been successfully assigned to the user.',
      });

      // Reset form
      setSelectedRoleId('');
      setEffectiveFrom(undefined);
      setEffectiveTo(undefined);

      onSuccess?.();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to assign role',
        description: err?.data?.message || 'An error occurred while assigning the role.',
      });
    }
  };

  const handleCancel = () => {
    setSelectedRoleId('');
    setEffectiveFrom(undefined);
    setEffectiveTo(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Assign Role to User
            </DialogTitle>
            <DialogDescription>
              Assign a role to this user with optional temporal settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              {isLoadingRoles ? (
                <div className="flex items-center justify-center h-10 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesResponse?.data?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <span>{role.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {role.code}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            L{role.hierarchyLevel}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Select the role you want to assign to this user
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
                Leave dates empty for permanent role assignment
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAssigning || !selectedRoleId}>
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

/**
 * RolePermissionsTab Component
 *
 * Permission assignment interface for roles.
 * Features:
 * - Two-column layout (Available | Assigned)
 * - Search and filter
 * - Assign/Revoke permissions
 * - Bulk operations
 * - Permission details on hover
 */

import React, { useState } from 'react';
import {
  useGetRolePermissionsQuery,
  useAssignRolePermissionMutation,
  useBulkAssignRolePermissionsMutation,
  useRevokeRolePermissionMutation,
} from '@/store/api/rolesApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Key,
  Search,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Info,
  Plus,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Permission } from '@/types/permissions/role.types';

interface RolePermissionsTabProps {
  roleId: string;
}

export default function RolePermissionsTab({ roleId }: RolePermissionsTabProps) {
  const [searchAvailable, setSearchAvailable] = useState('');
  const [searchAssigned, setSearchAssigned] = useState('');
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(new Set());

  // API hooks
  const { data: assignedPermissionsData, isLoading: isLoadingAssigned } =
    useGetRolePermissionsQuery(roleId);

  const [assignPermission, { isLoading: isAssigning }] = useAssignRolePermissionMutation();
  const [bulkAssignPermissions, { isLoading: isBulkAssigning }] =
    useBulkAssignRolePermissionsMutation();
  const [revokePermission, { isLoading: isRevoking }] = useRevokeRolePermissionMutation();

  // Normalize assigned permissions data (handle both array and object responses)
  const assignedPermissions = Array.isArray(assignedPermissionsData)
    ? assignedPermissionsData
    : assignedPermissionsData?.data || [];

  // Get assigned permission IDs
  const assignedPermissionIds = new Set(
    assignedPermissions.map((ap) => ap.permissionId)
  );

  // Available permissions - empty until real API is implemented
  const availablePermissions: Permission[] = [];

  // Filter functions
  const filterPermissions = (permissions: Permission[], search: string) => {
    if (!search) return permissions;
    const searchLower = search.toLowerCase();
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower)
    );
  };

  const filteredAvailable = filterPermissions(availablePermissions, searchAvailable);
  const filteredAssigned = filterPermissions(
    assignedPermissions?.map((ap) => ap.permission!).filter(Boolean) || [],
    searchAssigned
  );

  // Handle assign single permission
  const handleAssign = async (permissionId: string) => {
    try {
      await assignPermission({
        roleId,
        permissionId,
      }).unwrap();
      toast.success('Permission assigned successfully');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to assign permission');
    }
  };

  // Handle bulk assign
  const handleBulkAssign = async () => {
    if (selectedAvailable.size === 0) {
      toast.error('No permissions selected');
      return;
    }

    try {
      const result = await bulkAssignPermissions({
        roleId,
        permissionIds: Array.from(selectedAvailable),
      }).unwrap();

      if (result.success) {
        toast.success(`${result.assigned} permission(s) assigned successfully`);
        setSelectedAvailable(new Set());
      } else {
        toast.error(`Failed to assign ${result.failed} permission(s)`);
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to assign permissions');
    }
  };

  // Handle revoke single permission
  const handleRevoke = async (permissionId: string) => {
    try {
      await revokePermission({
        roleId,
        permissionId,
      }).unwrap();
      toast.success('Permission revoked successfully');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to revoke permission');
    }
  };

  // Handle bulk revoke
  const handleBulkRevoke = async () => {
    if (selectedAssigned.size === 0) {
      toast.error('No permissions selected');
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedAssigned).map((permissionId) =>
          revokePermission({ roleId, permissionId }).unwrap()
        )
      );
      toast.success(`${selectedAssigned.size} permission(s) revoked successfully`);
      setSelectedAssigned(new Set());
    } catch (err: any) {
      toast.error('Failed to revoke some permissions');
    }
  };

  // Toggle selection
  const toggleSelection = (
    permissionId: string,
    selectedSet: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    const newSet = new Set(selectedSet);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setSelected(newSet);
  };

  const isLoading = isLoadingAssigned || isAssigning || isBulkAssigning || isRevoking;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">
                    {assignedPermissions?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Assigned Permissions
                  </div>
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-2xl font-bold">
                    {availablePermissions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Available to Assign
                  </div>
                </div>
              </div>
            </div>

            {(selectedAvailable.size > 0 || selectedAssigned.size > 0) && (
              <div className="flex items-center gap-2">
                {selectedAvailable.size > 0 && (
                  <Button
                    onClick={handleBulkAssign}
                    disabled={isLoading}
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Assign {selectedAvailable.size}
                  </Button>
                )}
                {selectedAssigned.size > 0 && (
                  <Button
                    onClick={handleBulkRevoke}
                    disabled={isLoading}
                    size="sm"
                    variant="destructive"
                  >
                    <Minus className="mr-2 h-4 w-4" />
                    Revoke {selectedAssigned.size}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Available Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              Available Permissions
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search available..."
                value={searchAvailable}
                onChange={(e) => setSearchAvailable(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {filteredAvailable.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                  <Key className="h-12 w-12 mb-2 opacity-50" />
                  <p>No available permissions</p>
                  <p className="text-sm mt-1">All permissions have been assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailable.map((permission) => (
                    <TooltipProvider key={permission.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                            <Checkbox
                              checked={selectedAvailable.has(permission.id)}
                              onCheckedChange={() =>
                                toggleSelection(permission.id, selectedAvailable, setSelectedAvailable)
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{permission.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {permission.code}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleAssign(permission.id)}
                              disabled={isLoading}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">{permission.name}</p>
                            {permission.description && (
                              <p className="text-sm">{permission.description}</p>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                              <Badge variant="outline">{permission.resource}</Badge>
                              <Badge variant="outline">{permission.action}</Badge>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Assigned Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              Assigned Permissions
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assigned..."
                value={searchAssigned}
                onChange={(e) => setSearchAssigned(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAssigned ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                {filteredAssigned.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                    <Key className="h-12 w-12 mb-2 opacity-50" />
                    <p>No permissions assigned</p>
                    <p className="text-sm mt-1">
                      {searchAssigned ? 'Try adjusting your search' : 'Assign permissions to get started'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAssigned.map((permission) => (
                      <TooltipProvider key={permission.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRevoke(permission.id)}
                                disabled={isLoading}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{permission.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {permission.code}
                                </div>
                              </div>
                              <Checkbox
                                checked={selectedAssigned.has(permission.id)}
                                onCheckedChange={() =>
                                  toggleSelection(permission.id, selectedAssigned, setSelectedAssigned)
                                }
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{permission.name}</p>
                              {permission.description && (
                                <p className="text-sm">{permission.description}</p>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <Badge variant="outline">{permission.resource}</Badge>
                                <Badge variant="outline">{permission.action}</Badge>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

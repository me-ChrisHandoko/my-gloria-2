"use client";

/**
 * ModulePermissionsView Component
 *
 * Display and manage permissions associated with a specific module.
 * Features:
 * - List of module permissions
 * - Add new permissions
 * - Remove permissions
 * - Permission hierarchy display
 * - Visual permission indicators
 */

import React, { useState } from 'react';
import {
  useGetModulePermissionsQuery,
  useCreateModulePermissionMutation,
  useDeleteModulePermissionMutation,
} from '@/store/api/modulePermissionsApi';
import type { ModulePermission } from '@/lib/api/services/module-permissions.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, Shield, Key, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { AddModulePermissionForm } from './AddModulePermissionForm';

interface ModulePermissionsViewProps {
  moduleId: string;
  moduleName?: string;
}

export default function ModulePermissionsView({
  moduleId,
  moduleName,
}: ModulePermissionsViewProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<ModulePermission | null>(null);

  // API hooks
  const { data: permissions, isLoading, error } = useGetModulePermissionsQuery(moduleId);
  const [deletePermission, { isLoading: isDeleting }] = useDeleteModulePermissionMutation();

  const handleDeleteClick = (permission: ModulePermission) => {
    setSelectedPermission(permission);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPermission) return;

    try {
      await deletePermission({
        moduleId,
        permissionId: selectedPermission.id,
      }).unwrap();

      toast.success('Permission removed successfully');
      setIsDeleteDialogOpen(false);
      setSelectedPermission(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.data?.message || 'Failed to remove permission');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-md">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-medium">Error loading permissions</p>
          <p className="text-sm text-muted-foreground mt-1">
            {(error as any)?.message || 'Something went wrong'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            Module Permissions
          </h3>
          {moduleName && (
            <p className="text-sm text-muted-foreground mt-1">
              Permissions for module: <span className="font-medium">{moduleName}</span>
            </p>
          )}
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Permission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <AddModulePermissionForm
              moduleId={moduleId}
              onSuccess={() => {
                setIsAddDialogOpen(false);
                toast.success('Permission added successfully');
              }}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Permissions Table */}
      <div className="border rounded-md">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">Loading permissions...</span>
            </div>
          </div>
        ) : permissions && permissions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {permission.code}
                    </code>
                  </TableCell>
                  <TableCell className="font-medium">{permission.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{permission.resource}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{permission.action}</Badge>
                  </TableCell>
                  <TableCell>
                    {permission.category ? (
                      <Badge variant="outline">{permission.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={permission.isActive ? 'default' : 'secondary'}>
                      {permission.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(permission)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
            <Shield className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No permissions assigned</p>
            <p className="text-sm mt-1">Add permissions to control module access</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      {permissions && permissions.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>
              Total: <span className="font-medium text-foreground">{permissions.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>
              Active:{' '}
              <span className="font-medium text-foreground">
                {permissions.filter((p) => p.isActive).length}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>
              System:{' '}
              <span className="font-medium text-foreground">
                {permissions.filter((p) => p.isSystem).length}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Permission?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the permission{' '}
              <span className="font-medium">{selectedPermission?.name}</span> from this module?
              <br />
              <br />
              This action cannot be undone. Users with access through this module will lose this
              permission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Permission'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

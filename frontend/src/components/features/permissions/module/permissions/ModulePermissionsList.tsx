"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  type ModulePermission,
  PermissionAction,
  PermissionScope,
  modulePermissionsService,
} from "@/lib/api/services/module-permissions.service";
import { useGetModuleByIdQuery } from "@/store/api/modulesApi";
import { useGetModulePermissionsQuery } from "@/store/api/modulePermissionsApi";
import CreateModulePermissionModal from "./CreateModulePermissionModal";
import DeleteModulePermissionModal from "./DeleteModulePermissionModal";

const getActionBadgeColor = (action: PermissionAction) => {
  const colors = {
    [PermissionAction.CREATE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [PermissionAction.READ]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    [PermissionAction.UPDATE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [PermissionAction.DELETE]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    [PermissionAction.EXECUTE]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    [PermissionAction.APPROVE]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    [PermissionAction.MANAGE]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colors[action] || colors[PermissionAction.READ];
};

const getScopeBadgeColor = (scope: PermissionScope) => {
  const colors = {
    [PermissionScope.SELF]: 'bg-gray-100 text-gray-800',
    [PermissionScope.DEPARTMENT]: 'bg-blue-100 text-blue-800',
    [PermissionScope.ORGANIZATION]: 'bg-purple-100 text-purple-800',
    [PermissionScope.SYSTEM]: 'bg-red-100 text-red-800',
  };
  return colors[scope] || colors[PermissionScope.SELF];
};

export default function ModulePermissionsList() {
  const params = useParams();
  const moduleId = params?.id as string;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<ModulePermission | null>(null);

  const {
    data: module,
    isLoading: isLoadingModule,
    error: moduleError,
  } = useGetModuleByIdQuery(moduleId, { skip: !moduleId });

  const {
    data: permissionsData,
    isLoading: isLoadingPermissions,
    error: permissionsError,
    refetch: refetchPermissions,
  } = useGetModulePermissionsQuery(moduleId, { skip: !moduleId });

  // Safely extract array from response (handle various response formats)
  console.log('[DEBUG] permissionsData:', permissionsData);
  console.log('[DEBUG] permissionsData type:', typeof permissionsData, 'isArray:', Array.isArray(permissionsData));

  const permissions = Array.isArray(permissionsData)
    ? permissionsData
    : (permissionsData as any)?.data
    ? Array.isArray((permissionsData as any).data)
      ? (permissionsData as any).data
      : []
    : [];

  console.log('[DEBUG] extracted permissions:', permissions);

  const handleDelete = (permission: ModulePermission) => {
    setSelectedPermission(permission);
    setDeleteModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    refetchPermissions();
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedPermission(null);
    refetchPermissions();
  };

  if (isLoadingModule || isLoadingPermissions) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (moduleError || permissionsError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load module permissions. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/permissions/module/management">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Modules
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Module Permissions
          </h2>
          {module && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Managing permissions for: <strong>{module.name}</strong> ({module.code})
            </p>
          )}
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Permission
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Define what actions can be performed on this module and their scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!permissions || permissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No permissions defined for this module yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission: ModulePermission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      <Badge className={cn('font-medium', getActionBadgeColor(permission.action))}>
                        {modulePermissionsService.formatAction(permission.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getScopeBadgeColor(permission.scope)}>
                        {modulePermissionsService.formatScope(permission.scope)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {permission.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(permission)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateModulePermissionModal
        open={createModalOpen}
        moduleId={moduleId}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedPermission && (
        <DeleteModulePermissionModal
          open={deleteModalOpen}
          moduleId={moduleId}
          permission={selectedPermission}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedPermission(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}

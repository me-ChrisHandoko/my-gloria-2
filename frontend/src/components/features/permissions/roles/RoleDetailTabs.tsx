"use client";

/**
 * RoleDetailTabs Component
 *
 * Tabbed interface for viewing role details with Info, Permissions, and Modules tabs.
 * Features:
 * - Three main tabs
 * - Loading states
 * - Error handling
 * - Responsive layout
 */

import React from 'react';
import { useGetRoleByIdQuery } from '@/store/api/rolesApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Info, Key, Package, AlertCircle } from 'lucide-react';
import RoleInfo from './RoleInfo';
import RolePermissionsTab from './RolePermissionsTab';
import RoleModulesTab from './RoleModulesTab';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RoleDetailTabsProps {
  roleId: string;
}

export default function RoleDetailTabs({ roleId }: RoleDetailTabsProps) {
  const { data: role, isLoading, error, refetch } = useGetRoleByIdQuery(roleId);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading role details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !role) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load role</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(error as any)?.data?.message || 'An error occurred while loading role details'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div>{role.name}</div>
            <div className="text-sm font-normal text-muted-foreground">
              {role.code}
            </div>
          </div>
        </DialogTitle>
      </DialogHeader>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Information
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Modules
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="info" className="space-y-4 m-0">
            <RoleInfo role={role} onUpdate={refetch} />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 m-0">
            <RolePermissionsTab roleId={roleId} />
          </TabsContent>

          <TabsContent value="modules" className="space-y-4 m-0">
            <RoleModulesTab roleId={roleId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

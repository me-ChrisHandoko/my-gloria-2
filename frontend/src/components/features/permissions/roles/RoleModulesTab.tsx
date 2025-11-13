"use client";

/**
 * RoleModulesTab Component
 *
 * Module access management interface for roles.
 * Features:
 * - Two-column layout (Available | Granted)
 * - Access level selector (READ, WRITE, ADMIN, FULL)
 * - Search and filter
 * - Grant/Revoke module access
 * - Bulk operations
 */

import React, { useState } from 'react';
import {
  useGetRoleModuleAccessesQuery,
  useGrantRoleModuleAccessMutation,
  useBulkGrantRoleModuleAccessMutation,
  useRevokeRoleModuleAccessMutation,
} from '@/store/api/rolesApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Search,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Minus,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { ModuleAccessLevel, type Module } from '@/types/permissions/role.types';

interface RoleModulesTabProps {
  roleId: string;
}

const accessLevelColors: Record<ModuleAccessLevel, string> = {
  [ModuleAccessLevel.READ]: 'bg-blue-500',
  [ModuleAccessLevel.WRITE]: 'bg-green-500',
  [ModuleAccessLevel.ADMIN]: 'bg-orange-500',
  [ModuleAccessLevel.FULL]: 'bg-red-500',
};

const accessLevelLabels: Record<ModuleAccessLevel, string> = {
  [ModuleAccessLevel.READ]: 'Read',
  [ModuleAccessLevel.WRITE]: 'Write',
  [ModuleAccessLevel.ADMIN]: 'Admin',
  [ModuleAccessLevel.FULL]: 'Full',
};

export default function RoleModulesTab({ roleId }: RoleModulesTabProps) {
  const [searchAvailable, setSearchAvailable] = useState('');
  const [searchGranted, setSearchGranted] = useState('');
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
  const [selectedGranted, setSelectedGranted] = useState<Set<string>>(new Set());
  const [bulkAccessLevel, setBulkAccessLevel] = useState<ModuleAccessLevel>(
    ModuleAccessLevel.READ
  );

  // API hooks
  const { data: grantedModulesData, isLoading: isLoadingGranted } =
    useGetRoleModuleAccessesQuery(roleId);

  const [grantModuleAccess, { isLoading: isGranting }] = useGrantRoleModuleAccessMutation();
  const [bulkGrantModuleAccess, { isLoading: isBulkGranting }] =
    useBulkGrantRoleModuleAccessMutation();
  const [revokeModuleAccess, { isLoading: isRevoking }] = useRevokeRoleModuleAccessMutation();

  // Normalize granted modules data (handle both array and object responses)
  const grantedModules = Array.isArray(grantedModulesData)
    ? grantedModulesData
    : grantedModulesData?.data || [];

  // Get granted module IDs
  const grantedModuleIds = new Set(grantedModules.map((gm) => gm.moduleId));

  // Available modules - empty until real API is implemented
  const availableModules: Module[] = [];

  // Filter functions
  const filterModules = (modules: Module[], search: string) => {
    if (!search) return modules;
    const searchLower = search.toLowerCase();
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(searchLower) ||
        m.code.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower)
    );
  };

  const filteredAvailable = filterModules(availableModules, searchAvailable);
  const filteredGranted = filterModules(
    grantedModules.map((gm) => gm.module!).filter(Boolean),
    searchGranted
  );

  // Handle grant single module
  const handleGrant = async (moduleId: string, accessLevel: ModuleAccessLevel) => {
    try {
      await grantModuleAccess({
        roleId,
        moduleId,
        accessLevel,
      }).unwrap();
      toast.success('Module access granted successfully');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to grant module access');
    }
  };

  // Handle bulk grant
  const handleBulkGrant = async () => {
    if (selectedAvailable.size === 0) {
      toast.error('No modules selected');
      return;
    }

    try {
      const result = await bulkGrantModuleAccess({
        roleId,
        moduleIds: Array.from(selectedAvailable),
        accessLevel: bulkAccessLevel,
      }).unwrap();

      if (result.success) {
        toast.success(`${result.granted} module(s) granted successfully`);
        setSelectedAvailable(new Set());
      } else {
        toast.error(`Failed to grant ${result.failed} module(s)`);
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to grant module access');
    }
  };

  // Handle revoke single module
  const handleRevoke = async (moduleAccessId: string) => {
    try {
      await revokeModuleAccess({
        roleId,
        moduleAccessId,
      }).unwrap();
      toast.success('Module access revoked successfully');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to revoke module access');
    }
  };

  // Handle bulk revoke
  const handleBulkRevoke = async () => {
    if (selectedGranted.size === 0) {
      toast.error('No modules selected');
      return;
    }

    try {
      const moduleAccessIds = grantedModules
        ?.filter((gm) => selectedGranted.has(gm.moduleId))
        .map((gm) => gm.id) || [];

      await Promise.all(
        moduleAccessIds.map((id) =>
          revokeModuleAccess({ roleId, moduleAccessId: id }).unwrap()
        )
      );
      toast.success(`${selectedGranted.size} module(s) revoked successfully`);
      setSelectedGranted(new Set());
    } catch (err: any) {
      toast.error('Failed to revoke some modules');
    }
  };

  // Toggle selection
  const toggleSelection = (
    moduleId: string,
    selectedSet: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    const newSet = new Set(selectedSet);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setSelected(newSet);
  };

  const isLoading = isLoadingGranted || isGranting || isBulkGranting || isRevoking;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">
                    {grantedModules?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Granted Modules
                  </div>
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-2xl font-bold">
                    {availableModules.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Available to Grant
                  </div>
                </div>
              </div>
            </div>

            {(selectedAvailable.size > 0 || selectedGranted.size > 0) && (
              <div className="flex items-center gap-2">
                {selectedAvailable.size > 0 && (
                  <>
                    <Select
                      value={bulkAccessLevel}
                      onValueChange={(value) => setBulkAccessLevel(value as ModuleAccessLevel)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ModuleAccessLevel).map((level) => (
                          <SelectItem key={level} value={level}>
                            {accessLevelLabels[level]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleBulkGrant}
                      disabled={isLoading}
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Grant {selectedAvailable.size}
                    </Button>
                  </>
                )}
                {selectedGranted.size > 0 && (
                  <Button
                    onClick={handleBulkRevoke}
                    disabled={isLoading}
                    size="sm"
                    variant="destructive"
                  >
                    <Minus className="mr-2 h-4 w-4" />
                    Revoke {selectedGranted.size}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Available Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Available Modules
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
                  <Package className="h-12 w-12 mb-2 opacity-50" />
                  <p>No available modules</p>
                  <p className="text-sm mt-1">All modules have been granted</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailable.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <Checkbox
                        checked={selectedAvailable.has(module.id)}
                        onCheckedChange={() =>
                          toggleSelection(module.id, selectedAvailable, setSelectedAvailable)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{module.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {module.code}
                        </div>
                        {module.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {module.description}
                          </p>
                        )}
                      </div>
                      <Select
                        onValueChange={(value) => handleGrant(module.id, value as ModuleAccessLevel)}
                      >
                        <SelectTrigger className="w-[100px] opacity-0 group-hover:opacity-100 transition-opacity">
                          <SelectValue placeholder="Grant" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ModuleAccessLevel).map((level) => (
                            <SelectItem key={level} value={level}>
                              {accessLevelLabels[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Granted Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Granted Modules
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search granted..."
                value={searchGranted}
                onChange={(e) => setSearchGranted(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingGranted ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                {filteredGranted.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                    <Package className="h-12 w-12 mb-2 opacity-50" />
                    <p>No modules granted</p>
                    <p className="text-sm mt-1">
                      {searchGranted ? 'Try adjusting your search' : 'Grant modules to get started'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {grantedModules?.map((moduleAccess) => {
                      const module = moduleAccess.module;
                      if (!module) return null;

                      return (
                        <div
                          key={moduleAccess.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRevoke(moduleAccess.id)}
                            disabled={isLoading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{module.name}</span>
                              <Badge
                                variant="outline"
                                className={`${accessLevelColors[moduleAccess.accessLevel]} text-white border-0`}
                              >
                                {accessLevelLabels[moduleAccess.accessLevel]}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {module.code}
                            </div>
                          </div>
                          <Checkbox
                            checked={selectedGranted.has(module.id)}
                            onCheckedChange={() =>
                              toggleSelection(module.id, selectedGranted, setSelectedGranted)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Access Level Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Access Level Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {Object.values(ModuleAccessLevel).map((level) => (
              <div key={level} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${accessLevelColors[level]}`} />
                <div>
                  <div className="text-sm font-medium">{accessLevelLabels[level]}</div>
                  <div className="text-xs text-muted-foreground">
                    {level === ModuleAccessLevel.READ && 'View only'}
                    {level === ModuleAccessLevel.WRITE && 'View & Edit'}
                    {level === ModuleAccessLevel.ADMIN && 'Manage'}
                    {level === ModuleAccessLevel.FULL && 'Full control'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

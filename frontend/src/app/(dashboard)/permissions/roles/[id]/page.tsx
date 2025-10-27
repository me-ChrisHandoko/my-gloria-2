"use client";

import { useParams } from "next/navigation";
import { useGetRoleByIdQuery } from "@/store/api/rolesApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import RoleUsersList from "@/components/features/permissions/roles/users/RoleUsersList";
import RoleHierarchyTree from "@/components/features/permissions/roles/hierarchy/RoleHierarchyTree";
import RoleModulesGrid from "@/components/features/permissions/roles/modules/RoleModulesGrid";
import { Shield, Users, Network, Grid3x3 } from "lucide-react";

export default function RoleDetailPage() {
  const params = useParams();
  const roleId = params.id as string;

  const { data: role, isLoading, error } = useGetRoleByIdQuery(roleId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          Failed to load role details
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Role Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">{role.name}</CardTitle>
                <p className="text-sm text-muted-foreground">Code: {role.code}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={role.isActive ? "default" : "secondary"}>
                {role.isActive ? "Active" : "Inactive"}
              </Badge>
              {role.isSystemRole && (
                <Badge variant="outline">System Role</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">Hierarchy Level</p>
              <p className="text-2xl font-bold">{role.hierarchyLevel}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Users</p>
              <p className="text-2xl font-bold">{role._count?.userRoles || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Permissions</p>
              <p className="text-2xl font-bold">{role._count?.rolePermissions || 0}</p>
            </div>
          </div>
          {role.description && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Hierarchy
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Modules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <RoleUsersList roleId={roleId} />
        </TabsContent>

        <TabsContent value="hierarchy">
          <RoleHierarchyTree roleId={roleId} />
        </TabsContent>

        <TabsContent value="modules">
          <RoleModulesGrid roleId={roleId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

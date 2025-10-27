"use client";

import { useGetRoleModulesQuery } from "@/store/api/rolesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ModuleAccessCard from "./ModuleAccessCard";

interface RoleModulesGridProps {
  roleId: string;
}

export default function RoleModulesGrid({ roleId }: RoleModulesGridProps) {
  const { data: modules, isLoading } = useGetRoleModulesQuery(roleId);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Accessible Modules</CardTitle>
          <Badge>{modules?.length || 0} modules</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : modules && modules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module: any) => (
              <ModuleAccessCard key={module.id} module={module} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No modules accessible with current permissions
          </p>
        )}
      </CardContent>
    </Card>
  );
}

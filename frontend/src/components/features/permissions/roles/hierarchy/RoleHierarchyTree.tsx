"use client";

import { useState } from "react";
import { useGetRoleHierarchyQuery } from "@/store/api/rolesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import HierarchyDeleteDialog from "./HierarchyDeleteDialog";

interface RoleHierarchyTreeProps {
  roleId: string;
}

export default function RoleHierarchyTree({ roleId }: RoleHierarchyTreeProps) {
  const { data: hierarchy, isLoading } = useGetRoleHierarchyQuery(roleId);
  const [deleteRelation, setDeleteRelation] = useState<{
    roleId: string;
    parentRoleId: string;
  } | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!hierarchy) {
    return (
      <Card>
        <CardContent className="text-center text-muted-foreground py-8">
          No hierarchy data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Parent Roles */}
          {hierarchy.parents && hierarchy.parents.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Parent Roles:</p>
              <div className="space-y-2 pl-4">
                {hierarchy.parents.map((parent: any) => (
                  <div
                    key={parent.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{parent.code}</Badge>
                      <span className="text-sm">{parent.name}</span>
                      {parent.inheritPermissions && (
                        <Badge variant="secondary" className="text-xs">
                          Inherits Permissions
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDeleteRelation({
                          roleId,
                          parentRoleId: parent.id,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Child Roles */}
          {hierarchy.children && hierarchy.children.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Child Roles:</p>
              <div className="space-y-2 pl-4">
                {hierarchy.children.map((child: any) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-2 p-2 bg-muted rounded-md"
                  >
                    <Badge variant="outline">{child.code}</Badge>
                    <span className="text-sm flex-1">{child.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No hierarchy */}
          {(!hierarchy.parents || hierarchy.parents.length === 0) &&
            (!hierarchy.children || hierarchy.children.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hierarchy relationships defined
              </p>
            )}
        </div>
      </CardContent>

      {/* Delete Dialog */}
      {deleteRelation && (
        <HierarchyDeleteDialog
          roleId={deleteRelation.roleId}
          parentRoleId={deleteRelation.parentRoleId}
          open={!!deleteRelation}
          onClose={() => setDeleteRelation(null)}
          onSuccess={() => setDeleteRelation(null)}
        />
      )}
    </Card>
  );
}

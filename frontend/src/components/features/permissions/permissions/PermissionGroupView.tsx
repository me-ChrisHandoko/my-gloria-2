"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPermissionsQuery } from "@/store/api/permissionApi";
import PermissionCard from "./PermissionCard";
import type { Permission } from "@/lib/api/services/permissions.service";

interface GroupedPermissions {
  [key: string]: {
    category: string;
    permissions: Permission[];
  };
}

export default function PermissionGroupView() {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: permissionsData, isLoading } = useGetPermissionsQuery({
    page: 1,
    limit: 1000, // Get all permissions for grouping
  });

  const permissions = React.useMemo(() => permissionsData?.data || [], [permissionsData?.data]);

  // Group permissions by category (resource or group)
  const groupedPermissions: GroupedPermissions = React.useMemo(() => {
    const groups: GroupedPermissions = {};

    permissions.forEach((permission) => {
      // Primary grouping by resource
      const resourceKey = permission.resource || "Other";
      const categoryName = resourceKey.charAt(0).toUpperCase() + resourceKey.slice(1);

      if (!groups[resourceKey]) {
        groups[resourceKey] = {
          category: categoryName,
          permissions: [],
        };
      }

      groups[resourceKey].permissions.push(permission);
    });

    // Sort permissions within each group by action
    Object.values(groups).forEach((group) => {
      group.permissions.sort((a, b) => a.action.localeCompare(b.action));
    });

    return groups;
  }, [permissions]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedPermissions)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupKeys = Object.keys(groupedPermissions).sort();
  const totalGroups = groupKeys.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Permissions by Category</CardTitle>
            <CardDescription>
              Browse permissions organized by resource type
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              disabled={expandedGroups.size === totalGroups}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              disabled={expandedGroups.size === 0}
            >
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {groupKeys.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No permissions found
          </div>
        ) : (
          <div className="space-y-4">
            {groupKeys.map((groupKey) => {
              const group = groupedPermissions[groupKey];
              const isExpanded = expandedGroups.has(groupKey);
              const activeCount = group.permissions.filter((p) => p.isActive).length;
              const systemCount = group.permissions.filter((p) => p.isSystemPermission).length;

              return (
                <Collapsible
                  key={groupKey}
                  open={isExpanded}
                  onOpenChange={() => toggleGroup(groupKey)}
                >
                  <Card className="border-2">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="text-lg">
                                {group.category}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {group.permissions.length} permission
                                {group.permissions.length !== 1 ? "s" : ""}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {activeCount} Active
                            </Badge>
                            {systemCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {systemCount} System
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {group.permissions.map((permission) => (
                            <PermissionCard
                              key={permission.id}
                              permission={permission}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Total: {permissions.length} permission{permissions.length !== 1 ? "s" : ""}{" "}
            in {totalGroups} categor{totalGroups !== 1 ? "ies" : "y"}
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {permissions.filter((p) => p.isActive).length} Active
            </Badge>
            <Badge variant="outline">
              {permissions.filter((p) => p.isSystemPermission).length} System
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

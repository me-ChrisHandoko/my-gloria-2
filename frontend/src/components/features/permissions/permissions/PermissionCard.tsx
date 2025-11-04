"use client";

import React from "react";
import { Shield, Tag, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Permission } from "@/lib/api/services/permissions.service";
import { formatDate } from "@/lib/utils";

interface PermissionCardProps {
  permission: Permission;
}

export default function PermissionCard({ permission }: PermissionCardProps) {
  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    READ: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    UPDATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    APPROVE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    EXPORT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    IMPORT: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    PRINT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    ASSIGN: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    CLOSE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  };

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        !permission.isActive ? "opacity-60" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{permission.name}</span>
            </CardTitle>
            <CardDescription className="mt-1 font-mono text-xs">
              {permission.code}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={actionColors[permission.action] || "bg-gray-100"}>
              {permission.action}
            </Badge>
            {permission.isSystemPermission && (
              <Badge variant="outline" className="text-xs">
                System
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Description */}
        {permission.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {permission.description}
          </p>
        )}

        {/* Metadata */}
        <div className="space-y-2">
          {/* Resource */}
          <div className="flex items-center gap-2 text-sm">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Resource:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {permission.resource}
            </Badge>
          </div>

          {/* Scope */}
          {permission.scope && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Scope:</span>
              <Badge variant="secondary" className="text-xs">
                {permission.scope}
              </Badge>
            </div>
          )}

          {/* Group */}
          {permission.group && (
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Group:</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate text-sm font-medium max-w-[150px]">
                      {permission.group.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{permission.group.name}</p>
                    {permission.group.description && (
                      <p className="text-xs text-muted-foreground">
                        {permission.group.description}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Status and Date */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Badge variant={permission.isActive ? "default" : "secondary"} className="text-xs">
            {permission.isActive ? "Active" : "Inactive"}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(permission.updatedAt, "short")}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Last updated</p>
                <p className="text-xs font-medium">{formatDate(permission.updatedAt)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

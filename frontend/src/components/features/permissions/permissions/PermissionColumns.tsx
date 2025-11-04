"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Permission } from "@/lib/api/services/permissions.service";
import { formatDate } from "@/lib/utils";

interface PermissionColumnsProps {
  onEdit: (permission: Permission) => void;
  onDelete: (permission: Permission) => void;
}

export function createPermissionColumns({
  onEdit,
  onDelete,
}: PermissionColumnsProps): ColumnDef<Permission>[] {
  return [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("code")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.getValue("name")}>
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "resource",
      header: "Resource",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.getValue("resource")}
        </Badge>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const action = row.getValue("action") as string;
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
          <Badge className={actionColors[action] || "bg-gray-100"}>
            {action}
          </Badge>
        );
      },
    },
    {
      accessorKey: "scope",
      header: "Scope",
      cell: ({ row }) => {
        const scope = row.getValue("scope") as string | undefined;
        if (!scope) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="secondary" className="text-xs">
            {scope}
          </Badge>
        );
      },
    },
    {
      accessorKey: "group",
      header: "Group",
      cell: ({ row }) => {
        const group = row.original.group;
        if (!group) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="max-w-[150px] truncate text-sm" title={group.name}>
            {group.name}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isSystemPermission",
      header: "System",
      cell: ({ row }) => {
        const isSystem = row.getValue("isSystemPermission") as boolean;
        return isSystem ? (
          <Badge variant="outline" className="text-xs">
            System
          </Badge>
        ) : null;
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => {
        const date = row.getValue("updatedAt") as string;
        return (
          <div className="text-sm text-muted-foreground">
            {formatDate(date)}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const permission = row.original;
        const isSystem = permission.isSystemPermission;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(permission)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {!isSystem && (
                <DropdownMenuItem
                  onClick={() => onDelete(permission)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

"use client";

/**
 * RoleHierarchyTree Component
 *
 * Tree visualization component for displaying role hierarchy with drag-and-drop support.
 * Features:
 * - Recursive tree structure
 * - Expand/collapse nodes
 * - Drag-and-drop hierarchy management
 * - Context menu for hierarchy operations
 * - Visual level indicators
 */

import React, { useState, useMemo } from 'react';
import {
  useGetRolesQuery,
  useCreateRoleHierarchyMutation,
  useRemoveRoleHierarchyMutation,
} from '@/store/api/rolesApi';
import type { Role, RoleHierarchyNode } from '@/types/permissions/role.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Shield,
  Users,
  Key,
  Link2,
  Unlink,
  Loader2,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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

interface RoleHierarchyTreeProps {
  organizationId?: string;
  onRoleSelect?: (roleId: string) => void;
}

interface TreeNodeProps {
  node: RoleHierarchyNode;
  level?: number;
  onSetParent: (childId: string, parentId: string) => void;
  onRemoveHierarchy: (roleId: string) => void;
  onRoleClick?: (roleId: string) => void;
}

/**
 * Build hierarchy tree from flat role data
 * Converts array of Role objects into tree structure with parent-child relationships
 */
function buildHierarchyTree(roles: Role[]): RoleHierarchyNode[] {
  const rolesMap = new Map<string, RoleHierarchyNode>();

  // Convert all roles to RoleHierarchyNode with empty children array
  roles.forEach(role => {
    rolesMap.set(role.id, {
      ...role,
      children: [],
    });
  });

  const rootNodes: RoleHierarchyNode[] = [];

  // Build parent-child relationships
  roles.forEach(role => {
    const node = rolesMap.get(role.id)!;

    if (role.parentId) {
      const parent = rolesMap.get(role.parentId);
      if (parent) {
        // Add as child to parent
        parent.children.push(node);
      } else {
        // Parent not found (orphaned role), treat as root
        rootNodes.push(node);
      }
    } else {
      // No parent = root level role
      rootNodes.push(node);
    }
  });

  // Sort root nodes by hierarchyLevel and name for consistent display
  return rootNodes.sort((a, b) => {
    if (a.hierarchyLevel !== b.hierarchyLevel) {
      return a.hierarchyLevel - b.hierarchyLevel;
    }
    return a.name.localeCompare(b.name);
  });
}

function TreeNode({ node, level = 0, onSetParent, onRemoveHierarchy, onRoleClick }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors',
          'group relative'
        )}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleToggle}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </Button>

        {/* Role Info */}
        <div
          className="flex-1 flex items-center gap-3 cursor-pointer"
          onClick={() => onRoleClick?.(node.id)}
        >
          <div className="flex items-center gap-2 flex-1">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{node.name}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {node.code}
                </Badge>
              </div>
              {node.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {node.description}
                </p>
              )}
            </div>
          </div>

          {/* Level Indicator */}
          <Badge variant="secondary" className="font-mono">
            L{node.hierarchyLevel}
          </Badge>

          {/* Type Badge */}
          {node.isSystem && (
            <Badge variant="outline">
              <Shield className="mr-1 h-3 w-3" />
              System
            </Badge>
          )}

          {/* Status Badge */}
          <Badge variant={node.isActive ? 'success' : 'destructive'}>
            {node.isActive ? 'Active' : 'Inactive'}
          </Badge>

          {/* Stats */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {(node as any)._count?.userRoles || 0}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Key className="h-3 w-3" />
              {(node as any)._count?.permissions || 0}
            </Badge>
          </div>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Hierarchy Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {node.parentId && (
              <DropdownMenuItem onClick={() => onRemoveHierarchy(node.id)}>
                <Unlink className="mr-2 h-4 w-4" />
                Remove Parent
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="space-y-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSetParent={onSetParent}
              onRemoveHierarchy={onRemoveHierarchy}
              onRoleClick={onRoleClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoleHierarchyTree({
  organizationId,
  onRoleSelect,
}: RoleHierarchyTreeProps) {
  const [confirmRemove, setConfirmRemove] = useState<{
    roleId: string;
    roleName: string;
  } | null>(null);

  // Fetch all roles to build hierarchy tree
  // Note: Using limit of 100 to avoid backend validation errors
  // Most organizations have fewer than 100 roles. If more are needed,
  // implement pagination fetching in the future.
  const { data: rolesData, isLoading, error } = useGetRolesQuery({
    limit: 100,
    isActive: undefined, // Include both active and inactive
    organizationId,
  });

  // Build hierarchy tree from flat role data
  const hierarchyData = useMemo(() => {
    if (!rolesData?.data) return [];
    return buildHierarchyTree(rolesData.data);
  }, [rolesData]);

  const [createHierarchy, { isLoading: isCreating }] = useCreateRoleHierarchyMutation();
  const [removeHierarchy, { isLoading: isRemoving }] = useRemoveRoleHierarchyMutation();

  const handleSetParent = async (childId: string, parentId: string) => {
    try {
      await createHierarchy({ roleId: childId, parentId }).unwrap();
      toast.success('Role hierarchy updated successfully');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update role hierarchy');
    }
  };

  const handleRemoveHierarchy = (roleId: string) => {
    const role = findRoleInTree(hierarchyData || [], roleId);
    if (role) {
      setConfirmRemove({ roleId, roleName: role.name });
    }
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemove) return;

    try {
      await removeHierarchy(confirmRemove.roleId).unwrap();
      toast.success('Role hierarchy removed successfully');
      setConfirmRemove(null);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to remove role hierarchy');
    }
  };

  const findRoleInTree = (nodes: RoleHierarchyNode[], roleId: string): RoleHierarchyNode | null => {
    for (const node of nodes) {
      if (node.id === roleId) return node;
      if (node.children) {
        const found = findRoleInTree(node.children, roleId);
        if (found) return found;
      }
    }
    return null;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Role Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Role Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Failed to load hierarchy</p>
            <p className="text-sm text-muted-foreground mt-2">
              {(error as any)?.data?.message || 'An error occurred while loading the role hierarchy'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!hierarchyData || hierarchyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Role Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium">No hierarchy found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create roles and set parent relationships to build your hierarchy
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Role Hierarchy
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            View and manage role hierarchy relationships
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {hierarchyData.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                onSetParent={handleSetParent}
                onRemoveHierarchy={handleRemoveHierarchy}
                onRoleClick={onRoleSelect}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Remove Hierarchy Confirmation Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role Hierarchy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the parent relationship for{' '}
              <span className="font-semibold">{confirmRemove?.roleName}</span>?
              <br />
              <br />
              This will make it a root-level role. Child roles and permissions will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Hierarchy'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

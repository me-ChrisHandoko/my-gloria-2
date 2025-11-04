"use client";

/**
 * ModuleTree Component
 *
 * Hierarchical tree visualization of modules.
 * Features:
 * - Expandable/collapsible tree nodes
 * - Drag and drop support for reorganization
 * - Visual hierarchy indicators
 * - Quick actions per node
 * - Search and filter within tree
 */

import React, { useState, useMemo } from 'react';
import { useGetModuleTreeQuery, useMoveModuleMutation } from '@/store/api/modulesApi';
import type { ModuleTreeNode } from '@/lib/api/services/modules.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronDown,
  FolderTree,
  Loader2,
  Search,
  Eye,
  Edit,
  Trash2,
  Plus,
  Box,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ModuleTreeProps {
  onModuleSelect?: (moduleId: string) => void;
  onEdit?: (module: ModuleTreeNode) => void;
  onDelete?: (module: ModuleTreeNode) => void;
  onView?: (module: ModuleTreeNode) => void;
  onAddChild?: (parentModule: ModuleTreeNode) => void;
}

export default function ModuleTree({
  onModuleSelect,
  onEdit,
  onDelete,
  onView,
  onAddChild,
}: ModuleTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: treeData, isLoading, error, refetch } = useGetModuleTreeQuery();
  const [moveModule] = useMoveModuleMutation();

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!treeData || !searchTerm.trim()) return treeData;

    const filterNodes = (nodes: ModuleTreeNode[]): ModuleTreeNode[] => {
      return nodes
        .map((node) => {
          const matchesSearch =
            node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.code.toLowerCase().includes(searchTerm.toLowerCase());

          const filteredChildren = node.children ? filterNodes(node.children) : [];

          if (matchesSearch || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren.length > 0 ? filteredChildren : node.children,
            };
          }

          return null;
        })
        .filter((node): node is ModuleTreeNode => node !== null);
    };

    return filterNodes(treeData);
  }, [treeData, searchTerm]);

  // Auto-expand nodes when searching
  React.useEffect(() => {
    if (searchTerm.trim() && filteredTree) {
      const getAllNodeIds = (nodes: ModuleTreeNode[]): string[] => {
        return nodes.flatMap((node) => [
          node.id,
          ...(node.children ? getAllNodeIds(node.children) : []),
        ]);
      };
      setExpandedNodes(new Set(getAllNodeIds(filteredTree)));
    }
  }, [searchTerm, filteredTree]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleNodeClick = (node: ModuleTreeNode) => {
    setSelectedNodeId(node.id);
    onModuleSelect?.(node.id);
  };

  const expandAll = () => {
    if (!treeData) return;
    const getAllNodeIds = (nodes: ModuleTreeNode[]): string[] => {
      return nodes.flatMap((node) => [
        node.id,
        ...(node.children ? getAllNodeIds(node.children) : []),
      ]);
    };
    setExpandedNodes(new Set(getAllNodeIds(treeData)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderTreeNode = (node: ModuleTreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;

    return (
      <div key={node.id} className="select-none">
        {/* Node Row */}
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent transition-colors group',
            isSelected && 'bg-accent',
          )}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        >
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleNode(node.id)}
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

          {/* Icon */}
          <div className="flex-shrink-0">
            {node.icon ? (
              <span className="text-lg">{node.icon}</span>
            ) : (
              <Box className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Node Content */}
          <div
            className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
            onClick={() => handleNodeClick(node)}
          >
            <span className="font-medium truncate">{node.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{node.code}</span>
            {!node.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
            {!node.isVisible && (
              <Badge variant="outline" className="text-xs">
                Hidden
              </Badge>
            )}
          </div>

          {/* Category Badge */}
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {node.category}
          </Badge>

          {/* Actions (shown on hover) */}
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onView && (
                  <DropdownMenuItem onClick={() => onView(node)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(node)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Module
                  </DropdownMenuItem>
                )}
                {onAddChild && (
                  <DropdownMenuItem onClick={() => onAddChild(node)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Child Module
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(node)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Module
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive">Error loading module tree</p>
          <p className="text-sm text-muted-foreground mt-2">
            {(error as any)?.message || 'Something went wrong'}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Expand/Collapse Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll} disabled={isLoading}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} disabled={isLoading}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Tree View */}
      <div className="border rounded-md p-4 min-h-[400px] max-h-[600px] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">Loading module tree...</span>
            </div>
          </div>
        ) : filteredTree && filteredTree.length > 0 ? (
          <div className="space-y-0.5">
            {filteredTree.map((node) => renderTreeNode(node, 0))}
          </div>
        ) : searchTerm ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Search className="h-8 w-8 mb-2" />
            <p>No modules found matching "{searchTerm}"</p>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => setSearchTerm('')}
            >
              Clear search
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FolderTree className="h-8 w-8 mb-2" />
            <p>No modules found</p>
            <p className="text-sm">Create your first module to get started</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-2">
        <div className="flex items-center gap-1">
          <Box className="h-3 w-3" />
          <span>Module</span>
        </div>
        <div className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <span>Collapsed</span>
        </div>
        <div className="flex items-center gap-1">
          <ChevronDown className="h-3 w-3" />
          <span>Expanded</span>
        </div>
      </div>
    </div>
  );
}

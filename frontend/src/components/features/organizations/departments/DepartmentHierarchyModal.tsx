'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown, Building2, Users } from 'lucide-react';
import {
  departmentService,
  type DepartmentHierarchy,
} from '@/lib/api/services/departments.service';
import { organizationService } from '@/lib/api/services/organizations.service';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/lib/utils/errorLogger';

interface DepartmentHierarchyModalProps {
  open: boolean;
  schoolId: string;
  onClose: () => void;
}

interface TreeNodeProps {
  node: DepartmentHierarchy;
  level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 24;

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center space-x-2 py-2 px-2 hover:bg-muted rounded-md cursor-pointer',
          level === 0 && 'font-medium'
        )}
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">{node.name}</span>
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{node.code}</code>
        {hasChildren && (
          <Badge variant="secondary" className="ml-2">
            {node.children.length}
          </Badge>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DepartmentHierarchyModal({
  open,
  schoolId,
  onClose,
}: DepartmentHierarchyModalProps) {
  const [hierarchy, setHierarchy] = useState<DepartmentHierarchy[]>([]);
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState<string>('');

  useEffect(() => {
    if (open && schoolId) {
      fetchHierarchy();
      fetchSchoolInfo();
    }
  }, [open, schoolId]);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const data = await departmentService.getDepartmentHierarchy(schoolId);
      setHierarchy(data);
    } catch (error) {
      console.error('Failed to fetch hierarchy:', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolInfo = async () => {
    try {
      const school = await organizationService.getOrganizationById(schoolId);
      setSchoolName(school.name);
    } catch (error) {
      console.error('Failed to fetch school info:', extractErrorMessage(error));
    }
  };

  const getTotalDepartments = (nodes: DepartmentHierarchy[]): number => {
    return nodes.reduce((total, node) => {
      return total + 1 + getTotalDepartments(node.children || []);
    }, 0);
  };

  const totalDepartments = getTotalDepartments(hierarchy);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Department Hierarchy</DialogTitle>
          <DialogDescription>
            Organizational structure for {schoolName || 'School'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total Departments: {totalDepartments}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Root Departments: {hierarchy.length}
              </span>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : hierarchy.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No departments found for this school</p>
              <p className="text-sm mt-2">Create departments to build your organizational structure</p>
            </div>
          ) : (
            <div className="space-y-1">
              {hierarchy.map((node) => (
                <TreeNode key={node.id} node={node} level={0} />
              ))}
            </div>
          )}
        </ScrollArea>

        {!loading && hierarchy.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Click on departments with children to expand/collapse. Departments are organized in a
              hierarchical structure where each department can have multiple child departments.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
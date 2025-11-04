"use client";

/**
 * RoleInfo Component
 *
 * Displays comprehensive role information in read-only format.
 * Features:
 * - Organized sections for different info types
 * - Visual badges and indicators
 * - Timestamps and metadata
 * - Edit button to switch to RoleForm
 */

import React, { useState } from 'react';
import type { Role } from '@/types/permissions/role.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Edit,
  Calendar,
  User,
  GitBranch,
  Info,
  CheckCircle2,
  XCircle,
  Building,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import RoleForm from './RoleForm';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RoleInfoProps {
  role: Role;
  onUpdate?: () => void;
}

export default function RoleInfo({ role, onUpdate }: RoleInfoProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), 'PPpp');
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{role.name}</h2>
            <p className="text-sm text-muted-foreground">Role Information</p>
          </div>
        </div>
        <Button
          onClick={() => setIsEditDialogOpen(true)}
          disabled={role.isSystem}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Role
        </Button>
      </div>

      <Separator />

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Code
              </label>
              <div className="mt-1 font-mono text-lg">{role.code}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <div className="mt-1 text-lg">{role.name}</div>
            </div>
          </div>

          {role.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>
              <div className="mt-1 text-sm">{role.description}</div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <div className="mt-1">
                <Badge variant={role.isActive ? 'success' : 'destructive'}>
                  {role.isActive ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1 h-3 w-3" />
                      Inactive
                    </>
                  )}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Type
              </label>
              <div className="mt-1">
                <Badge variant={role.isSystem ? 'secondary' : 'default'}>
                  <Shield className="mr-1 h-3 w-3" />
                  {role.isSystem ? 'System' : 'Custom'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Hierarchy Level
              </label>
              <div className="mt-1">
                <Badge variant="outline" className="font-mono">
                  Level {role.hierarchyLevel}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchy Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5" />
            Hierarchy Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Parent Role
              </label>
              <div className="mt-1">
                {role.parentId ? (
                  <Badge variant="outline">Has Parent</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Root Level Role
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Organization
              </label>
              <div className="mt-1">
                {role.organizationId ? (
                  <Badge variant="outline">
                    <Building className="mr-1 h-3 w-3" />
                    Assigned
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Global Role
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Role ID
              </label>
              <div className="mt-1 font-mono text-xs break-all">{role.id}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Created At
              </label>
              <div className="mt-1 text-sm">{formatDate(role.createdAt)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Last Updated
              </label>
              <div className="mt-1 text-sm">{formatDate(role.updatedAt)}</div>
            </div>
            {role.deletedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Deleted At
                </label>
                <div className="mt-1 text-sm text-destructive">
                  {formatDate(role.deletedAt)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Role Warning */}
      {role.isSystem && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-100">
                  System Role
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  This is a system role and cannot be modified or deleted. System roles are
                  essential for platform operation and user access control.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <RoleForm
            roleId={role.id}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              onUpdate?.();
              toast.success('Role updated successfully');
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

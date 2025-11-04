"use client";

import React from 'react';
import type { Module } from '@/lib/api/services/modules.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Box, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface ViewModuleDialogProps {
  module: Module;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewModuleDialog({ module, open, onOpenChange }: ViewModuleDialogProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {module.icon && <span className="text-2xl">{module.icon}</span>}
            {!module.icon && <Box className="h-5 w-5" />}
            {module.name}
          </DialogTitle>
          <DialogDescription>
            View detailed information about this module
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Code</p>
                <code className="text-sm bg-muted px-2 py-1 rounded mt-1 inline-block">
                  {module.code}
                </code>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <Badge variant="outline" className="mt-1">
                  {module.category}
                </Badge>
              </div>
            </div>

            {module.description && (
              <div>
                <p className="text-muted-foreground text-sm">Description</p>
                <p className="text-sm mt-1">{module.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Configuration */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Configuration</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {module.path && (
                <div>
                  <p className="text-muted-foreground">Path</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                    {module.path}
                  </code>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Sort Order</p>
                <p className="font-medium mt-1">{module.sortOrder}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Status</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Active:</p>
                <Badge variant={module.isActive ? 'default' : 'secondary'}>
                  {module.isActive ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Visible:</p>
                <Badge variant={module.isVisible ? 'default' : 'secondary'}>
                  {module.isVisible ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Metadata</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(module.createdAt)}</p>
                  {module.createdBy && (
                    <p className="text-xs text-muted-foreground mt-0.5">by {module.createdBy}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDate(module.updatedAt)}</p>
                  {module.updatedBy && (
                    <p className="text-xs text-muted-foreground mt-0.5">by {module.updatedBy}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <p className="text-muted-foreground">Version:</p>
              <Badge variant="outline">{module.version}</Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

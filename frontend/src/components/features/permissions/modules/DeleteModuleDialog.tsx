"use client";

import React, { useState } from 'react';
import { useDeleteModuleMutation } from '@/store/api/modulesApi';
import type { Module } from '@/lib/api/services/modules.service';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteModuleDialogProps {
  module: Module;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteModuleDialog({
  module,
  open,
  onOpenChange,
  onSuccess,
}: DeleteModuleDialogProps) {
  const [reason, setReason] = useState('');
  const [deleteModule, { isLoading }] = useDeleteModuleMutation();

  const handleDelete = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    try {
      await deleteModule({
        id: module.id,
        reason: reason.trim(),
      }).unwrap();

      onSuccess?.();
      onOpenChange(false);
      setReason('');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.data?.message || 'Failed to delete module');
    }
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Module?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete the module{' '}
              <span className="font-medium text-foreground">{module.name}</span> (
              <code className="text-xs">{module.code}</code>)?
            </p>
            <p className="text-destructive font-medium">
              This action cannot be undone. All associated data will be permanently removed.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="delete-reason">Deletion Reason *</Label>
          <Textarea
            id="delete-reason"
            placeholder="Provide a reason for deleting this module..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            This reason will be logged for audit purposes
          </p>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Module'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { PermissionDelegation } from "@/lib/api/services/permission-delegation.service";
import { useRevokeDelegationMutation } from "@/store/api/permissionDelegationApi";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RevokeDelegationModalProps {
  open: boolean;
  delegation: PermissionDelegation | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RevokeDelegationModal({
  open,
  delegation,
  onClose,
  onSuccess,
}: RevokeDelegationModalProps) {
  const [reason, setReason] = useState("");
  const [revokeDelegation, { isLoading: isRevoking }] =
    useRevokeDelegationMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!delegation) return;

    if (!reason.trim()) {
      toast.error("Please provide a reason for revoking this delegation");
      return;
    }

    try {
      await revokeDelegation({
        id: delegation.id,
        data: { reason },
      }).unwrap();
      onSuccess();
      setReason("");
      toast.success("Delegation revoked successfully");
    } catch (error: any) {
      console.error("Failed to revoke delegation:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to revoke delegation";
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    if (!isRevoking) {
      setReason("");
      onClose();
    }
  };

  if (!delegation) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Revoke Permission Delegation</DialogTitle>
            <DialogDescription>
              This action will immediately revoke all delegated permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning Alert */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Warning: This action cannot be undone</p>
                <p className="text-sm mt-1">
                  The delegate will immediately lose access to all permissions
                  granted through this delegation.
                </p>
              </AlertDescription>
            </Alert>

            {/* Delegation Details */}
            <div className="bg-muted p-4 rounded-md space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Delegated To</p>
                <p className="font-medium">
                  {delegation.delegate?.dataKaryawan?.nama || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  NIP: {delegation.delegate?.nip || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Permissions</p>
                <p className="font-medium">
                  {delegation.permissions.length} permission(s)
                </p>
              </div>
            </div>

            {/* Revocation Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Revocation Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a reason for revoking this delegation..."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                This reason will be recorded in the system audit log.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isRevoking}
            >
              {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke Delegation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

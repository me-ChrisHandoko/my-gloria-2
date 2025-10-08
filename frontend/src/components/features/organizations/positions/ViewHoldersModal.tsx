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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useGetPositionHoldersQuery,
  useRemoveUserFromPositionMutation,
} from "@/store/api/positionApi";
import { Position } from "@/lib/api/services/positions.service";
import { Users, Trash2, UserPlus, Building2, Mail } from "lucide-react";
import { toast } from "sonner";

interface ViewHoldersModalProps {
  open: boolean;
  position: Position;
  onClose: () => void;
  onAssignUser: () => void;
}

export default function ViewHoldersModal({
  open,
  position,
  onClose,
  onAssignUser,
}: ViewHoldersModalProps) {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Fetch holders
  const { data: holders, isLoading, refetch } = useGetPositionHoldersQuery(
    position.id,
    {
      skip: !open,
    }
  );

  // Remove user mutation
  const [removeUser, { isLoading: isRemoving }] =
    useRemoveUserFromPositionMutation();

  const handleRemoveClick = (user: any) => {
    setSelectedUser(user);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedUser) return;

    try {
      await removeUser({
        positionId: position.id,
        userId: selectedUser.id,
      }).unwrap();

      toast.success(`${selectedUser.name} removed from position`);
      setRemoveDialogOpen(false);
      setSelectedUser(null);
      refetch();
    } catch (error: any) {
      console.error("Failed to remove user:", error);
      toast.error(error?.data?.message || "Failed to remove user");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Position Holders
            </DialogTitle>
            <DialogDescription>
              Users currently assigned to <strong>{position.name}</strong> ({position.code})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add User Button */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {holders?.length || 0} user{holders?.length !== 1 ? "s" : ""} assigned
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onAssignUser}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Assign User
              </Button>
            </div>

            {/* Holders List */}
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : holders && holders.length > 0 ? (
              <div className="space-y-3">
                {holders.map((user: any) => (
                  <Card key={user.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Name and Email */}
                          <div>
                            <p className="font-medium">
                              {user.name || `${user.firstName} ${user.lastName}`}
                            </p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>

                          {/* Department and School */}
                          <div className="flex flex-wrap gap-2 text-sm">
                            {user.department && (
                              <Badge variant="outline" className="gap-1">
                                <Building2 className="h-3 w-3" />
                                {user.department.name}
                              </Badge>
                            )}
                            {user.school && (
                              <Badge variant="outline">{user.school.name}</Badge>
                            )}
                          </div>
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClick(user)}
                          className="gap-1 text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Remove</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No users assigned</p>
                <p className="text-sm mt-1">
                  Click "Assign User" to add users to this position
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{selectedUser?.name || selectedUser?.firstName}</strong> from{" "}
              <strong>{position.name}</strong>? This action can be undone by reassigning
              the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

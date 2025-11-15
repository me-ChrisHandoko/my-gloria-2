"use client";

import React, { useState, useEffect } from "react";
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
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGetUsersQuery } from "@/store/api/userApi";
import { useGetOrganizationsQuery } from "@/store/api/organizationApi";
import { useGetDepartmentsQuery } from "@/store/api/departmentApi";
import { useAssignUserToPositionMutation } from "@/store/api/positionApi";
import { Position } from "@/lib/api/services/positions.service";
import { UserPlus, AlertCircle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logRTKError } from "@/lib/utils/errorLogger";

interface AssignUserModalProps {
  open: boolean;
  position: Position;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignUserModal({
  open,
  position,
  onClose,
  onSuccess,
}: AssignUserModalProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  // Fetch schools
  const { data: organizationsData } = useGetOrganizationsQuery({ limit: 100 });
  const schools = organizationsData?.data || [];

  // Fetch departments based on selected school
  const { data: departmentsData } = useGetDepartmentsQuery(
    {
      schoolId: schoolFilter === "all" ? undefined : schoolFilter,
      limit: 100,
      isActive: true,
    },
    {
      skip: schoolFilter === "all",
    }
  );
  const departments = departmentsData?.data || [];

  // Fetch users based on filters
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery(
    {
      limit: 100,
      // Add filters if backend supports them
      ...(schoolFilter !== "all" && { schoolId: schoolFilter }),
      ...(departmentFilter !== "all" && { departmentId: departmentFilter }),
    },
    {
      skip: !open,
    }
  );

  const users = usersData?.data || [];

  // Assign user mutation
  const [assignUser, { isLoading: isAssigning }] =
    useAssignUserToPositionMutation();

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedUserId("");
      setSchoolFilter("all");
      setDepartmentFilter("all");
    }
  }, [open]);

  // Reset department filter when school changes
  useEffect(() => {
    setDepartmentFilter("all");
  }, [schoolFilter]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    try {
      await assignUser({
        positionId: position.id,
        userId: selectedUserId,
      }).unwrap();

      toast.success(`User assigned to ${position.name} successfully`);
      onSuccess();
    } catch (error: any) {
      logRTKError("Failed to assign user", error);
      toast.error(error?.data?.message || "Failed to assign user");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign User to Position
            </DialogTitle>
            <DialogDescription>
              Assign a user to <strong>{position.name}</strong> ({position.code})
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Filters Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filter Users (Optional)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* School Filter */}
                <div className="grid gap-2">
                  <Label htmlFor="school-filter" className="text-xs text-muted-foreground">
                    By School
                  </Label>
                  <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                    <SelectTrigger id="school-filter">
                      <SelectValue placeholder="All Schools" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schools</SelectItem>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Filter */}
                <div className="grid gap-2">
                  <Label htmlFor="department-filter" className="text-xs text-muted-foreground">
                    By Department
                  </Label>
                  <Select
                    value={departmentFilter}
                    onValueChange={setDepartmentFilter}
                    disabled={schoolFilter === "all"}
                  >
                    <SelectTrigger id="department-filter">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* User Selection */}
            <div className="grid gap-2">
              <Label htmlFor="user">
                Select User <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={users.map((user) => ({
                  value: user.id,
                  label: `${user.firstName || ""} ${user.lastName || ""} (${user.email})`,
                }))}
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                placeholder="Select a user"
                searchPlaceholder="Search users..."
                emptyMessage={
                  isLoadingUsers ? "Loading users..." : "No users found"
                }
                disabled={isLoadingUsers}
              />
              <p className="text-xs text-muted-foreground">
                {users.length} user{users.length !== 1 ? "s" : ""} available
              </p>
            </div>

            {/* Selected User Info */}
            {selectedUser && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <p className="text-sm">{selectedUser.email}</p>
                    {selectedUser.currentPosition && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <p className="font-medium text-amber-600 dark:text-amber-500">
                          Current Position: {selectedUser.currentPosition}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigning to a new position may affect existing assignments
                        </p>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Warning */}
            <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                Users can be assigned to multiple positions. Make sure this is the
                correct assignment.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAssigning || !selectedUserId}>
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

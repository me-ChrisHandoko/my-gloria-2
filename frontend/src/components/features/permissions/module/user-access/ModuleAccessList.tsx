"use client";

import React, { useState, useEffect } from "react";
import { Plus, ArrowLeft, Shield, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { createModuleAccessColumns } from "./ModuleAccessColumns";
import CreateModuleAccessModal from "./CreateModuleAccessModal";
import EditModuleAccessModal from "./EditModuleAccessModal";
import ViewModuleAccessModal from "./ViewModuleAccessModal";
import DeleteModuleAccessModal from "./DeleteModuleAccessModal";
import { type UserModuleAccess } from "@/lib/api/services/module-access.service";
import { useGetUserModuleAccessQuery } from "@/store/api/moduleAccessApi";
import { useGetUsersQuery } from "@/store/api/userApi";

export default function ModuleAccessList() {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<UserModuleAccess | null>(null);

  // Fetch users for filter
  const {
    data: usersData,
    isLoading: isLoadingUsers,
  } = useGetUsersQuery({
    page: 1,
    limit: 100,
  });

  // Fetch module access by user
  const {
    data: accessList,
    isLoading: isLoadingAccess,
    isFetching,
    error: accessError,
    refetch: refetchAccess,
  } = useGetUserModuleAccessQuery(selectedUserId, {
    skip: selectedUserId === "all",
  });

  const usersList = usersData?.data || [];

  // Handle RTK Query errors
  useEffect(() => {
    if (accessError) {
      console.error("Failed to fetch module access:", accessError);
      toast.error("Failed to load user module access");
    }
  }, [accessError]);

  // Handle actions
  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleEdit = (access: UserModuleAccess) => {
    setSelectedAccess(access);
    setEditModalOpen(true);
  };

  const handleRevoke = (access: UserModuleAccess) => {
    setSelectedAccess(access);
    setDeleteModalOpen(true);
  };

  const handleView = (access: UserModuleAccess) => {
    setSelectedAccess(access);
    setViewModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    refetchAccess();
    toast.success("Module access granted successfully");
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedAccess(null);
    refetchAccess();
    toast.success("Module access updated successfully");
  };

  const handleRevokeSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedAccess(null);
    refetchAccess();
    toast.success("Module access revoked successfully");
  };

  // Create columns with action handlers
  const columns = createModuleAccessColumns({
    onView: handleView,
    onEdit: handleEdit,
    onRevoke: handleRevoke,
  });

  if (isLoadingUsers) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UserCircle className="h-6 w-6" />
            User Module Access
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Grant and manage user access to modules with custom permissions
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Grant Access
        </Button>
      </div>

      <Card>
        <CardContent>
          {/* User Filter */}
          <div className="mt-6 mb-6 flex items-center gap-2">
            <label className="text-sm font-medium">Select User:</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {usersList.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DataTable or Empty State */}
          {selectedUserId === "all" ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a User
              </h3>
              <p className="text-sm text-gray-600">
                Please select a user from the dropdown to view their module access permissions
              </p>
            </div>
          ) : isLoadingAccess ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !accessList || accessList.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Access Granted
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This user has no module access permissions yet
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Grant Access
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={accessList}
              isLoading={isFetching}
              showSearch={false}
              showPagination={false}
            />
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateModuleAccessModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedAccess && (
        <>
          <EditModuleAccessModal
            open={editModalOpen}
            access={selectedAccess}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedAccess(null);
            }}
            onSuccess={handleEditSuccess}
          />

          <DeleteModuleAccessModal
            open={deleteModalOpen}
            access={selectedAccess}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedAccess(null);
            }}
            onSuccess={handleRevokeSuccess}
          />

          <ViewModuleAccessModal
            open={viewModalOpen}
            access={selectedAccess}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedAccess(null);
            }}
            onEdit={handleEdit}
            onRevoke={handleRevoke}
          />
        </>
      )}
    </div>
  );
}

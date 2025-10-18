"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import CreatePermissionModal from "./CreatePermissionModal";
import EditPermissionModal from "./EditPermissionModal";
import DeletePermissionModal from "./DeletePermissionModal";
import ViewPermissionModal from "./ViewPermissionModal";
import { createPermissionColumns } from "./PermissionColumns";
import { type Permission, type PermissionAction } from "@/lib/api/services/permissions.service";
import { useGetPermissionsQuery } from "@/store/api/permissionApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";

const PERMISSION_ACTIONS: PermissionAction[] = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE',
  'EXPORT', 'IMPORT', 'PRINT', 'ASSIGN', 'CLOSE'
];

export default function PermissionList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const itemsPerPage = 10;

  // Fetch permissions using RTK Query
  const {
    data: permissionsData,
    isLoading: isLoadingPermissions,
    isFetching,
    error: permissionsError,
    refetch: refetchPermissions,
  } = useGetPermissionsQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      action: actionFilter === "all" ? undefined : (actionFilter as PermissionAction),
      isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "active",
    },
    {
      skip: searchTerm !== debouncedSearchTerm,
    }
  );

  const permissions = permissionsData?.data || [];
  const totalItems = permissionsData?.meta?.total || 0;

  // Handle RTK Query errors
  useEffect(() => {
    if (permissionsError) {
      console.error("Failed to fetch permissions:", permissionsError);
      toast.error("Failed to load permissions");
    }
  }, [permissionsError]);

  // Handle actions
  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleEdit = (permission: Permission) => {
    setSelectedPermission(permission);
    setEditModalOpen(true);
  };

  const handleDelete = (permission: Permission) => {
    setSelectedPermission(permission);
    setDeleteModalOpen(true);
  };

  const handleView = (permission: Permission) => {
    setSelectedPermission(permission);
    setViewModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    refetchPermissions();
    toast.success("Permission created successfully");
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedPermission(null);
    refetchPermissions();
    toast.success("Permission updated successfully");
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedPermission(null);
    refetchPermissions();
    toast.success("Permission deleted successfully");
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, actionFilter, isActiveFilter]);

  // Create columns with action handlers
  const columns = createPermissionColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  if (isLoadingPermissions && permissions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Permissions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage system permissions and access control
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Permission
          </button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mt-6 mb-6 flex flex-wrap gap-4">
            <Input
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {PERMISSION_ACTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DataTable */}
          <DataTable
            columns={columns}
            data={permissions}
            isLoading={isFetching}
            showSearch={false}
            showPagination={true}
            pagination={{
              page: currentPage,
              pageSize: itemsPerPage,
              total: totalItems,
              onPageChange: setCurrentPage,
              onPageSizeChange: () => {},
            }}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <CreatePermissionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedPermission && (
        <>
          <EditPermissionModal
            open={editModalOpen}
            permission={selectedPermission}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedPermission(null);
            }}
            onSuccess={handleEditSuccess}
          />

          <DeletePermissionModal
            open={deleteModalOpen}
            permission={selectedPermission}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedPermission(null);
            }}
            onSuccess={handleDeleteSuccess}
          />

          <ViewPermissionModal
            open={viewModalOpen}
            permission={selectedPermission}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedPermission(null);
            }}
          />
        </>
      )}
    </div>
  );
}

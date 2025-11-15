"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useGetPermissionsQuery } from "@/store/api/permissionApi";
import { createPermissionColumns } from "./PermissionColumns";
import PermissionForm from "./PermissionForm";
import DeletePermissionDialog from "./DeletePermissionDialog";
import type { Permission } from "@/lib/api/services/permissions.service";
import { logRTKError } from "@/lib/utils/errorLogger";

export default function PermissionList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const itemsPerPage = 10;

  // Fetch permissions using RTK Query
  const {
    data: permissionsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetPermissionsQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      action: actionFilter === "all" ? undefined : (actionFilter as any),
      isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "active",
    },
    {
      skip: searchTerm !== debouncedSearchTerm,
    }
  );

  const permissions = permissionsData?.data || [];
  const totalItems = permissionsData?.total || 0;

  // Handle errors
  useEffect(() => {
    if (error) {
      logRTKError("Failed to fetch permissions", error);
      toast.error("Failed to load permissions");
    }
  }, [error]);

  // Action handlers
  const handleCreate = () => {
    setSelectedPermission(null);
    setFormOpen(true);
  };

  const handleEdit = (permission: Permission) => {
    setSelectedPermission(permission);
    setFormOpen(true);
  };

  const handleDelete = (permission: Permission) => {
    setSelectedPermission(permission);
    setDeleteDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelectedPermission(null);
    refetch();
    toast.success(
      selectedPermission ? "Permission updated successfully" : "Permission created successfully"
    );
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    setSelectedPermission(null);
    refetch();
    toast.success("Permission deleted successfully");
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, actionFilter, isActiveFilter]);

  // Create columns with action handlers
  const columns = createPermissionColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  if (isLoading && permissions.length === 0) {
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                Manage system permissions and access controls
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Permission
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="READ">Read</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="EXPORT">Export</SelectItem>
                <SelectItem value="IMPORT">Import</SelectItem>
                <SelectItem value="PRINT">Print</SelectItem>
                <SelectItem value="ASSIGN">Assign</SelectItem>
                <SelectItem value="CLOSE">Close</SelectItem>
              </SelectContent>
            </Select>
            <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Table */}
          <DataTable
            columns={columns}
            data={permissions}
            pagination={{
              page: currentPage,
              pageSize: itemsPerPage,
              total: totalItems,
              onPageChange: setCurrentPage,
              onPageSizeChange: () => {},
            }}
            isLoading={isFetching}
            showSearch={false}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      {formOpen && (
        <PermissionForm
          open={formOpen}
          permission={selectedPermission}
          onClose={() => {
            setFormOpen(false);
            setSelectedPermission(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {deleteDialogOpen && selectedPermission && (
        <DeletePermissionDialog
          open={deleteDialogOpen}
          permission={selectedPermission}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedPermission(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}

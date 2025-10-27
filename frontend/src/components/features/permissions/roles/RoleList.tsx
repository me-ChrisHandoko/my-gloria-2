"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookTemplate } from "lucide-react";
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
import CreateRoleModal from "./CreateRoleModal";
import EditRoleModal from "./EditRoleModal";
import DeleteRoleModal from "./DeleteRoleModal";
import { createRoleColumns } from "./RoleColumns";
import { Role } from "@/lib/api/services/roles.service";
import { useGetRolesQuery } from "@/store/api/rolesApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoleList() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Increased debounce delay to reduce API call frequency and prevent rate limiting
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const itemsPerPage = 10;

  // Fetch roles using RTK Query with Redis caching and rate limiting (20 req/10s)
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
    isFetching,
    error: rolesError,
    refetch: refetchRoles,
  } = useGetRolesQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      // Use isActive for explicit filtering
      ...(isActiveFilter === "all"
        ? { includeInactive: true }
        : { isActive: isActiveFilter === "active" }),
    },
    {
      // Skip query if search term is still being debounced
      skip: searchTerm !== debouncedSearchTerm,
    }
  );

  const roles = rolesData?.data || [];
  const totalItems = rolesData?.total || 0;

  // Handle RTK Query errors
  useEffect(() => {
    if (rolesError) {
      console.error("Failed to fetch roles:", rolesError);
      toast.error("Failed to load roles");
    }
  }, [rolesError]);

  // Handle actions
  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setEditModalOpen(true);
  };

  const handleDelete = (role: Role) => {
    setSelectedRole(role);
    setDeleteModalOpen(true);
  };

  const handleView = (role: Role) => {
    // Navigate to role detail page instead of opening modal
    router.push(`/permissions/roles/${role.id}`);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    refetchRoles();
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedRole(null);
    refetchRoles();
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedRole(null);
    refetchRoles();
  };

  // Reset page when filters change
  // Use debounced search term to prevent premature page resets during typing
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, isActiveFilter]);

  // Create columns with action handlers
  const columns = createRoleColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  if (isLoadingRoles && roles.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Roles
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage user roles and permissions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/permissions/roles/templates')}
          >
            <BookTemplate className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mt-6 mb-6 flex flex-wrap gap-4">
            <Input
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
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
            data={roles}
            isLoading={isFetching}
            showSearch={false} // We're using custom search above
            showPagination={true}
            pagination={{
              page: currentPage,
              pageSize: itemsPerPage,
              total: totalItems,
              onPageChange: setCurrentPage,
              onPageSizeChange: () => {}, // Keep pageSize fixed for now
            }}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateRoleModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedRole && (
        <>
          <EditRoleModal
            open={editModalOpen}
            role={selectedRole}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedRole(null);
            }}
            onSuccess={handleEditSuccess}
          />

          <DeleteRoleModal
            open={deleteModalOpen}
            role={selectedRole}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedRole(null);
            }}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </div>
  );
}

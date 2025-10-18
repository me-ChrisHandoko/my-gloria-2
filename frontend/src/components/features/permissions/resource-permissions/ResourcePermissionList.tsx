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
} from "@/components/ui/card";
import { toast } from "sonner";
import GrantPermissionModal from "./GrantPermissionModal";
import ViewResourcePermissionModal from "./ViewResourcePermissionModal";
import RevokePermissionModal from "./RevokePermissionModal";
import { createResourcePermissionColumns } from "./ResourcePermissionColumns";
import { type ResourcePermission, RESOURCE_TYPES } from "@/lib/api/services/resource-permissions.service";
import { useGetUserResourcePermissionsQuery } from "@/store/api/resourcePermissionApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResourcePermissionList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [userIdFilter, setUserIdFilter] = useState<string>(""); // In real app, get from user selector

  // Modal states
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<ResourcePermission | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const itemsPerPage = 10;

  // Note: This is a simplified query - in production you'd want a more flexible endpoint
  // For now, we'll use mock data or extend the backend to support full querying
  const {
    data: permissionsData,
    isLoading: isLoadingPermissions,
    isFetching,
    error: permissionsError,
    refetch: refetchPermissions,
  } = useGetUserResourcePermissionsQuery(
    {
      userProfileId: userIdFilter || "all", // This needs backend support for "all"
      resourceType: resourceTypeFilter === "all" ? undefined : resourceTypeFilter,
      page: currentPage,
      limit: itemsPerPage,
    },
    {
      skip: !userIdFilter || searchTerm !== debouncedSearchTerm,
    }
  );

  const permissions = permissionsData?.data || [];
  const totalItems = permissionsData?.meta?.total || 0;

  useEffect(() => {
    if (permissionsError) {
      console.error("Failed to fetch permissions:", permissionsError);
      toast.error("Failed to load resource permissions");
    }
  }, [permissionsError]);

  // Handle actions
  const handleGrant = () => {
    setGrantModalOpen(true);
  };

  const handleView = (permission: ResourcePermission) => {
    setSelectedPermission(permission);
    setViewModalOpen(true);
  };

  const handleRevoke = (permission: ResourcePermission) => {
    setSelectedPermission(permission);
    setRevokeModalOpen(true);
  };

  const handleGrantSuccess = () => {
    setGrantModalOpen(false);
    refetchPermissions();
  };

  const handleRevokeSuccess = () => {
    setRevokeModalOpen(false);
    setSelectedPermission(null);
    refetchPermissions();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, resourceTypeFilter, statusFilter]);

  const columns = createResourcePermissionColumns({
    onView: handleView,
    onRevoke: handleRevoke,
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
            Resource Permissions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage resource-specific permissions for users
          </p>
        </div>
        <Button onClick={handleGrant}>
          <Plus className="h-4 w-4 mr-2" />
          Grant Permission
        </Button>
      </div>

      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mt-6 mb-6 flex flex-wrap gap-4">
            <Input
              placeholder="Search by user or resource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="User ID (for filtering)"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Note about backend limitation */}
          {!userIdFilter && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ℹ️ Please enter a User ID to view permissions. The current backend API requires a specific user ID.
              </p>
            </div>
          )}

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
      <GrantPermissionModal
        open={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        onSuccess={handleGrantSuccess}
      />

      {selectedPermission && (
        <>
          <ViewResourcePermissionModal
            open={viewModalOpen}
            permission={selectedPermission}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedPermission(null);
            }}
          />

          <RevokePermissionModal
            open={revokeModalOpen}
            permission={selectedPermission}
            onClose={() => {
              setRevokeModalOpen(false);
              setSelectedPermission(null);
            }}
            onSuccess={handleRevokeSuccess}
          />
        </>
      )}
    </div>
  );
}

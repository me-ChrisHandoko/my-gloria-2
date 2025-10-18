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
import { createModuleAccessColumns } from "./ModuleAccessColumns";
import CreateModuleAccessModal from "./CreateModuleAccessModal";
import EditModuleAccessModal from "./EditModuleAccessModal";
import ViewModuleAccessModal from "./ViewModuleAccessModal";
import DeleteModuleAccessModal from "./DeleteModuleAccessModal";
import { type UserModuleAccess, ModuleCategory } from "@/lib/api/services/module-access.service";
import { useGetModuleAccessListQuery } from "@/store/api/moduleAccessApi";

export default function ModuleAccessList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<UserModuleAccess | null>(null);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 800);

  // Fetch module access list using RTK Query
  const {
    data: accessData,
    isLoading: isLoadingAccess,
    isFetching,
    error: accessError,
    refetch: refetchAccess,
  } = useGetModuleAccessListQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "active",
      category: categoryFilter === "all" ? undefined : (categoryFilter as ModuleCategory),
      includeModule: true,
      includeUser: true,
      includeGrantedBy: true,
    },
    {
      skip: searchTerm !== debouncedSearchTerm,
    }
  );

  const accessList = accessData?.data || [];
  const totalItems = accessData?.total || 0;

  // Handle RTK Query errors
  useEffect(() => {
    if (accessError) {
      console.error("Failed to fetch module access:", accessError);
      toast.error("Failed to load module access records");
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, isActiveFilter, categoryFilter]);

  // Create columns with action handlers
  const columns = createModuleAccessColumns({
    onView: handleView,
    onEdit: handleEdit,
    onRevoke: handleRevoke,
  });

  if (isLoadingAccess && accessList.length === 0) {
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
            Module Access Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Grant and manage user access to modules with custom permissions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Grant Access
          </button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mt-6 mb-6 flex flex-wrap gap-4">
            <Input
              placeholder="Search by user or module..."
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

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value={ModuleCategory.SERVICE}>Service</SelectItem>
                <SelectItem value={ModuleCategory.PERFORMANCE}>Performance</SelectItem>
                <SelectItem value={ModuleCategory.QUALITY}>Quality</SelectItem>
                <SelectItem value={ModuleCategory.FEEDBACK}>Feedback</SelectItem>
                <SelectItem value={ModuleCategory.TRAINING}>Training</SelectItem>
                <SelectItem value={ModuleCategory.SYSTEM}>System</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || isActiveFilter !== "all" || categoryFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setIsActiveFilter("all");
                  setCategoryFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* DataTable */}
          <DataTable
            columns={columns}
            data={accessList}
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

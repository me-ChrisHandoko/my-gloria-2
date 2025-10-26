"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { createModuleColumns } from "./ModuleColumns";
import CreateModuleModal from "./CreateModuleModal";
import EditModuleModal from "./EditModuleModal";
import ViewModuleModal from "./ViewModuleModal";
import DeleteModuleModal from "./DeleteModuleModal";
import {
  type Module,
  ModuleCategory,
} from "@/lib/api/services/modules.service";
import { useGetModulesQuery } from "@/store/api/modulesApi";

export default function ModuleList() {
  const router = useRouter();
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
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 800);

  // Fetch modules using RTK Query
  const {
    data: modulesData,
    isLoading: isLoadingModules,
    isFetching,
    error: modulesError,
    refetch: refetchModules,
  } = useGetModulesQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      isActive:
        isActiveFilter === "all" ? undefined : isActiveFilter === "active",
      category:
        categoryFilter === "all"
          ? undefined
          : (categoryFilter as ModuleCategory),
    },
    {
      skip: searchTerm !== debouncedSearchTerm,
    }
  );

  const modulesList = modulesData?.data || [];
  const totalItems = modulesData?.total || 0;

  // Handle RTK Query errors
  useEffect(() => {
    if (modulesError) {
      console.error("Failed to fetch modules:", modulesError);
      toast.error("Failed to load modules");
    }
  }, [modulesError]);

  // Handle actions
  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleEdit = (module: Module) => {
    setSelectedModule(module);
    setEditModalOpen(true);
  };

  const handleDelete = (module: Module) => {
    setSelectedModule(module);
    setDeleteModalOpen(true);
  };

  const handleView = (module: Module) => {
    setSelectedModule(module);
    setViewModalOpen(true);
  };

  const handleViewPermissions = (module: Module) => {
    router.push(`/permissions/module/${module.id}/permissions`);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    refetchModules();
    toast.success("Module created successfully");
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedModule(null);
    refetchModules();
    toast.success("Module updated successfully");
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedModule(null);
    refetchModules();
    toast.success("Module deleted successfully");
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, isActiveFilter, categoryFilter]);

  // Create columns with action handlers
  const columns = createModuleColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onViewPermissions: handleViewPermissions,
  });

  if (isLoadingModules && modulesList.length === 0) {
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
            Module Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage system modules and their configurations
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Module
          </button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mt-6 mb-6 flex flex-wrap gap-4">
            <Input
              placeholder="Search modules..."
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
                <SelectItem value={ModuleCategory.PERFORMANCE}>
                  Performance
                </SelectItem>
                <SelectItem value={ModuleCategory.QUALITY}>Quality</SelectItem>
                <SelectItem value={ModuleCategory.FEEDBACK}>
                  Feedback
                </SelectItem>
                <SelectItem value={ModuleCategory.TRAINING}>
                  Training
                </SelectItem>
                <SelectItem value={ModuleCategory.SYSTEM}>System</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm ||
              isActiveFilter !== "all" ||
              categoryFilter !== "all") && (
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
          <div className="w-full overflow-auto">
            <DataTable
              columns={columns}
              data={modulesList}
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
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateModuleModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedModule && (
        <>
          <EditModuleModal
            open={editModalOpen}
            module={selectedModule}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedModule(null);
            }}
            onSuccess={handleEditSuccess}
          />

          <DeleteModuleModal
            open={deleteModalOpen}
            module={selectedModule}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedModule(null);
            }}
            onSuccess={handleDeleteSuccess}
          />

          <ViewModuleModal
            open={viewModalOpen}
            module={selectedModule}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedModule(null);
            }}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}

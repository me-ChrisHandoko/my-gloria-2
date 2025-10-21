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
import CreateDepartmentModal from "./CreateDepartmentModal";
import EditDepartmentModal from "./EditDepartmentModal";
import DeleteDepartmentModal from "./DeleteDepartmentModal";
import ViewDepartmentModal from "./ViewDepartmentModal";
import { createDepartmentColumns } from "./DepartmentColumns";
import { type Department } from "@/lib/api/services/departments.service";
import { useGetDepartmentsQuery } from "@/store/api/departmentApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";

export default function DepartmentList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showNestedData, setShowNestedData] = useState(false);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);

  // Increased debounce delay to reduce API call frequency and prevent rate limiting
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const itemsPerPage = 10;

  // Fetch departments using RTK Query
  // Skip query execution while debouncing to prevent premature API calls
  const {
    data: departmentsData,
    isLoading: isLoadingDepartments,
    isFetching,
    error: departmentsError,
    refetch: refetchDepartments,
  } = useGetDepartmentsQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      isActive:
        isActiveFilter === "all" ? undefined : isActiveFilter === "active",
      // Lazy load nested data only when needed (reduces payload size by ~40%)
      includeSchool: showNestedData,
      includeParent: showNestedData,
    },
    {
      // Skip query if search term is still being debounced
      skip: searchTerm !== debouncedSearchTerm,
    }
  );

  const departments = departmentsData?.data || [];
  const totalItems = departmentsData?.total || 0;

  // Handle RTK Query errors
  useEffect(() => {
    if (departmentsError) {
      console.error("Failed to fetch departments:", departmentsError);
      toast.error("Failed to load departments");
    }
  }, [departmentsError]);

  // Handle actions
  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setEditModalOpen(true);
  };

  const handleDelete = (department: Department) => {
    setSelectedDepartment(department);
    setDeleteModalOpen(true);
  };

  const handleView = (department: Department) => {
    setSelectedDepartment(department);
    setViewModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    refetchDepartments();
    toast.success("Department created successfully");
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedDepartment(null);
    refetchDepartments();
    toast.success("Department updated successfully");
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedDepartment(null);
    refetchDepartments();
    toast.success("Department deleted successfully");
  };

  // Reset page when filters change
  // Use debounced search term to prevent premature page resets during typing
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, isActiveFilter]);

  // Create columns with action handlers
  const columns = createDepartmentColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  if (isLoadingDepartments && departments.length === 0) {
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
            Departments
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage organizational departments and hierarchy
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </button>
        </div>
      </div>
      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mt-6 mb-6 flex flex-wrap gap-4">
            <Input
              placeholder="Search departments..."
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
            data={departments}
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
      <CreateDepartmentModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedDepartment && (
        <>
          <EditDepartmentModal
            open={editModalOpen}
            department={selectedDepartment}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedDepartment(null);
            }}
            onSuccess={handleEditSuccess}
          />

          <DeleteDepartmentModal
            open={deleteModalOpen}
            department={selectedDepartment}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedDepartment(null);
            }}
            onSuccess={handleDeleteSuccess}
          />

          <ViewDepartmentModal
            open={viewModalOpen}
            department={selectedDepartment}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedDepartment(null);
            }}
          />
        </>
      )}
    </div>
  );
}

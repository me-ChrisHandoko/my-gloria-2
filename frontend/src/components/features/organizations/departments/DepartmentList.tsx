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
import { logRTKError } from "@/lib/utils/errorLogger";

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
      logRTKError("Failed to fetch departments", departmentsError);
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                Manage organizational departments and hierarchy
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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

          {/* DataTable */}
          <DataTable
            columns={columns}
            data={departments}
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
    </>
  );
}

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Plus, Building2 } from "lucide-react";
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
import DepartmentHierarchyModal from "./DepartmentHierarchyModal";
import { createDepartmentColumns } from "./DepartmentColumns";
import { type Department } from "@/lib/api/services/departments.service";
import { useGetDepartmentsQuery } from "@/store/api/departmentApi";
import { useGetOrganizationsQuery } from "@/store/api/organizationApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";

export default function DepartmentList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [hierarchyModalOpen, setHierarchyModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [selectedSchoolForHierarchy, setSelectedSchoolForHierarchy] =
    useState<string>("");

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const itemsPerPage = 10;

  // RTK Query hooks
  const { data: organizationsData, isLoading: isLoadingOrganizations } =
    useGetOrganizationsQuery({ limit: 100 });

  const schools = organizationsData?.data || [];

  // Fetch departments using RTK Query
  const {
    data: departmentsData,
    isLoading: isLoadingDepartments,
    isFetching,
    error: departmentsError,
    refetch: refetchDepartments,
  } = useGetDepartmentsQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm,
    schoolId: selectedSchool === "all" ? undefined : selectedSchool,
    isActive:
      isActiveFilter === "all" ? undefined : isActiveFilter === "active",
    includeSchool: true,
    includeParent: true,
  });

  const departments = departmentsData?.data || [];
  const totalPages =
    departmentsData?.meta?.totalPages || departmentsData?.totalPages || 1;
  const totalItems =
    departmentsData?.meta?.total || departmentsData?.total || 0;

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

  const handleViewHierarchy = (schoolId: string) => {
    setSelectedSchoolForHierarchy(schoolId);
    setHierarchyModalOpen(true);
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
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedSchool, isActiveFilter]);

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
              <CardTitle className="text-2xl font-bold">Departments</CardTitle>
              <CardDescription>
                Manage organizational departments and hierarchy
              </CardDescription>
            </div>
            <Button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <Input
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-[200px]">
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
            {selectedSchool && selectedSchool !== "all" && (
              <Button
                variant="outline"
                onClick={() => handleViewHierarchy(selectedSchool)}
                className="gap-2"
              >
                <Building2 className="h-4 w-4" />
                View Hierarchy
              </Button>
            )}
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

      {selectedSchoolForHierarchy && (
        <DepartmentHierarchyModal
          open={hierarchyModalOpen}
          schoolId={selectedSchoolForHierarchy}
          onClose={() => {
            setHierarchyModalOpen(false);
            setSelectedSchoolForHierarchy("");
          }}
        />
      )}
    </>
  );
}

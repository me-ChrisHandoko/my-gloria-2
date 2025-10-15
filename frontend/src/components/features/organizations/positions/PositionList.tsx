"use client";

import React, { useState, useEffect } from "react";
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
} from "@/components/ui/card";
import { toast } from "sonner";
import { createPositionColumns } from "./PositionColumns";
import { type Position } from "@/types";
import { useGetPositionsQuery } from "@/store/api/positionApi";
import { useGetOrganizationsQuery } from "@/store/api/organizationApi";
import { useGetDepartmentsQuery } from "@/store/api/departmentApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";
import CreatePositionModal from "./CreatePositionModal";
import EditPositionModal from "./EditPositionModal";
import ViewPositionModal from "./ViewPositionModal";
import DeletePositionModal from "./DeletePositionModal";
import PositionHierarchyModal from "./PositionHierarchyModal";
import ViewHoldersModal from "./ViewHoldersModal";
import ManagePermissionsModal from "./ManagePermissionsModal";
import AssignUserModal from "./AssignUserModal";

export default function PositionList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [hierarchyLevelFilter, setHierarchyLevelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [holdersModalOpen, setHoldersModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [hierarchyModalOpen, setHierarchyModalOpen] = useState(false);
  const [assignUserModalOpen, setAssignUserModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedSchoolForHierarchy, setSelectedSchoolForHierarchy] = useState<string>("");

  // Increased debounce delay to reduce API call frequency and prevent rate limiting
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const itemsPerPage = 10;

  // RTK Query hooks
  const { data: organizationsData, isLoading: isLoadingOrganizations } =
    useGetOrganizationsQuery({ limit: 100 });

  const schools = organizationsData?.data || [];

  // Fetch departments based on selected school
  const {
    data: departmentsData,
    isLoading: isLoadingDepartments,
  } = useGetDepartmentsQuery(
    {
      schoolId: selectedSchool === "all" ? undefined : selectedSchool,
      limit: 100,
      isActive: true,
    },
    {
      skip: selectedSchool === "all",
    }
  );

  const departments = departmentsData?.data || [];

  // Fetch positions using RTK Query
  // Skip query execution while debouncing to prevent premature API calls
  const {
    data: positionsData,
    isLoading: isLoadingPositions,
    isFetching,
    error: positionsError,
    refetch: refetchPositions,
  } = useGetPositionsQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      schoolId: selectedSchool === "all" ? undefined : selectedSchool,
      departmentId: selectedDepartment === "all" ? undefined : selectedDepartment,
      isActive:
        isActiveFilter === "all" ? undefined : isActiveFilter === "active",
    },
    {
      // Skip query if search term is still being debounced
      skip: searchTerm !== debouncedSearchTerm,
    }
  );

  // Filter positions by hierarchy level on client-side
  // Backend response is wrapped by TransformInterceptor: { success, data: { data: [...], meta: {...} } }
  // RTK Query types expect PaginatedResponse<Position> but actual response has extra nesting
  // Cast to any to access the nested structure safely
  const responseData = positionsData as any;
  const allPositions: Position[] = responseData?.data?.data || responseData?.data || [];

  const positions = React.useMemo(() => {
    if (hierarchyLevelFilter === "all") {
      return allPositions;
    }

    // Handle range filters
    if (hierarchyLevelFilter === "1-3") {
      return allPositions.filter(
        (p: Position) => (p.hierarchyLevel || p.level || 0) >= 1 && (p.hierarchyLevel || p.level || 0) <= 3
      );
    }
    if (hierarchyLevelFilter === "4-6") {
      return allPositions.filter(
        (p: Position) => (p.hierarchyLevel || p.level || 0) >= 4 && (p.hierarchyLevel || p.level || 0) <= 6
      );
    }
    if (hierarchyLevelFilter === "7-10") {
      return allPositions.filter(
        (p: Position) => (p.hierarchyLevel || p.level || 0) >= 7 && (p.hierarchyLevel || p.level || 0) <= 10
      );
    }

    // Handle single level filter
    const levelNum = parseInt(hierarchyLevelFilter);
    if (!isNaN(levelNum)) {
      return allPositions.filter((p: Position) => (p.hierarchyLevel || p.level || 0) === levelNum);
    }

    return allPositions;
  }, [allPositions, hierarchyLevelFilter]);

  // Access meta from the nested structure: positionsData.data.meta
  const meta = responseData?.data?.meta || responseData?.meta;
  const totalPages = meta?.totalPages || 1;
  const totalItems = meta?.total || 0;

  // Handle RTK Query errors
  useEffect(() => {
    if (positionsError) {
      console.error("Failed to fetch positions:", positionsError);
      toast.error("Failed to load positions");
    }
  }, [positionsError]);

  // Reset department filter when school changes
  useEffect(() => {
    setSelectedDepartment("all");
  }, [selectedSchool]);

  // Handle actions
  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleEdit = (position: Position) => {
    setSelectedPosition(position);
    setEditModalOpen(true);
  };

  const handleDelete = (position: Position) => {
    setSelectedPosition(position);
    setDeleteModalOpen(true);
  };

  const handleView = (position: Position) => {
    setSelectedPosition(position);
    setViewModalOpen(true);
  };

  const handleViewHolders = (position: Position) => {
    setSelectedPosition(position);
    setHoldersModalOpen(true);
  };

  const handleManagePermissions = (position: Position) => {
    setSelectedPosition(position);
    setPermissionsModalOpen(true);
  };

  const handleViewHierarchy = (schoolId: string) => {
    setSelectedSchoolForHierarchy(schoolId);
    setHierarchyModalOpen(true);
  };

  const handleAssignUserSuccess = () => {
    setAssignUserModalOpen(false);
    refetchPositions();
    toast.success("User assigned successfully");
  };

  const handleHoldersSuccess = () => {
    refetchPositions();
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    refetchPositions();
    toast.success("Position created successfully");
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedPosition(null);
    refetchPositions();
    toast.success("Position updated successfully");
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedPosition(null);
    refetchPositions();
    toast.success("Position deleted successfully");
  };

  // Reset page when filters change
  // Use debounced search term to prevent premature page resets during typing
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedSchool, selectedDepartment, isActiveFilter, hierarchyLevelFilter]);

  // Create columns with action handlers
  const columns = createPositionColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onViewHolders: handleViewHolders,
    onManagePermissions: handleManagePermissions,
  });

  if (isLoadingPositions && positions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="mt-6 space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
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
            Positions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage organizational positions and assignments
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mt-6 mb-6 space-y-3">
            {/* Primary filters row */}
            <div className="flex flex-wrap gap-4">
              <Input
                placeholder="Search positions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:max-w-xs"
              />
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
                disabled={selectedSchool === "all" || isLoadingDepartments}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Secondary filters row */}
            <div className="flex flex-wrap gap-4">
              <Select value={hierarchyLevelFilter} onValueChange={setHierarchyLevelFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="1-3">Senior (1-3)</SelectItem>
                  <SelectItem value="4-6">Mid (4-6)</SelectItem>
                  <SelectItem value="7-10">Entry (7-10)</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      Level {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
                <SelectTrigger className="w-full sm:w-[130px]">
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
          </div>

          {/* DataTable */}
          <DataTable
            columns={columns}
            data={positions}
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
      <CreatePositionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedPosition && (
        <>
          <EditPositionModal
            open={editModalOpen}
            position={selectedPosition}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedPosition(null);
            }}
            onSuccess={handleEditSuccess}
          />

          <ViewPositionModal
            open={viewModalOpen}
            position={selectedPosition}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedPosition(null);
            }}
          />

          <DeletePositionModal
            open={deleteModalOpen}
            position={selectedPosition}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedPosition(null);
            }}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}

      {/* Hierarchy Modal */}
      <PositionHierarchyModal
        open={hierarchyModalOpen}
        schoolId={selectedSchoolForHierarchy}
        onClose={() => {
          setHierarchyModalOpen(false);
          setSelectedSchoolForHierarchy("");
        }}
      />

      {/* Phase 4 Modals */}
      {selectedPosition && (
        <>
          {/* View Holders Modal */}
          <ViewHoldersModal
            open={holdersModalOpen}
            position={selectedPosition}
            onClose={() => {
              setHoldersModalOpen(false);
              setSelectedPosition(null);
            }}
            onAssignUser={() => {
              setHoldersModalOpen(false);
              setAssignUserModalOpen(true);
            }}
          />

          {/* Manage Permissions Modal */}
          <ManagePermissionsModal
            open={permissionsModalOpen}
            position={selectedPosition}
            onClose={() => {
              setPermissionsModalOpen(false);
              setSelectedPosition(null);
            }}
          />

          {/* Assign User Modal */}
          <AssignUserModal
            open={assignUserModalOpen}
            position={selectedPosition}
            onClose={() => {
              setAssignUserModalOpen(false);
              setSelectedPosition(null);
            }}
            onSuccess={handleAssignUserSuccess}
          />
        </>
      )}
    </div>
  );
}

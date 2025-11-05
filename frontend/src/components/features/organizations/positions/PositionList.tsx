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
import { createPositionColumns } from "./PositionColumns";
import { type Position } from "@/types";
import { useGetPositionsQuery } from "@/store/api/positionApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";
import CreatePositionModal from "./CreatePositionModal";
import EditPositionModal from "./EditPositionModal";
import ViewPositionModal from "./ViewPositionModal";
import DeletePositionModal from "./DeletePositionModal";
import ViewHoldersModal from "./ViewHoldersModal";
import ManagePermissionsModal from "./ManagePermissionsModal";
import AssignUserModal from "./AssignUserModal";

export default function PositionList() {
  const [searchTerm, setSearchTerm] = useState("");
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
  const [assignUserModalOpen, setAssignUserModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  // Increased debounce delay to reduce API call frequency and prevent rate limiting
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const itemsPerPage = 10;

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
      isActive: isActiveFilter === "all" ? undefined : isActiveFilter,
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
  }, [debouncedSearchTerm, isActiveFilter, hierarchyLevelFilter]);

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
              <CardTitle>Positions</CardTitle>
              <CardDescription>
                Manage organizational positions and assignments
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Position
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search positions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={hierarchyLevelFilter} onValueChange={setHierarchyLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by level" />
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

          {/* Display total count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {positions.length} of {totalItems} position(s)
          </div>
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
    </>
  );
}

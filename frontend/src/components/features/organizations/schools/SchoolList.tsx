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
import { createSchoolColumns } from "./SchoolColumns";
import { type School } from "@/types";
import { useGetSchoolsQuery } from "@/store/api/schoolApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";
import CreateSchoolModal from "./CreateSchoolModal";
import EditSchoolModal from "./EditSchoolModal";
import ViewSchoolModal from "./ViewSchoolModal";
import DeleteSchoolModal from "./DeleteSchoolModal";
import { logRTKError } from "@/lib/utils/errorLogger";

export default function SchoolList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // Increased debounce delay to reduce API call frequency and prevent rate limiting
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const itemsPerPage = 10;

  // Fetch schools using RTK Query
  // Skip query execution while debouncing to prevent premature API calls
  const {
    data: schoolsData,
    isLoading: isLoadingSchools,
    isFetching,
    error: schoolsError,
    refetch: refetchSchools,
  } = useGetSchoolsQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      lokasi: selectedLocation === "all" ? undefined : selectedLocation,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    {
      // Skip query if search term is still being debounced
      skip: searchTerm !== debouncedSearchTerm,
    }
  );

  const schools = schoolsData?.data || [];
  const totalPages = schoolsData?.totalPages || 1;
  const totalItems = schoolsData?.total || schools.length;

  // Handle RTK Query errors
  useEffect(() => {
    if (schoolsError) {
      logRTKError("Failed to fetch schools", schoolsError);
      toast.error("Failed to load schools");
    }
  }, [schoolsError]);

  // Handle actions
  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleEdit = (school: School) => {
    setSelectedSchool(school);
    setEditModalOpen(true);
  };

  const handleDelete = (school: School) => {
    setSelectedSchool(school);
    setDeleteModalOpen(true);
  };

  const handleView = (school: School) => {
    setSelectedSchool(school);
    setViewModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    // Note: RTK Query automatically refetches via invalidatesTags
    toast.success("School created successfully");
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedSchool(null);
    // Note: RTK Query automatically refetches via invalidatesTags
    toast.success("School updated successfully");
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedSchool(null);
    // Note: RTK Query automatically refetches via invalidatesTags
    toast.success("School deleted successfully");
  };

  // Reset page when filters change
  // Use debounced search term to prevent premature page resets during typing
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedLocation, statusFilter]);

  // Create columns with action handlers
  const columns = createSchoolColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  if (isLoadingSchools && schools.length === 0) {
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
              <CardTitle>Schools</CardTitle>
              <CardDescription>
                Manage schools and their information
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add School
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Barat">Barat</SelectItem>
                <SelectItem value="Timur">Timur</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            data={schools}
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
      <CreateSchoolModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedSchool && (
        <>
          <EditSchoolModal
            open={editModalOpen}
            school={selectedSchool}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedSchool(null);
            }}
            onSuccess={handleEditSuccess}
          />

          <ViewSchoolModal
            open={viewModalOpen}
            school={selectedSchool}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedSchool(null);
            }}
          />

          <DeleteSchoolModal
            open={deleteModalOpen}
            school={selectedSchool}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedSchool(null);
            }}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </>
  );
}

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
import { Card, CardContent } from "@/components/ui/card";
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

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const itemsPerPage = 10;

  // Fetch schools using RTK Query
  const {
    data: schoolsData,
    isLoading: isLoadingSchools,
    isFetching,
    error: schoolsError,
    refetch: refetchSchools,
  } = useGetSchoolsQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm,
    lokasi: selectedLocation === "all" ? undefined : selectedLocation,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const schools = schoolsData?.data || [];
  const totalPages =
    schoolsData?.meta?.totalPages || schoolsData?.totalPages || 1;
  const totalItems =
    schoolsData?.meta?.total || schoolsData?.total || schools.length;

  // Handle RTK Query errors
  useEffect(() => {
    if (schoolsError) {
      console.error("Failed to fetch schools:", schoolsError);
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
            Schools
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage schools and their information
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add School
          </button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mt-6 mb-6 flex flex-wrap gap-4">
            <Input
              placeholder="Search schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Barat">Barat</SelectItem>
                <SelectItem value="Timur">Timur</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
    </div>
  );
}

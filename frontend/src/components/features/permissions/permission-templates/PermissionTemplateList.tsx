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
import CreateTemplateModal from "./CreateTemplateModal";
import ViewTemplateModal from "./ViewTemplateModal";
import DeleteTemplateModal from "./DeleteTemplateModal";
import ApplyTemplateModal from "./ApplyTemplateModal";
import { createPermissionTemplateColumns, type PermissionTemplate } from "./PermissionTemplateColumns";
import { useGetPermissionTemplatesQuery } from "@/store/api/permissionTemplateApi";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";

export default function PermissionTemplateList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const itemsPerPage = 10;

  // Fetch permission templates using RTK Query
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    isFetching,
    error: templatesError,
    refetch: refetchTemplates,
  } = useGetPermissionTemplatesQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm,
      isActive:
        isActiveFilter === "all" ? undefined : isActiveFilter === "active",
      category: categoryFilter === "all" ? undefined : categoryFilter,
    },
    {
      skip: searchTerm !== debouncedSearchTerm,
    }
  );

  const templates = templatesData?.data || [];
  const totalItems = templatesData?.meta?.total || templatesData?.total || 0;

  // Handle RTK Query errors
  useEffect(() => {
    if (templatesError) {
      console.error("Failed to fetch permission templates:", templatesError);
      toast.error("Failed to load permission templates");
    }
  }, [templatesError]);

  // Handle actions
  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleView = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    setViewModalOpen(true);
  };

  const handleApply = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    setApplyModalOpen(true);
  };

  const handleDelete = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    setDeleteModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    refetchTemplates();
    toast.success("Permission template created successfully");
  };

  const handleApplySuccess = () => {
    setApplyModalOpen(false);
    setSelectedTemplate(null);
    toast.success("Permission template applied successfully");
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    setSelectedTemplate(null);
    refetchTemplates();
    toast.success("Permission template deleted successfully");
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, isActiveFilter, categoryFilter]);

  // Create columns with action handlers
  const columns = createPermissionTemplateColumns({
    onView: handleView,
    onApply: handleApply,
    onDelete: handleDelete,
  });

  if (isLoadingTemplates && templates.length === 0) {
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
            Permission Templates
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage reusable permission templates for roles, positions, and departments
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </button>
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mt-6 mb-6 flex flex-wrap gap-4">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="ROLE_BASED">Role Based</SelectItem>
                <SelectItem value="POSITION_BASED">Position Based</SelectItem>
                <SelectItem value="DEPARTMENT_BASED">Department Based</SelectItem>
                <SelectItem value="SCHOOL_BASED">School Based</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
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
          </div>

          {/* DataTable */}
          <DataTable
            columns={columns}
            data={templates}
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
      <CreateTemplateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedTemplate && (
        <>
          <ViewTemplateModal
            open={viewModalOpen}
            template={selectedTemplate}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedTemplate(null);
            }}
          />

          <ApplyTemplateModal
            open={applyModalOpen}
            template={selectedTemplate}
            onClose={() => {
              setApplyModalOpen(false);
              setSelectedTemplate(null);
            }}
            onSuccess={handleApplySuccess}
          />

          <DeleteTemplateModal
            open={deleteModalOpen}
            template={selectedTemplate}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedTemplate(null);
            }}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </div>
  );
}

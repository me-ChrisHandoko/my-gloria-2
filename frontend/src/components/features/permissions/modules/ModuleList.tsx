"use client";

/**
 * ModuleList Component
 *
 * Data table component for displaying and managing modules with full CRUD operations.
 * Features:
 * - Server-side pagination
 * - Sorting and filtering
 * - Search functionality
 * - Category filtering
 * - Row actions (View, Edit, Delete)
 */

import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  useGetModulesQuery,
  useDeleteModuleMutation,
} from "@/store/api/modulesApi";
import type {
  Module,
  ModuleCategory,
} from "@/lib/api/services/modules.service";
import { renderIcon } from "@/lib/utils/iconRenderer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  Loader2,
  FolderTree,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ModuleForm from "./ModuleForm";
import { DeleteModuleDialog } from "./DeleteModuleDialog";
import { ViewModuleDialog } from "./ViewModuleDialog";

interface ModuleListProps {
  onModuleSelect?: (moduleId: string) => void;
}

export default function ModuleList({ onModuleSelect }: ModuleListProps) {
  // State management
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [categoryFilter, setCategoryFilter] = useState<
    ModuleCategory | undefined
  >(undefined);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(
    undefined
  );

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  // API hooks
  const { data, isLoading, isFetching, error } = useGetModulesQuery({
    page,
    limit,
    search: search || undefined,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? "desc" : "asc",
    category: categoryFilter,
    isActive: isActiveFilter,
  });

  // Handle row actions
  const handleView = (module: Module) => {
    setSelectedModule(module);
    setIsViewDialogOpen(true);
    onModuleSelect?.(module.id);
  };

  const handleEdit = (module: Module) => {
    setSelectedModule(module);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (module: Module) => {
    setSelectedModule(module);
    setIsDeleteDialogOpen(true);
  };

  // Column definitions
  const columns: ColumnDef<Module>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium">{row.getValue("code")}</span>
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {renderIcon({
            icon: row.original.icon,
            size: 18,
            className: "text-muted-foreground",
          })}
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as ModuleCategory;
        const categoryColors: Record<ModuleCategory, string> = {
          SERVICE:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
          PERFORMANCE:
            "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
          QUALITY:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          FEEDBACK:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          TRAINING:
            "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
          SYSTEM:
            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
        };

        return (
          <Badge variant="outline" className={categoryColors[category]}>
            {category}
          </Badge>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string;
        return (
          <div className="max-w-[300px] truncate text-sm text-muted-foreground">
            {description || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive");
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isVisible",
      header: "Visibility",
      cell: ({ row }) => {
        const isVisible = row.getValue("isVisible");
        return (
          <Badge variant={isVisible ? "outline" : "secondary"}>
            {isVisible ? "Visible" : "Hidden"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const module = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleView(module)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(module)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Module
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(module)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Module
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualPagination: true,
    manualSorting: true,
    pageCount: data?.totalPages || 0,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive">Error loading modules</p>
          <p className="text-sm text-muted-foreground mt-2">
            {(error as any)?.message || "Something went wrong"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Input
            placeholder="Search modules..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Category Filter */}
        <Select
          value={categoryFilter || "all"}
          onValueChange={(value) => {
            setCategoryFilter(
              value === "all" ? undefined : (value as ModuleCategory)
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="SERVICE">Service</SelectItem>
            <SelectItem value="PERFORMANCE">Performance</SelectItem>
            <SelectItem value="QUALITY">Quality</SelectItem>
            <SelectItem value="FEEDBACK">Feedback</SelectItem>
            <SelectItem value="TRAINING">Training</SelectItem>
            <SelectItem value="SYSTEM">System</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={
            isActiveFilter === undefined
              ? "all"
              : isActiveFilter
              ? "active"
              : "inactive"
          }
          onValueChange={(value) => {
            setIsActiveFilter(value === "all" ? undefined : value === "active");
            setPage(1);
          }}
        >
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

      {/* Hidden Create Dialog (now controlled from parent) */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <ModuleForm
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              toast.success("Module created successfully");
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading || isFetching ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-muted-foreground">
                      Loading modules...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <FolderTree className="h-8 w-8" />
                    <p>No modules found</p>
                    <p className="text-sm">
                      Try adjusting your search or filters
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {data?.data.length || 0} of {data?.total || 0} modules
          </span>
          <span>•</span>
          <Select
            value={limit.toString()}
            onValueChange={(value) => {
              setLimit(parseInt(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {data?.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={page >= (data?.totalPages || 1) || isLoading}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedModule && (
            <ModuleForm
              moduleId={selectedModule.id}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedModule(null);
                toast.success("Module updated successfully");
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedModule(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {selectedModule && (
        <ViewModuleDialog
          module={selectedModule}
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
        />
      )}

      {/* Delete Dialog */}
      {selectedModule && (
        <DeleteModuleDialog
          module={selectedModule}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onSuccess={() => {
            setIsDeleteDialogOpen(false);
            setSelectedModule(null);
            toast.success("Module deleted successfully");
          }}
        />
      )}
    </div>
  );
}

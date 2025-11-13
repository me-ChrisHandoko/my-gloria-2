"use client";

/**
 * RoleList Component
 *
 * Data table component for displaying and managing roles with full CRUD operations.
 * Features:
 * - Server-side pagination
 * - Sorting and filtering
 * - Search functionality
 * - Bulk actions
 * - Row actions (View, Edit, Delete)
 */

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  useGetRolesQuery,
  useDeleteRoleMutation,
} from '@/store/api/rolesApi';
import type { Role } from '@/types/permissions/role.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Search,
  ArrowUpDown,
  Shield,
  Users,
  Key,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import RoleForm from './RoleForm';
import DeleteRoleDialog from './DeleteRoleDialog';
import RoleDetailTabs from './RoleDetailTabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoleListProps {
  onRoleSelect?: (roleId: string) => void;
}

export default function RoleList({ onRoleSelect }: RoleListProps) {
  // State management
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [isSystemFilter, setIsSystemFilter] = useState<boolean | undefined>(undefined);

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // API hooks
  const { data, isLoading, isFetching, error } = useGetRolesQuery({
    page,
    limit,
    search: search || undefined,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    isActive: isActiveFilter,
  });

  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();

  // Handle row actions
  const handleView = (role: Role) => {
    setSelectedRole(role);
    setIsViewDialogOpen(true);
    onRoleSelect?.(role.id);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRole) return;

    try {
      await deleteRole(selectedRole.id).unwrap();
      toast.success('Role deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete role');
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => row.original.id);

    if (selectedIds.length === 0) {
      toast.error('No roles selected');
      return;
    }

    try {
      await Promise.all(selectedIds.map((id) => deleteRole(id).unwrap()));
      toast.success(`${selectedIds.length} role(s) deleted successfully`);
      setRowSelection({});
    } catch (err: any) {
      toast.error('Failed to delete some roles');
    }
  };

  // Define columns
  const columns: ColumnDef<Role>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-muted/50"
        >
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('code')}</div>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-muted/50"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const role = row.original;
        const truncateText = (text: string, maxLength: number = 50) => {
          if (text.length <= maxLength) return text;
          return text.substring(0, maxLength).trim() + '...';
        };

        return (
          <div className="flex items-center gap-2">
            <div className="max-w-md">
              <div className="font-medium">{role.name}</div>
              {role.description && (
                <div className="text-sm text-muted-foreground truncate">
                  {truncateText(role.description)}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'hierarchyLevel',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-muted/50"
        >
          Level
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          L{row.getValue('hierarchyLevel')}
        </Badge>
      ),
    },
    {
      accessorKey: 'isSystem',
      header: 'Type',
      cell: ({ row }) => {
        const isSystem = row.getValue('isSystem') as boolean;
        return (
          <Badge variant={isSystem ? 'secondary' : 'default'}>
            <Shield className="mr-1 h-3 w-3" />
            {isSystem ? 'System' : 'Custom'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean;
        return (
          <Badge variant={isActive ? 'success' : 'destructive'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'users',
      header: () => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          Users
        </div>
      ),
      cell: ({ row }) => {
        const role = row.original as any;
        const count = role._count?.userRoles || 0;
        return (
          <div className="text-center">
            <Badge variant="outline">{count}</Badge>
          </div>
        );
      },
    },
    {
      id: 'permissions',
      header: () => (
        <div className="flex items-center gap-1">
          <Key className="h-4 w-4" />
          Permissions
        </div>
      ),
      cell: ({ row }) => {
        const role = row.original as any;
        const count = role._count?.permissions || 0;
        return (
          <div className="text-center">
            <Badge variant="outline">{count}</Badge>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const role = row.original;

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
              <DropdownMenuItem onClick={() => handleView(role)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(role)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(role)}
                className="text-destructive focus:text-destructive"
                disabled={role.isSystem}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Role
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Initialize table
  const table = useReactTable({
    data: data?.data || [],
    columns,
    pageCount: data?.totalPages || 0,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: page - 1,
        pageSize: limit,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">Failed to load roles</p>
          <p className="text-sm text-muted-foreground mt-2">
            {(error as any)?.data?.message || 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions - only show when rows are selected */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({Object.keys(rowSelection).length})
          </Button>
        </div>
      )}

      {/* Table */}
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
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, [role="button"]')) {
                      return;
                    }
                    handleView(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Shield className="h-12 w-12 mb-2 opacity-50" />
                    <p>No roles found</p>
                    <p className="text-sm mt-1">
                      {search ? 'Try adjusting your search' : 'Create your first role to get started'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} roles
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    disabled={isLoading}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedRole && (
            <RoleForm
              roleId={selectedRole.id}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedRole(null);
                toast.success('Role updated successfully');
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedRole && (
            <RoleDetailTabs roleId={selectedRole.id} />
          )}
        </DialogContent>
      </Dialog>

      <DeleteRoleDialog
        roleId={selectedRole?.id || ''}
        roleName={selectedRole?.name || ''}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedRole(null);
        }}
        onSuccess={() => {
          setIsDeleteDialogOpen(false);
          setSelectedRole(null);
          toast.success('Role deleted successfully');
        }}
      />
    </div>
  );
}

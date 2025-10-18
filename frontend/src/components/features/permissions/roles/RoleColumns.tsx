'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Role } from '@/lib/api/services/roles.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ChevronsUpDown,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleColumnsProps {
  onView: (role: Role) => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export const createRoleColumns = ({
  onView,
  onEdit,
  onDelete,
}: RoleColumnsProps): ColumnDef<Role>[] => [
  {
    accessorKey: 'name',
    size: 200,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Role Name
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const isSystemRole = row.original.isSystemRole;
      return (
        <div className="flex items-center gap-2">
          {isSystemRole && (
            <Shield className="h-4 w-4 text-blue-500 shrink-0" title="System Role" />
          )}
          <div className="font-medium max-w-[200px] truncate" title={row.getValue('name')}>
            {row.getValue('name')}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'code',
    size: 120,
    header: ({ column }) => {
      return (
        <div className="hidden sm:table-cell">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Code
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      return (
        <code className="hidden sm:table-cell text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.getValue('code')}
        </code>
      );
    },
  },
  {
    accessorKey: 'hierarchyLevel',
    size: 100,
    header: ({ column }) => {
      return (
        <div className="hidden md:table-cell text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Level
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const level = row.getValue('hierarchyLevel') as number;
      return (
        <div className="hidden md:table-cell text-center whitespace-nowrap">
          <Badge variant="outline">{level}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'description',
    size: 200,
    header: () => <div className="hidden lg:table-cell">Description</div>,
    cell: ({ row }) => {
      const description = row.getValue('description') as string;
      return (
        <div className="hidden lg:table-cell max-w-[200px] truncate text-sm text-muted-foreground" title={description}>
          {description || '-'}
        </div>
      );
    },
  },
  {
    id: 'userCount',
    accessorFn: (row) => row._count?.userRoles || 0,
    size: 80,
    header: () => {
      return (
        <div className="hidden sm:table-cell text-center">
          Users
        </div>
      );
    },
    cell: ({ row }) => {
      const count = (row.original._count?.userRoles || 0) as number;
      return (
        <div className="hidden sm:table-cell text-center whitespace-nowrap">
          <Badge variant="secondary">{count}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'isActive',
    size: 100,
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Status
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const isActive = row.getValue('isActive') as boolean;
      return (
        <div className="text-center whitespace-nowrap">
          <Badge
            variant={isActive ? 'success' : 'secondary'}
            className={cn(
              isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : ''
            )}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      if (value === 'all') return true;
      return row.getValue(id) === (value === 'active');
    },
  },
  {
    id: 'actions',
    size: 80,
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const role = row.original;
      const isSystemRole = role.isSystemRole;

      return (
        <div className="text-right whitespace-nowrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(role)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(role)}
                disabled={isSystemRole}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(role)}
                className="text-destructive focus:text-destructive"
                disabled={isSystemRole}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

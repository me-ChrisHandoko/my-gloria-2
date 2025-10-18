'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Permission } from '@/lib/api/services/permissions.service';
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

interface PermissionColumnsProps {
  onView: (permission: Permission) => void;
  onEdit: (permission: Permission) => void;
  onDelete: (permission: Permission) => void;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  READ: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  UPDATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  APPROVE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  EXPORT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  IMPORT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  PRINT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  ASSIGN: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  CLOSE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

const scopeColors: Record<string, string> = {
  OWN: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  DEPARTMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  SCHOOL: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ALL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export const createPermissionColumns = ({
  onView,
  onEdit,
  onDelete,
}: PermissionColumnsProps): ColumnDef<Permission>[] => [
  {
    accessorKey: 'code',
    size: 120,
    header: ({ column }) => {
      return (
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
      );
    },
    cell: ({ row }) => {
      const isSystem = row.original.isSystemPermission;
      return (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded max-w-[120px] truncate" title={row.getValue('code')}>
            {row.getValue('code')}
          </code>
          {isSystem && (
            <Shield className="h-3 w-3 text-amber-500" title="System Permission" />
          )}
        </div>
      );
    },
  },
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
          Name
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
      return (
        <div className="font-medium max-w-[220px] truncate" title={row.getValue('name')}>
          {row.getValue('name')}
        </div>
      );
    },
  },
  {
    accessorKey: 'resource',
    size: 140,
    header: ({ column }) => {
      return (
        <div className="hidden lg:table-cell">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Resource
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
        <div className="hidden lg:table-cell max-w-[150px] truncate" title={row.getValue('resource')}>
          {row.getValue('resource')}
        </div>
      );
    },
  },
  {
    accessorKey: 'action',
    size: 100,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Action
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
      const action = row.getValue('action') as string;
      return (
        <Badge className={cn('whitespace-nowrap', actionColors[action] || 'bg-gray-100')}>
          {action}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'scope',
    size: 110,
    header: () => <div className="hidden md:table-cell">Scope</div>,
    cell: ({ row }) => {
      const scope = row.getValue('scope') as string | undefined;
      if (!scope) {
        return <div className="hidden md:table-cell text-muted-foreground">-</div>;
      }
      return (
        <div className="hidden md:table-cell">
          <Badge className={cn('whitespace-nowrap', scopeColors[scope] || 'bg-gray-100')}>
            {scope}
          </Badge>
        </div>
      );
    },
  },
  {
    id: 'group',
    accessorFn: (row) => row.group?.name,
    size: 140,
    header: () => <div className="hidden xl:table-cell">Group</div>,
    cell: ({ row }) => {
      const group = row.original.group;
      return (
        <div className="hidden xl:table-cell max-w-[150px] truncate text-sm" title={group?.name}>
          {group?.name || <span className="text-muted-foreground">-</span>}
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
      const permission = row.original;

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
              <DropdownMenuItem onClick={() => onView(permission)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onEdit(permission)}
                disabled={permission.isSystemPermission}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(permission)}
                className="text-destructive focus:text-destructive"
                disabled={permission.isSystemPermission}
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

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Module, ModuleCategory } from '@/lib/api/services/modules.service';
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
  Move,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ModuleColumnsProps {
  onView: (module: Module) => void;
  onEdit: (module: Module) => void;
  onDelete: (module: Module) => void;
  onMove?: (module: Module) => void;
  onViewPermissions?: (module: Module) => void;
}

// Helper to get category badge color
const getCategoryBadgeColor = (category: ModuleCategory) => {
  const colors = {
    SERVICE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    PERFORMANCE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    QUALITY: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    FEEDBACK: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    TRAINING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    SYSTEM: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colors[category] || colors.SYSTEM;
};

export const createModuleColumns = ({
  onView,
  onEdit,
  onDelete,
  onMove,
  onViewPermissions,
}: ModuleColumnsProps): ColumnDef<Module>[] => [
  {
    id: 'code',
    accessorKey: 'code',
    size: 120,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="h-8 px-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Code
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-1 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-1 h-4 w-4" />
          ) : (
            <ChevronsUpDown className="ml-1 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const code = row.getValue('code') as string;
      return (
        <div className="font-mono text-xs font-medium px-2">
          {code}
        </div>
      );
    },
  },
  {
    id: 'name',
    accessorKey: 'name',
    size: 200,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="h-8 px-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Module Name
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-1 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-1 h-4 w-4" />
          ) : (
            <ChevronsUpDown className="ml-1 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.getValue('name') as string;
      const icon = row.original.icon;
      return (
        <div className="flex items-center gap-2 px-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-medium">{name}</span>
        </div>
      );
    },
  },
  {
    id: 'category',
    accessorKey: 'category',
    size: 120,
    header: 'Category',
    cell: ({ row }) => {
      const category = row.getValue('category') as ModuleCategory;
      return (
        <Badge className={cn('font-medium', getCategoryBadgeColor(category))}>
          {category}
        </Badge>
      );
    },
  },
  {
    id: 'description',
    accessorKey: 'description',
    size: 200,
    header: 'Description',
    cell: ({ row }) => {
      const description = row.getValue('description') as string | undefined;
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
          {description || '-'}
        </div>
      );
    },
  },
  {
    id: 'status',
    accessorKey: 'isActive',
    size: 100,
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.getValue('status') as boolean;
      const isVisible = row.original.isVisible;

      return (
        <div className="flex flex-col gap-1">
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
            )}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
          {!isVisible && (
            <Badge variant="outline" className="text-xs">
              Hidden
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: 'updatedAt',
    accessorKey: 'updatedAt',
    size: 120,
    header: 'Last Updated',
    cell: ({ row }) => {
      const updatedAt = row.getValue('updatedAt') as string;
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
        </div>
      );
    },
  },
  {
    id: 'actions',
    size: 80,
    header: 'Actions',
    cell: ({ row }) => {
      const module = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onView(module)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {onViewPermissions && (
              <DropdownMenuItem onClick={() => onViewPermissions(module)}>
                <Shield className="mr-2 h-4 w-4" />
                Manage Permissions
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(module)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {onMove && (
              <DropdownMenuItem onClick={() => onMove(module)}>
                <Move className="mr-2 h-4 w-4" />
                Move
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(module)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

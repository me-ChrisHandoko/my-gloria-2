'use client';

import { ColumnDef } from '@tanstack/react-table';
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
  Eye,
  Trash2,
  ChevronsUpDown,
  CheckCircle,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PermissionTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  permissions: any;
  moduleAccess?: any;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  version: number;
}

interface PermissionTemplateColumnsProps {
  onView: (template: PermissionTemplate) => void;
  onApply: (template: PermissionTemplate) => void;
  onDelete: (template: PermissionTemplate) => void;
}

export const createPermissionTemplateColumns = ({
  onView,
  onApply,
  onDelete,
}: PermissionTemplateColumnsProps): ColumnDef<PermissionTemplate>[] => [
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
          Template Name
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
      const isSystem = row.original.isSystem;
      return (
        <div className="flex items-center gap-2">
          <div className="font-medium max-w-[220px] truncate" title={row.getValue('name')}>
            {row.getValue('name')}
          </div>
          {isSystem && (
            <Badge variant="secondary" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              System
            </Badge>
          )}
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
    accessorKey: 'category',
    size: 140,
    header: ({ column }) => {
      return (
        <div className="hidden md:table-cell">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Category
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
      const category = row.getValue('category') as string;
      return (
        <div className="hidden md:table-cell">
          <Badge variant="outline" className="whitespace-nowrap">
            {category.replace(/_/g, ' ')}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'description',
    size: 180,
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
      const template = row.original;
      const isSystem = template.isSystem;

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
              <DropdownMenuItem onClick={() => onView(template)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onApply(template)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Apply Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(template)}
                className="text-destructive focus:text-destructive"
                disabled={isSystem}
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

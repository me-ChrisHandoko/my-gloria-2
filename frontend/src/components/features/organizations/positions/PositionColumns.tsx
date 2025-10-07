'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Position } from '@/lib/api/services/positions.service';
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
  Users,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PositionColumnsProps {
  onView: (position: Position) => void;
  onEdit: (position: Position) => void;
  onDelete: (position: Position) => void;
  onViewHolders?: (position: Position) => void;
  onManagePermissions?: (position: Position) => void;
}

export const createPositionColumns = ({
  onView,
  onEdit,
  onDelete,
  onViewHolders,
  onManagePermissions,
}: PositionColumnsProps): ColumnDef<Position>[] => [
  {
    accessorKey: 'name',
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
      return <div className="font-medium max-w-[200px] truncate" title={row.getValue('name')}>{row.getValue('name')}</div>;
    },
  },
  {
    accessorKey: 'code',
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
      return (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.getValue('code')}
        </code>
      );
    },
  },
  {
    accessorKey: 'hierarchyLevel',
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
      const level = row.original.hierarchyLevel || row.original.level || 0;
      return (
        <div className="text-center hidden md:table-cell whitespace-nowrap">
          <Badge variant="outline" className="font-mono">
            {level}
          </Badge>
        </div>
      );
    },
  },
  {
    id: 'department',
    accessorFn: (row) => row.department?.name,
    header: () => <div className="hidden md:table-cell">Department</div>,
    cell: ({ row }) => {
      const department = row.original.department;
      return <div className="hidden md:table-cell max-w-[150px] truncate" title={department?.name}>{department?.name || '-'}</div>;
    },
  },
  {
    id: 'school',
    accessorFn: (row) => row.school?.name,
    header: () => <div className="hidden lg:table-cell">School</div>,
    cell: ({ row }) => {
      const school = row.original.school;
      return <div className="hidden lg:table-cell max-w-[150px] truncate" title={school?.name}>{school?.name || '-'}</div>;
    },
  },
  {
    accessorKey: 'holderCount',
    header: ({ column }) => {
      return (
        <div className="text-center hidden md:table-cell">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Holders
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
      const count = row.getValue('holderCount') as number;
      return (
        <div className="text-center hidden md:table-cell whitespace-nowrap">
          <Badge variant="secondary">{count || 0}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'permissionCount',
    header: () => <div className="text-center hidden lg:table-cell">Permissions</div>,
    cell: ({ row }) => {
      const count = row.original.permissionCount || row.original.permissions?.length || 0;
      return (
        <div className="text-center hidden lg:table-cell whitespace-nowrap">
          <Badge variant="secondary">{count}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'isActive',
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
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const position = row.original;

      return (
        <div className="text-right whitespace-nowrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(position)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(position)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {onViewHolders && (
                <DropdownMenuItem onClick={() => onViewHolders(position)}>
                  <Users className="mr-2 h-4 w-4" />
                  View Holders
                </DropdownMenuItem>
              )}
              {onManagePermissions && (
                <DropdownMenuItem onClick={() => onManagePermissions(position)}>
                  <Shield className="mr-2 h-4 w-4" />
                  Manage Permissions
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(position)}
                className="text-destructive focus:text-destructive"
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

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Department } from '@/lib/api/services/departments.service';
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
  ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentColumnsProps {
  onView: (department: Department) => void;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
}

export const createDepartmentColumns = ({
  onView,
  onEdit,
  onDelete,
}: DepartmentColumnsProps): ColumnDef<Department>[] => [
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
    id: 'school',
    accessorFn: (row) => row.school?.name,
    header: () => <div className="hidden lg:table-cell">School</div>,
    cell: ({ row }) => {
      const school = row.original.school;
      return <div className="hidden lg:table-cell max-w-[150px] truncate" title={school?.name}>{school?.name || '-'}</div>;
    },
  },
  {
    id: 'parent',
    accessorFn: (row) => row.parent?.name,
    header: () => <div className="hidden md:table-cell">Parent Department</div>,
    cell: ({ row }) => {
      const parent = row.original.parent;
      return (
        <div className="text-sm hidden md:table-cell max-w-[150px]">
          {parent ? (
            <span className="truncate block" title={parent.name}>{parent.name}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      );
    },
  },
  {
    id: 'head',
    accessorFn: (row) => row.head?.name,
    header: 'Department Head',
    cell: ({ row }) => {
      const head = row.original.head;
      return (
        <div className="text-sm max-w-[200px]">
          {head ? (
            <div>
              <div className="truncate">{head.name}</div>
              <div className="text-xs text-muted-foreground truncate" title={head.email}>
                {head.email}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'userCount',
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Users
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
      const count = row.getValue('userCount') as number;
      return (
        <div className="text-center whitespace-nowrap">
          <Badge variant="secondary">{count || 0}</Badge>
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
      const department = row.original;

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
              <DropdownMenuItem onClick={() => onView(department)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(department)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(department)}
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
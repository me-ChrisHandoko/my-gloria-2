'use client';

import { ColumnDef } from '@tanstack/react-table';
import { User, UserRole } from '@/types';
import { format } from 'date-fns';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  KeyIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface UserColumnsProps {
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onView?: (user: User) => void;
  onResetPassword?: (user: User) => void;
  onManagePermissions?: (user: User) => void;
}

export const createUserColumns = ({
  onEdit,
  onDelete,
  onView,
  onResetPassword,
  onManagePermissions,
}: UserColumnsProps): ColumnDef<User>[] => [
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
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {user.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as UserRole;
      const roleConfig = {
        [UserRole.ADMIN]: {
          label: 'Admin',
          variant: 'destructive' as const,
        },
        [UserRole.USER]: {
          label: 'User',
          variant: 'default' as const,
        },
        [UserRole.VIEWER]: {
          label: 'Viewer',
          variant: 'secondary' as const,
        },
      };

      const config = roleConfig[role] || roleConfig[UserRole.VIEWER];

      return (
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'nip',
    header: 'NIP',
    cell: ({ row }) => {
      const nip = row.getValue('nip') as string | undefined;
      return nip ? (
        <span className="font-mono text-sm">{nip}</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    accessorKey: 'departmentId',
    header: 'Department',
    cell: ({ row }) => {
      const departmentId = row.getValue('departmentId') as string | undefined;
      // In production, this would fetch the department name from the API
      return departmentId ? (
        <span className="text-sm">Department {departmentId.slice(0, 8)}</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    accessorKey: 'positionId',
    header: 'Position',
    cell: ({ row }) => {
      const positionId = row.getValue('positionId') as string | undefined;
      // In production, this would fetch the position name from the API
      return positionId ? (
        <span className="text-sm">Position {positionId.slice(0, 8)}</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date;
      return (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {format(new Date(date), 'dd MMM yyyy')}
        </span>
      );
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md flex items-center justify-center">
              <span className="sr-only">Open menu</span>
              <EllipsisVerticalIcon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {onView && (
              <DropdownMenuItem onClick={() => onView(user)}>
                <EyeIcon className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onManagePermissions && (
              <DropdownMenuItem onClick={() => onManagePermissions(user)}>
                <ShieldCheckIcon className="mr-2 h-4 w-4" />
                Manage Permissions
              </DropdownMenuItem>
            )}
            {onResetPassword && (
              <DropdownMenuItem onClick={() => onResetPassword(user)}>
                <KeyIcon className="mr-2 h-4 w-4" />
                Reset Password
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(user)}
                className="text-red-600 dark:text-red-400"
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// Default columns export
export const UserColumns = createUserColumns({});
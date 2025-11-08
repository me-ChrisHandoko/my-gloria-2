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
      const name = row.getValue('name') as string;
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {name || '-'}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'nip',
    header: 'NIP',
    cell: ({ row }) => {
      const nip = row.getValue('nip') as string;
      return nip ? (
        <span className="font-mono text-sm">{nip}</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.getValue('email') as string;
      return (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {email || '-'}
        </span>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.getValue('isActive') as boolean;
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
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
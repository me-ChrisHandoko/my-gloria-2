'use client';

import { ColumnDef } from '@tanstack/react-table';
import { UserModuleAccess } from '@/lib/api/services/module-access.service';
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
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns';

interface ModuleAccessColumnsProps {
  onView: (access: UserModuleAccess) => void;
  onEdit: (access: UserModuleAccess) => void;
  onRevoke: (access: UserModuleAccess) => void;
}

// Helper to render permission badges
const PermissionBadges = ({ permissions }: { permissions: UserModuleAccess['permissions'] }) => {
  return (
    <div className="flex gap-1 flex-wrap">
      {permissions.canRead && (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          R
        </Badge>
      )}
      {permissions.canWrite && (
        <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
          W
        </Badge>
      )}
      {permissions.canDelete && (
        <Badge variant="destructive">
          D
        </Badge>
      )}
      {permissions.canShare && (
        <Badge variant="secondary">
          S
        </Badge>
      )}
    </div>
  );
};

// Helper to check if access is expiring soon
const isExpiringSoon = (validUntil?: string): boolean => {
  if (!validUntil) return false;
  const expiryDate = new Date(validUntil);
  const daysUntilExpiry = differenceInDays(expiryDate, new Date());
  return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
};

export const createModuleAccessColumns = ({
  onView,
  onEdit,
  onRevoke,
}: ModuleAccessColumnsProps): ColumnDef<UserModuleAccess>[] => [
  {
    id: 'user',
    accessorFn: (row) => row.userProfile?.dataKaryawan?.nama || row.userProfile?.nip || 'Unknown',
    size: 180,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          User
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
      const user = row.original.userProfile;
      const name = user?.dataKaryawan?.nama || 'Unknown';
      const nip = user?.nip || '';

      return (
        <div className="max-w-[200px]">
          <div className="font-medium truncate" title={name}>
            {name}
          </div>
          {nip && (
            <div className="text-xs text-muted-foreground truncate" title={nip}>
              {nip}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 'module',
    accessorFn: (row) => row.module?.name || 'Unknown',
    size: 150,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Module
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
      const module = row.original.module;
      return (
        <div className="max-w-[160px]">
          <div className="font-medium truncate" title={module?.name}>
            {module?.name || 'Unknown'}
          </div>
          {module && (
            <div className="flex items-center gap-1 mt-1">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {module.code}
              </code>
              <Badge variant="outline" className="text-xs">
                {module.category}
              </Badge>
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 'permissions',
    accessorKey: 'permissions',
    size: 120,
    header: () => <div className="text-center">Permissions</div>,
    cell: ({ row }) => {
      return (
        <div className="flex justify-center">
          <PermissionBadges permissions={row.original.permissions} />
        </div>
      );
    },
  },
  {
    id: 'validUntil',
    accessorKey: 'validUntil',
    size: 140,
    header: ({ column }) => {
      return (
        <div className="hidden md:block">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Valid Until
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
      const validUntil = row.original.validUntil;

      if (!validUntil) {
        return (
          <div className="hidden md:block text-sm text-muted-foreground">
            Permanent
          </div>
        );
      }

      const expiryDate = new Date(validUntil);
      const isExpired = isPast(expiryDate);
      const expiringSoon = isExpiringSoon(validUntil);

      return (
        <div className="hidden md:block">
          <div className={cn(
            "text-sm flex items-center gap-1",
            isExpired && "text-destructive",
            expiringSoon && !isExpired && "text-orange-600"
          )}>
            {expiringSoon && !isExpired && <Clock className="h-3 w-3" />}
            {formatDistanceToNow(expiryDate, { addSuffix: true })}
          </div>
          <div className="text-xs text-muted-foreground">
            {expiryDate.toLocaleDateString()}
          </div>
        </div>
      );
    },
  },
  {
    id: 'grantedBy',
    accessorFn: (row) => row.grantedByUser?.dataKaryawan?.nama || 'Unknown',
    size: 120,
    header: () => <div className="hidden lg:block">Granted By</div>,
    cell: ({ row }) => {
      const grantedBy = row.original.grantedByUser;
      const name = grantedBy?.dataKaryawan?.nama || 'Unknown';

      return (
        <div className="hidden lg:block max-w-[130px]">
          <div className="text-sm truncate" title={name}>
            {name}
          </div>
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
      const validUntil = row.original.validUntil;
      const isExpired = validUntil ? isPast(new Date(validUntil)) : false;

      let status = 'Active';
      let variant: 'success' | 'secondary' | 'destructive' = 'success';
      let className = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';

      if (!isActive) {
        status = 'Revoked';
        variant = 'secondary';
        className = '';
      } else if (isExpired) {
        status = 'Expired';
        variant = 'destructive';
        className = '';
      }

      return (
        <div className="text-center whitespace-nowrap">
          <Badge variant={variant} className={className}>
            {status}
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
      const access = row.original;

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
              <DropdownMenuItem onClick={() => onView(access)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(access)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Access
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onRevoke(access)}
                className="text-destructive focus:text-destructive"
                disabled={!access.isActive}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Revoke Access
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

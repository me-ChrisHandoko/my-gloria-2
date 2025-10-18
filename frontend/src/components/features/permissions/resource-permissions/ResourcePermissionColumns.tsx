'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ResourcePermission } from '@/lib/api/services/resource-permissions.service';
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
  XCircle,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';

interface ResourcePermissionColumnsProps {
  onView: (permission: ResourcePermission) => void;
  onRevoke: (permission: ResourcePermission) => void;
}

export const createResourcePermissionColumns = ({
  onView,
  onRevoke,
}: ResourcePermissionColumnsProps): ColumnDef<ResourcePermission>[] => [
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
    id: 'permission',
    accessorFn: (row) => row.permission?.name || row.permission?.code || 'Unknown',
    size: 180,
    header: ({ column }) => {
      return (
        <div className="hidden sm:table-cell">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Permission
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
      const permission = row.original.permission;
      return (
        <div className="hidden sm:table-cell max-w-[200px]">
          <div className="font-medium truncate" title={permission?.name}>
            {permission?.name || 'Unknown'}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {permission?.action || 'N/A'}
            </Badge>
            {permission?.scope && (
              <Badge variant="secondary" className="text-xs">
                {permission.scope}
              </Badge>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'resourceType',
    size: 140,
    header: () => <div className="hidden md:table-cell">Resource</div>,
    cell: ({ row }) => {
      const resourceType = row.getValue('resourceType') as string;
      const resourceId = row.original.resourceId;
      return (
        <div className="hidden md:table-cell max-w-[150px]">
          <div className="font-medium text-sm">{resourceType}</div>
          <div
            className="text-xs text-muted-foreground truncate"
            title={resourceId}
          >
            {resourceId}
          </div>
        </div>
      );
    },
  },
  {
    id: 'validPeriod',
    accessorKey: 'validFrom',
    size: 160,
    header: () => <div className="hidden lg:table-cell">Valid Period</div>,
    cell: ({ row }) => {
      const validFrom = row.getValue('validPeriod') as string;
      const validUntil = row.original.validUntil;

      return (
        <div className="hidden lg:table-cell text-sm">
          <div className="text-muted-foreground">
            {format(new Date(validFrom), 'PP')}
          </div>
          {validUntil && (
            <div className="text-muted-foreground">
              → {format(new Date(validUntil), 'PP')}
            </div>
          )}
          {!validUntil && (
            <div className="text-blue-600 dark:text-blue-400 text-xs">
              Permanent
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 'status',
    accessorFn: (row) => {
      if (!row.validUntil) return 'active';
      return isPast(new Date(row.validUntil)) ? 'expired' : 'active';
    },
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
      const status = row.getValue('status') as string;
      const isActive = status === 'active';
      return (
        <div className="text-center whitespace-nowrap">
          <Badge
            variant={isActive ? 'success' : 'secondary'}
            className={cn(
              isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            )}
          >
            {isActive ? 'Active' : 'Expired'}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      if (value === 'all') return true;
      return row.getValue(id) === value;
    },
  },
  {
    id: 'grantedBy',
    accessorFn: (row) => row.grantedByUser?.dataKaryawan?.nama || row.grantedBy || 'Unknown',
    size: 140,
    header: () => <div className="hidden xl:table-cell">Granted By</div>,
    cell: ({ row }) => {
      const grantedByName = row.getValue('grantedBy') as string;
      return (
        <div className="hidden xl:table-cell text-sm text-muted-foreground max-w-[150px] truncate" title={grantedByName}>
          {grantedByName}
        </div>
      );
    },
  },
  {
    id: 'actions',
    size: 80,
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const permission = row.original;
      const status = row.getValue('status') as string;
      const isActive = status === 'active';

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
              {isActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onRevoke(permission)}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Revoke
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

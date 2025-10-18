'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  PermissionDelegation,
  getDelegationStatus,
} from '@/lib/api/services/permission-delegation.service';
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
  Ban,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DelegationColumnsProps {
  onView: (delegation: PermissionDelegation) => void;
  onRevoke: (delegation: PermissionDelegation) => void;
  viewType: 'my-delegations' | 'delegated-to-me';
}

export const createDelegationColumns = ({
  onView,
  onRevoke,
  viewType,
}: DelegationColumnsProps): ColumnDef<PermissionDelegation>[] => [
  {
    id: 'user',
    accessorFn: (row) =>
      viewType === 'my-delegations'
        ? row.delegate?.dataKaryawan?.nama
        : row.delegator?.dataKaryawan?.nama,
    size: 180,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          {viewType === 'my-delegations' ? 'Delegated To' : 'Delegated By'}
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
      const user =
        viewType === 'my-delegations'
          ? row.original.delegate
          : row.original.delegator;
      const name = user?.dataKaryawan?.nama || 'Unknown';
      const nip = user?.nip || '-';
      return (
        <div className="font-medium">
          <div className="max-w-[200px] truncate" title={name}>
            {name}
          </div>
          <div className="text-xs text-muted-foreground">{nip}</div>
        </div>
      );
    },
  },
  {
    id: 'permissions',
    accessorFn: (row) => row.permissions.length,
    size: 120,
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Permissions
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
      const count = row.original.permissions.length;
      return (
        <div className="text-center">
          <Badge variant="secondary">{count} permission{count !== 1 ? 's' : ''}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'validFrom',
    size: 140,
    header: () => <div className="hidden md:table-cell">Valid From</div>,
    cell: ({ row }) => {
      const date = row.getValue('validFrom') as Date;
      return (
        <div className="hidden md:table-cell text-sm">
          {format(date, 'dd MMM yyyy')}
        </div>
      );
    },
  },
  {
    accessorKey: 'validUntil',
    size: 140,
    header: ({ column }) => {
      return (
        <div className="hidden md:table-cell">
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
      const date = row.getValue('validUntil') as Date;
      const isExpired = date < new Date();
      return (
        <div className="hidden md:table-cell text-sm">
          <span className={cn(isExpired && 'text-destructive font-medium')}>
            {format(date, 'dd MMM yyyy')}
          </span>
        </div>
      );
    },
  },
  {
    id: 'status',
    accessorFn: (row) => getDelegationStatus(row),
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
      const status = getDelegationStatus(row.original);
      return (
        <div className="text-center whitespace-nowrap">
          <Badge
            variant={
              status === 'active'
                ? 'success'
                : status === 'expired'
                ? 'secondary'
                : 'destructive'
            }
            className={cn(
              status === 'active' &&
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
              status === 'revoked' &&
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
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
    id: 'actions',
    size: 80,
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const delegation = row.original;
      const status = getDelegationStatus(delegation);
      const canRevoke = viewType === 'my-delegations' && status === 'active';

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
              <DropdownMenuItem onClick={() => onView(delegation)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {canRevoke && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onRevoke(delegation)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="mr-2 h-4 w-4" />
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

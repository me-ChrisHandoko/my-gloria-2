'use client';

import React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon
} from '@heroicons/react/24/outline';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  onSearch?: (searchTerm: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showPagination?: boolean;
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  selectedRows?: string[];
  onRowSelection?: (selectedIds: string[]) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  onSearch,
  searchPlaceholder = 'Search...',
  showSearch = true,
  showPagination = true,
  isLoading = false,
  onRowClick,
  selectedRows = [],
  onRowSelection,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    manualPagination: !!pagination,
    pageCount: pagination ? Math.ceil(pagination.total / pagination.pageSize) : undefined,
  });

  // Handle search input
  const handleSearch = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (onSearch) {
        onSearch(value);
      } else {
        setGlobalFilter(value);
      }
    },
    [onSearch]
  );

  // Handle row selection changes
  React.useEffect(() => {
    if (onRowSelection) {
      const selectedIds = Object.keys(rowSelection);
      onRowSelection(selectedIds);
    }
  }, [rowSelection, onRowSelection]);

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              onChange={handleSearch}
              className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Scroll shadow indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent dark:from-gray-900 pointer-events-none lg:hidden z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent dark:from-gray-900 pointer-events-none lg:hidden z-10" />

        <div className="overflow-x-auto">
          <table className="min-w-[400px] sm:min-w-[600px] lg:min-w-0 w-full lg:table-fixed divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? 'flex cursor-pointer select-none items-center space-x-1'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                            {header.column.getCanSort() && (
                              <span className="flex flex-col">
                                <ChevronUpIcon
                                  className={`h-3 w-3 ${
                                    header.column.getIsSorted() === 'asc'
                                      ? 'text-blue-600'
                                      : 'text-gray-400'
                                  }`}
                                />
                                <ChevronDownIcon
                                  className={`-mt-1 h-3 w-3 ${
                                    header.column.getIsSorted() === 'desc'
                                      ? 'text-blue-600'
                                      : 'text-gray-400'
                                  }`}
                                />
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={`${
                      onRowClick ? 'cursor-pointer' : ''
                    } hover:bg-gray-50 dark:hover:bg-gray-800`}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {pagination ? (
              <>
                {/* Mobile version - abbreviated */}
                <span className="sm:hidden">
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.pageSize + 1}
                  </span>
                  -
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.total}</span>
                </span>
                {/* Desktop version - full text */}
                <span className="hidden sm:inline">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </span>
              </>
            ) : (
              <>
                {/* Mobile version - abbreviated */}
                <span className="sm:hidden">
                  <span className="font-medium">
                    {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                  </span>
                  -
                  <span className="font-medium">
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                      data.length
                    )}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{data.length}</span>
                </span>
                {/* Desktop version - full text */}
                <span className="hidden sm:inline">
                  Showing{' '}
                  <span className="font-medium">
                    {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                      data.length
                    )}
                  </span>{' '}
                  of <span className="font-medium">{data.length}</span> results
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Page Size Selector */}
            <select
              value={pagination?.pageSize || table.getState().pagination.pageSize}
              onChange={(e) => {
                const newPageSize = Number(e.target.value);
                if (pagination) {
                  pagination.onPageSizeChange(newPageSize);
                } else {
                  table.setPageSize(newPageSize);
                }
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>

            {/* Pagination Buttons */}
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  if (pagination) {
                    pagination.onPageChange(1);
                  } else {
                    table.setPageIndex(0);
                  }
                }}
                disabled={
                  pagination
                    ? pagination.page === 1
                    : !table.getCanPreviousPage()
                }
                className="rounded-md border border-gray-300 bg-white px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="First page"
              >
                <ChevronDoubleLeftIcon className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">First</span>
              </button>
              <button
                onClick={() => {
                  if (pagination) {
                    pagination.onPageChange(pagination.page - 1);
                  } else {
                    table.previousPage();
                  }
                }}
                disabled={
                  pagination
                    ? pagination.page === 1
                    : !table.getCanPreviousPage()
                }
                className="rounded-md border border-gray-300 bg-white px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <button
                onClick={() => {
                  if (pagination) {
                    pagination.onPageChange(pagination.page + 1);
                  } else {
                    table.nextPage();
                  }
                }}
                disabled={
                  pagination
                    ? pagination.page >= Math.ceil(pagination.total / pagination.pageSize)
                    : !table.getCanNextPage()
                }
                className="rounded-md border border-gray-300 bg-white px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Next page"
              >
                <ChevronRightIcon className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Next</span>
              </button>
              <button
                onClick={() => {
                  if (pagination) {
                    const lastPage = Math.ceil(pagination.total / pagination.pageSize);
                    pagination.onPageChange(lastPage);
                  } else {
                    table.setPageIndex(table.getPageCount() - 1);
                  }
                }}
                disabled={
                  pagination
                    ? pagination.page >= Math.ceil(pagination.total / pagination.pageSize)
                    : !table.getCanNextPage()
                }
                className="rounded-md border border-gray-300 bg-white px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Last page"
              >
                <ChevronDoubleRightIcon className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Last</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Default export
export default DataTable;
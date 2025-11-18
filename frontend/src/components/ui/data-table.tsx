"use client";

import React from "react";
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
} from "@tanstack/react-table";
import {
  MagnifyingGlassIcon,
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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
  searchPlaceholder = "Search...",
  showSearch = true,
  showPagination = true,
  isLoading = false,
  onRowClick,
  selectedRows = [],
  onRowSelection,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

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
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    manualPagination: !!pagination,
    pageCount: pagination
      ? Math.ceil(pagination.total / pagination.pageSize)
      : undefined,
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

  // Pagination helper functions
  const handleFirstPage = React.useCallback(() => {
    if (pagination) {
      pagination.onPageChange(1);
    } else {
      table.setPageIndex(0);
    }
  }, [pagination, table]);

  const handlePreviousPage = React.useCallback(() => {
    if (pagination) {
      pagination.onPageChange(pagination.page - 1);
    } else {
      table.previousPage();
    }
  }, [pagination, table]);

  const handleNextPage = React.useCallback(() => {
    if (pagination) {
      pagination.onPageChange(pagination.page + 1);
    } else {
      table.nextPage();
    }
  }, [pagination, table]);

  const handleLastPage = React.useCallback(() => {
    if (pagination) {
      const lastPage = Math.ceil(pagination.total / pagination.pageSize);
      pagination.onPageChange(lastPage);
    } else {
      table.setPageIndex(table.getPageCount() - 1);
    }
  }, [pagination, table]);

  const canPreviousPage = pagination
    ? pagination.page === 1
    : !table.getCanPreviousPage();

  const canNextPage = pagination
    ? pagination.page >= Math.ceil(pagination.total / pagination.pageSize)
    : !table.getCanNextPage();

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              onChange={handleSearch}
              className="pl-10"
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
          <Table className="min-w-[400px] sm:min-w-[600px] lg:min-w-0 lg:table-fixed">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className="uppercase tracking-wider px-4"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? "flex cursor-pointer select-none items-center space-x-1"
                                : ""
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={onRowClick ? "cursor-pointer" : ""}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          {/* Results Info - Left */}
          <div className="text-sm text-muted-foreground">
            {pagination ? (
              <>
                Showing{" "}
                {Math.min(
                  (pagination.page - 1) * pagination.pageSize + 1,
                  pagination.total
                )}{" "}
                to{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
                of {pagination.total} results
              </>
            ) : (
              <>
                Showing{" "}
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}{" "}
                to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{" "}
                of {table.getFilteredRowModel().rows.length} results
              </>
            )}
          </div>

          {/* Pagination Controls - Right */}
          <div className="flex items-center space-x-2">
            {/* Page Size Selector */}
            <Select
              value={String(
                pagination?.pageSize || table.getState().pagination.pageSize
              )}
              onValueChange={(value) => {
                const newPageSize = Number(value);
                if (pagination) {
                  pagination.onPageSizeChange(newPageSize);
                } else {
                  table.setPageSize(newPageSize);
                }
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    Show {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Pagination */}
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFirstPage}
                    disabled={canPreviousPage}
                    aria-label="First page"
                    className="gap-1 px-2.5"
                  >
                    <ChevronDoubleLeftIcon className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">First</span>
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={canPreviousPage}
                    aria-label="Previous page"
                    className="gap-1 px-2.5"
                  >
                    <ChevronLeftIcon className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={canNextPage}
                    aria-label="Next page"
                    className="gap-1 px-2.5"
                  >
                    <ChevronRightIcon className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">Next</span>
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLastPage}
                    disabled={canNextPage}
                    aria-label="Last page"
                    className="gap-1 px-2.5"
                  >
                    <ChevronDoubleRightIcon className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">Last</span>
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}

// Default export
export default DataTable;

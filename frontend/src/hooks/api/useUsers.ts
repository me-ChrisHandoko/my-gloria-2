import { useState, useCallback, useMemo } from 'react';
import { useGetUsersQuery, useLazyExportUsersQuery } from '@/store/api/userApi';
import type { QueryParams } from '@/types';

export interface UseUsersOptions {
  initialPage?: number;
  initialLimit?: number;
  initialSearch?: string;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
  pollingInterval?: number;
  refetchOnMount?: boolean;
  refetchOnFocus?: boolean;
}

export const useUsers = (options: UseUsersOptions = {}) => {
  const {
    initialPage = 1,
    initialLimit = 10,
    initialSearch = '',
    initialSortBy = 'createdAt',
    initialSortOrder = 'desc',
    pollingInterval = 30000, // Poll every 30 seconds by default
    refetchOnMount = true,
    refetchOnFocus = true,
  } = options;

  // Filter state management
  const [filters, setFilters] = useState<QueryParams>({
    page: initialPage,
    limit: initialLimit,
    search: initialSearch,
    sortBy: initialSortBy,
    sortOrder: initialSortOrder,
  });

  // RTK Query hook with caching and automatic refetching
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    isSuccess,
    isError,
  } = useGetUsersQuery(filters, {
    pollingInterval,
    refetchOnMountOrArgChange: refetchOnMount,
    refetchOnFocus,
    // Skip the query if we're on the server
    skip: typeof window === 'undefined',
  });

  // Export functionality
  const [triggerExport, { isLoading: isExporting }] = useLazyExportUsersQuery();

  // Update filters with partial updates
  const updateFilters = useCallback((newFilters: Partial<QueryParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters to initial values
  const resetFilters = useCallback(() => {
    setFilters({
      page: initialPage,
      limit: initialLimit,
      search: initialSearch,
      sortBy: initialSortBy,
      sortOrder: initialSortOrder,
    });
  }, [initialPage, initialLimit, initialSearch, initialSortBy, initialSortOrder]);

  // Pagination helpers
  const goToPage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  const nextPage = useCallback(() => {
    const currentPage = filters.page ?? 1;
    if (data && currentPage < data.totalPages) {
      updateFilters({ page: currentPage + 1 });
    }
  }, [data, filters.page, updateFilters]);

  const previousPage = useCallback(() => {
    const currentPage = filters.page ?? 1;
    if (currentPage > 1) {
      updateFilters({ page: currentPage - 1 });
    }
  }, [filters.page, updateFilters]);

  const changePageSize = useCallback((limit: number) => {
    updateFilters({ limit, page: 1 }); // Reset to first page when changing page size
  }, [updateFilters]);

  // Sorting helpers
  const sortBy = useCallback((field: string) => {
    const isSameField = filters.sortBy === field;
    const newOrder = isSameField && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    updateFilters({
      sortBy: field,
      sortOrder: newOrder,
    });
  }, [filters.sortBy, filters.sortOrder, updateFilters]);

  // Search functionality with debounce consideration
  const setSearchTerm = useCallback((search: string) => {
    updateFilters({ search, page: 1 }); // Reset to first page when searching
  }, [updateFilters]);

  // Export users functionality
  const exportUsers = useCallback(async (format: 'csv' | 'excel' = 'csv') => {
    try {
      const result = await triggerExport({ format, filters }).unwrap();

      // Create a download link for the blob
      if (result instanceof Blob) {
        const url = URL.createObjectURL(result);
        const link = document.createElement('a');
        link.href = url;
        link.download = `users-export-${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true };
      }

      return { success: false, error: 'Export failed' };
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, error };
    }
  }, [triggerExport, filters]);

  // Manual refresh functionality
  const refreshData = useCallback(() => {
    refetch();
  }, [refetch]);

  // Computed values
  const hasNextPage = useMemo(() => {
    const currentPage = filters.page ?? 1;
    return data ? currentPage < data.totalPages : false;
  }, [data, filters.page]);

  const hasPreviousPage = useMemo(() => {
    const currentPage = filters.page ?? 1;
    return currentPage > 1;
  }, [filters.page]);

  const pageInfo = useMemo(() => {
    if (!data) return null;

    const currentPage = filters.page ?? 1;
    const pageLimit = filters.limit ?? 10;
    const startIndex = (currentPage - 1) * pageLimit + 1;
    const endIndex = Math.min(currentPage * pageLimit, data.total);

    return {
      startIndex,
      endIndex,
      total: data.total,
      currentPage: currentPage,
      totalPages: data.totalPages,
      pageSize: pageLimit,
    };
  }, [data, filters.page, filters.limit]);

  // Return comprehensive hook interface
  return {
    // Data
    users: data?.data || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    hasMore: data?.hasMore || false,

    // Loading states
    isLoading,
    isFetching,
    isExporting,
    isSuccess,
    isError,

    // Error
    error,

    // Filters
    filters,
    updateFilters,
    resetFilters,

    // Pagination
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    hasNextPage,
    hasPreviousPage,
    pageInfo,

    // Sorting
    sortBy,

    // Search
    setSearchTerm,

    // Actions
    refreshData,
    exportUsers,
  };
};

// Hook for single user with caching
export const useUser = (userId: string, options: { skip?: boolean } = {}) => {
  const { skip = false } = options;

  const {
    data: user,
    isLoading,
    isFetching,
    error,
    refetch,
    isSuccess,
    isError,
  } = useGetUsersQuery({ id: userId }, {
    skip: skip || !userId,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  return {
    user,
    isLoading,
    isFetching,
    error,
    refetch,
    isSuccess,
    isError,
  };
};

// Export additional hooks for specific use cases
// Note: useGetUserByIdQuery is not directly exported, use useUser hook instead
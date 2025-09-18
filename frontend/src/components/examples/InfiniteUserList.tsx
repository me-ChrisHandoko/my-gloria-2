'use client';

import React, { useState, useCallback } from 'react';
import { useGetUsersQuery } from '@/store/api/userApi';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

/**
 * Example component demonstrating infinite scrolling with RTK Query
 */
export const InfiniteUserList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Fetch users for current page
  const { data, isLoading, isFetching } = useGetUsersQuery(
    { page, limit: 20 },
    {
      // Keep data from previous pages
      selectFromResult: (result) => ({
        ...result,
        data: result.data,
      }),
    }
  );

  // Update all users when new data arrives
  React.useEffect(() => {
    if (data?.data) {
      setAllUsers((prev) => {
        // If it's the first page, replace all users
        if (page === 1) {
          return data.data;
        }
        // Otherwise, append new users
        const existingIds = new Set(prev.map((u) => u.id));
        const newUsers = data.data.filter((u) => !existingIds.has(u.id));
        return [...prev, ...newUsers];
      });
    }
  }, [data, page]);

  // Setup infinite scroll
  const lastUserRef = useInfiniteScroll({
    onLoadMore: () => {
      if (!isFetching && data?.hasMore) {
        setPage((p) => p + 1);
      }
    },
    hasMore: data?.hasMore || false,
    isLoading: isFetching,
    threshold: 200, // Start loading 200px before the end
  });

  // Reset functionality
  const handleReset = () => {
    setPage(1);
    setAllUsers([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Users (Infinite Scroll)</h2>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reset List
        </button>
      </div>

      <div className="space-y-4">
        {allUsers.map((user, index) => (
          <div
            key={user.id}
            ref={index === allUsers.length - 1 ? lastUserRef : null}
            className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{user.name}</h3>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500">ID: {user.id}</p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm ${
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                {user.role && (
                  <p className="text-sm text-gray-600 mt-2">{user.role}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isFetching && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading more users...</span>
          </div>
        )}

        {/* No more data indicator */}
        {!data?.hasMore && allUsers.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            No more users to load
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Loaded Users:</span>
            <span className="ml-2 font-semibold">{allUsers.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Current Page:</span>
            <span className="ml-2 font-semibold">{page}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Users:</span>
            <span className="ml-2 font-semibold">{data?.total || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Alternative implementation using a custom hook for infinite user loading
 */
export const useInfiniteUsers = () => {
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, isLoading, isFetching } = useGetUsersQuery(
    { page, limit: 20 },
    { skip: !hasMore }
  );

  React.useEffect(() => {
    if (data) {
      setUsers((prev) => {
        if (page === 1) return data.data;
        const existingIds = new Set(prev.map((u) => u.id));
        const newUsers = data.data.filter((u) => !existingIds.has(u.id));
        return [...prev, ...newUsers];
      });
      setHasMore(data.hasMore);
    }
  }, [data, page]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setPage((p) => p + 1);
    }
  }, [isFetching, hasMore]);

  const reset = useCallback(() => {
    setPage(1);
    setUsers([]);
    setHasMore(true);
  }, []);

  return {
    users,
    loadMore,
    reset,
    isLoading,
    isFetching,
    hasMore,
    page,
    total: data?.total || 0,
  };
};
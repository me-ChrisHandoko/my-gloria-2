'use client';

import React, { useState, useCallback } from 'react';
import { useGetUsersQuery, useDeleteUserMutation, useBulkDeleteUsersMutation } from '@/store/api/userApi';
import { DataTable } from '@/components/ui/data-table';
import { createUserColumns } from './UserColumns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorAlert } from '@/components/ui/error-alert';
import { UserForm } from './UserForm';
import { User } from '@/types';
import { PlusIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const UserList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // RTK Query hooks
  const { data, isLoading, error, refetch } = useGetUsersQuery({
    page,
    limit: pageSize,
    search: searchTerm,
  });

  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [bulkDeleteUsers, { isLoading: isBulkDeleting }] = useBulkDeleteUsersMutation();

  // Handle user actions
  const handleEdit = useCallback((user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  }, []);

  const handleDelete = useCallback(async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) {
      return;
    }

    try {
      await deleteUser(user.id).unwrap();
      toast.success(`User ${user.name} deleted successfully`);
      refetch();
    } catch (error) {
      toast.error('Failed to delete user');
      console.error('Delete error:', error);
    }
  }, [deleteUser, refetch]);

  const handleView = useCallback((user: User) => {
    // In production, this would navigate to a user details page
    console.log('View user:', user);
  }, []);

  const handleResetPassword = useCallback((user: User) => {
    // In production, this would open a password reset dialog
    console.log('Reset password for:', user);
    toast.info('Password reset functionality coming soon');
  }, []);

  const handleManagePermissions = useCallback((user: User) => {
    // In production, this would open a permissions management dialog
    console.log('Manage permissions for:', user);
    toast.info('Permission management functionality coming soon');
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select users to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedRows.length} users?`)) {
      return;
    }

    try {
      await bulkDeleteUsers(selectedRows).unwrap();
      toast.success(`${selectedRows.length} users deleted successfully`);
      setSelectedRows([]);
      refetch();
    } catch (error) {
      toast.error('Failed to delete users');
      console.error('Bulk delete error:', error);
    }
  }, [selectedRows, bulkDeleteUsers, refetch]);

  const handleExport = useCallback(() => {
    // In production, this would trigger an export
    toast.info('Export functionality coming soon');
  }, []);

  const handleImport = useCallback(() => {
    // In production, this would open an import dialog
    toast.info('Import functionality coming soon');
  }, []);

  const handleAddUser = useCallback(() => {
    setEditingUser(null);
    setShowUserForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowUserForm(false);
    setEditingUser(null);
    refetch();
  }, [refetch]);

  // Create columns with action handlers
  const columns = createUserColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onView: handleView,
    onResetPassword: handleResetPassword,
    onManagePermissions: handleManagePermissions,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" message="Loading users..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorAlert
          error={error}
          title="Failed to load users"
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            User Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage system users and their permissions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedRows.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-red-400 dark:border-red-600 dark:hover:bg-gray-700"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete ({selectedRows.length})
            </button>
          )}
          <button
            onClick={handleImport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={handleAddUser}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Users
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {data.total}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Active Users
            </div>
            <div className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
              {data.data.filter(u => u.role !== 'VIEWER').length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Administrators
            </div>
            <div className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {data.data.filter(u => u.role === 'ADMIN').length}
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <DataTable
          columns={columns}
          data={data?.data || []}
          pagination={{
            page,
            pageSize,
            total: data?.total || 0,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          onSearch={setSearchTerm}
          searchPlaceholder="Search users by name or email..."
          isLoading={isLoading}
          onRowSelection={setSelectedRows}
        />
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={editingUser}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};

// Default export
export default UserList;
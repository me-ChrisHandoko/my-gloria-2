'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, UserRole } from '@/types';
import { useCreateUserMutation, useUpdateUserMutation } from '@/store/api/userApi';
import { toast } from 'sonner';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { logRTKError } from '@/lib/utils/errorLogger';

// Validation schema
const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(UserRole),
  nip: z.string().regex(/^\d{18}$/, 'NIP must be 18 digits').optional().or(z.literal('')),
  departmentId: z.string().uuid().optional().or(z.literal('')),
  positionId: z.string().uuid().optional().or(z.literal('')),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: User | null;
  onClose: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onClose }) => {
  const isEditing = !!user;

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      role: UserRole.USER,
      nip: '',
      departmentId: '',
      positionId: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (user) {
      setValue('name', user.name);
      setValue('email', user.email);
      setValue('role', user.role);
      setValue('nip', user.nip || '');
      setValue('departmentId', user.departmentId || '');
      setValue('positionId', user.positionId || '');
    }
  }, [user, setValue]);

  const onSubmit = async (data: UserFormData) => {
    try {
      // Clean up optional fields
      const cleanedData = {
        ...data,
        nip: data.nip || undefined,
        departmentId: data.departmentId || undefined,
        positionId: data.positionId || undefined,
      };

      if (isEditing) {
        await updateUser({
          id: user.id,
          data: cleanedData,
        }).unwrap();
        toast.success('User updated successfully');
      } else {
        await createUser(cleanedData).unwrap();
        toast.success('User created successfully');
      }
      onClose();
    } catch (error: any) {
      const message = error?.data?.message || 'An error occurred';
      toast.error(message);
      logRTKError('Form submission error', error);
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isEditing ? 'Edit User' : 'Add New User'}
            </h3>
            <button
              onClick={onClose}
              className="rounded-md bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email *
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="john.doe@example.com"
                  disabled={isEditing}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role *
                </label>
                <select
                  {...register('role')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value={UserRole.USER}>User</option>
                  <option value={UserRole.VIEWER}>Viewer</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.role.message}
                  </p>
                )}
              </div>

              {/* NIP */}
              <div>
                <label htmlFor="nip" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  NIP (Optional)
                </label>
                <input
                  {...register('nip')}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="18 digit NIP"
                  maxLength={18}
                />
                {errors.nip && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.nip.message}
                  </p>
                )}
              </div>

              {/* Department */}
              <div>
                <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department (Optional)
                </label>
                <select
                  {...register('departmentId')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Department</option>
                  {/* In production, this would be populated from API */}
                  <option value="550e8400-e29b-41d4-a716-446655440001">Department 1</option>
                  <option value="550e8400-e29b-41d4-a716-446655440002">Department 2</option>
                  <option value="550e8400-e29b-41d4-a716-446655440003">Department 3</option>
                </select>
                {errors.departmentId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.departmentId.message}
                  </p>
                )}
              </div>

              {/* Position */}
              <div>
                <label htmlFor="positionId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Position (Optional)
                </label>
                <select
                  {...register('positionId')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Position</option>
                  {/* In production, this would be populated from API */}
                  <option value="650e8400-e29b-41d4-a716-446655440001">Position 1</option>
                  <option value="650e8400-e29b-41d4-a716-446655440002">Position 2</option>
                  <option value="650e8400-e29b-41d4-a716-446655440003">Position 3</option>
                </select>
                {errors.positionId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.positionId.message}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>{isEditing ? 'Update User' : 'Create User'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Default export
export default UserForm;
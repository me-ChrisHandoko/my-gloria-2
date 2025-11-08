import { apiSlice } from './apiSliceWithHook';
import { Notification, PaginatedResponse, QueryParams } from '@/types';

// Enhanced Notification types
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'email' | 'in-app' | 'push' | 'sms';
  variables?: string[];
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  email: boolean;
  inApp: boolean;
  push: boolean;
  sms: boolean;
  categories: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

// Notification API with template support and preferences
export const notificationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== NOTIFICATION QUERIES =====

    // Get notifications
    getNotifications: builder.query<PaginatedResponse<Notification>, QueryParams & {
      userId?: string;
      read?: boolean;
      type?: string;
    }>({
      query: (params = {}) => ({
        url: '/notifications',
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
          sortBy: params.sortBy || 'createdAt',
          sortOrder: params.sortOrder || 'desc',
          userId: params.userId,
          read: params.read,
          type: params.type,
          ...params
        },
      }),
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Notification' as const, id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),

    // Get single notification
    getNotificationById: builder.query<Notification, string>({
      query: (id) => `/notifications/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Notification', id }],
    }),

    // Get unread count
    getUnreadNotificationCount: builder.query<{ count: number }, string | void>({
      query: (userId) => ({
        url: '/notifications/unread-count',
        params: userId ? { userId } : {},
      }),
      providesTags: ['Notification'],
      keepUnusedDataFor: 30,
    }),

    // Get my notifications
    getMyNotifications: builder.query<Notification[], { limit?: number; read?: boolean }>({
      query: (params = {}) => ({
        url: '/notifications/my-notifications',
        params,
      }),
      providesTags: (result) =>
        result && Array.isArray(result)
          ? [
              ...result.map(({ id }) => ({ type: 'Notification' as const, id })),
              'Notification',
            ]
          : ['Notification'],
    }),

    // ===== NOTIFICATION TEMPLATE QUERIES =====

    // Get notification templates
    getNotificationTemplates: builder.query<PaginatedResponse<NotificationTemplate>, QueryParams>({
      query: (params = {}) => ({
        url: '/notification-templates',
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search || '',
          sortBy: params.sortBy || 'name',
          sortOrder: params.sortOrder || 'asc',
          ...params
        },
      }),
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'NotificationTemplate' as const, id })),
              { type: 'NotificationTemplate', id: 'LIST' },
            ]
          : [{ type: 'NotificationTemplate', id: 'LIST' }],
      keepUnusedDataFor: 600,
    }),

    // Get notification template by ID
    getNotificationTemplateById: builder.query<NotificationTemplate, string>({
      query: (id) => `/notification-templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'NotificationTemplate', id }],
    }),

    // Get user preferences
    getUserNotificationPreferences: builder.query<NotificationPreference, string>({
      query: (userId) => `/users/${userId}/notification-preferences`,
      providesTags: (_result, _error, userId) => [
        { type: 'Notification', id: `prefs-${userId}` }
      ],
    }),

    // ===== NOTIFICATION MUTATIONS =====

    // Create notification
    createNotification: builder.mutation<Notification, Partial<Notification>>({
      query: (notification) => ({
        url: '/notifications',
        method: 'POST',
        body: notification,
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        'Notification',
      ],
    }),

    // Mark as read
    markNotificationAsRead: builder.mutation<Notification, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        'Notification',
      ],
      // Optimistic update
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationApi.util.updateQueryData('getNotificationById', id, (draft) => {
            draft.read = true;
            draft.readAt = new Date();
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Mark all as read
    markAllNotificationsAsRead: builder.mutation<{ success: boolean; updated: number }, void>({
      query: () => ({
        url: '/notifications/mark-all-read',
        method: 'PATCH',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        'Notification',
      ],
    }),

    // Delete notification
    deleteNotification: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),

    // Bulk delete notifications
    bulkDeleteNotifications: builder.mutation<
      { success: boolean; deleted: number },
      string[]
    >({
      query: (ids) => ({
        url: '/notifications/bulk-delete',
        method: 'POST',
        body: { ids },
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        'Notification',
      ],
    }),

    // ===== NOTIFICATION TEMPLATE MUTATIONS =====

    // Create notification template
    createNotificationTemplate: builder.mutation<
      NotificationTemplate,
      Partial<NotificationTemplate>
    >({
      query: (template) => ({
        url: '/notification-templates',
        method: 'POST',
        body: template,
      }),
      invalidatesTags: [{ type: 'NotificationTemplate', id: 'LIST' }],
    }),

    // Update notification template
    updateNotificationTemplate: builder.mutation<
      NotificationTemplate,
      { id: string; data: Partial<NotificationTemplate> }
    >({
      query: ({ id, data }) => ({
        url: `/notification-templates/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'NotificationTemplate', id },
        { type: 'NotificationTemplate', id: 'LIST' },
      ],
    }),

    // Delete notification template
    deleteNotificationTemplate: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/notification-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'NotificationTemplate', id },
        { type: 'NotificationTemplate', id: 'LIST' },
      ],
    }),

    // Update user preferences
    updateUserNotificationPreferences: builder.mutation<
      NotificationPreference,
      { userId: string; preferences: Partial<NotificationPreference> }
    >({
      query: ({ userId, preferences }) => ({
        url: `/users/${userId}/notification-preferences`,
        method: 'PUT',
        body: preferences,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'Notification', id: `prefs-${userId}` }
      ],
    }),

    // Send notification
    sendNotification: builder.mutation<
      { success: boolean; notificationId: string },
      {
        templateId: string;
        recipients: string[];
        variables?: Record<string, any>;
        channels?: ('email' | 'in-app' | 'push' | 'sms')[];
      }
    >({
      query: (data) => ({
        url: '/notifications/send',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Notification'],
    }),

    // Send bulk notifications
    sendBulkNotifications: builder.mutation<
      { success: boolean; sent: number; failed: number },
      {
        templateId: string;
        recipientGroups?: string[];
        filters?: Record<string, any>;
        variables?: Record<string, any>;
      }
    >({
      query: (data) => ({
        url: '/notifications/send-bulk',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Notification'],
    }),

    // Test notification template
    testNotificationTemplate: builder.mutation<
      { success: boolean; preview: string },
      {
        templateId: string;
        variables?: Record<string, any>;
        email?: string;
      }
    >({
      query: (data) => ({
        url: '/notification-templates/test',
        method: 'POST',
        body: data,
      }),
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  // Notification hooks
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useGetNotificationByIdQuery,
  useGetUnreadNotificationCountQuery,
  useGetMyNotificationsQuery,
  useCreateNotificationMutation,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useBulkDeleteNotificationsMutation,
  // Template hooks
  useGetNotificationTemplatesQuery,
  useLazyGetNotificationTemplatesQuery,
  useGetNotificationTemplateByIdQuery,
  useGetUserNotificationPreferencesQuery,
  useCreateNotificationTemplateMutation,
  useUpdateNotificationTemplateMutation,
  useDeleteNotificationTemplateMutation,
  useUpdateUserNotificationPreferencesMutation,
  // Send hooks
  useSendNotificationMutation,
  useSendBulkNotificationsMutation,
  useTestNotificationTemplateMutation,
} = notificationApi;

// Export endpoints
export const { endpoints: notificationEndpoints } = notificationApi;
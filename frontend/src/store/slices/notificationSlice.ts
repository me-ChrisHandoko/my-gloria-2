/**
 * Notification Slice
 * Redux slice for managing notifications with SSE integration
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { NotificationSSEData } from '@/types/sse';

/**
 * Notification interface extending SSE data
 */
export interface Notification extends NotificationSSEData {
  timestamp?: number;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Notification state interface
 */
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
  filter: {
    type?: 'info' | 'success' | 'warning' | 'error';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    read?: boolean;
  };
  sound: boolean;
  desktop: boolean;
}

/**
 * Initial state
 */
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastFetch: null,
  filter: {},
  sound: true,
  desktop: true,
};

/**
 * Notification slice
 */
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add notification (from SSE or manual)
    addNotification: (state, action: PayloadAction<Notification>) => {
      const notification = {
        ...action.payload,
        timestamp: Date.now(),
      };

      // Add to beginning of array (newest first)
      state.notifications.unshift(notification);

      // Update unread count
      if (!notification.read) {
        state.unreadCount++;
      }

      // Limit notifications to 100
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }

      // Play sound if enabled
      if (state.sound && !notification.read) {
        // Sound will be played by component
      }

      // Show desktop notification if enabled
      if (state.desktop && !notification.read && 'Notification' in window) {
        // Desktop notification will be shown by component
      }
    },

    // Update notification
    updateNotification: (state, action: PayloadAction<Partial<Notification> & { id: string }>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload.id);
      if (index !== -1) {
        const wasUnread = !state.notifications[index].read;
        state.notifications[index] = {
          ...state.notifications[index],
          ...action.payload,
        };

        // Update unread count if read status changed
        if (wasUnread && action.payload.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (!wasUnread && action.payload.read === false) {
          state.unreadCount++;
        }
      }
    },

    // Remove notification
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const notification = state.notifications[index];
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(index, 1);
      }
    },

    // Mark notification as read
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    // Mark all as read
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },

    // Clear all notifications
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },

    // Clear read notifications
    clearReadNotifications: (state) => {
      state.notifications = state.notifications.filter(n => !n.read);
    },

    // Set notifications (initial load)
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read).length;
      state.lastFetch = new Date().toISOString();
      state.loading = false;
      state.error = null;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },

    // Set filter
    setFilter: (state, action: PayloadAction<NotificationState['filter']>) => {
      state.filter = action.payload;
    },

    // Toggle sound
    toggleSound: (state) => {
      state.sound = !state.sound;
    },

    // Toggle desktop notifications
    toggleDesktop: (state) => {
      state.desktop = !state.desktop;
    },

    // Bulk update from SSE
    bulkUpdateNotifications: (state, action: PayloadAction<Notification[]>) => {
      action.payload.forEach(update => {
        const index = state.notifications.findIndex(n => n.id === update.id);
        if (index !== -1) {
          state.notifications[index] = {
            ...state.notifications[index],
            ...update,
          };
        }
      });

      // Recalculate unread count
      state.unreadCount = state.notifications.filter(n => !n.read).length;
    },
  },
});

/**
 * Actions
 */
export const {
  addNotification,
  updateNotification,
  removeNotification,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  clearReadNotifications,
  setNotifications,
  setLoading,
  setError,
  setFilter,
  toggleSound,
  toggleDesktop,
  bulkUpdateNotifications,
} = notificationSlice.actions;

/**
 * Selectors
 */
export const selectNotifications = (state: RootState) => {
  const { notifications, filter } = state.notifications;

  // Apply filters
  let filtered = [...notifications];

  if (filter.type) {
    filtered = filtered.filter(n => n.type === filter.type);
  }

  if (filter.priority) {
    filtered = filtered.filter(n => n.priority === filter.priority);
  }

  if (filter.read !== undefined) {
    filtered = filtered.filter(n => n.read === filter.read);
  }

  return filtered;
};

export const selectUnreadNotifications = (state: RootState) =>
  state.notifications.notifications.filter(n => !n.read);

export const selectUnreadCount = (state: RootState) =>
  state.notifications.unreadCount;

export const selectNotificationById = (id: string) => (state: RootState) =>
  state.notifications.notifications.find(n => n.id === id);

export const selectNotificationSettings = (state: RootState) => ({
  sound: state.notifications.sound,
  desktop: state.notifications.desktop,
});

export const selectHighPriorityNotifications = (state: RootState) =>
  state.notifications.notifications.filter(
    n => n.priority === 'high' || n.priority === 'urgent'
  );

/**
 * Async actions (thunks) - Adding missing exports
 */
export const fetchNotifications = () => async (dispatch: any) => {
  dispatch(setLoading(true));
  try {
    // Placeholder for fetching notifications from API
    // const response = await fetch('/api/notifications');
    // const data = await response.json();
    // dispatch(setNotifications(data));

    // For now, just clear loading
    dispatch(setLoading(false));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch notifications'));
  }
};

export const updateUnreadCount = () => (dispatch: any, getState: any) => {
  const state = getState();
  const unreadCount = state.notifications.notifications.filter((n: Notification) => !n.read).length;
  // The unread count is already updated by the reducers
  // This is just a placeholder for any additional logic needed
};

export { clearAllNotifications as clearNotifications };

/**
 * Reducer
 */
export default notificationSlice.reducer;
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import {
  selectNotifications,
  selectUnreadCount,
  selectUnreadNotifications,
  addNotification,
  removeNotification,
  clearNotifications,
  updateUnreadCount,
  fetchNotifications,
  markAsRead,
} from '@/store/slices/notificationSlice';
import { showToast } from '@/store/slices/uiSlice';
import type { Notification } from '@/types';

interface NotificationOptions {
  autoFetch?: boolean;
  fetchInterval?: number;
  showToast?: boolean;
  playSound?: boolean;
  vibrate?: boolean;
}

/**
 * Comprehensive notification management hook
 * Handles real-time notifications, persistence, and user interactions
 */
export const useNotifications = (options: NotificationOptions = {}) => {
  const {
    autoFetch = true,
    fetchInterval = 60000, // 1 minute
    showToast: shouldShowToast = true,
    playSound = true,
    vibrate = true,
  } = options;

  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const unreadNotifications = useAppSelector(selectUnreadNotifications);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastNotificationRef = useRef<string | null>(null);

  // Initialize audio for notification sounds
  useEffect(() => {
    if (playSound && typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, [playSound]);

  // Auto-fetch notifications at interval
  useEffect(() => {
    if (autoFetch) {
      // Initial fetch
      dispatch(fetchNotifications());

      // Set up interval
      intervalRef.current = setInterval(() => {
        dispatch(fetchNotifications());
      }, fetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoFetch, fetchInterval, dispatch]);

  /**
   * Play notification sound
   */
  const playNotificationSound = useCallback(() => {
    if (playSound && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.warn('Failed to play notification sound:', err);
      });
    }
  }, [playSound]);

  /**
   * Trigger device vibration
   */
  const triggerVibration = useCallback(() => {
    if (vibrate && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [vibrate]);

  /**
   * Show browser notification
   */
  const showBrowserNotification = useCallback(
    async (notification: Notification) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: notification.id,
          requireInteraction: notification.priority === 'high',
          silent: !playSound,
          data: notification,
        });

        browserNotification.onclick = () => {
          window.focus();
          dispatch(markAsRead(notification.id));
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        };
      }
    },
    [dispatch, playSound]
  );

  /**
   * Request browser notification permission
   */
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  /**
   * Add a new notification
   */
  const notify = useCallback(
    async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random()}`,
        createdAt: new Date().toISOString(),
        read: false,
      };

      // Add to store
      dispatch(addNotification(newNotification));

      // Show toast if enabled
      if (shouldShowToast) {
        dispatch(
          showToast({
            id: `toast-${newNotification.id}`,
            type: notification.type || 'info',
            message: notification.message,
            duration: 5000,
          })
        );
      }

      // Play sound and vibrate
      if (notification.type !== 'info') {
        playNotificationSound();
        triggerVibration();
      }

      // Show browser notification
      await showBrowserNotification(newNotification);

      return newNotification.id;
    },
    [
      dispatch,
      shouldShowToast,
      playNotificationSound,
      triggerVibration,
      showBrowserNotification,
    ]
  );

  /**
   * Mark notification as read
   */
  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await dispatch(markAsRead(notificationId)).unwrap();
        return true;
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        return false;
      }
    },
    [dispatch]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    const unreadIds = unreadNotifications.map(n => n.id);
    const promises = unreadIds.map(id => dispatch(markAsRead(id)));

    try {
      await Promise.all(promises);
      dispatch(updateUnreadCount());
      return true;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  }, [dispatch, unreadNotifications]);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(
    (notificationId: string) => {
      dispatch(removeNotification(notificationId));
    },
    [dispatch]
  );

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    dispatch(clearNotifications());
  }, [dispatch]);

  /**
   * Filter notifications by type
   */
  const getNotificationsByType = useCallback(
    (type: Notification['type']) => {
      return notifications.filter(n => n.type === type);
    },
    [notifications]
  );

  /**
   * Filter notifications by priority
   */
  const getNotificationsByPriority = useCallback(
    (priority: Notification['priority']) => {
      return notifications.filter(n => n.priority === priority);
    },
    [notifications]
  );

  /**
   * Get notifications within date range
   */
  const getNotificationsByDateRange = useCallback(
    (startDate: Date, endDate: Date) => {
      return notifications.filter(n => {
        const notifDate = new Date(n.createdAt);
        return notifDate >= startDate && notifDate <= endDate;
      });
    },
    [notifications]
  );

  // Computed values
  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  const notificationStats = useMemo(() => ({
    total: notifications.length,
    unread: unreadCount,
    read: notifications.length - unreadCount,
    byType: {
      success: notifications.filter(n => n.type === 'success').length,
      error: notifications.filter(n => n.type === 'error').length,
      warning: notifications.filter(n => n.type === 'warning').length,
      info: notifications.filter(n => n.type === 'info').length,
    },
    byPriority: {
      high: notifications.filter(n => n.priority === 'high').length,
      medium: notifications.filter(n => n.priority === 'medium').length,
      low: notifications.filter(n => n.priority === 'low').length,
    },
  }), [notifications, unreadCount]);

  const recentNotifications = useMemo(() => {
    return [...notifications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [notifications]);

  // Check for new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      if (
        latestNotification.id !== lastNotificationRef.current &&
        !latestNotification.read
      ) {
        lastNotificationRef.current = latestNotification.id;

        // Trigger notification effects for new notifications
        if (!latestNotification.silent) {
          playNotificationSound();
          triggerVibration();
        }
      }
    }
  }, [notifications, playNotificationSound, triggerVibration]);

  return {
    // State
    notifications,
    unreadNotifications,
    recentNotifications,
    unreadCount,
    hasUnread,
    notificationStats,

    // Actions
    notify,
    markAsRead: markNotificationAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    requestNotificationPermission,

    // Filters
    getNotificationsByType,
    getNotificationsByPriority,
    getNotificationsByDateRange,

    // Utilities
    refresh: () => dispatch(fetchNotifications()),
  };
};

/**
 * Hook for notification preferences
 */
export const useNotificationPreferences = () => {
  const dispatch = useAppDispatch();

  const preferences = useAppSelector(state =>
    state.preferences?.notifications || {}
  );

  const updatePreferences = useCallback(
    (updates: Partial<typeof preferences>) => {
      dispatch({
        type: 'preferences/updateNotificationPreferences',
        payload: updates,
      });
    },
    [dispatch]
  );

  const toggleCategory = useCallback(
    (category: string, enabled: boolean) => {
      updatePreferences({
        categories: {
          ...preferences.categories,
          [category]: enabled,
        },
      });
    },
    [preferences, updatePreferences]
  );

  return {
    preferences,
    updatePreferences,
    toggleCategory,
    isEmailEnabled: preferences.email,
    isPushEnabled: preferences.push,
    isInAppEnabled: preferences.inApp,
  };
};

export default useNotifications;
/**
 * NotificationBell Component
 * Notification bell with real-time updates
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, Trash2, Settings, Volume2, VolumeX } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/hooks';
import {
  selectUnreadCount,
  selectNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearReadNotifications,
  toggleSound,
  toggleDesktop,
  selectNotificationSettings,
} from '@/store/slices/notificationSlice';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

/**
 * Notification Item Component
 */
const NotificationItem: React.FC<{
  notification: any;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ notification, onRead, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/20';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/20';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <div
      className={`p-3 border-b last:border-b-0 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      } ${getPriorityColor()}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl mt-1">{getIcon()}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                {notification.title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRead(notification.id)}
                  className="h-7 w-7 p-0"
                  title="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(notification.id)}
                className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                title="Remove notification"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {notification.actionUrl && (
            <a
              href={notification.actionUrl}
              className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {notification.actionLabel || 'View Details'} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * NotificationBell Component
 */
export const NotificationBell: React.FC = () => {
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector(selectUnreadCount);
  const notifications = useAppSelector(selectNotifications);
  const { sound, desktop } = useAppSelector(selectNotificationSettings);
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Request notification permission
  useEffect(() => {
    if (desktop && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [desktop]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (sound && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Failed to play notification sound:', err);
      });
    }
  }, [sound]);

  // Show desktop notification
  const showDesktopNotification = useCallback((title: string, body: string, icon?: string) => {
    if (desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'gloria-notification',
      });
    }
  }, [desktop]);

  // Handle marking notification as read
  const handleMarkAsRead = useCallback((id: string) => {
    dispatch(markAsRead(id));
  }, [dispatch]);

  // Handle removing notification
  const handleRemoveNotification = useCallback((id: string) => {
    dispatch(removeNotification(id));
  }, [dispatch]);

  // Handle marking all as read
  const handleMarkAllAsRead = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);

  // Handle clearing read notifications
  const handleClearRead = useCallback(() => {
    dispatch(clearReadNotifications());
  }, [dispatch]);

  // Handle toggling sound
  const handleToggleSound = useCallback(() => {
    dispatch(toggleSound());
  }, [dispatch]);

  // Handle toggling desktop notifications
  const handleToggleDesktop = useCallback(() => {
    dispatch(toggleDesktop());
  }, [dispatch]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSound}
              className="h-7 w-7 p-0"
              title={sound ? 'Mute notifications' : 'Unmute notifications'}
            >
              {sound ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-gray-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleDesktop}
              className="h-7 w-7 p-0"
              title={desktop ? 'Disable desktop notifications' : 'Enable desktop notifications'}
            >
              <Bell className={`h-3.5 w-3.5 ${desktop ? '' : 'text-gray-400'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-96">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                  onRemove={handleRemoveNotification}
                />
              ))}
            </ScrollArea>
            <DropdownMenuSeparator />
            <div className="p-2 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearRead}
                className="text-xs"
              >
                Clear read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/notifications'}
                className="text-xs"
              >
                View all →
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
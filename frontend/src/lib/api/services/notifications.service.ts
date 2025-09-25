import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { PaginatedResponse, QueryParams } from '../types';

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM';
  category?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  categories: {
    [key: string]: {
      email: boolean;
      push: boolean;
      sms: boolean;
      inApp: boolean;
    };
  };
  quietHours?: {
    enabled: boolean;
    start: string; // e.g., "22:00"
    end: string; // e.g., "08:00"
  };
}

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM';
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
}

// Notification service class
class NotificationService {
  /**
   * Get paginated list of notifications for current user
   */
  async getNotifications(params?: QueryParams): Promise<PaginatedResponse<Notification>> {
    return apiClient.get<PaginatedResponse<Notification>>(
      API_ENDPOINTS.notifications.notifications.list(params)
    );
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string): Promise<Notification> {
    return apiClient.get<Notification>(API_ENDPOINTS.notifications.notifications.byId(id));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    return apiClient.patch<Notification>(API_ENDPOINTS.notifications.notifications.markAsRead(id));
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[]): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.notifications.notifications.bulkMarkAsRead(), { ids });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.notifications.notifications.markAllAsRead());
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.notifications.notifications.byId(id));
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(ids: string[]): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.notifications.notifications.bulkDelete(), { ids });
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    return apiClient.get<NotificationPreferences>(API_ENDPOINTS.notifications.preferences.get());
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    return apiClient.patch<NotificationPreferences>(
      API_ENDPOINTS.notifications.preferences.update(),
      preferences
    );
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return apiClient.get<{ count: number }>(API_ENDPOINTS.notifications.notifications.unreadCount());
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(subscription: PushSubscription): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.notifications.notifications.subscribe(), {
      subscription,
    });
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.notifications.notifications.unsubscribe());
  }

  /**
   * Send notification (admin only)
   */
  async sendNotification(data: CreateNotificationDto): Promise<Notification> {
    return apiClient.post<Notification>(API_ENDPOINTS.notifications.notifications.send(), data);
  }

  /**
   * Send bulk notifications (admin only)
   */
  async sendBulkNotifications(
    userIds: string[],
    notification: Omit<CreateNotificationDto, 'userId'>
  ): Promise<{ sent: number; failed: number }> {
    return apiClient.post<{ sent: number; failed: number }>(
      API_ENDPOINTS.notifications.notifications.send(),
      {
        userIds,
        notification,
      }
    );
  }

  /**
   * Get notification statistics
   */
  async getStatistics(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.notifications.notifications.count());
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
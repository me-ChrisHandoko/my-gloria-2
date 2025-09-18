import apiClient from '../client';
import { API_ENDPOINTS } from '../constants';
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
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<Notification>>(
      `${API_ENDPOINTS.NOTIFICATIONS.BASE}${queryString}`
    );
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string): Promise<Notification> {
    return apiClient.get<Notification>(API_ENDPOINTS.NOTIFICATIONS.BY_ID(id));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    return apiClient.patch<Notification>(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[]): Promise<void> {
    return apiClient.post<void>(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/mark-read`, { ids });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.NOTIFICATIONS.BY_ID(id));
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(ids: string[]): Promise<void> {
    return apiClient.post<void>(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/delete-multiple`, { ids });
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    return apiClient.get<NotificationPreferences>(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    return apiClient.patch<NotificationPreferences>(
      API_ENDPOINTS.NOTIFICATIONS.PREFERENCES,
      preferences
    );
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return apiClient.get<{ count: number }>(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/unread-count`);
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(subscription: PushSubscription): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.NOTIFICATIONS.SUBSCRIBE, {
      subscription,
    });
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.NOTIFICATIONS.SUBSCRIBE);
  }

  /**
   * Send notification (admin only)
   */
  async sendNotification(data: CreateNotificationDto): Promise<Notification> {
    return apiClient.post<Notification>(API_ENDPOINTS.NOTIFICATIONS.BASE, data);
  }

  /**
   * Send bulk notifications (admin only)
   */
  async sendBulkNotifications(
    userIds: string[],
    notification: Omit<CreateNotificationDto, 'userId'>
  ): Promise<{ sent: number; failed: number }> {
    return apiClient.post<{ sent: number; failed: number }>(
      `${API_ENDPOINTS.NOTIFICATIONS.BASE}/bulk`,
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
    return apiClient.get(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/statistics`);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
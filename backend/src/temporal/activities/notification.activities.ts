/**
 * Temporal Activities for Notifications
 */

import { NotificationPayload } from '../types/workflow.types';

export async function sendNotification(
  payload: NotificationPayload,
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    // TODO: Integrate with existing notification service
    // This is a placeholder implementation
    console.log(
      `[Temporal Activity] Sending notification to user ${payload.userId}`,
      payload,
    );

    // Simulate notification sending
    const notificationId = `notif_${Date.now()}_${payload.userId}`;

    return {
      success: true,
      notificationId,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to send notification',
    };
  }
}

export async function sendEmailNotification(
  email: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Integrate with Postmark email service
    console.log(`[Temporal Activity] Sending email to ${email}`, { subject });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

export async function sendBulkNotifications(
  userIds: string[],
  payload: Omit<NotificationPayload, 'userId'>,
): Promise<{
  success: boolean;
  successCount: number;
  failedCount: number;
  errors?: string[];
}> {
  try {
    const results = await Promise.allSettled(
      userIds.map((userId) => sendNotification({ ...payload, userId })),
    );

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success,
    ).length;
    const failedCount = results.length - successCount;
    const errors = results
      .filter(
        (r) =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && !r.value.success),
      )
      .map((r) =>
        r.status === 'rejected' ? r.reason : (r as any).value.error,
      );

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      successCount: 0,
      failedCount: userIds.length,
      errors: [error.message || 'Bulk notification failed'],
    };
  }
}

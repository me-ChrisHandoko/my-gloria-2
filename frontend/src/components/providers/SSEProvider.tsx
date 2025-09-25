/**
 * SSE Provider Component
 * Provides Server-Sent Events functionality throughout the application
 */

'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useAppDispatch } from '@/hooks';
import { useSSE } from '@/hooks/useSSE';
import {
  SSEConnectionStatus,
  SSEEventType,
  SSEContextValue,
  NotificationSSEData,
  WorkflowSSEData,
  SystemAnnouncementSSEData,
  UserStatusSSEData,
} from '@/types/sse';
import {
  setConnectionStatus,
  setLastHeartbeat,
  trackEvent,
  setError as setSSEError,
} from '@/store/slices/sseSlice';
import {
  addNotification,
  updateNotification,
  removeNotification as deleteNotification,
} from '@/store/slices/notificationSlice';
import { toast } from 'sonner';

/**
 * SSE Context
 */
const SSEContext = createContext<SSEContextValue>({
  service: null,
  status: SSEConnectionStatus.DISCONNECTED,
  isConnected: false,
  isReconnecting: false,
});

/**
 * SSE Provider Props
 */
interface SSEProviderProps {
  children: React.ReactNode;
  endpoint?: string;
  autoConnect?: boolean;
  enableLogging?: boolean;
}

/**
 * SSE Provider Component
 */
export const SSEProvider: React.FC<SSEProviderProps> = ({
  children,
  endpoint = '/sse',
  autoConnect = true,
  enableLogging = process.env.NODE_ENV === 'development',
}) => {
  const { isSignedIn } = useAuth();
  const dispatch = useAppDispatch();

  // Initialize SSE hook
  const {
    status,
    isConnected,
    isReconnecting,
    error,
    addEventListener,
    connect,
    disconnect,
  } = useSSE(endpoint, {
    autoConnect: autoConnect && isSignedIn,
    reconnectOnFocus: true,
    reconnectOnOnline: true,
    onConnectionChange: (newStatus) => {
      dispatch(setConnectionStatus(newStatus));

      // Show connection status toasts in development
      if (enableLogging) {
        switch (newStatus) {
          case SSEConnectionStatus.CONNECTED:
            toast.success('Real-time updates connected', { id: 'sse-status' });
            break;
          case SSEConnectionStatus.DISCONNECTED:
            toast.error('Real-time updates disconnected', { id: 'sse-status' });
            break;
          case SSEConnectionStatus.RECONNECTING:
            toast.loading('Reconnecting to real-time updates...', { id: 'sse-status' });
            break;
          case SSEConnectionStatus.ERROR:
            toast.error('Real-time connection error', { id: 'sse-status' });
            break;
        }
      }
    },
    enableLogging,
  });

  // Update Redux store with SSE error
  useEffect(() => {
    if (error) {
      dispatch(setSSEError(error.message));
    }
  }, [error, dispatch]);

  // Setup event listeners for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    // Heartbeat handler
    const handleHeartbeat = () => {
      dispatch(setLastHeartbeat(new Date().toISOString()));
      dispatch(trackEvent(SSEEventType.HEARTBEAT));
    };

    // Notification handlers
    const handleNotificationCreated = (data: NotificationSSEData) => {
      dispatch(addNotification(data));
      dispatch(trackEvent(SSEEventType.NOTIFICATION_CREATED));

      // Play sound if enabled (handled by NotificationBell component)
      // Show desktop notification if enabled (handled by NotificationBell component)
    };

    const handleNotificationUpdated = (data: NotificationSSEData) => {
      dispatch(updateNotification(data));
      dispatch(trackEvent(SSEEventType.NOTIFICATION_UPDATED));
    };

    const handleNotificationDeleted = (data: { id: string }) => {
      dispatch(deleteNotification(data.id));
      dispatch(trackEvent(SSEEventType.NOTIFICATION_DELETED));
    };

    // User status handler
    const handleUserStatusChanged = (data: UserStatusSSEData) => {
      dispatch(trackEvent(SSEEventType.USER_STATUS_CHANGED));

      // Dispatch user status update to user slice
      dispatch({
        type: 'user/updateUserStatus',
        payload: data,
      });
    };

    // Workflow handlers
    const handleWorkflowUpdate = (type: SSEEventType) => (data: WorkflowSSEData) => {
      dispatch(trackEvent(type));

      // Show workflow notifications
      switch (type) {
        case SSEEventType.WORKFLOW_STARTED:
          toast.loading(`Workflow "${data.workflowName}" started`, {
            id: `workflow-${data.workflowId}`,
          });
          break;
        case SSEEventType.WORKFLOW_COMPLETED:
          toast.success(`Workflow "${data.workflowName}" completed successfully`, {
            id: `workflow-${data.workflowId}`,
          });
          break;
        case SSEEventType.WORKFLOW_FAILED:
          toast.error(`Workflow "${data.workflowName}" failed: ${data.error}`, {
            id: `workflow-${data.workflowId}`,
          });
          break;
        case SSEEventType.WORKFLOW_STEP_COMPLETED:
          if (data.progress) {
            toast.loading(`Workflow progress: ${data.progress}%`, {
              id: `workflow-${data.workflowId}`,
            });
          }
          break;
      }

      // Dispatch workflow update
      dispatch({
        type: 'workflow/updateWorkflow',
        payload: data,
      });
    };

    // System announcement handler
    const handleSystemAnnouncement = (data: SystemAnnouncementSSEData) => {
      dispatch(trackEvent(SSEEventType.SYSTEM_ANNOUNCEMENT));

      // Create notification for system announcement
      const notification: NotificationSSEData = {
        id: data.id,
        title: data.title,
        message: data.message,
        type: data.severity === 'critical' ? 'error' :
              data.severity === 'warning' ? 'warning' : 'info',
        priority: data.severity === 'critical' ? 'urgent' :
                  data.severity === 'warning' ? 'high' : 'medium',
        read: false,
        createdAt: data.startTime,
        metadata: {
          endTime: data.endTime,
          affectedServices: data.affectedServices,
        },
      };

      dispatch(addNotification(notification));

      // Show persistent toast for critical announcements
      if (data.severity === 'critical') {
        toast.error(data.message, {
          duration: Infinity,
          id: `announcement-${data.id}`,
        });
      }
    };

    // Add all event listeners
    const unsubscribers = [
      addEventListener(SSEEventType.HEARTBEAT, handleHeartbeat),
      addEventListener(SSEEventType.NOTIFICATION_CREATED, handleNotificationCreated),
      addEventListener(SSEEventType.NOTIFICATION_UPDATED, handleNotificationUpdated),
      addEventListener(SSEEventType.NOTIFICATION_DELETED, handleNotificationDeleted),
      addEventListener(SSEEventType.USER_STATUS_CHANGED, handleUserStatusChanged),
      addEventListener(SSEEventType.WORKFLOW_STARTED, handleWorkflowUpdate(SSEEventType.WORKFLOW_STARTED)),
      addEventListener(SSEEventType.WORKFLOW_COMPLETED, handleWorkflowUpdate(SSEEventType.WORKFLOW_COMPLETED)),
      addEventListener(SSEEventType.WORKFLOW_FAILED, handleWorkflowUpdate(SSEEventType.WORKFLOW_FAILED)),
      addEventListener(SSEEventType.WORKFLOW_STEP_COMPLETED, handleWorkflowUpdate(SSEEventType.WORKFLOW_STEP_COMPLETED)),
      addEventListener(SSEEventType.SYSTEM_ANNOUNCEMENT, handleSystemAnnouncement),
    ];

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [isConnected, addEventListener, dispatch]);

  // Automatically connect/disconnect based on authentication status
  useEffect(() => {
    if (isSignedIn && !isConnected && autoConnect) {
      connect();
    } else if (!isSignedIn && isConnected) {
      disconnect();
    }
  }, [isSignedIn, isConnected, autoConnect, connect, disconnect]);

  // Context value
  const contextValue = useMemo<SSEContextValue>(() => ({
    service: null, // Service is managed internally by the hook
    status,
    error: error || undefined,
    isConnected,
    isReconnecting,
  }), [status, error, isConnected, isReconnecting]);

  return (
    <SSEContext.Provider value={contextValue}>
      {children}
    </SSEContext.Provider>
  );
};

/**
 * Hook to use SSE context
 */
export const useSSEContext = (): SSEContextValue => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEContext must be used within SSEProvider');
  }
  return context;
};

/**
 * HOC to wrap components with SSE Provider
 */
export const withSSE = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => (
    <SSEProvider>
      <Component {...props} />
    </SSEProvider>
  );
};

export default SSEProvider;
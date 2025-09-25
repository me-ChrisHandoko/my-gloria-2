/**
 * useSSE Hook
 * Production-ready React hook for Server-Sent Events with Clerk authentication
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { SSEService } from "@/lib/sse/SSEService";
import {
  SSEConnectionStatus,
  SSEEventType,
  SSEEventHandler,
  NotificationSSEData,
  UserStatusSSEData,
  WorkflowSSEData,
  SystemAnnouncementSSEData,
} from "@/types/sse";
import { toast } from "sonner";

/**
 * Hook options
 */
interface UseSSEOptions {
  autoConnect?: boolean;
  reconnectOnFocus?: boolean;
  reconnectOnOnline?: boolean;
  onConnectionChange?: (status: SSEConnectionStatus) => void;
  enableLogging?: boolean;
}

/**
 * Hook return type
 */
interface UseSSEReturn {
  status: SSEConnectionStatus;
  isConnected: boolean;
  isReconnecting: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  addEventListener: <T = any>(
    event: SSEEventType,
    handler: SSEEventHandler<T>
  ) => () => void;
  removeEventListener: <T = any>(
    event: SSEEventType,
    handler: SSEEventHandler<T>
  ) => void;
}

/**
 * Production-ready SSE Hook with Clerk Authentication
 */
export const useSSE = (
  endpoint: string = "/sse",
  options: UseSSEOptions = {}
): UseSSEReturn => {
  const {
    autoConnect = true,
    reconnectOnFocus = true,
    reconnectOnOnline = true,
    onConnectionChange,
    enableLogging = process.env.NODE_ENV === "development",
  } = options;

  const { getToken, isSignedIn } = useAuth();
  const dispatch = useAppDispatch();

  const [status, setStatus] = useState<SSEConnectionStatus>(
    SSEConnectionStatus.DISCONNECTED
  );
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef<SSEService | null>(null);
  const isConnectedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);

  /**
   * Log helper
   */
  const log = useCallback(
    (message: string, ...args: any[]) => {
      if (enableLogging) {
        console.log(`[useSSE] ${message}`, ...args);
      }
    },
    [enableLogging]
  );

  /**
   * Initialize SSE service
   */
  const initializeService = useCallback(async () => {
    if (!isSignedIn) {
      log("User not signed in, skipping SSE connection");
      return null;
    }

    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      // Build SSE URL
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const sseUrl = `${baseUrl}${endpoint}`;

      // Create or get existing service
      if (!serviceRef.current) {
        serviceRef.current = new SSEService(sseUrl, {
          withCredentials: true,
          reconnectInterval: 5000,
          maxReconnectAttempts: 10,
          heartbeatInterval: 30000,
          onOpen: () => {
            log("SSE connection opened");
            setStatus(SSEConnectionStatus.CONNECTED);
            setError(null);
            isConnectedRef.current = true;
            reconnectAttemptsRef.current = 0;
            onConnectionChange?.(SSEConnectionStatus.CONNECTED);
          },
          onError: (err) => {
            log("SSE connection error:", err);
            setError(err);
            setStatus(SSEConnectionStatus.ERROR);
            isConnectedRef.current = false;
            onConnectionChange?.(SSEConnectionStatus.ERROR);
          },
          onReconnect: (attempt) => {
            log(`SSE reconnection attempt ${attempt}`);
            setStatus(SSEConnectionStatus.RECONNECTING);
            reconnectAttemptsRef.current = attempt;
            onConnectionChange?.(SSEConnectionStatus.RECONNECTING);
          },
          onClose: () => {
            log("SSE connection closed");
            setStatus(SSEConnectionStatus.DISCONNECTED);
            isConnectedRef.current = false;
            onConnectionChange?.(SSEConnectionStatus.DISCONNECTED);
          },
        });
      }

      // Set authentication token
      serviceRef.current.setAuthToken(token);

      return serviceRef.current;
    } catch (err) {
      log("Failed to initialize SSE service:", err);
      setError(err as Error);
      return null;
    }
  }, [isSignedIn, getToken, endpoint, log, onConnectionChange]);

  /**
   * Connect to SSE
   */
  const connect = useCallback(async () => {
    log("Connecting to SSE...");
    const service = await initializeService();
    if (service) {
      service.connect();
    }
  }, [initializeService, log]);

  /**
   * Disconnect from SSE
   */
  const disconnect = useCallback(() => {
    log("Disconnecting from SSE...");
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
  }, [log]);

  /**
   * Reconnect to SSE
   */
  const reconnect = useCallback(() => {
    log("Reconnecting to SSE...");
    if (serviceRef.current) {
      serviceRef.current.reconnect();
    }
  }, [log]);

  /**
   * Add event listener wrapper
   */
  const addEventListener = useCallback(
    <T = any>(
      event: SSEEventType,
      handler: SSEEventHandler<T>
    ): (() => void) => {
      if (serviceRef.current) {
        return serviceRef.current.addEventListener(event, handler);
      }
      return () => {};
    },
    []
  );

  /**
   * Remove event listener wrapper
   */
  const removeEventListener = useCallback(
    <T = any>(event: SSEEventType, handler: SSEEventHandler<T>): void => {
      if (serviceRef.current) {
        serviceRef.current.removeEventListener(event, handler);
      }
    },
    []
  );

  /**
   * Setup default event handlers
   */
  useEffect(() => {
    if (!serviceRef.current) return;

    // Notification handler
    const handleNotification = (data: NotificationSSEData) => {
      log("Received notification:", data);

      // Show toast notification
      switch (data.type) {
        case "success":
          toast.success(data.message);
          break;
        case "error":
          toast.error(data.message);
          break;
        case "warning":
          toast(data.message, { icon: "⚠️" });
          break;
        default:
          toast(data.message);
      }

      // Dispatch to Redux store
      dispatch({
        type: "notifications/addNotification",
        payload: data,
      });
    };

    // User status handler
    const handleUserStatus = (data: UserStatusSSEData) => {
      log("User status changed:", data);
      dispatch({
        type: "users/updateUserStatus",
        payload: data,
      });
    };

    // Workflow handler
    const handleWorkflow = (data: WorkflowSSEData) => {
      log("Workflow update:", data);

      if (data.status === "completed") {
        toast.success(`Workflow "${data.workflowName}" completed successfully`);
      } else if (data.status === "failed") {
        toast.error(`Workflow "${data.workflowName}" failed: ${data.error}`);
      }

      dispatch({
        type: "workflows/updateWorkflow",
        payload: data,
      });
    };

    // System announcement handler
    const handleSystemAnnouncement = (data: SystemAnnouncementSSEData) => {
      log("System announcement:", data);

      const icon =
        data.severity === "critical"
          ? "🚨"
          : data.severity === "warning"
          ? "⚠️"
          : "ℹ️";

      toast(data.message, {
        icon,
        duration: data.severity === "critical" ? Infinity : 10000,
      });

      dispatch({
        type: "system/addAnnouncement",
        payload: data,
      });
    };

    // Add event listeners
    const unsubscribers = [
      addEventListener(SSEEventType.NOTIFICATION_CREATED, handleNotification),
      addEventListener(SSEEventType.NOTIFICATION_UPDATED, handleNotification),
      addEventListener(SSEEventType.USER_STATUS_CHANGED, handleUserStatus),
      addEventListener(SSEEventType.WORKFLOW_COMPLETED, handleWorkflow),
      addEventListener(SSEEventType.WORKFLOW_FAILED, handleWorkflow),
      addEventListener(
        SSEEventType.SYSTEM_ANNOUNCEMENT,
        handleSystemAnnouncement
      ),
    ];

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [addEventListener, dispatch, log]);

  /**
   * Handle page visibility change
   */
  useEffect(() => {
    if (!reconnectOnFocus) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isConnectedRef.current) {
        log("Page became visible, reconnecting...");
        reconnect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reconnectOnFocus, reconnect, log]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    if (!reconnectOnOnline) return;

    const handleOnline = () => {
      log("Network came online, reconnecting...");
      reconnect();
    };

    const handleOffline = () => {
      log("Network went offline");
      setStatus(SSEConnectionStatus.DISCONNECTED);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [reconnectOnOnline, reconnect, log]);

  /**
   * Auto-connect on mount if signed in
   */
  useEffect(() => {
    if (autoConnect && isSignedIn) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
      }
    };
  }, [autoConnect, isSignedIn]); // Don't include connect to avoid loops

  return {
    status,
    isConnected: status === SSEConnectionStatus.CONNECTED,
    isReconnecting: status === SSEConnectionStatus.RECONNECTING,
    error,
    connect,
    disconnect,
    reconnect,
    addEventListener,
    removeEventListener,
  };
};

/**
 * Convenience hook for notification-specific SSE events
 */
export const useSSENotifications = (
  onNotification?: (notification: NotificationSSEData) => void
) => {
  const sse = useSSE("/sse/notifications");

  useEffect(() => {
    if (!onNotification) return;

    const unsubscribe = sse.addEventListener(
      SSEEventType.NOTIFICATION_CREATED,
      onNotification
    );

    return unsubscribe;
  }, [sse, onNotification]);

  return sse;
};

/**
 * Convenience hook for workflow-specific SSE events
 */
export const useSSEWorkflows = (
  onWorkflowUpdate?: (workflow: WorkflowSSEData) => void
) => {
  const sse = useSSE("/sse/workflows");

  useEffect(() => {
    if (!onWorkflowUpdate) return;

    const unsubscribers = [
      sse.addEventListener(SSEEventType.WORKFLOW_STARTED, onWorkflowUpdate),
      sse.addEventListener(SSEEventType.WORKFLOW_COMPLETED, onWorkflowUpdate),
      sse.addEventListener(SSEEventType.WORKFLOW_FAILED, onWorkflowUpdate),
      sse.addEventListener(
        SSEEventType.WORKFLOW_STEP_COMPLETED,
        onWorkflowUpdate
      ),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [sse, onWorkflowUpdate]);

  return sse;
};

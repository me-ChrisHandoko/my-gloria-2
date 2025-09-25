import { Middleware } from '@reduxjs/toolkit';

// Extend Window interface for analytics
declare global {
  interface Window {
    analytics?: {
      track: (event: string, properties?: Record<string, any>) => void;
      identify: (userId: string, traits?: Record<string, any>) => void;
      page: (name?: string, properties?: Record<string, any>) => void;
    };
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Analytics middleware for tracking user actions and events
 * Integrates with various analytics services
 */
export const analyticsMiddleware: Middleware = (store) => (next) => (action: any) => {
  // Track specific actions for analytics
  const trackedActions: Record<string, string> = {
    // Auth events
    'auth/login/fulfilled': 'User Login',
    'auth/logout/fulfilled': 'User Logout',
    'auth/signup/fulfilled': 'User Signup',
    'auth/resetPassword/fulfilled': 'Password Reset',

    // User actions
    'user/updateProfile/fulfilled': 'Profile Updated',
    'user/changePassword/fulfilled': 'Password Changed',
    'preferences/update': 'Preferences Updated',

    // Workflow events
    'workflow/create/fulfilled': 'Workflow Created',
    'workflow/update/fulfilled': 'Workflow Updated',
    'workflow/delete/fulfilled': 'Workflow Deleted',
    'workflow/execute/fulfilled': 'Workflow Executed',

    // Notification events
    'notification/markAsRead': 'Notification Read',
    'notification/markAllAsRead': 'All Notifications Read',
    'notification/delete': 'Notification Deleted',

    // Feature usage
    'ui/openModal': 'Modal Opened',
    'ui/changeTheme': 'Theme Changed',
    'ui/toggleSidebar': 'Sidebar Toggled',
  };

  const eventName = trackedActions[action.type];

  if (eventName) {
    // Get current state for context
    const state = store.getState();
    const userId = state.auth?.user?.id;

    // Prepare event properties
    const properties = {
      action: action.type,
      timestamp: Date.now(),
      sessionId: state.auth?.sessionId,
      ...(action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
        ? { ...action.payload }
        : { payload: action.payload }),
    };

    // Remove sensitive data
    delete properties.password;
    delete properties.token;
    delete properties.secret;

    // Track with various analytics services
    try {
      // Segment / Analytics.js
      if (window.analytics?.track) {
        window.analytics.track(eventName, properties);
      }

      // Google Analytics 4
      if (window.gtag) {
        window.gtag('event', eventName.replace(/\s+/g, '_').toLowerCase(), {
          event_category: 'Redux Action',
          event_label: action.type,
          value: properties.timestamp,
          user_id: userId,
        });
      }

      // Google Tag Manager
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'redux_action',
          eventName: eventName,
          eventProperties: properties,
          userId: userId,
        });
      }

      // Custom analytics endpoint
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: eventName,
            properties,
            userId,
            timestamp: new Date().toISOString(),
          }),
        }).catch((error) => {
          console.error('Analytics tracking failed:', error);
        });
      }
    } catch (error) {
      // Fail silently to not break the app
      console.error('Analytics error:', error);
    }
  }

  // Performance tracking for async actions
  if (action.type.endsWith('/pending')) {
    const startTime = performance.now();
    const actionType = action.type.replace('/pending', '');

    // Store start time in action meta
    action.meta = {
      ...action.meta,
      startTime,
    };
  }

  if (action.type.endsWith('/fulfilled') || action.type.endsWith('/rejected')) {
    const actionType = action.type.replace(/\/(fulfilled|rejected)$/, '');
    const startTime = action.meta?.startTime;

    if (startTime) {
      const duration = performance.now() - startTime;

      // Track performance metrics
      if (window.analytics?.track) {
        window.analytics.track('Action Performance', {
          action: actionType,
          status: action.type.endsWith('/fulfilled') ? 'success' : 'error',
          duration: Math.round(duration),
          timestamp: Date.now(),
        });
      }

      // Log slow actions in development
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.warn(`⚠️ Slow action detected: ${actionType} took ${duration.toFixed(2)}ms`);
      }
    }
  }

  return next(action);
};
# Server-Sent Events (SSE) Implementation Guide

## Implementation Status ✅

Successfully implemented a production-ready SSE system with the following features:
- ✅ **Backend**: Proper API versioning (`/api/v1/sse`) with Fastify-compatible SSE handling
- ✅ **Authentication**: Clerk token integration with query parameter support
- ✅ **Frontend**: Comprehensive SSE hooks with automatic reconnection
- ✅ **Error Handling**: Circuit breaker pattern with exponential backoff
- ✅ **Monitoring**: Network connectivity awareness and heartbeat mechanism
- ✅ **Testing**: Created test page at `/dashboard/test-sse` for validation

## Overview

This document provides a comprehensive guide for the production-ready Server-Sent Events (SSE) implementation in the Gloria System frontend. SSE enables real-time, unidirectional communication from the server to the client for notifications, status updates, and system events.

## Architecture

### Core Components

1. **SSE Service Layer** (`/src/lib/sse/SSEService.ts`)
   - Manages WebSocket connections with automatic reconnection
   - Handles authentication with Clerk tokens
   - Provides event listener management
   - Implements heartbeat monitoring

2. **useSSE Hook** (`/src/hooks/useSSE.ts`)
   - React hook for SSE integration
   - Automatic connection management
   - Authentication token handling
   - Network status monitoring

3. **SSE Provider** (`/src/components/providers/SSEProvider.tsx`)
   - Application-wide SSE context
   - Centralized event handling
   - Redux integration

4. **Notification System** (`/src/components/features/notifications/NotificationBell.tsx`)
   - Real-time notification display
   - Sound and desktop notifications
   - Unread count management

## Features

### Production-Ready Capabilities

- ✅ **Automatic Reconnection**: Exponential backoff with configurable retry limits
- ✅ **Authentication Integration**: Clerk token management
- ✅ **Heartbeat Monitoring**: Connection health checks
- ✅ **Event Type System**: Strongly typed events with TypeScript
- ✅ **Redux Integration**: State management for notifications and SSE status
- ✅ **Network Awareness**: Reconnect on network recovery
- ✅ **Page Visibility**: Reconnect when page becomes visible
- ✅ **Error Handling**: Comprehensive error recovery
- ✅ **Development Logging**: Configurable debug output

## Event Types

### Supported Events

```typescript
enum SSEEventType {
  // Connection Events
  CONNECTION_ESTABLISHED = 'connection_established',
  HEARTBEAT = 'heartbeat',

  // Notification Events
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_UPDATED = 'notification.updated',
  NOTIFICATION_DELETED = 'notification.deleted',

  // User Events
  USER_STATUS_CHANGED = 'user.status_changed',
  USER_UPDATED = 'user.updated',

  // Workflow Events
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',

  // System Events
  SYSTEM_ANNOUNCEMENT = 'system.announcement',
  SYSTEM_MAINTENANCE = 'system.maintenance',
}
```

## Usage

### Basic Implementation

```typescript
// In your component
import { useSSE } from '@/hooks/useSSE';

function MyComponent() {
  const { status, isConnected, addEventListener } = useSSE('/sse');

  useEffect(() => {
    const unsubscribe = addEventListener(
      SSEEventType.NOTIFICATION_CREATED,
      (notification) => {
        console.log('New notification:', notification);
      }
    );

    return unsubscribe;
  }, [addEventListener]);

  return (
    <div>
      Connection Status: {status}
    </div>
  );
}
```

### With Redux Integration

```typescript
// Notifications are automatically synced to Redux
import { useAppSelector } from '@/hooks';
import { selectUnreadCount } from '@/store/slices/notificationSlice';

function NotificationCounter() {
  const unreadCount = useAppSelector(selectUnreadCount);

  return <span>Unread: {unreadCount}</span>;
}
```

### Custom Event Handlers

```typescript
// Add custom event handlers
const sse = useSSE('/sse');

useEffect(() => {
  const handleWorkflow = (data: WorkflowSSEData) => {
    // Custom workflow handling
    if (data.status === 'completed') {
      refreshDashboard();
    }
  };

  const unsubscribe = sse.addEventListener(
    SSEEventType.WORKFLOW_COMPLETED,
    handleWorkflow
  );

  return unsubscribe;
}, [sse]);
```

## Configuration

### Environment Variables

```env
# Required
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Optional
NEXT_PUBLIC_SSE_RECONNECT_INTERVAL=5000
NEXT_PUBLIC_SSE_MAX_RECONNECT_ATTEMPTS=10
NEXT_PUBLIC_SSE_HEARTBEAT_INTERVAL=30000
```

### SSE Provider Configuration

```tsx
// In app/layout.tsx
<SSEProvider
  autoConnect={true}
  endpoint="/sse"
  enableLogging={process.env.NODE_ENV === 'development'}
>
  {children}
</SSEProvider>
```

## Testing

### Manual Testing

1. **Connection Testing**
   ```bash
   # Start the application
   npm run dev

   # Monitor console for SSE logs
   # Look for: "[SSE] Connection established"
   ```

2. **Notification Testing**
   - Use backend API to send test notifications
   - Verify real-time updates in notification bell
   - Check Redux DevTools for state updates

3. **Reconnection Testing**
   - Disable network connection
   - Re-enable network
   - Verify automatic reconnection

### Automated Testing

```typescript
// Example test for SSE hook
import { renderHook } from '@testing-library/react';
import { useSSE } from '@/hooks/useSSE';

describe('useSSE', () => {
  it('should connect on mount', async () => {
    const { result } = renderHook(() => useSSE('/sse'));

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Connection Fails**
   - Check API URL configuration
   - Verify authentication token
   - Check CORS settings on backend

2. **Events Not Received**
   - Verify event type matches backend
   - Check Redux DevTools for state updates
   - Enable logging for debugging

3. **Reconnection Issues**
   - Check max reconnect attempts
   - Verify network connectivity
   - Check browser console for errors

### Debug Mode

Enable debug logging:
```typescript
const sse = useSSE('/sse', {
  enableLogging: true
});
```

## Performance Considerations

### Optimization Tips

1. **Event Throttling**: Implement throttling for high-frequency events
2. **Selective Listening**: Only subscribe to needed events
3. **Memory Management**: Properly cleanup listeners on unmount
4. **Connection Pooling**: Use single SSE connection for entire app

### Resource Usage

- **Memory**: ~5-10MB for SSE connection and event queue
- **Network**: Minimal bandwidth (heartbeat every 30s)
- **CPU**: Negligible impact

## Security

### Best Practices

1. **Authentication**: Always validate tokens before establishing connection
2. **HTTPS**: Use secure connections in production
3. **Token Refresh**: Handle token expiration gracefully
4. **Input Validation**: Validate all incoming event data
5. **Rate Limiting**: Implement client-side rate limiting for events

## API Backend Requirements

### Expected Endpoints

```
GET /api/v1/sse
- Headers: Authorization: Bearer <token>
- Query: ?lastEventId=<id>
- Response: EventStream
```

### Event Format

```javascript
// Server should send events in this format
event: notification.created
id: 12345
data: {"id":"1","title":"New Task","message":"Task assigned"}

// Heartbeat
event: heartbeat
data: {"timestamp":"2024-01-01T00:00:00Z"}
```

## Monitoring

### Metrics to Track

1. **Connection Metrics**
   - Connection success rate
   - Reconnection attempts
   - Connection duration

2. **Event Metrics**
   - Events received per minute
   - Event processing time
   - Failed event handling

3. **Error Metrics**
   - Connection errors
   - Authentication failures
   - Network timeouts

## Future Enhancements

1. **WebSocket Upgrade**: Migrate to WebSocket for bidirectional communication
2. **Event Replay**: Implement event history and replay
3. **Offline Queue**: Queue events when offline
4. **Custom Protocols**: Support for custom event protocols
5. **Analytics Integration**: Track user engagement with real-time events

## Support

For issues or questions regarding SSE implementation:
1. Check this documentation
2. Review error logs in browser console
3. Contact the backend team for server-side issues
4. File an issue in the project repository
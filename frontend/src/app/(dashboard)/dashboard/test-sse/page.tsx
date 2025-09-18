'use client';

import { useEffect, useState } from 'react';
import { useSSE, useSSENotifications, useSSEWorkflows } from '@/hooks/useSSE';
import { SSEConnectionStatus, SSEEventType } from '@/types/sse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, RefreshCw, Power, PowerOff } from 'lucide-react';

export default function SSETestPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);

  // Main SSE connection
  const {
    status,
    isConnected,
    isReconnecting,
    error,
    connect,
    disconnect,
    reconnect,
    addEventListener,
  } = useSSE('/sse', {
    autoConnect: true,
    reconnectOnFocus: true,
    reconnectOnOnline: true,
    enableLogging: true,
    onConnectionChange: (newStatus) => {
      const event = {
        type: 'CONNECTION_STATUS',
        status: newStatus,
        timestamp: new Date().toISOString(),
      };
      setEvents((prev) => [event, ...prev].slice(0, 50));
    },
  });

  // Notification-specific SSE
  const notificationSSE = useSSENotifications((notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 20));
  });

  // Workflow-specific SSE
  const workflowSSE = useSSEWorkflows((workflow) => {
    setWorkflows((prev) => [workflow, ...prev].slice(0, 20));
  });

  useEffect(() => {
    // Listen to all event types
    const unsubscribers = Object.values(SSEEventType).map((eventType) =>
      addEventListener(eventType, (data) => {
        const event = {
          type: eventType,
          data,
          timestamp: new Date().toISOString(),
        };
        setEvents((prev) => [event, ...prev].slice(0, 50));
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [addEventListener]);

  const getStatusBadge = () => {
    switch (status) {
      case SSEConnectionStatus.CONNECTED:
        return <Badge className="bg-green-500">Connected</Badge>;
      case SSEConnectionStatus.CONNECTING:
        return <Badge className="bg-blue-500">Connecting</Badge>;
      case SSEConnectionStatus.RECONNECTING:
        return <Badge className="bg-yellow-500">Reconnecting</Badge>;
      case SSEConnectionStatus.DISCONNECTED:
        return <Badge className="bg-gray-500">Disconnected</Badge>;
      case SSEConnectionStatus.ERROR:
        return <Badge className="bg-red-500">Error</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const clearEvents = () => setEvents([]);
  const clearNotifications = () => setNotifications([]);
  const clearWorkflows = () => setWorkflows([]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">SSE Connection Test</h1>
        <p className="text-muted-foreground">
          Test page for Server-Sent Events connection with the backend
        </p>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Current SSE connection state</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm">
              {isConnected
                ? 'Connected to SSE server'
                : isReconnecting
                ? 'Attempting to reconnect...'
                : 'Not connected'}
            </span>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={connect}
              disabled={isConnected}
              variant="outline"
              size="sm"
            >
              <Power className="h-4 w-4 mr-1" />
              Connect
            </Button>
            <Button
              onClick={disconnect}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              <PowerOff className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
            <Button
              onClick={reconnect}
              disabled={isConnected}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reconnect
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Main Connection</p>
              <p className="text-2xl font-bold">{status}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Notification SSE</p>
              <p className="text-2xl font-bold">
                {notificationSSE.isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Workflow SSE</p>
              <p className="text-2xl font-bold">
                {workflowSSE.isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Events</CardTitle>
              <CardDescription>
                Real-time events from SSE connection ({events.length} events)
              </CardDescription>
            </div>
            <Button onClick={clearEvents} variant="outline" size="sm">
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No events received yet
              </p>
            ) : (
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className="p-2 bg-muted rounded text-xs font-mono"
                  >
                    <div className="flex justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(event.data || event.status, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Notifications Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Notification events ({notifications.length})
                </CardDescription>
              </div>
              <Button onClick={clearNotifications} variant="outline" size="sm">
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">
                  No notifications yet
                </p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-xs">
                      <pre className="overflow-x-auto">
                        {JSON.stringify(notification, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Workflows Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workflows</CardTitle>
                <CardDescription>
                  Workflow events ({workflows.length})
                </CardDescription>
              </div>
              <Button onClick={clearWorkflows} variant="outline" size="sm">
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              {workflows.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">
                  No workflow events yet
                </p>
              ) : (
                <div className="space-y-2">
                  {workflows.map((workflow, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-xs">
                      <pre className="overflow-x-auto">
                        {JSON.stringify(workflow, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
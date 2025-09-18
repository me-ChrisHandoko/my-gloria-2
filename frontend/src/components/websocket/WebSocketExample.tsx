'use client';

import React, { useState, useEffect } from 'react';
import {
  useWebSocket,
  useWebSocketConnection,
  useWebSocketEvent,
  WebSocketStatus
} from '@/contexts/WebSocketContext';
import { WS_EVENTS } from '@/lib/websocket/config';

/**
 * Example component showing WebSocket usage
 */
export function WebSocketExample() {
  const { emit, request, metrics } = useWebSocket();
  const { isConnected, connect, disconnect } = useWebSocketConnection();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  // Listen to messages
  useWebSocketEvent(WS_EVENTS.MESSAGE, (data) => {
    console.log('Received message:', data);
    setMessages((prev) => [...prev, { type: 'received', data, timestamp: Date.now() }]);
  });

  // Listen to notifications
  useWebSocketEvent(WS_EVENTS.NOTIFICATION, (data) => {
    console.log('Received notification:', data);
    setMessages((prev) => [...prev, { type: 'notification', data, timestamp: Date.now() }]);
  });

  // Send a message
  const sendMessage = () => {
    if (!isConnected) {
      alert('Not connected to WebSocket');
      return;
    }

    const message = {
      text: 'Hello from client!',
      timestamp: Date.now(),
    };

    emit(WS_EVENTS.MESSAGE, message);
    setMessages((prev) => [...prev, { type: 'sent', data: message, timestamp: Date.now() }]);
  };

  // Send a request and wait for response
  const sendRequest = async () => {
    if (!isConnected) {
      alert('Not connected to WebSocket');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const result = await request('echo', {
        message: 'Test request',
        timestamp: Date.now(),
      });

      setResponse(result);
      console.log('Request response:', result);
    } catch (error) {
      console.error('Request failed:', error);
      setResponse({ error: error instanceof Error ? error.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
    setResponse(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-card rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">WebSocket Demo</h2>

        {/* Connection Status */}
        <div className="mb-4">
          <WebSocketStatus />
        </div>

        {/* Connection Controls */}
        <div className="flex gap-2 mb-4">
          {!isConnected ? (
            <button
              onClick={() => connect()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Message Controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={sendMessage}
            disabled={!isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Message
          </button>

          <button
            onClick={sendRequest}
            disabled={!isConnected || loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>

          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            Clear
          </button>
        </div>

        {/* Metrics */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <h3 className="font-semibold mb-2">Metrics</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Messages Sent: {metrics.messagesSent}</div>
            <div>Messages Received: {metrics.messagesReceived}</div>
            <div>Bytes Sent: {metrics.bytesSent}</div>
            <div>Bytes Received: {metrics.bytesReceived}</div>
            <div>Uptime: {Math.floor(metrics.uptime / 1000)}s</div>
            <div>Queue Size: {metrics.queuedMessages}</div>
          </div>
        </div>

        {/* Request Response */}
        {response && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded">
            <h3 className="font-semibold mb-2">Request Response</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        {/* Messages */}
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <h3 className="font-semibold mb-2">Messages</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500">No messages yet</p>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-sm ${
                    msg.type === 'sent'
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : msg.type === 'notification'
                      ? 'bg-yellow-100 dark:bg-yellow-900'
                      : 'bg-green-100 dark:bg-green-900'
                  }`}
                >
                  <div className="font-semibold">{msg.type.toUpperCase()}</div>
                  <pre className="overflow-auto">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
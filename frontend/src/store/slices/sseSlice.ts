/**
 * SSE Slice
 * Redux slice for managing SSE connection state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { SSEConnectionStatus } from '@/types/sse';

/**
 * SSE state interface
 */
interface SSEState {
  status: SSEConnectionStatus;
  lastEventId: string | null;
  lastHeartbeat: string | null;
  reconnectAttempts: number;
  error: string | null;
  connectedAt: string | null;
  events: {
    total: number;
    byType: Record<string, number>;
  };
}

/**
 * Initial state
 */
const initialState: SSEState = {
  status: SSEConnectionStatus.DISCONNECTED,
  lastEventId: null,
  lastHeartbeat: null,
  reconnectAttempts: 0,
  error: null,
  connectedAt: null,
  events: {
    total: 0,
    byType: {},
  },
};

/**
 * SSE slice
 */
const sseSlice = createSlice({
  name: 'sse',
  initialState,
  reducers: {
    // Update connection status
    setConnectionStatus: (state, action: PayloadAction<SSEConnectionStatus>) => {
      state.status = action.payload;

      // Reset error on successful connection
      if (action.payload === SSEConnectionStatus.CONNECTED) {
        state.error = null;
        state.reconnectAttempts = 0;
        state.connectedAt = new Date().toISOString();
      }

      // Clear connected time on disconnect
      if (action.payload === SSEConnectionStatus.DISCONNECTED ||
          action.payload === SSEConnectionStatus.ERROR) {
        state.connectedAt = null;
      }
    },

    // Update last event ID
    setLastEventId: (state, action: PayloadAction<string>) => {
      state.lastEventId = action.payload;
    },

    // Update heartbeat timestamp
    setLastHeartbeat: (state, action: PayloadAction<string>) => {
      state.lastHeartbeat = action.payload;
    },

    // Increment reconnect attempts
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts++;
    },

    // Reset reconnect attempts
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.status = SSEConnectionStatus.ERROR;
      }
    },

    // Track event received
    trackEvent: (state, action: PayloadAction<string>) => {
      state.events.total++;
      state.events.byType[action.payload] = (state.events.byType[action.payload] || 0) + 1;
    },

    // Reset SSE state
    resetSSEState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

/**
 * Actions
 */
export const {
  setConnectionStatus,
  setLastEventId,
  setLastHeartbeat,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  setError,
  trackEvent,
  resetSSEState,
} = sseSlice.actions;

/**
 * Selectors
 */
export const selectSSEStatus = (state: RootState) => state.sse.status;

export const selectIsSSEConnected = (state: RootState) =>
  state.sse.status === SSEConnectionStatus.CONNECTED;

export const selectIsSSEReconnecting = (state: RootState) =>
  state.sse.status === SSEConnectionStatus.RECONNECTING;

export const selectSSEError = (state: RootState) => state.sse.error;

export const selectSSEConnectionInfo = (state: RootState) => ({
  status: state.sse.status,
  connectedAt: state.sse.connectedAt,
  lastHeartbeat: state.sse.lastHeartbeat,
  reconnectAttempts: state.sse.reconnectAttempts,
});

export const selectSSEEventStats = (state: RootState) => state.sse.events;

/**
 * Reducer
 */
export default sseSlice.reducer;
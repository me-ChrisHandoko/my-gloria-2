import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v7 as uuidv7 } from 'uuid';
import { Observable, Subject, interval, merge } from 'rxjs';
import { map, filter, takeUntil } from 'rxjs/operators';

export enum SSEEventType {
  // Connection events
  CONNECTION_ESTABLISHED = 'connection_established',
  HEARTBEAT = 'heartbeat',

  // Notification events
  NOTIFICATION_CREATED = 'notification_created',
  NOTIFICATION_UPDATED = 'notification_updated',
  NOTIFICATION_DELETED = 'notification_deleted',

  // User status events
  USER_STATUS_CHANGED = 'user_status_changed',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',

  // Workflow events
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
  WORKFLOW_STEP_COMPLETED = 'workflow_step_completed',

  // System events
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SYSTEM_UPDATE = 'system_update',
}

export interface SSEMessage {
  id: string;
  type: SSEEventType;
  data: any;
  timestamp: string;
  userId?: string;
}

export interface SSEClient {
  id: string;
  userId: string;
  connectionId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class SSEService implements OnModuleDestroy {
  private readonly logger = new Logger(SSEService.name);
  private readonly clients = new Map<string, SSEClient>();
  private readonly clientSubjects = new Map<string, Subject<SSEMessage>>();
  private readonly destroy$ = new Subject<void>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.startHeartbeat();
    this.setupEventListeners();
  }

  onModuleDestroy() {
    this.logger.log('Destroying SSE service...');
    this.stopHeartbeat();
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnectAllClients();
  }

  /**
   * Create SSE connection for a user
   */
  createConnection(
    userId: string,
    metadata?: Record<string, any>,
  ): Observable<any> {
    const connectionId = uuidv7();
    const subject = new Subject<SSEMessage>();

    // Register client
    const client: SSEClient = {
      id: connectionId,
      userId,
      connectionId,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      metadata,
    };

    this.clients.set(connectionId, client);
    this.clientSubjects.set(connectionId, subject);

    this.logger.log(
      `SSE client connected: ${connectionId} for user: ${userId}`,
    );

    // Send initial connection established message
    this.sendToClient(connectionId, {
      id: uuidv7(),
      type: SSEEventType.CONNECTION_ESTABLISHED,
      data: { connectionId, userId },
      timestamp: new Date().toISOString(),
      userId,
    });

    // Create heartbeat observable
    const heartbeat$ = interval(30000).pipe(
      map(() => ({
        id: uuidv7(),
        type: SSEEventType.HEARTBEAT,
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
        userId,
      })),
      takeUntil(this.destroy$),
    );

    // Merge client messages with heartbeat
    const messages$ = merge(subject, heartbeat$).pipe(
      takeUntil(this.destroy$),
      map((message) => this.formatSSEMessage(message)),
    );

    // Clean up on disconnect
    messages$.subscribe({
      complete: () => {
        this.disconnectClient(connectionId);
      },
      error: (error) => {
        this.logger.error(`SSE error for client ${connectionId}:`, error);
        this.disconnectClient(connectionId);
      },
    });

    return messages$;
  }

  /**
   * Disconnect a specific client
   */
  disconnectClient(connectionId: string): void {
    const client = this.clients.get(connectionId);
    if (client) {
      this.logger.log(
        `SSE client disconnected: ${connectionId} for user: ${client.userId}`,
      );

      // Clean up subject
      const subject = this.clientSubjects.get(connectionId);
      if (subject) {
        subject.complete();
        this.clientSubjects.delete(connectionId);
      }

      // Remove client
      this.clients.delete(connectionId);

      // Emit user offline event if no more connections
      const remainingConnections = Array.from(this.clients.values()).filter(
        (c) => c.userId === client.userId,
      );

      if (remainingConnections.length === 0) {
        this.eventEmitter.emit(SSEEventType.USER_OFFLINE, {
          userId: client.userId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Disconnect all clients
   */
  private disconnectAllClients(): void {
    this.logger.log(`Disconnecting all ${this.clients.size} SSE clients...`);

    for (const connectionId of this.clients.keys()) {
      this.disconnectClient(connectionId);
    }
  }

  /**
   * Send message to a specific client
   */
  sendToClient(connectionId: string, message: SSEMessage): void {
    const subject = this.clientSubjects.get(connectionId);
    if (subject) {
      subject.next(message);

      // Update last heartbeat
      const client = this.clients.get(connectionId);
      if (client) {
        client.lastHeartbeat = new Date();
      }
    }
  }

  /**
   * Send message to a specific user (all their connections)
   */
  sendToUser(userId: string, message: Partial<SSEMessage>): void {
    const userClients = Array.from(this.clients.entries()).filter(
      ([_, client]) => client.userId === userId,
    );

    for (const [connectionId, _] of userClients) {
      this.sendToClient(connectionId, {
        id: message.id || uuidv7(),
        type: message.type || SSEEventType.NOTIFICATION_CREATED,
        data: message.data,
        timestamp: message.timestamp || new Date().toISOString(),
        userId,
      });
    }

    this.logger.debug(
      `Sent message to ${userClients.length} connections for user ${userId}`,
    );
  }

  /**
   * Send message to multiple users
   */
  sendToUsers(userIds: string[], message: Partial<SSEMessage>): void {
    for (const userId of userIds) {
      this.sendToUser(userId, message);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: Partial<SSEMessage>): void {
    const fullMessage: SSEMessage = {
      id: message.id || uuidv7(),
      type: message.type || SSEEventType.SYSTEM_ANNOUNCEMENT,
      data: message.data,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    for (const [connectionId, client] of this.clients.entries()) {
      this.sendToClient(connectionId, {
        ...fullMessage,
        userId: client.userId,
      });
    }

    this.logger.debug(`Broadcast message to ${this.clients.size} clients`);
  }

  /**
   * Get connected users
   */
  getConnectedUsers(): string[] {
    const users = new Set<string>();
    for (const client of this.clients.values()) {
      users.add(client.userId);
    }
    return Array.from(users);
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients by user ID
   */
  getClientsByUserId(userId: string): SSEClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );
  }

  /**
   * Format message for SSE
   */
  private formatSSEMessage(message: SSEMessage): any {
    const data = JSON.stringify(message);

    return {
      data: `event: ${message.type}\ndata: ${data}\nid: ${message.id}\n\n`,
    };
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    // Check for stale connections every 60 seconds
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 90000; // 90 seconds

      for (const [connectionId, client] of this.clients.entries()) {
        const timeSinceLastHeartbeat =
          now.getTime() - client.lastHeartbeat.getTime();

        if (timeSinceLastHeartbeat > staleThreshold) {
          this.logger.warn(`Removing stale connection: ${connectionId}`);
          this.disconnectClient(connectionId);
        }
      }
    }, 60000);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Setup internal event listeners
   */
  private setupEventListeners(): void {
    // Listen for notification events
    this.eventEmitter.on('notification.created', (data) => {
      if (data.userId) {
        this.sendToUser(data.userId, {
          type: SSEEventType.NOTIFICATION_CREATED,
          data,
        });
      }
    });

    this.eventEmitter.on('notification.updated', (data) => {
      if (data.userId) {
        this.sendToUser(data.userId, {
          type: SSEEventType.NOTIFICATION_UPDATED,
          data,
        });
      }
    });

    // Listen for workflow events
    this.eventEmitter.on('workflow.started', (data) => {
      if (data.userId) {
        this.sendToUser(data.userId, {
          type: SSEEventType.WORKFLOW_STARTED,
          data,
        });
      }
    });

    this.eventEmitter.on('workflow.completed', (data) => {
      if (data.userId) {
        this.sendToUser(data.userId, {
          type: SSEEventType.WORKFLOW_COMPLETED,
          data,
        });
      }
    });

    this.eventEmitter.on('workflow.failed', (data) => {
      if (data.userId) {
        this.sendToUser(data.userId, {
          type: SSEEventType.WORKFLOW_FAILED,
          data,
        });
      }
    });

    // Listen for system events
    this.eventEmitter.on('system.announcement', (data) => {
      this.broadcast({
        type: SSEEventType.SYSTEM_ANNOUNCEMENT,
        data,
      });
    });

    this.eventEmitter.on('system.maintenance', (data) => {
      this.broadcast({
        type: SSEEventType.SYSTEM_MAINTENANCE,
        data,
      });
    });
  }
}

import {
  Controller,
  Get,
  Query,
  Res,
  Logger,
  UseGuards,
  Req,
  HttpStatus,
  BadRequestException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, interval, map } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../core/auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { SSEService } from './sse.service';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';

interface ClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
}

@ApiTags('Server-Sent Events')
@Controller('sse')
export class SSEController {
  private readonly logger = new Logger(SSEController.name);

  constructor(
    private readonly sseService: SSEService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Main SSE endpoint with Clerk authentication
   */
  @Get()
  @ApiOperation({
    summary: 'Establish SSE connection',
    description:
      'Creates a Server-Sent Events connection for real-time updates',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description: 'Clerk JWT token (can also be sent in Authorization header)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SSE connection established',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  async connectSSE(
    @Query('token') token: string,
    @Query('lastEventId') lastEventId: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Get token from query param or Authorization header
    const authToken = token || this.extractTokenFromHeader(request) || '';

    if (!authToken) {
      reply.status(400).send({ message: 'Authentication token required' });
      return;
    }

    // Verify token with Clerk
    const userId = await this.verifyClerkToken(authToken);

    if (!userId) {
      reply.status(401).send({ message: 'Invalid authentication token' });
      return;
    }

    // Log connection
    this.logger.log(`SSE connection established for user: ${userId}`);

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': this.getAllowedOrigins(),
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    });

    // Create SSE connection
    const connection$ = this.sseService.createConnection(userId, {
      lastEventId,
      userAgent: request.headers['user-agent'] as string,
      ip: request.ip,
    });

    // Subscribe to the connection and send events
    const subscription = connection$.subscribe({
      next: (event) => {
        // Send the SSE formatted event
        reply.raw.write(event.data);
      },
      error: (error) => {
        this.logger.error(`SSE error for user ${userId}:`, error);
        reply.raw.end();
      },
      complete: () => {
        this.logger.log(`SSE connection closed for user ${userId}`);
        reply.raw.end();
      },
    });

    // Handle client disconnect
    request.raw.on('close', () => {
      this.logger.log(`Client disconnected: ${userId}`);
      subscription.unsubscribe();
    });

    // Handle connection errors
    request.raw.on('error', (error) => {
      this.logger.error(`Connection error for ${userId}:`, error);
      subscription.unsubscribe();
    });
  }

  /**
   * SSE endpoint for notifications only
   */
  @Get('notifications')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Notification-specific SSE connection',
    description: 'Creates SSE connection for notification events only',
  })
  async connectNotificationSSE(
    @CurrentUser() user: ClerkUser,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Log connection
    this.logger.log(
      `SSE notification connection established for user: ${user.id}`,
    );

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': this.getAllowedOrigins(),
      'X-Accel-Buffering': 'no',
    });

    // Create SSE connection for notifications
    const connection$ = this.sseService.createConnection(user.id, {
      userAgent: request.headers['user-agent'] as string,
      ip: request.ip,
    });

    // Subscribe and send events
    const subscription = connection$.subscribe({
      next: (event) => {
        reply.raw.write(event.data);
      },
      error: (error) => {
        this.logger.error(`SSE notification error for user ${user.id}:`, error);
        reply.raw.end();
      },
      complete: () => {
        this.logger.log(
          `SSE notification connection closed for user ${user.id}`,
        );
        reply.raw.end();
      },
    });

    // Handle client disconnect
    request.raw.on('close', () => {
      this.logger.log(`Notification client disconnected: ${user.id}`);
      subscription.unsubscribe();
    });
  }

  /**
   * SSE endpoint for workflow events
   */
  @Get('workflows')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Workflow-specific SSE connection',
    description: 'Creates SSE connection for workflow events only',
  })
  async connectWorkflowSSE(
    @CurrentUser() user: ClerkUser,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Log connection
    this.logger.log(`SSE workflow connection established for user: ${user.id}`);

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': this.getAllowedOrigins(),
      'X-Accel-Buffering': 'no',
    });

    // Create SSE connection for workflows
    const connection$ = this.sseService.createConnection(user.id, {
      userAgent: request.headers['user-agent'] as string,
      ip: request.ip,
    });

    // Subscribe and send events
    const subscription = connection$.subscribe({
      next: (event) => {
        reply.raw.write(event.data);
      },
      error: (error) => {
        this.logger.error(`SSE workflow error for user ${user.id}:`, error);
        reply.raw.end();
      },
      complete: () => {
        this.logger.log(`SSE workflow connection closed for user ${user.id}`);
        reply.raw.end();
      },
    });

    // Handle client disconnect
    request.raw.on('close', () => {
      this.logger.log(`Workflow client disconnected: ${user.id}`);
      subscription.unsubscribe();
    });
  }

  /**
   * Get connection status
   */
  @Get('status')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get SSE connection status',
    description: 'Returns current SSE connection status and statistics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection status retrieved',
  })
  async getStatus(@CurrentUser() user: ClerkUser) {
    const connectedUsers = this.sseService.getConnectedUsers();
    const clientCount = this.sseService.getClientCount();
    const userConnections = this.sseService.getClientsByUserId(user.id);

    return {
      status: 'operational',
      totalConnections: clientCount,
      connectedUsers: connectedUsers.length,
      yourConnections: userConnections.length,
      connections: userConnections.map((client) => ({
        id: client.connectionId,
        connectedAt: client.connectedAt,
        lastHeartbeat: client.lastHeartbeat,
      })),
    };
  }

  /**
   * Extract token from Authorization header
   */
  private extractTokenFromHeader(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  /**
   * Verify Clerk JWT token
   */
  private async verifyClerkToken(token: string): Promise<string | null> {
    try {
      // Verify the session token with Clerk
      const verifiedToken = await clerkClient.verifyToken(token);

      if (!verifiedToken || !verifiedToken.sub) {
        return null;
      }

      // The 'sub' field contains the user ID
      return verifiedToken.sub;
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Get allowed origins from config
   */
  private getAllowedOrigins(): string {
    const origins = this.configService.get<string[]>('cors.origins', [
      'http://localhost:3000',
    ]);

    // For SSE, we need to return a single origin that matches the request
    // In production, you might want to check the request origin against the allowed list
    return origins[0] || '*';
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_AUTH_KEY } from '../decorators/skip-auth.decorator';
import { ClerkAuthService } from '../services/clerk-auth.service';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  profileImageUrl?: string | null;
  clerkUserId: string;
  sessionId: string;
  organizationId?: string | null;
  organizationRole?: string | null;
  profileId?: string;
  nip?: string;
  roles?: any[];
  permissions?: any[];
  positions?: any[];
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private clerkAuthService: ClerkAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Check if route is public
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (isPublic) {
        return true;
      }

      // Check if auth should be skipped (for internal services)
      const skipAuth = this.reflector.getAllAndOverride<boolean>(
        SKIP_AUTH_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (skipAuth) {
        this.logger.debug('Authentication skipped for internal service call');
        return true;
      }

      const request = context.switchToHttp().getRequest<FastifyRequest>();
      const token = this.extractTokenFromHeader(request);

      if (!token) {
        this.logger.warn('No authentication token provided');
        throw new UnauthorizedException({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Authentication token is required',
          error: 'Unauthorized',
        });
      }

      // Verify session with Clerk service
      const session = await this.clerkAuthService.verifySession(token);

      // Get user details from Clerk
      const clerkUser = await this.clerkAuthService.getClerkUser(
        session.userId,
      );

      // Check if user is banned or locked
      if (clerkUser.banned) {
        throw new UnauthorizedException({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'User account is banned',
          error: 'Forbidden',
        });
      }

      if (clerkUser.publicMetadata?.locked) {
        throw new UnauthorizedException({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'User account is locked',
          error: 'Forbidden',
        });
      }

      // Build authenticated user object
      const authenticatedUser: AuthenticatedUser = {
        id: clerkUser.id,
        clerkUserId: clerkUser.id,
        email: clerkUser.email || undefined,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        username: clerkUser.username,
        profileImageUrl: clerkUser.profileImageUrl,
        sessionId: session.sessionId,
        organizationId: session.organizationId,
        organizationRole: session.organizationRole,
      };

      // Sync with database and validate user authorization
      // This will throw UnauthorizedException if user is not in DataKaryawan or not active
      const userProfile =
        await this.clerkAuthService.syncUserProfile(clerkUser);

      // If we reach here, user is validated and authorized
      if (!userProfile) {
        // This shouldn't happen if syncUserProfile is working correctly
        this.logger.error(
          `Critical error: syncUserProfile returned null for ${clerkUser.email}`,
        );
        throw new UnauthorizedException({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'User profile validation failed',
          error: 'Forbidden',
        });
      }

      authenticatedUser.profileId = userProfile.id;
      authenticatedUser.nip = userProfile.nip;

      // Load user roles and permissions
      const rolesAndPermissions =
        await this.clerkAuthService.loadUserRolesAndPermissions(userProfile.id);
      authenticatedUser.roles = rolesAndPermissions.roles;
      authenticatedUser.permissions = rolesAndPermissions.permissions;
      authenticatedUser.positions = rolesAndPermissions.positions;

      // Attach user to request
      (request as any).user = authenticatedUser;
      (request as any).sessionId = session.sessionId;

      const executionTime = Date.now() - startTime;
      if (executionTime > 100) {
        this.logger.warn(`Slow authentication: ${executionTime}ms`);
      }

      // Audit log for sensitive operations
      if (this.shouldAuditLog(request)) {
        await this.clerkAuthService.createAuditLog(
          authenticatedUser.id,
          'AUTH_SUCCESS',
          {
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            url: (request as any).url,
            method: request.method,
          },
        );
      }

      return true;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Authentication failed after ${executionTime}ms`,
        error instanceof Error ? error.stack : error,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Authentication failed',
        error: 'Unauthorized',
      });
    }
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      this.logger.warn('Invalid authorization header format');
      return undefined;
    }

    return token;
  }

  private shouldAuditLog(request: FastifyRequest): boolean {
    // Only log sensitive operations
    const sensitiveRoutes = [
      '/users',
      '/permissions',
      '/roles',
      '/schools',
      '/departments',
    ];

    const requestUrl = (request as any).url || '';
    const method = request.method;

    // Log all non-GET requests to sensitive routes
    if (method !== 'GET') {
      return sensitiveRoutes.some((route) => requestUrl.startsWith(route));
    }

    // Log GET requests only for specific sensitive endpoints
    const sensitiveGetEndpoints = ['/permissions', '/roles'];

    return sensitiveGetEndpoints.some((endpoint) =>
      requestUrl.startsWith(endpoint),
    );
  }
}

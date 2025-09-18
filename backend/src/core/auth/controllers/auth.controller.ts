import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { ClerkAuthService } from '../services/clerk-auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { SkipAuth } from '../decorators/skip-auth.decorator';
import { AuthenticatedUser } from '../guards/clerk-auth.guard';
import { Logger } from '@nestjs/common';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly clerkAuthService: ClerkAuthService) {}

  /**
   * Public health check endpoint
   */
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'gloria-backend-auth',
    };
  }

  /**
   * Login endpoint - validates Clerk token and creates session
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates user with Clerk token and returns session information',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        clerkToken: {
          type: 'string',
          description: 'Clerk authentication token',
          example: 'clerk_token_xyz123',
        },
      },
      required: ['clerkToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Login successful' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            profileId: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
        sessionId: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: { clerkToken: string }) {
    try {
      // Verify Clerk token
      const clerkUser = await this.clerkAuthService.verifyToken(
        loginDto.clerkToken,
      );

      if (!clerkUser) {
        this.logger.warn('Login attempt with invalid token');
        throw new UnauthorizedException({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Invalid authentication token',
          error: 'Unauthorized',
        });
      }

      // Load and validate user profile against DataKaryawan
      // This will throw UnauthorizedException if user is not authorized
      const userProfile = await this.clerkAuthService.loadUserProfile(
        clerkUser.id,
      );

      // Validate user profile exists and is authorized
      if (!userProfile) {
        this.logger.warn(
          `Login denied for ${clerkUser.emailAddress} - Not authorized in system`,
        );
        throw new UnauthorizedException({
          statusCode: HttpStatus.FORBIDDEN,
          message:
            'Access denied. Your email is not registered in the employee database or your account is inactive.',
          error: 'Forbidden',
        });
      }

      // Load roles and permissions for authorized user
      const rolesAndPermissions =
        await this.clerkAuthService.loadUserRolesAndPermissions(userProfile.id);

      // Log successful login
      this.logger.log(
        `Successful login for ${clerkUser.emailAddress} (NIP: ${userProfile.nip})`,
      );

      const sessionData = {
        message: 'Login successful',
        user: {
          id: clerkUser.id,
          email: clerkUser.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          profileId: userProfile.id,
          nip: userProfile.nip,
          schoolId: userProfile.schoolId,
          roles: rolesAndPermissions.roles,
          permissions: rolesAndPermissions.permissions,
          positions: rolesAndPermissions.positions,
        },
        sessionId: clerkUser.sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      return sessionData;
    } catch (error) {
      // Log the error for monitoring
      this.logger.error(
        `Login failed: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Re-throw UnauthorizedException with proper message
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Generic error for unexpected failures
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Authentication failed. Please try again.',
        error: 'Unauthorized',
      });
    }
  }

  /**
   * Logout endpoint - invalidates session
   */
  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description: 'Invalidates the current session',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout successful' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    // In a real implementation, you would invalidate the session here
    // For Clerk, the actual logout is handled on the client side
    // This endpoint can be used for audit logging or cleanup

    this.logger.log(`User ${user.email} logged out`);

    return {
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current authenticated user
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      profileId: user.profileId,
      nip: user.nip,
      organizationId: user.organizationId,
      organizationRole: user.organizationRole,
      roles: user.roles || [],
      permissions: user.permissions || [],
      positions: user.positions || [],
    };
  }

  /**
   * Validate session token
   */
  @Post('validate')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate current session' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  @ApiResponse({ status: 401, description: 'Invalid session' })
  async validateSession(@CurrentUser() user: AuthenticatedUser) {
    return {
      valid: true,
      userId: user.id,
      sessionId: user.sessionId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Refresh user permissions (after role changes)
   */
  @Post('refresh-permissions')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh user permissions' })
  @ApiResponse({ status: 200, description: 'Permissions refreshed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshPermissions(@CurrentUser() user: AuthenticatedUser) {
    if (!user.profileId) {
      return {
        message: 'User profile not found',
        roles: [],
        permissions: [],
        positions: [],
      };
    }

    const rolesAndPermissions =
      await this.clerkAuthService.loadUserRolesAndPermissions(user.profileId);

    return {
      message: 'Permissions refreshed successfully',
      roles: rolesAndPermissions.roles,
      permissions: rolesAndPermissions.permissions,
      positions: rolesAndPermissions.positions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Internal health check (bypasses authentication)
   */
  @Get('internal/health')
  @SkipAuth()
  @ApiOperation({ summary: 'Internal health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  internalHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'gloria-backend-auth',
      internal: true,
      environment: process.env.NODE_ENV,
    };
  }
}

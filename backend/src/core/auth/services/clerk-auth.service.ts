import {
  Injectable,
  Logger,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, ClerkClient } from '@clerk/backend';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../guards/clerk-auth.guard';
import { SecurityMonitorService } from '../../monitoring/security-monitor.service';

@Injectable()
export class ClerkAuthService {
  private readonly logger = new Logger(ClerkAuthService.name);
  private readonly clerkClient: ClerkClient;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    @Optional()
    @Inject(SecurityMonitorService)
    private securityMonitor?: SecurityMonitorService,
  ) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');

    if (!secretKey) {
      this.logger.error('CLERK_SECRET_KEY is not configured');
      throw new Error('Clerk authentication is not properly configured');
    }

    this.clerkClient = createClerkClient({
      secretKey,
    });
  }

  /**
   * Verify session token with Clerk - simplified version
   */
  async verifySession(token: string): Promise<any> {
    try {
      // Parse the JWT to get basic claims
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const claims = JSON.parse(jsonPayload);

      // Get user from Clerk
      const user = await this.getClerkUser(claims.sub);

      return {
        userId: claims.sub,
        sessionId: claims.sid || 'session',
        organizationId: claims.org_id || null,
        organizationRole: claims.org_role || null,
      };
    } catch (error) {
      this.logger.error(`Session verification failed: ${error.message}`);
      throw new UnauthorizedException({
        message: 'Failed to verify session',
        code: 'AUTH_VERIFICATION_FAILED',
      });
    }
  }

  /**
   * Get user from Clerk
   */
  async getClerkUser(userId: string): Promise<any> {
    try {
      const user = await this.clerkClient.users.getUser(userId);

      if (!user) {
        throw new UnauthorizedException({
          message: 'User not found',
          code: 'AUTH_USER_NOT_FOUND',
        });
      }

      return {
        id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress || null,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        profileImageUrl: user.imageUrl,
        banned: user.banned || false,
        publicMetadata: user.publicMetadata || {},
        privateMetadata: user.privateMetadata || {},
      };
    } catch (error) {
      this.logger.error(`Failed to get user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync user profile with database - production version with DataKaryawan validation
   */
  async syncUserProfile(clerkUser: any): Promise<any | null> {
    try {
      // Validate email exists from Clerk
      if (!clerkUser.email) {
        this.logger.error(
          `Login attempt without email for Clerk user: ${clerkUser.id}`,
        );
        throw new UnauthorizedException({
          statusCode: 400,
          message: 'Email is required for authentication.',
          code: 'EMAIL_REQUIRED',
        });
      }

      // Normalize email for consistent comparison
      const normalizedClerkEmail = clerkUser.email.toLowerCase().trim();

      // Check if user profile exists
      let userProfile = await this.prismaService.userProfile.findUnique({
        where: { clerkUserId: clerkUser.id },
      });

      if (!userProfile) {
        // New user - validate against DataKaryawan
        const dataKaryawan = await this.prismaService.dataKaryawan.findFirst({
          where: {
            email: {
              equals: normalizedClerkEmail,
              mode: 'insensitive',
            },
            statusAktif: 'Aktif', // Only allow active employees
          },
        });

        if (!dataKaryawan) {
          // Log the attempt for security monitoring
          this.logger.warn(
            `Login attempt denied for ${clerkUser.email} - Not found in DataKaryawan or inactive`,
          );

          // Track with security monitor
          if (this.securityMonitor) {
            await this.securityMonitor.trackFailedLogin(
              clerkUser.email,
              'NOT_IN_DATA_KARYAWAN_OR_INACTIVE',
            );
          }

          // Create audit log for failed attempt
          await this.createAuditLog(clerkUser.id, 'AUTH_FAILURE', {
            email: clerkUser.email,
            reason: 'NOT_IN_DATA_KARYAWAN_OR_INACTIVE',
            timestamp: new Date().toISOString(),
          });

          throw new UnauthorizedException({
            statusCode: 403,
            message: 'Access denied. Your email is not registered in the employee database or your account is inactive.',
            code: 'USER_NOT_AUTHORIZED',
          });
        }

        // Create user profile for active employee
        userProfile = await this.prismaService.userProfile.create({
          data: {
            id: crypto.randomUUID(),
            clerkUserId: clerkUser.id,
            nip: dataKaryawan.nip,
            isActive: true,
            lastActive: new Date(),
          },
        });

        this.logger.log(
          `Created new user profile for active employee: ${clerkUser.email} (NIP: ${dataKaryawan.nip})`,
        );
      } else {
        // Existing user - verify both email match AND active status
        const dataKaryawan = await this.prismaService.dataKaryawan.findUnique({
          where: { nip: userProfile.nip },
          select: {
            statusAktif: true,
            email: true,
            nama: true,
            nip: true,
          },
        });

        // Check if DataKaryawan record exists
        if (!dataKaryawan) {
          this.logger.warn(
            `Access denied for ${clerkUser.email} - DataKaryawan record not found for NIP: ${userProfile.nip}`,
          );

          // Deactivate orphaned user profile
          await this.prismaService.userProfile.update({
            where: { id: userProfile.id },
            data: { isActive: false },
          });

          // Create audit log
          await this.createAuditLog(clerkUser.id, 'AUTH_FAILURE', {
            email: clerkUser.email,
            reason: 'DATA_KARYAWAN_NOT_FOUND',
            nip: userProfile.nip,
            timestamp: new Date().toISOString(),
          });

          throw new UnauthorizedException({
            statusCode: 403,
            message: 'Access denied. Employee record not found.',
            code: 'EMPLOYEE_NOT_FOUND',
          });
        }

        // Check if employee is active
        if (dataKaryawan.statusAktif !== 'Aktif') {
          this.logger.warn(
            `Access denied for ${clerkUser.email} - Employee status is not active (${dataKaryawan.statusAktif})`,
          );

          // Deactivate user profile
          await this.prismaService.userProfile.update({
            where: { id: userProfile.id },
            data: { isActive: false },
          });

          // Create audit log
          await this.createAuditLog(clerkUser.id, 'AUTH_FAILURE', {
            email: clerkUser.email,
            reason: 'EMPLOYEE_NOT_ACTIVE',
            status: dataKaryawan.statusAktif,
            nip: userProfile.nip,
            timestamp: new Date().toISOString(),
          });

          throw new UnauthorizedException({
            statusCode: 403,
            message: 'Access denied. Employee status is not active.',
            code: 'EMPLOYEE_NOT_ACTIVE',
          });
        }

        // CRITICAL: Validate email consistency
        const normalizedDbEmail = dataKaryawan.email?.toLowerCase().trim();

        if (!normalizedDbEmail) {
          // Handle case where DataKaryawan has no email
          this.logger.error(
            `DataKaryawan record for NIP ${userProfile.nip} has no email configured`,
          );

          // Create audit log
          await this.createAuditLog(clerkUser.id, 'AUTH_FAILURE', {
            email: clerkUser.email,
            reason: 'DATA_KARYAWAN_EMAIL_MISSING',
            nip: userProfile.nip,
            timestamp: new Date().toISOString(),
          });

          throw new UnauthorizedException({
            statusCode: 403,
            message: 'Access denied. Employee email configuration is incomplete.',
            code: 'EMPLOYEE_EMAIL_MISSING',
          });
        }

        if (normalizedDbEmail !== normalizedClerkEmail) {
          // Email mismatch detected
          this.logger.warn(
            `Email mismatch detected - Clerk: ${clerkUser.email}, DataKaryawan: ${dataKaryawan.email} for NIP: ${userProfile.nip}`,
          );

          // Track with security monitor
          if (this.securityMonitor) {
            await this.securityMonitor.trackFailedLogin(
              clerkUser.email,
              'EMAIL_MISMATCH',
            );
          }

          // Create detailed audit log
          await this.createAuditLog(clerkUser.id, 'AUTH_FAILURE', {
            email: clerkUser.email,
            reason: 'EMAIL_MISMATCH',
            expectedEmail: dataKaryawan.email,
            nip: userProfile.nip,
            employeeName: dataKaryawan.nama,
            timestamp: new Date().toISOString(),
          });

          throw new UnauthorizedException({
            statusCode: 403,
            message: 'Access denied. The email address does not match employee records. Please contact HR if your email has changed.',
            code: 'EMAIL_MISMATCH',
          });
        }

        // All validations passed - update last active
        await this.prismaService.userProfile.update({
          where: { id: userProfile.id },
          data: {
            lastActive: new Date(),
            isActive: true, // Ensure profile is active
          },
        });

        this.logger.log(
          `Successful authentication for ${clerkUser.email} (NIP: ${userProfile.nip})`,
        );
      }

      return userProfile;
    } catch (error) {
      // Re-throw UnauthorizedException
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        `Failed to sync user profile: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new UnauthorizedException({
        statusCode: 500,
        message: 'Authentication validation failed. Please try again later.',
        code: 'AUTH_VALIDATION_ERROR',
      });
    }
  }

  /**
   * Load user roles and permissions - simplified version
   */
  async loadUserRolesAndPermissions(userProfileId: string) {
    try {
      // Load user roles
      const userRoles = await this.prismaService.userRole.findMany({
        where: {
          userProfileId,
          isActive: true,
        },
      });

      // Get role details
      const roleIds = userRoles.map((ur) => ur.roleId);
      const roles = await this.prismaService.role.findMany({
        where: {
          id: { in: roleIds },
          isActive: true,
        },
      });

      // Load direct user permissions
      const userPermissions = await this.prismaService.userPermission.findMany({
        where: {
          userProfileId,
          isGranted: true,
          validFrom: {
            lte: new Date(),
          },
        },
      });

      // Get permission details
      const permissionIds = userPermissions.map((up) => up.permissionId);
      const permissions = await this.prismaService.permission.findMany({
        where: {
          id: { in: permissionIds },
          isActive: true,
        },
      });

      return {
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
        })),
        permissions: permissions.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          scope: p.scope || 'OWN',
        })),
        positions: [],
      };
    } catch (error) {
      this.logger.error(
        `Failed to load roles and permissions: ${error.message}`,
      );
      return { roles: [], permissions: [], positions: [] };
    }
  }

  /**
   * Verify token - wrapper for login controller
   */
  async verifyToken(token: string): Promise<any> {
    try {
      const session = await this.verifySession(token);
      const clerkUser = await this.getClerkUser(session.userId);

      return {
        id: clerkUser.id,
        email: clerkUser.email,
        emailAddress: clerkUser.email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        username: clerkUser.username,
        sessionId: session.sessionId,
        organizationId: session.organizationId,
        organizationRole: session.organizationRole,
      };
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  /**
   * Load user profile - wrapper for login controller
   */
  async loadUserProfile(clerkUserId: string): Promise<any | null> {
    try {
      const clerkUser = await this.getClerkUser(clerkUserId);
      // This will throw UnauthorizedException if user is not authorized
      const userProfile = await this.syncUserProfile(clerkUser);
      return userProfile;
    } catch (error) {
      // Re-throw UnauthorizedException to propagate validation errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Failed to load user profile: ${error.message}`);
      throw new UnauthorizedException({
        statusCode: 500,
        message: 'Failed to validate user profile',
        code: 'PROFILE_VALIDATION_ERROR',
      });
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(userId: string, action: string, data: any) {
    try {
      const auditAction = this.mapToAuditAction(action);

      await this.prismaService.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          actorId: userId,
          action: auditAction,
          module: 'AUTH',
          entityType: 'USER',
          entityId: userId,
          entityDisplay: data.email || userId,
          metadata: data,
          ipAddress: data.ipAddress || '0.0.0.0',
          userAgent: data.userAgent || 'System',
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to create audit log: ${error.message}`);
    }
  }

  /**
   * Map string action to AuditAction enum
   */
  private mapToAuditAction(action: string): any {
    const actionMap: Record<string, string> = {
      AUTH_SUCCESS: 'LOGIN',
      AUTH_FAILURE: 'LOGIN',
      USER_PROFILE_CREATED: 'CREATE',
      USER_PROFILE_UPDATED: 'UPDATE',
      LOGOUT: 'LOGOUT',
    };

    return actionMap[action] || 'LOGIN';
  }
}

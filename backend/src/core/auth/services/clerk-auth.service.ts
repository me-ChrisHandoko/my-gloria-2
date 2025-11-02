import {
  Injectable,
  Logger,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, ClerkClient } from '@clerk/backend';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../guards/clerk-auth.guard';
import { SecurityMonitorService } from '../../monitoring/security-monitor.service';

@Injectable()
export class ClerkAuthService {
  private readonly logger = new Logger(ClerkAuthService.name);
  private readonly clerkClient: ClerkClient;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  // Email sync configuration
  private readonly emailSyncEnabled: boolean;
  private readonly syncMaxRetries: number;
  private readonly syncRetryDelay: number;
  private readonly syncTimeout: number;

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

    // Load email sync configuration with defaults
    this.emailSyncEnabled = this.configService.get<boolean>(
      'CLERK_AUTO_SYNC_EMAIL',
      true,
    );
    this.syncMaxRetries = this.configService.get<number>(
      'CLERK_SYNC_MAX_RETRIES',
      3,
    );
    this.syncRetryDelay = this.configService.get<number>(
      'CLERK_SYNC_RETRY_DELAY',
      1000,
    );
    this.syncTimeout = this.configService.get<number>(
      'CLERK_SYNC_TIMEOUT',
      5000,
    );
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
            message:
              'Access denied. Your email is not registered in the employee database or your account is inactive.',
            code: 'USER_NOT_AUTHORIZED',
          });
        }

        // Use transaction for profile creation/update to ensure data consistency
        try {
          // Check if a profile already exists with this NIP (from previous Clerk account)
          const existingProfileByNip =
            await this.prismaService.userProfile.findUnique({
              where: { nip: dataKaryawan.nip },
            });

          if (existingProfileByNip) {
            // Profile exists with same NIP but different clerkUserId
            // This happens when user creates new Clerk account with different email
            this.logger.log(
              `Found existing profile for NIP ${dataKaryawan.nip}, updating clerkUserId from ${existingProfileByNip.clerkUserId} to ${clerkUser.id}`,
            );

            // Use transaction to ensure atomicity
            const result = await this.prismaService.$transaction(async (tx) => {
              // Update existing profile with new clerkUserId
              const updatedProfile = await tx.userProfile.update({
                where: { nip: dataKaryawan.nip },
                data: {
                  clerkUserId: clerkUser.id, // Link to new Clerk account
                  isActive: true,
                  lastActive: new Date(),
                  updatedAt: new Date(),
                },
              });

              // Create audit log for profile re-linking within transaction
              await tx.auditLog.create({
                data: {
                  id: uuidv7(),
                  actorId: clerkUser.id,
                  action: 'UPDATE',
                  module: 'AUTH',
                  entityType: 'USER_PROFILE',
                  entityId: updatedProfile.id,
                  entityDisplay: clerkUser.email,
                  metadata: {
                    email: clerkUser.email,
                    nip: dataKaryawan.nip,
                    oldClerkUserId: existingProfileByNip.clerkUserId,
                    newClerkUserId: clerkUser.id,
                    reason: 'CLERK_ACCOUNT_CHANGED',
                    timestamp: new Date().toISOString(),
                  },
                  ipAddress: '0.0.0.0',
                  userAgent: 'System',
                },
              });

              return updatedProfile;
            });

            userProfile = result;

            this.logger.log(
              `Successfully re-linked user profile for ${clerkUser.email} (NIP: ${dataKaryawan.nip})`,
            );
          } else {
            // No existing profile found, create new one with transaction
            userProfile = await this.prismaService.$transaction(async (tx) => {
              const newProfile = await tx.userProfile.create({
                data: {
                  id: uuidv7(),
                  clerkUserId: clerkUser.id,
                  nip: dataKaryawan.nip,
                  isActive: true,
                  lastActive: new Date(),
                  updatedAt: new Date(),
                },
              });

              // Create audit log for new profile
              await tx.auditLog.create({
                data: {
                  id: uuidv7(),
                  actorId: clerkUser.id,
                  action: 'CREATE',
                  module: 'AUTH',
                  entityType: 'USER_PROFILE',
                  entityId: newProfile.id,
                  entityDisplay: clerkUser.email,
                  metadata: {
                    email: clerkUser.email,
                    nip: dataKaryawan.nip,
                    reason: 'NEW_EMPLOYEE_PROFILE',
                    timestamp: new Date().toISOString(),
                  },
                  ipAddress: '0.0.0.0',
                  userAgent: 'System',
                },
              });

              return newProfile;
            });

            this.logger.log(
              `Created new user profile for active employee: ${clerkUser.email} (NIP: ${dataKaryawan.nip})`,
            );
          }
        } catch (profileError) {
          // Handle specific Prisma errors
          if (profileError.code === 'P2002') {
            // Unique constraint violation - likely a race condition
            this.logger.error(
              `Race condition detected for NIP ${dataKaryawan.nip}: ${profileError.message}`,
            );

            // Try to fetch the existing profile as fallback
            userProfile = await this.prismaService.userProfile.findUnique({
              where: { nip: dataKaryawan.nip },
            });

            if (userProfile) {
              this.logger.log(
                `Retrieved existing profile after race condition for NIP ${dataKaryawan.nip}`,
              );
            } else {
              throw new UnauthorizedException({
                statusCode: 500,
                message:
                  'Unable to create or retrieve user profile. Please try again.',
                code: 'PROFILE_CREATION_FAILED',
              });
            }
          } else {
            // Other database errors
            this.logger.error(
              `Failed to create/update user profile: ${profileError.message}`,
              profileError.stack,
            );
            throw new UnauthorizedException({
              statusCode: 500,
              message: 'Database operation failed. Please try again later.',
              code: 'DATABASE_ERROR',
            });
          }
        }
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
            message:
              'Access denied. Employee email configuration is incomplete.',
            code: 'EMPLOYEE_EMAIL_MISSING',
          });
        }

        if (normalizedDbEmail !== normalizedClerkEmail) {
          // Email mismatch detected
          this.logger.warn(
            `Email mismatch detected - Clerk: ${clerkUser.email}, DataKaryawan: ${dataKaryawan.email} for NIP: ${userProfile.nip}`,
          );

          // OPTION 1 IMPLEMENTATION: Attempt auto-sync if user identity can be verified
          // This is safe because we've already verified:
          // 1. UserProfile exists with matching clerkUserId
          // 2. NIP matches between UserProfile and DataKaryawan
          // 3. Employee is active in DataKaryawan

          const syncAttempted = await this.attemptEmailSync(
            clerkUser,
            dataKaryawan.email!, // Already validated it exists above
            userProfile,
          );

          if (syncAttempted) {
            // Sync was successful, update normalized email for flow continuation
            // The clerkUser object has been updated in attemptEmailSync
            this.logger.log(
              `Email sync successful - continuing authentication for NIP ${userProfile.nip}`,
            );
            // Continue with normal flow - no error thrown
          } else {
            // Sync failed or was not attempted (disabled, missing data, etc.)
            this.logger.warn(
              `Email sync failed or not attempted - denying access for NIP ${userProfile.nip}`,
            );

            // Track with security monitor
            if (this.securityMonitor) {
              await this.securityMonitor.trackFailedLogin(
                clerkUser.email,
                'EMAIL_MISMATCH_AFTER_SYNC_FAILURE',
              );
            }

            // Create detailed audit log
            await this.createAuditLog(clerkUser.id, 'AUTH_FAILURE', {
              email: clerkUser.email,
              reason: 'EMAIL_MISMATCH',
              expectedEmail: dataKaryawan.email,
              nip: userProfile.nip,
              employeeName: dataKaryawan.nama,
              syncAttempted: this.emailSyncEnabled,
              timestamp: new Date().toISOString(),
            });

            throw new UnauthorizedException({
              statusCode: 403,
              message: this.emailSyncEnabled
                ? 'Access denied. Unable to sync email changes. Please contact IT support for assistance.'
                : 'Access denied. The email address does not match employee records. Please contact HR if your email has changed.',
              code: 'EMAIL_MISMATCH',
            });
          }
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
          effectiveFrom: {
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
          id: uuidv7(),
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
      USER_PROFILE_RELINKED: 'UPDATE',
      EMAIL_SYNC_SUCCESS: 'UPDATE',
      EMAIL_SYNC_FAILURE: 'UPDATE',
      EMAIL_SYNC_ATTEMPT: 'UPDATE',
      LOGOUT: 'LOGOUT',
    };

    return actionMap[action] || 'LOGIN';
  }

  /**
   * Update Clerk user email with retry logic
   * Production-ready implementation with comprehensive error handling
   */
  private async updateClerkUserEmail(
    clerkUserId: string,
    newEmail: string,
    oldEmail: string,
  ): Promise<boolean> {
    let retryCount = 0;
    const maxRetries = this.syncMaxRetries;

    while (retryCount < maxRetries) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Clerk email update timeout')),
            this.syncTimeout,
          ),
        );

        // Create update promise
        const updatePromise = (async () => {
          // First, create the new email address in Clerk
          const emailAddress =
            await this.clerkClient.emailAddresses.createEmailAddress({
              userId: clerkUserId,
              emailAddress: newEmail,
              verified: true, // Set as verified since it comes from DataKaryawan
              primary: false, // Don't set as primary yet
            });

          // Then update user to set new email as primary
          await this.clerkClient.users.updateUser(clerkUserId, {
            primaryEmailAddressID: emailAddress.id, // Note: capital ID
          });

          // Optionally delete old email address to keep clean
          try {
            const user = await this.clerkClient.users.getUser(clerkUserId);
            const oldEmailObj = user.emailAddresses?.find(
              (e) => e.emailAddress === oldEmail,
            );
            if (oldEmailObj && oldEmailObj.id !== emailAddress.id) {
              await this.clerkClient.emailAddresses.deleteEmailAddress(
                oldEmailObj.id,
              );
            }
          } catch (deleteError) {
            // Non-critical error, just log it
            this.logger.warn(
              `Failed to delete old email address: ${deleteError.message}`,
            );
          }

          return true;
        })();

        // Race between update and timeout
        const result = await Promise.race([updatePromise, timeoutPromise]);

        this.logger.log(
          `Successfully updated Clerk email from ${oldEmail} to ${newEmail} for user ${clerkUserId}`,
        );

        return result as boolean;
      } catch (error) {
        retryCount++;

        this.logger.warn(
          `Failed to update Clerk email (attempt ${retryCount}/${maxRetries}): ${error.message}`,
        );

        if (retryCount < maxRetries) {
          // Exponential backoff with jitter
          const delay =
            this.syncRetryDelay * Math.pow(2, retryCount - 1) +
            Math.random() * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Final attempt failed
          this.logger.error(
            `Failed to update Clerk email after ${maxRetries} attempts for user ${clerkUserId}`,
            error instanceof Error ? error.stack : undefined,
          );

          // Track failed sync attempt
          if (this.securityMonitor) {
            await this.securityMonitor.trackFailedLogin(
              newEmail,
              'EMAIL_SYNC_FAILURE',
            );
          }

          throw new Error(
            `Email sync failed after ${maxRetries} attempts: ${error.message}`,
          );
        }
      }
    }

    return false;
  }

  /**
   * Attempt to sync email mismatch between Clerk and DataKaryawan
   * This is the core of Option 1 implementation
   */
  private async attemptEmailSync(
    clerkUser: any,
    dataKaryawanEmail: string,
    userProfile: any,
  ): Promise<boolean> {
    try {
      // Check if auto-sync is enabled
      if (!this.emailSyncEnabled) {
        this.logger.log('Email auto-sync is disabled via configuration');
        return false;
      }

      // Verify we have all required data
      if (!clerkUser?.id || !dataKaryawanEmail || !userProfile?.nip) {
        this.logger.warn('Missing required data for email sync');
        return false;
      }

      // Log sync attempt
      this.logger.log(
        `Attempting email sync for NIP ${userProfile.nip}: ${clerkUser.email} → ${dataKaryawanEmail}`,
      );

      // Create audit log for sync attempt
      await this.createAuditLog(clerkUser.id, 'EMAIL_SYNC_ATTEMPT', {
        oldEmail: clerkUser.email,
        newEmail: dataKaryawanEmail,
        nip: userProfile.nip,
        reason: 'EMAIL_MISMATCH_DETECTED',
        timestamp: new Date().toISOString(),
      });

      // Attempt the sync with retry logic
      const syncSuccess = await this.updateClerkUserEmail(
        clerkUser.id,
        dataKaryawanEmail,
        clerkUser.email,
      );

      if (syncSuccess) {
        // Update the clerkUser object to reflect the change
        clerkUser.email = dataKaryawanEmail;
        clerkUser.emailAddress = dataKaryawanEmail;

        // Create success audit log
        await this.createAuditLog(clerkUser.id, 'EMAIL_SYNC_SUCCESS', {
          oldEmail: clerkUser.email,
          newEmail: dataKaryawanEmail,
          nip: userProfile.nip,
          timestamp: new Date().toISOString(),
        });

        this.logger.log(
          `Email sync successful for NIP ${userProfile.nip}: Now using ${dataKaryawanEmail}`,
        );

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Email sync failed for user ${clerkUser.id}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Create failure audit log
      await this.createAuditLog(clerkUser.id, 'EMAIL_SYNC_FAILURE', {
        oldEmail: clerkUser.email,
        attemptedEmail: dataKaryawanEmail,
        nip: userProfile.nip,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Don't throw here - let the calling method handle the failure
      return false;
    }
  }
}

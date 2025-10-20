import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { ResourcePermission } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ResourcePermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Grant resource-specific permission
   */
  async grantResourcePermission(
    userProfileId: string,
    permissionId: string,
    resourceType: string,
    resourceId: string,
    grantedBy: string,
    grantReason?: string,
    validUntil?: Date,
  ): Promise<ResourcePermission> {
    try {
      const resourcePermission = await this.prisma.resourcePermission.upsert({
        where: {
          userProfileId_permissionId_resourceType_resourceId: {
            userProfileId,
            permissionId,
            resourceType,
            resourceId,
          },
        },
        create: {
          id: uuidv7(),
          userProfileId,
          permissionId,
          resourceType,
          resourceId,
          isGranted: true,
          grantedBy,
          grantReason,
          validUntil,
        },
        update: {
          isGranted: true,
          grantedBy,
          grantReason,
          validUntil,
          updatedAt: new Date(),
        },
        include: {
          permission: true,
          userProfile: true,
        },
      });

      this.logger.log(
        `Resource permission granted for user ${userProfileId} on ${resourceType}:${resourceId}`,
        'ResourcePermissionsService',
      );
      return resourcePermission;
    } catch (error) {
      this.logger.error(
        'Error granting resource permission',
        error.stack,
        'ResourcePermissionsService',
      );
      throw error;
    }
  }

  /**
   * Revoke resource-specific permission
   */
  async revokeResourcePermission(
    userProfileId: string,
    permissionId: string,
    resourceType: string,
    resourceId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _revokedBy: string,
  ): Promise<void> {
    try {
      await this.prisma.resourcePermission.update({
        where: {
          userProfileId_permissionId_resourceType_resourceId: {
            userProfileId,
            permissionId,
            resourceType,
            resourceId,
          },
        },
        data: {
          isGranted: false,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Resource permission revoked for user ${userProfileId} on ${resourceType}:${resourceId}`,
        'ResourcePermissionsService',
      );
    } catch (error) {
      this.logger.error(
        'Error revoking resource permission',
        error.stack,
        'ResourcePermissionsService',
      );
      throw error;
    }
  }

  /**
   * Get resource permissions for a user
   */
  async getUserResourcePermissions(
    userProfileId: string,
    resourceType?: string,
  ): Promise<ResourcePermission[]> {
    return this.prisma.resourcePermission.findMany({
      where: {
        userProfileId,
        ...(resourceType && { resourceType }),
        isGranted: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        permission: true,
      },
    });
  }

  /**
   * Get users with permission on a resource
   */
  async getResourceUsers(
    resourceType: string,
    resourceId: string,
  ): Promise<ResourcePermission[]> {
    return this.prisma.resourcePermission.findMany({
      where: {
        resourceType,
        resourceId,
        isGranted: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        userProfile: true,
        permission: true,
      },
    });
  }
}

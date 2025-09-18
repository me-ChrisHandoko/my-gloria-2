import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { UserModuleAccess, RoleModuleAccess } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ModuleAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Grant module access to user
   */
  async grantUserModuleAccess(
    userProfileId: string,
    moduleId: string,
    canRead: boolean,
    canWrite: boolean,
    canDelete: boolean,
    canShare: boolean,
    grantedBy: string,
    validUntil?: Date,
  ): Promise<UserModuleAccess> {
    try {
      const permissions = {
        canRead,
        canWrite,
        canDelete,
        canShare,
      };

      const moduleAccess = await this.prisma.userModuleAccess.upsert({
        where: {
          id: `${userProfileId}_${moduleId}`,
        },
        create: {
          id: uuidv7(),
          userProfileId,
          moduleId,
          permissions,
          grantedBy,
          validUntil,
        },
        update: {
          permissions,
          grantedBy,
          validUntil,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Module access granted for user ${userProfileId} on module ${moduleId}`,
        'ModuleAccessService',
      );
      return moduleAccess;
    } catch (error) {
      this.logger.error(
        'Error granting module access',
        error.stack,
        'ModuleAccessService',
      );
      throw error;
    }
  }

  /**
   * Get user module access
   */
  async getUserModuleAccess(
    userProfileId: string,
  ): Promise<UserModuleAccess[]> {
    return this.prisma.userModuleAccess.findMany({
      where: {
        userProfileId,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        module: true,
      },
    });
  }

  /**
   * Check if user has access to module
   */
  async checkModuleAccess(
    userProfileId: string,
    moduleId: string,
    accessType: 'read' | 'write' | 'delete' | 'share',
  ): Promise<boolean> {
    const access = await this.prisma.userModuleAccess.findFirst({
      where: {
        userProfileId,
        moduleId,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
    });

    if (!access) {
      return false;
    }

    const permissions = access.permissions as any;
    if (!permissions) {
      return false;
    }

    switch (accessType) {
      case 'read':
        return permissions.canRead || false;
      case 'write':
        return permissions.canWrite || false;
      case 'delete':
        return permissions.canDelete || false;
      case 'share':
        return permissions.canShare || false;
      default:
        return false;
    }
  }
}

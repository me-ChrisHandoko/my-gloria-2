import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { RoleHierarchy } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class RoleHierarchyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Create role hierarchy relationship
   */
  async createHierarchy(
    roleId: string,
    parentRoleId: string,
    inheritPermissions = true,
  ): Promise<RoleHierarchy> {
    try {
      if (roleId === parentRoleId) {
        throw new BadRequestException('Role cannot be its own parent');
      }

      // Check for circular dependencies
      await this.checkCircularDependency(roleId, parentRoleId);

      const hierarchy = await this.prisma.roleHierarchy.create({
        data: {
          id: uuidv7(),
          roleId,
          parentRoleId,
          inheritPermissions,
        },
        include: {
          role: true,
          parentRole: true,
        },
      });

      this.logger.log(
        `Role hierarchy created: ${roleId} inherits from ${parentRoleId}`,
        'RoleHierarchyService',
      );
      return hierarchy;
    } catch (error) {
      this.logger.error(
        'Error creating role hierarchy',
        error.stack,
        'RoleHierarchyService',
      );
      throw error;
    }
  }

  /**
   * Check for circular dependencies in role hierarchy
   */
  private async checkCircularDependency(
    roleId: string,
    parentRoleId: string,
    visited = new Set<string>(),
  ): Promise<void> {
    if (visited.has(parentRoleId)) {
      throw new BadRequestException(
        'Circular dependency detected in role hierarchy',
      );
    }

    visited.add(parentRoleId);

    const parentHierarchies = await this.prisma.roleHierarchy.findMany({
      where: { roleId: parentRoleId },
    });

    for (const hierarchy of parentHierarchies) {
      if (hierarchy.parentRoleId === roleId) {
        throw new BadRequestException(
          'Circular dependency detected in role hierarchy',
        );
      }
      await this.checkCircularDependency(
        roleId,
        hierarchy.parentRoleId,
        visited,
      );
    }
  }

  /**
   * Get role hierarchy tree
   */
  async getRoleHierarchy(roleId: string): Promise<any> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        parentRoles: {
          include: {
            parentRole: true,
          },
        },
        childRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!role) {
      throw new BadRequestException(`Role with ID ${roleId} not found`);
    }

    return {
      ...role,
      parents: role.parentRoles.map((pr) => pr.parentRole),
      children: role.childRoles.map((cr) => cr.role),
    };
  }
}

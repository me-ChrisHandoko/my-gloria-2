import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { nanoid } from 'nanoid';
import {
  CreatePermissionDependencyDto,
  UpdatePermissionDependencyDto,
  CheckPermissionDependenciesDto,
} from '../dto/permission-dependency.dto';

@Injectable()
export class PermissionDependencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a permission dependency rule
   */
  async createDependency(
    dto: CreatePermissionDependencyDto,
    createdBy: string,
  ) {
    // Validate both permissions exist and are active
    const [permission, requiredPermission] = await Promise.all([
      this.prisma.permission.findUnique({
        where: { id: dto.permissionId },
      }),
      this.prisma.permission.findUnique({
        where: { id: dto.requiredPermissionId },
      }),
    ]);

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${dto.permissionId} not found`,
      );
    }
    if (!requiredPermission) {
      throw new NotFoundException(
        `Required permission with ID ${dto.requiredPermissionId} not found`,
      );
    }

    if (!permission.isActive) {
      throw new BadRequestException(
        `Permission ${permission.code} is not active`,
      );
    }
    if (!requiredPermission.isActive) {
      throw new BadRequestException(
        `Required permission ${requiredPermission.code} is not active`,
      );
    }

    // Prevent self-dependency
    if (dto.permissionId === dto.requiredPermissionId) {
      throw new BadRequestException(
        'Permission cannot depend on itself',
      );
    }

    // Check for existing dependency
    const existing = await this.prisma.permissionDependency.findFirst({
      where: {
        permissionId: dto.permissionId,
        requiredPermissionId: dto.requiredPermissionId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Dependency already exists: ${permission.code} requires ${requiredPermission.code}`,
      );
    }

    // Check for circular dependencies
    const wouldCreateCircular = await this.checkCircularDependency(
      dto.permissionId,
      dto.requiredPermissionId,
    );

    if (wouldCreateCircular) {
      throw new BadRequestException(
        `Cannot create dependency: would create circular dependency chain`,
      );
    }

    // Create dependency
    const dependency = await this.prisma.permissionDependency.create({
      data: {
        id: nanoid(),
        permissionId: dto.permissionId,
        requiredPermissionId: dto.requiredPermissionId,
        description: dto.description,
        createdBy,
      },
      include: {
        permission: true,
        requiredPermission: true,
      },
    });

    return {
      success: true,
      message: 'Permission dependency created successfully',
      data: dependency,
    };
  }

  /**
   * Get all dependencies for a permission
   */
  async getPermissionDependencies(permissionId: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    const dependencies = await this.prisma.permissionDependency.findMany({
      where: { permissionId },
      include: {
        requiredPermission: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      permission,
      dependencies,
      totalDependencies: dependencies.length,
    };
  }

  /**
   * Get all permissions that depend on a specific permission
   */
  async getDependentPermissions(permissionId: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    const dependents = await this.prisma.permissionDependency.findMany({
      where: { requiredPermissionId: permissionId },
      include: {
        permission: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      permission,
      dependents,
      totalDependents: dependents.length,
    };
  }

  /**
   * Update a permission dependency
   */
  async updateDependency(
    dependencyId: string,
    dto: UpdatePermissionDependencyDto,
    updatedBy: string,
  ) {
    const existing = await this.prisma.permissionDependency.findUnique({
      where: { id: dependencyId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Permission dependency with ID ${dependencyId} not found`,
      );
    }

    const updated = await this.prisma.permissionDependency.update({
      where: { id: dependencyId },
      data: {
        description: dto.description,
      },
      include: {
        permission: true,
        requiredPermission: true,
      },
    });

    return {
      success: true,
      message: 'Permission dependency updated successfully',
      data: updated,
    };
  }

  /**
   * Delete a permission dependency
   */
  async deleteDependency(dependencyId: string, deletedBy: string) {
    const existing = await this.prisma.permissionDependency.findUnique({
      where: { id: dependencyId },
      include: {
        permission: true,
        requiredPermission: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Permission dependency with ID ${dependencyId} not found`,
      );
    }

    await this.prisma.permissionDependency.delete({
      where: { id: dependencyId },
    });

    return {
      success: true,
      message: `Dependency removed: ${existing.permission.code} no longer requires ${existing.requiredPermission.code}`,
    };
  }

  /**
   * Get dependency chain for a permission (recursive)
   */
  async getDependencyChain(permissionId: string): Promise<any> {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    const chain = await this.buildDependencyChain(permissionId, new Set());

    return {
      permission,
      dependencyChain: chain,
      totalRequiredPermissions: chain.length,
    };
  }

  /**
   * Check if user has all required dependencies for a permission
   */
  async checkUserDependencies(dto: CheckPermissionDependenciesDto) {
    // Get the permission and its dependencies
    const dependencies = await this.prisma.permissionDependency.findMany({
      where: { permissionId: dto.permissionId },
      include: {
        requiredPermission: true,
      },
    });

    if (dependencies.length === 0) {
      return {
        hasAllDependencies: true,
        requiredPermissions: [],
        missingPermissions: [],
        message: 'No dependencies required',
      };
    }

    const now = new Date();
    const requiredPermissionIds = dependencies.map(
      (d) => d.requiredPermissionId,
    );

    // Check if user has all required permissions
    // First check role permissions
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        permissionId: { in: requiredPermissionIds },
        isGranted: true,
        role: {
          userRoles: {
            some: {
              userProfileId: dto.userId,
              isActive: true,
            },
          },
        },
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [
          {
            OR: [{ validUntil: null }, { validUntil: { gte: now } }],
          },
        ],
      },
      select: { permissionId: true },
    });

    // Then check direct user permissions
    const userPermissions = await this.prisma.userPermission.findMany({
      where: {
        userProfileId: dto.userId,
        permissionId: { in: requiredPermissionIds },
        isGranted: true,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [
          {
            OR: [{ validUntil: null }, { validUntil: { gte: now } }],
          },
        ],
      },
      select: { permissionId: true },
    });

    // If resource-specific, also check resource permissions
    let resourcePermissions: any[] = [];
    if (dto.resourceType && dto.resourceId) {
      resourcePermissions = await this.prisma.resourcePermission.findMany({
        where: {
          userProfileId: dto.userId,
          permissionId: { in: requiredPermissionIds },
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          isGranted: true,
          OR: [{ validFrom: null }, { validFrom: { lte: now } }],
          AND: [
            {
              OR: [{ validUntil: null }, { validUntil: { gte: now } }],
            },
          ],
        },
        select: { permissionId: true },
      });
    }

    // Combine all granted permissions
    const grantedPermissionIds = new Set([
      ...rolePermissions.map((p) => p.permissionId),
      ...userPermissions.map((p) => p.permissionId),
      ...resourcePermissions.map((p) => p.permissionId),
    ]);

    // Find missing dependencies
    const missingDependencies = dependencies.filter(
      (dep) => !grantedPermissionIds.has(dep.requiredPermissionId),
    );

    const hasAllDependencies = missingDependencies.length === 0;

    return {
      hasAllDependencies,
      requiredPermissions: dependencies.map((d) => ({
        id: d.requiredPermission.id,
        code: d.requiredPermission.code,
        name: d.requiredPermission.name,
        description: d.description,
        hasPermission: grantedPermissionIds.has(d.requiredPermissionId),
      })),
      missingPermissions: missingDependencies.map((d) => ({
        id: d.requiredPermission.id,
        code: d.requiredPermission.code,
        name: d.requiredPermission.name,
        description: d.description,
      })),
      message: hasAllDependencies
        ? 'User has all required dependencies'
        : `User is missing ${missingDependencies.length} required permission(s)`,
    };
  }

  /**
   * Check for circular dependency
   * Returns true if adding dependency would create a circular chain
   */
  private async checkCircularDependency(
    permissionId: string,
    requiredPermissionId: string,
  ): Promise<boolean> {
    // If requiredPermission depends on permissionId (directly or indirectly),
    // then adding this dependency would create a circular chain

    const visited = new Set<string>();
    const queue: string[] = [requiredPermissionId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      // If we find the original permission in the chain, it's circular
      if (currentId === permissionId) {
        return true;
      }

      // Get dependencies of current permission
      const dependencies = await this.prisma.permissionDependency.findMany({
        where: { permissionId: currentId },
        select: { requiredPermissionId: true },
      });

      // Add to queue for checking
      for (const dep of dependencies) {
        if (!visited.has(dep.requiredPermissionId)) {
          queue.push(dep.requiredPermissionId);
        }
      }
    }

    return false;
  }

  /**
   * Build complete dependency chain recursively
   */
  private async buildDependencyChain(
    permissionId: string,
    visited: Set<string>,
  ): Promise<any[]> {
    if (visited.has(permissionId)) {
      return []; // Prevent infinite loops
    }

    visited.add(permissionId);

    const dependencies = await this.prisma.permissionDependency.findMany({
      where: { permissionId },
      include: {
        requiredPermission: true,
      },
    });

    const chain: any[] = [];

    for (const dep of dependencies) {
      const subChain = await this.buildDependencyChain(
        dep.requiredPermissionId,
        visited,
      );

      chain.push({
        permission: dep.requiredPermission,
        description: dep.description,
        dependencies: subChain,
      });
    }

    return chain;
  }
}

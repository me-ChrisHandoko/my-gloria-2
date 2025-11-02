import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import { RoleResponseDto } from '../dto/role.dto';
import { RolePermissionResponseDto } from '../dto/role-permission.dto';

export interface RoleHierarchyNode {
  id: string;
  code: string;
  name: string;
  hierarchyLevel: number;
  children: RoleHierarchyNode[];
}

@Injectable()
export class RoleHierarchyService {
  private readonly logger = new Logger(RoleHierarchyService.name);
  private readonly cachePrefix = 'role-hierarchy:';
  private readonly cacheTTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Create parent-child relationship between roles using RoleHierarchy table
   */
  async createHierarchy(
    childId: string,
    parentId: string,
  ): Promise<RoleResponseDto> {
    try {
      // Verify both roles exist
      const [child, parent] = await Promise.all([
        this.prisma.role.findUnique({ where: { id: childId } }),
        this.prisma.role.findUnique({ where: { id: parentId } }),
      ]);

      if (!child) {
        throw new NotFoundException(`Child role with ID ${childId} not found`);
      }

      if (!parent) {
        throw new NotFoundException(`Parent role with ID ${parentId} not found`);
      }

      // Prevent self-referencing
      if (childId === parentId) {
        throw new BadRequestException('Role cannot be its own parent');
      }

      // Check for circular dependencies
      const wouldCreateCycle = await this.wouldCreateCycle(childId, parentId);
      if (wouldCreateCycle) {
        throw new BadRequestException(
          'Creating this hierarchy would create a circular dependency',
        );
      }

      // Validate hierarchy level constraints
      if (child.hierarchyLevel <= parent.hierarchyLevel) {
        throw new BadRequestException(
          `Child role hierarchy level (${child.hierarchyLevel}) must be greater than parent (${parent.hierarchyLevel})`,
        );
      }

      // Check if hierarchy already exists
      const existing = await this.prisma.roleHierarchy.findUnique({
        where: {
          roleId_parentRoleId: {
            roleId: childId,
            parentRoleId: parentId,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          'Hierarchy relationship already exists between these roles',
        );
      }

      // Create hierarchy relationship
      await this.prisma.roleHierarchy.create({
        data: {
          id: uuidv7(),
          roleId: childId,
          parentRoleId: parentId,
          inheritPermissions: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await this.invalidateHierarchyCache(childId, parentId);

      this.logger.log(
        `Created hierarchy: ${parent.name} (${parent.hierarchyLevel}) → ${child.name} (${child.hierarchyLevel})`,
      );

      return this.formatRoleResponse(child);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create role hierarchy: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create role hierarchy');
    }
  }

  /**
   * Get role hierarchy tree
   */
  async getHierarchyTree(roleId: string): Promise<RoleHierarchyNode> {
    const cacheKey = `${this.cachePrefix}tree:${roleId}`;
    const cached = await this.cache.get<RoleHierarchyNode>(cacheKey);

    if (cached) {
      return cached;
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const tree = await this.buildHierarchyTree(roleId);

    await this.cache.set(cacheKey, tree, this.cacheTTL);

    return tree;
  }

  /**
   * Get all inherited permissions from parent roles
   */
  async getInheritedPermissions(
    roleId: string,
  ): Promise<RolePermissionResponseDto[]> {
    const cacheKey = `${this.cachePrefix}inherited:${roleId}`;
    const cached =
      await this.cache.get<RolePermissionResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Get all ancestor roles (parent, grandparent, etc.)
    const ancestors = await this.getAncestors(roleId);

    // Collect permissions from all ancestors
    const inheritedPermissions: RolePermissionResponseDto[] = [];
    const seenPermissions = new Set<string>(); // Track unique permission IDs

    for (const ancestor of ancestors) {
      const permissions = await this.prisma.rolePermission.findMany({
        where: {
          roleId: ancestor.id,
          isGranted: true,
          OR: [
            { effectiveUntil: null },
            { effectiveUntil: { gte: new Date() } },
          ],
        },
        include: {
          permission: {
            select: {
              id: true,
              code: true,
              name: true,
              resource: true,
              action: true,
            },
          },
          role: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      for (const perm of permissions) {
        const key = perm.permissionId;
        if (!seenPermissions.has(key)) {
          seenPermissions.add(key);
          inheritedPermissions.push(this.formatRolePermissionResponse(perm));
        }
      }
    }

    await this.cache.set(cacheKey, inheritedPermissions, this.cacheTTL);

    this.logger.log(
      `Retrieved ${inheritedPermissions.length} inherited permissions for role ${role.name}`,
    );

    return inheritedPermissions;
  }

  /**
   * Remove parent-child relationship
   */
  async removeHierarchy(roleId: string): Promise<RoleResponseDto> {
    // Find all hierarchies where this role is a child
    const hierarchies = await this.prisma.roleHierarchy.findMany({
      where: { roleId },
    });

    if (hierarchies.length === 0) {
      throw new BadRequestException('Role does not have any parent relationships');
    }

    // Delete all parent relationships for this role
    await this.prisma.roleHierarchy.deleteMany({
      where: { roleId },
    });

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Invalidate cache for role and all its parents
    await this.invalidateHierarchyCache(roleId);
    for (const hierarchy of hierarchies) {
      await this.invalidateHierarchyCache(hierarchy.parentRoleId);
    }

    this.logger.log(`Removed hierarchy for role: ${role.name}`);

    return this.formatRoleResponse(role);
  }

  /**
   * Check if creating a hierarchy would create a circular dependency
   */
  private async wouldCreateCycle(
    childId: string,
    parentId: string,
  ): Promise<boolean> {
    // Check if parent is a descendant of child
    const descendants = await this.getDescendants(childId);
    return descendants.some((desc) => desc.id === parentId);
  }

  /**
   * Build hierarchical tree structure
   */
  private async buildHierarchyTree(
    roleId: string,
  ): Promise<RoleHierarchyNode> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Get children through RoleHierarchy table
    const childHierarchies = await this.prisma.roleHierarchy.findMany({
      where: {
        parentRoleId: roleId,
      },
      include: {
        role: true,
      },
    });

    const node: RoleHierarchyNode = {
      id: role.id,
      code: role.code,
      name: role.name,
      hierarchyLevel: role.hierarchyLevel,
      children: [],
    };

    // Recursively build children
    for (const hierarchy of childHierarchies) {
      if (hierarchy.role.isActive) {
        node.children.push(await this.buildHierarchyTree(hierarchy.role.id));
      }
    }

    return node;
  }

  /**
   * Get all ancestor roles (parent, grandparent, etc.)
   */
  private async getAncestors(roleId: string): Promise<any[]> {
    const ancestors: any[] = [];
    const visited = new Set<string>(); // Prevent infinite loops

    const queue = [roleId];

    while (queue.length > 0) {
      const currentRoleId = queue.shift()!;

      if (visited.has(currentRoleId)) continue;
      visited.add(currentRoleId);

      // Get parent hierarchies
      const parentHierarchies = await this.prisma.roleHierarchy.findMany({
        where: { roleId: currentRoleId },
        include: {
          parentRole: true,
        },
      });

      for (const hierarchy of parentHierarchies) {
        if (!visited.has(hierarchy.parentRole.id)) {
          ancestors.push(hierarchy.parentRole);
          queue.push(hierarchy.parentRole.id);
        }
      }
    }

    return ancestors;
  }

  /**
   * Get all descendant roles (children, grandchildren, etc.)
   */
  private async getDescendants(roleId: string): Promise<any[]> {
    const descendants: any[] = [];
    const visited = new Set<string>();

    const queue = [roleId];

    while (queue.length > 0) {
      const currentRoleId = queue.shift()!;

      if (visited.has(currentRoleId)) continue;
      visited.add(currentRoleId);

      // Get child hierarchies
      const childHierarchies = await this.prisma.roleHierarchy.findMany({
        where: { parentRoleId: currentRoleId },
        include: {
          role: true,
        },
      });

      for (const hierarchy of childHierarchies) {
        if (!visited.has(hierarchy.role.id)) {
          descendants.push(hierarchy.role);
          queue.push(hierarchy.role.id);
        }
      }
    }

    return descendants;
  }

  /**
   * Invalidate hierarchy cache
   */
  private async invalidateHierarchyCache(
    ...roleIds: (string | null)[]
  ): Promise<void> {
    for (const roleId of roleIds) {
      if (roleId) {
        await this.cache.del(`${this.cachePrefix}tree:${roleId}`);
        await this.cache.del(`${this.cachePrefix}inherited:${roleId}`);
      }
    }
  }

  /**
   * Format role response
   */
  private formatRoleResponse(role: any): RoleResponseDto {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      hierarchyLevel: role.hierarchyLevel,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Format role permission response
   */
  private formatRolePermissionResponse(perm: any): RolePermissionResponseDto {
    return {
      id: perm.id,
      roleId: perm.roleId,
      permissionId: perm.permissionId,
      conditions: perm.conditions,
      isGranted: perm.isGranted,
      effectiveFrom: perm.effectiveFrom,
      effectiveUntil: perm.effectiveUntil,
      createdAt: perm.createdAt,
      updatedAt: perm.updatedAt,
      permission: perm.permission
        ? {
            id: perm.permission.id,
            code: perm.permission.code,
            name: perm.permission.name,
            resource: perm.permission.resource,
            action: perm.permission.action,
          }
        : undefined,
      role: perm.role
        ? {
            id: perm.role.id,
            code: perm.role.code,
            name: perm.role.name,
          }
        : undefined,
    };
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  QueryPositionDto,
  PositionResponseDto,
  PaginatedPositionResponseDto,
  PositionHierarchyDto,
  PositionLevel,
} from '../dto/position.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);
  private readonly cachePrefix = 'position:';
  private readonly cacheTTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(
    createPositionDto: CreatePositionDto,
  ): Promise<PositionResponseDto> {
    try {
      // Verify department exists
      const department = await this.prisma.department.findUnique({
        where: { id: createPositionDto.departmentId },
        include: { school: true },
      });

      if (!department) {
        throw new NotFoundException(
          `Department with ID ${createPositionDto.departmentId} not found`,
        );
      }

      // Check for duplicate code within the department
      const existingPosition = await this.prisma.position.findFirst({
        where: {
          code: createPositionDto.code,
          departmentId: createPositionDto.departmentId,
        },
      });

      if (existingPosition) {
        throw new ConflictException(
          `Position with code ${createPositionDto.code} already exists in this department`,
        );
      }

      // Verify parent position if provided
      if (createPositionDto.parentId) {
        const parentPosition = await this.prisma.position.findFirst({
          where: {
            id: createPositionDto.parentId,
            departmentId: createPositionDto.departmentId,
          },
        });

        if (!parentPosition) {
          throw new NotFoundException(
            `Parent position with ID ${createPositionDto.parentId} not found in the same department`,
          );
        }
      }

      const position = await this.prisma.position.create({
        data: {
          id: uuidv7(),
          name: createPositionDto.name,
          code: createPositionDto.code,
          departmentId: createPositionDto.departmentId,
          hierarchyLevel: createPositionDto.hierarchyLevel, // Use hierarchyLevel from DTO
          maxHolders: createPositionDto.maxOccupants || 1,
          isActive: createPositionDto.isActive ?? true,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
              schoolId: true,
              school: {
                select: { id: true, name: true, code: true },
              },
            },
          },
          _count: {
            select: {
              userPositions: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(
        `${this.cachePrefix}hierarchy:${position.departmentId}`,
      );

      this.logger.log(`Created position: ${position.name} (${position.code})`);
      return this.formatPositionResponse(position);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create position: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create position');
    }
  }

  async findAll(
    query: QueryPositionDto,
  ): Promise<PaginatedPositionResponseDto> {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify(query)}`;
    const cached = await this.cache.get<PaginatedPositionResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PositionWhereInput = {};

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query.code) {
      where.code = { equals: query.code, mode: 'insensitive' };
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.schoolId) {
      where.department = { schoolId: query.schoolId };
    }

    if (query.level) {
      // Map PositionLevel enum to hierarchyLevel
      const levelMap: Record<string, number> = {
        ENTRY: 1,
        JUNIOR: 2,
        SENIOR: 3,
        LEAD: 4,
        MANAGER: 5,
        DIRECTOR: 6,
        EXECUTIVE: 7,
      };
      where.hierarchyLevel = levelMap[query.level] || 1;
    }

    if (query.parentId !== undefined) {
      // Filter by parent through PositionHierarchy if needed
    }

    if (query.isActive !== undefined) {
      // Handle both boolean and string values for isActive
      if (typeof query.isActive === 'string') {
        where.isActive = query.isActive === 'active' ? true : query.isActive === 'inactive' ? false : undefined;
      } else {
        where.isActive = query.isActive;
      }
    }

    // Always include department and school for frontend compatibility
    const include: Prisma.PositionInclude = {
      _count: {
        select: {
          userPositions: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
          schoolId: true,
          school: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    };

    if (query.includeParent) {
      // Include parent through PositionHierarchy if needed
    }

    const [positions, total] = await Promise.all([
      this.prisma.position.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include,
      }),
      this.prisma.position.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const result: PaginatedPositionResponseDto = {
      data: positions.map((position) => this.formatPositionResponse(position)),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };

    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async findOne(id: string): Promise<PositionResponseDto> {
    const cacheKey = `${this.cachePrefix}${id}`;
    const cached = await this.cache.get<PositionResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            schoolId: true,
            school: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        _count: {
          select: {
            userPositions: true,
          },
        },
      },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    const result = this.formatPositionResponse(position);
    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async update(
    id: string,
    updatePositionDto: UpdatePositionDto,
  ): Promise<PositionResponseDto> {
    try {
      // Check if position exists
      const existingPosition = await this.prisma.position.findUnique({
        where: { id },
      });

      if (!existingPosition) {
        throw new NotFoundException(`Position with ID ${id} not found`);
      }

      // Check for duplicate code if code is being updated
      if (
        updatePositionDto.code &&
        updatePositionDto.code !== existingPosition.code
      ) {
        const duplicatePosition = await this.prisma.position.findFirst({
          where: {
            code: updatePositionDto.code,
            departmentId: existingPosition.departmentId,
            id: { not: id },
          },
        });

        if (duplicatePosition) {
          throw new ConflictException(
            `Position with code ${updatePositionDto.code} already exists in this department`,
          );
        }
      }

      // Verify parent position if provided
      if (updatePositionDto.parentId) {
        if (updatePositionDto.parentId === id) {
          throw new BadRequestException('Position cannot be its own parent');
        }

        const parentPosition = await this.prisma.position.findFirst({
          where: {
            id: updatePositionDto.parentId,
            departmentId: existingPosition.departmentId,
          },
        });

        if (!parentPosition) {
          throw new NotFoundException(
            `Parent position with ID ${updatePositionDto.parentId} not found in the same department`,
          );
        }

        // Check for circular reference
        await this.checkCircularReference(
          updatePositionDto.parentId,
          id,
          existingPosition.departmentId || '',
        );
      }

      // Check if maxOccupants is being reduced below current occupants
      if (updatePositionDto.maxOccupants) {
        const currentOccupants = await this.prisma.userPosition.count({
          where: { positionId: id, isActive: true },
        });

        if (updatePositionDto.maxOccupants < currentOccupants) {
          throw new BadRequestException(
            `Cannot set maxOccupants to ${updatePositionDto.maxOccupants} as there are currently ${currentOccupants} users in this position`,
          );
        }
      }

      // Map DTO fields to database fields
      const updateData: any = {};
      if (updatePositionDto.name !== undefined)
        updateData.name = updatePositionDto.name;
      if (updatePositionDto.code !== undefined)
        updateData.code = updatePositionDto.code;
      if (updatePositionDto.hierarchyLevel !== undefined)
        updateData.hierarchyLevel = updatePositionDto.hierarchyLevel;
      if (updatePositionDto.maxOccupants !== undefined)
        updateData.maxHolders = updatePositionDto.maxOccupants;
      if (updatePositionDto.isActive !== undefined)
        updateData.isActive = updatePositionDto.isActive;

      const position = await this.prisma.position.update({
        where: { id },
        data: updateData,
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
              schoolId: true,
              school: {
                select: { id: true, name: true, code: true },
              },
            },
          },
          _count: {
            select: {
              userPositions: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(
        `${this.cachePrefix}hierarchy:${position.departmentId}`,
      );

      this.logger.log(`Updated position: ${position.name} (${position.id})`);
      return this.formatPositionResponse(position);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update position: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to update position');
    }
  }

  async remove(id: string): Promise<PositionResponseDto> {
    try {
      const position = await this.prisma.position.findUnique({
        where: { id },
        include: {
          userPositions: { where: { isActive: true } },
        },
      });

      if (!position) {
        throw new NotFoundException(`Position with ID ${id} not found`);
      }

      // Check if position has active users
      if (position.userPositions.length > 0) {
        throw new BadRequestException(
          'Cannot delete position with existing users. Please reassign or remove them first.',
        );
      }

      // Soft delete by setting isActive to false
      const deletedPosition = await this.prisma.position.update({
        where: { id },
        data: { isActive: false },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
              schoolId: true,
              school: {
                select: { id: true, name: true, code: true },
              },
            },
          },
          _count: {
            select: {
              userPositions: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(
        `${this.cachePrefix}hierarchy:${deletedPosition.departmentId}`,
      );

      this.logger.log(`Soft deleted position: ${deletedPosition.name} (${id})`);
      return this.formatPositionResponse(deletedPosition);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to delete position: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to delete position');
    }
  }

  async getHierarchy(departmentId: string): Promise<PositionHierarchyDto[]> {
    const cacheKey = `${this.cachePrefix}hierarchy:${departmentId}`;
    const cached = await this.cache.get<PositionHierarchyDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const positions = await this.prisma.position.findMany({
      where: { departmentId, isActive: true },
      orderBy: [{ hierarchyLevel: 'desc' }, { name: 'asc' }],
    });

    const hierarchy = this.buildHierarchy(positions, null);
    await this.cache.set(cacheKey, hierarchy, this.cacheTTL);
    return hierarchy;
  }

  async assignUserToPosition(
    userId: string,
    positionId: string,
    startDate?: Date,
  ): Promise<void> {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      include: {
        _count: {
          select: { userPositions: { where: { isActive: true } } },
        },
      },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${positionId} not found`);
    }

    if (!position.isActive) {
      throw new BadRequestException('Cannot assign user to inactive position');
    }

    // Check maxHolders limit
    if (
      position.maxHolders &&
      position._count.userPositions >= position.maxHolders
    ) {
      throw new BadRequestException(
        `Position ${position.name} has reached maximum occupancy (${position.maxHolders})`,
      );
    }

    // Check if user is already in this position
    const existingAssignment = await this.prisma.userPosition.findFirst({
      where: {
        userProfile: {
          id: userId,
        },
        positionId,
        isActive: true,
      },
    });

    if (existingAssignment) {
      throw new ConflictException('User is already assigned to this position');
    }

    // Create new assignment
    await this.prisma.userPosition.create({
      data: {
        id: uuidv7(),
        userProfileId: userId,
        positionId,
        startDate: startDate || new Date(),
        isActive: true,
      },
    });

    // Invalidate cache
    await this.cache.del(`${this.cachePrefix}${positionId}`);

    this.logger.log(
      `Assigned user ${userId} to position ${position.name} (${positionId})`,
    );
  }

  private buildHierarchy(
    positions: any[],
    parentId: string | null,
  ): PositionHierarchyDto[] {
    // Map hierarchyLevel to PositionLevel enum
    const levelMap: Record<number, PositionLevel> = {
      1: PositionLevel.ENTRY,
      2: PositionLevel.JUNIOR,
      3: PositionLevel.SENIOR,
      4: PositionLevel.LEAD,
      5: PositionLevel.MANAGER,
      6: PositionLevel.DIRECTOR,
      7: PositionLevel.EXECUTIVE,
    };

    return positions
      .filter((pos) => {
        // Filter by hierarchy level for simple hierarchy
        if (!parentId) return pos.hierarchyLevel === 1;
        return false;
      })
      .map((pos) => ({
        id: pos.id,
        name: pos.name,
        code: pos.code,
        level: levelMap[pos.hierarchyLevel] || PositionLevel.ENTRY,
        subordinates: positions
          .filter((child) => child.hierarchyLevel === pos.hierarchyLevel + 1)
          .map((child) => ({
            id: child.id,
            name: child.name,
            code: child.code,
            level: levelMap[child.hierarchyLevel] || PositionLevel.ENTRY,
            subordinates: [],
          })),
      }));
  }

  private async checkCircularReference(
    parentId: string,
    positionId: string,
    departmentId: string,
  ): Promise<void> {
    const visited = new Set<string>();
    const currentId = parentId;

    while (currentId) {
      if (visited.has(currentId)) {
        throw new BadRequestException(
          'Circular reference detected in position hierarchy',
        );
      }
      if (currentId === positionId) {
        throw new BadRequestException(
          'Setting this parent would create a circular reference',
        );
      }
      visited.add(currentId);

      const parent = await this.prisma.position.findFirst({
        where: { id: currentId, departmentId },
        select: { id: true, hierarchyLevel: true },
      });

      // For positions, we don't have direct parent relationships
      // This would need to be handled through PositionHierarchy if needed
      break;
    }
  }

  private formatPositionResponse(position: any): PositionResponseDto {
    // Map hierarchyLevel to PositionLevel enum
    const levelMap: Record<number, PositionLevel> = {
      1: PositionLevel.ENTRY,
      2: PositionLevel.JUNIOR,
      3: PositionLevel.SENIOR,
      4: PositionLevel.LEAD,
      5: PositionLevel.MANAGER,
      6: PositionLevel.DIRECTOR,
      7: PositionLevel.EXECUTIVE,
    };

    const holderCount = position._count?.userPositions || 0;

    const response: PositionResponseDto = {
      id: position.id,
      name: position.name,
      code: position.code,
      departmentId: position.departmentId,
      hierarchyLevel: position.hierarchyLevel, // Required field for frontend
      level: levelMap[position.hierarchyLevel] || PositionLevel.ENTRY,
      parentId: undefined, // Will be populated from PositionHierarchy if needed
      description: undefined,
      responsibilities: undefined,
      qualifications: undefined,
      maxOccupants: position.maxHolders,
      currentOccupants: holderCount,
      isActive: position.isActive,
      holderCount: holderCount, // Frontend expects this field name
      userCount: holderCount, // Alias for compatibility
      subordinateCount: 0, // Will be calculated if needed
      createdAt: position.createdAt,
      updatedAt: position.updatedAt,
    };

    // Add department details if available
    if (position.department) {
      response.department = position.department;

      // Extract school info from department if available
      if (position.department.school) {
        response.schoolId = position.department.schoolId;
        response.school = {
          id: position.department.school.id,
          name: position.department.school.name,
          code: position.department.school.code,
        };
      }
    }

    if (position.parent) {
      response.parent = position.parent;
    }

    return response;
  }
}

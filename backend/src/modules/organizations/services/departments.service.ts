import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  QueryDepartmentDto,
  DepartmentResponseDto,
  PaginatedDepartmentResponseDto,
  DepartmentHierarchyDto,
} from '../dto/department.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);
  private readonly cachePrefix = 'department:';
  private readonly cacheTTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(
    createDepartmentDto: CreateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    try {
      // Verify school exists
      const school = await this.prisma.school.findUnique({
        where: { id: createDepartmentDto.schoolId },
      });

      if (!school) {
        throw new NotFoundException(
          `School with ID ${createDepartmentDto.schoolId} not found`,
        );
      }

      // Check for duplicate code within the school
      const existingDepartment = await this.prisma.department.findFirst({
        where: {
          code: createDepartmentDto.code,
          schoolId: createDepartmentDto.schoolId,
        },
      });

      if (existingDepartment) {
        throw new ConflictException(
          `Department with code ${createDepartmentDto.code} already exists in this school`,
        );
      }

      // Verify parent department if provided
      if (createDepartmentDto.parentId) {
        const parentDept = await this.prisma.department.findFirst({
          where: {
            id: createDepartmentDto.parentId,
            schoolId: createDepartmentDto.schoolId,
          },
        });

        if (!parentDept) {
          throw new NotFoundException(
            `Parent department with ID ${createDepartmentDto.parentId} not found in the same school`,
          );
        }
      }

      // Verify head user if provided
      if (createDepartmentDto.headId) {
        const headUser = await this.prisma.userProfile.findUnique({
          where: { id: createDepartmentDto.headId },
        });

        if (!headUser) {
          throw new NotFoundException(
            `User with ID ${createDepartmentDto.headId} not found`,
          );
        }
      }

      const department = await this.prisma.department.create({
        data: {
          id: crypto.randomUUID(),
          ...createDepartmentDto,
          isActive: createDepartmentDto.isActive ?? true,
        },
        include: {
          school: {
            select: { id: true, name: true, code: true },
          },
          parent: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(
        `${this.cachePrefix}hierarchy:${department.schoolId}`,
      );

      this.logger.log(
        `Created department: ${department.name} (${department.code})`,
      );
      return this.formatDepartmentResponse(department);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create department: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create department');
    }
  }

  async findAll(
    query: QueryDepartmentDto,
  ): Promise<PaginatedDepartmentResponseDto> {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify(query)}`;
    const cached =
      await this.cache.get<PaginatedDepartmentResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DepartmentWhereInput = {};

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query.code) {
      where.code = { equals: query.code, mode: 'insensitive' };
    }

    if (query.schoolId) {
      where.schoolId = query.schoolId;
    }

    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const include: Prisma.DepartmentInclude = {
      _count: {
        select: {
          positions: true,
          children: true,
        },
      },
    };

    if (query.includeSchool) {
      include.school = {
        select: { id: true, name: true, code: true },
      };
    }

    if (query.includeParent) {
      include.parent = {
        select: { id: true, name: true, code: true },
      };
    }

    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include,
      }),
      this.prisma.department.count({ where }),
    ]);

    // Get user counts for each department
    const departmentIds = departments.map((d) => d.id);
    const positions = await this.prisma.position.findMany({
      where: { departmentId: { in: departmentIds } },
      include: {
        userPositions: {
          where: { isActive: true },
        },
      },
    });

    const userCountMap = new Map<string, number>();
    for (const dept of departments) {
      const deptPositions = positions.filter((p) => p.departmentId === dept.id);
      const userCount = deptPositions.reduce(
        (sum, pos) => sum + pos.userPositions.length,
        0,
      );
      userCountMap.set(dept.id, userCount);
    }

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const result: PaginatedDepartmentResponseDto = {
      data: departments.map((dept) =>
        this.formatDepartmentResponse(dept, userCountMap.get(dept.id) || 0),
      ),
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

  async findOne(id: string): Promise<DepartmentResponseDto> {
    const cacheKey = `${this.cachePrefix}${id}`;
    const cached = await this.cache.get<DepartmentResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        school: {
          select: { id: true, name: true, code: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: {
            positions: true,
            children: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Get user count through positions
    const positions = await this.prisma.position.findMany({
      where: { departmentId: id },
      include: {
        userPositions: {
          where: { isActive: true },
        },
      },
    });
    const userCount = positions.reduce(
      (sum, pos) => sum + pos.userPositions.length,
      0,
    );

    const result = this.formatDepartmentResponse(department, userCount);
    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    try {
      // Check if department exists
      const existingDepartment = await this.prisma.department.findUnique({
        where: { id },
      });

      if (!existingDepartment) {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }

      // Check for duplicate code if code is being updated
      if (
        updateDepartmentDto.code &&
        updateDepartmentDto.code !== existingDepartment.code
      ) {
        const duplicateDepartment = await this.prisma.department.findFirst({
          where: {
            code: updateDepartmentDto.code,
            schoolId: existingDepartment.schoolId,
            id: { not: id },
          },
        });

        if (duplicateDepartment) {
          throw new ConflictException(
            `Department with code ${updateDepartmentDto.code} already exists in this school`,
          );
        }
      }

      // Verify parent department if provided
      if (updateDepartmentDto.parentId) {
        if (updateDepartmentDto.parentId === id) {
          throw new BadRequestException('Department cannot be its own parent');
        }

        const parentDept = await this.prisma.department.findFirst({
          where: {
            id: updateDepartmentDto.parentId,
            schoolId: existingDepartment.schoolId,
          },
        });

        if (!parentDept) {
          throw new NotFoundException(
            `Parent department with ID ${updateDepartmentDto.parentId} not found in the same school`,
          );
        }

        // Check for circular reference
        if (existingDepartment.schoolId) {
          await this.checkCircularReference(
            updateDepartmentDto.parentId,
            id,
            existingDepartment.schoolId,
          );
        }
      }

      const department = await this.prisma.department.update({
        where: { id },
        data: updateDepartmentDto,
        include: {
          school: {
            select: { id: true, name: true, code: true },
          },
          parent: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: {
              positions: true,
              children: true,
            },
          },
        },
      });

      // Get user count through positions
      const userCount = await this.prisma.userPosition.count({
        where: {
          position: {
            departmentId: id,
          },
          isActive: true,
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(
        `${this.cachePrefix}hierarchy:${department.schoolId}`,
      );

      this.logger.log(
        `Updated department: ${department.name} (${department.id})`,
      );
      return this.formatDepartmentResponse(department, userCount);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update department: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to update department');
    }
  }

  async remove(id: string): Promise<DepartmentResponseDto> {
    try {
      const department = await this.prisma.department.findUnique({
        where: { id },
        include: {
          positions: true,
          children: true,
        },
      });

      if (!department) {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }

      // Check if department has positions or child departments
      if (department.positions.length > 0 || department.children.length > 0) {
        throw new BadRequestException(
          'Cannot delete department with existing positions or child departments. Please remove them first.',
        );
      }

      // Soft delete by setting isActive to false
      const deletedDepartment = await this.prisma.department.update({
        where: { id },
        data: { isActive: false },
        include: {
          school: {
            select: { id: true, name: true, code: true },
          },
          parent: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: {
              positions: true,
              children: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(
        `${this.cachePrefix}hierarchy:${deletedDepartment.schoolId}`,
      );

      this.logger.log(
        `Soft deleted department: ${deletedDepartment.name} (${id})`,
      );
      return this.formatDepartmentResponse(deletedDepartment);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to delete department: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to delete department');
    }
  }

  async getHierarchy(schoolId: string): Promise<DepartmentHierarchyDto[]> {
    const cacheKey = `${this.cachePrefix}hierarchy:${schoolId}`;
    const cached = await this.cache.get<DepartmentHierarchyDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const departments = await this.prisma.department.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const hierarchy = this.buildHierarchy(departments, null, 1);
    await this.cache.set(cacheKey, hierarchy, this.cacheTTL);
    return hierarchy;
  }

  private buildHierarchy(
    departments: any[],
    parentId: string | null,
    level: number,
  ): DepartmentHierarchyDto[] {
    return departments
      .filter((dept) => dept.parentId === parentId)
      .map((dept) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        level,
        children: this.buildHierarchy(departments, dept.id, level + 1),
      }));
  }

  private async checkCircularReference(
    parentId: string,
    departmentId: string,
    schoolId: string,
  ): Promise<void> {
    const visited = new Set<string>();
    let currentId: string | null = parentId;

    while (currentId) {
      if (visited.has(currentId)) {
        throw new BadRequestException(
          'Circular reference detected in department hierarchy',
        );
      }
      if (currentId === departmentId) {
        throw new BadRequestException(
          'Setting this parent would create a circular reference',
        );
      }
      visited.add(currentId);

      const parent = await this.prisma.department.findFirst({
        where: { id: currentId, schoolId },
        select: { parentId: true },
      });

      currentId = parent?.parentId || null;
    }
  }

  private formatDepartmentResponse(
    department: any,
    userCount = 0,
  ): DepartmentResponseDto {
    const response: DepartmentResponseDto = {
      id: department.id,
      name: department.name,
      code: department.code,
      schoolId: department.schoolId,
      parentId: department.parentId,
      headId: department.headId,
      description: department.description,
      isActive: department.isActive,
      positionCount: department._count?.positions || 0,
      userCount,
      childDepartmentCount: department._count?.children || 0,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };

    if (department.school) {
      response.school = department.school;
    }

    if (department.parent) {
      response.parent = department.parent;
    }

    if (department.head) {
      response.head = {
        id: department.head.id,
        name:
          `${department.head.firstName || ''} ${department.head.lastName || ''}`.trim() ||
          department.head.email,
        email: department.head.email,
      };
    }

    return response;
  }
}

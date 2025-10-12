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
      // Verify school exists if provided
      if (createDepartmentDto.schoolId) {
        const school = await this.prisma.school.findUnique({
          where: { id: createDepartmentDto.schoolId },
        });

        if (!school) {
          throw new NotFoundException(
            `School with ID ${createDepartmentDto.schoolId} not found`,
          );
        }
      }

      // Check for duplicate code
      await this.checkDuplicateCode(
        createDepartmentDto.code,
        createDepartmentDto.schoolId,
      );

      // Verify parent department if provided
      if (createDepartmentDto.parentId) {
        const parentDept = await this.prisma.department.findUnique({
          where: { id: createDepartmentDto.parentId },
        });

        if (!parentDept) {
          throw new NotFoundException(
            `Parent department with ID ${createDepartmentDto.parentId} not found`,
          );
        }

        // Validate parent-child relationship
        await this.validateParentChildRelationship(
          createDepartmentDto.schoolId,
          parentDept.schoolId,
          createDepartmentDto.parentId,
        );
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
        `Created department: ${department.name} (${department.code}) - ${department.schoolId ? 'School-specific' : 'Foundation-level'}`,
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
    // Use hierarchy ordering if sortBy is 'hierarchy' or undefined (default)
    if (query.sortBy === 'hierarchy' || query.sortBy === undefined) {
      return this.findAllWithHierarchyOrder(query);
    }

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

  /**
   * Find all departments with hierarchy-based ordering using PostgreSQL Recursive CTE
   * Calculates hierarchy levels and paths dynamically for proper hierarchical sorting
   * @param query - Query parameters including filters and pagination
   * @returns Paginated departments ordered by hierarchy (root departments first, then children)
   */
  async findAllWithHierarchyOrder(
    query: QueryDepartmentDto,
  ): Promise<PaginatedDepartmentResponseDto> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Separate filters into hierarchy filters and search filters
    // Hierarchy filters: Applied in CTE to build the tree structure
    // Search filters: Applied after CTE to search across full hierarchy
    const hierarchyConditions: string[] = ['1=1'];
    const searchConditions: string[] = ['1=1'];
    const hierarchyParams: any[] = [];
    const searchParams: any[] = [];

    // Search filters - applied AFTER building hierarchy
    if (query.name) {
      searchParams.push(`%${query.name}%`);
      searchConditions.push(`name ILIKE $${searchParams.length}`);
    }

    if (query.code) {
      searchParams.push(`%${query.code}%`);
      searchConditions.push(`code ILIKE $${searchParams.length}`);
    }

    // Hierarchy filters - applied DURING hierarchy construction
    if (query.schoolId) {
      hierarchyParams.push(query.schoolId);
      hierarchyConditions.push(`d.school_id = $${hierarchyParams.length}`);
    }

    if (query.parentId !== undefined) {
      if (query.parentId === null) {
        hierarchyConditions.push(`d.parent_id IS NULL`);
      } else {
        hierarchyParams.push(query.parentId);
        hierarchyConditions.push(`d.parent_id = $${hierarchyParams.length}`);
      }
    }

    if (query.isActive !== undefined) {
      hierarchyParams.push(query.isActive);
      hierarchyConditions.push(`d.is_active = $${hierarchyParams.length}`);
    }

    const hierarchyClause = hierarchyConditions.join(' AND ');
    const searchClause = searchConditions.join(' AND ');

    // Combine all params: hierarchy params + search params + pagination params
    const allParams = [...hierarchyParams, ...searchParams, limit, skip];
    const searchParamOffset = hierarchyParams.length;
    const paginationOffset = hierarchyParams.length + searchParams.length;

    // Recursive CTE query for hierarchical ordering
    // Build full hierarchy first, then apply search filters
    const departmentsQuery = `
      WITH RECURSIVE department_hierarchy AS (
        -- Base case: Root departments (parentId IS NULL)
        SELECT
          d.id,
          d.code,
          d.name,
          d.school_id,
          d.parent_id,
          d.description,
          d.is_active,
          d.created_at,
          d.updated_at,
          d.created_by,
          d.modified_by,
          0 as hierarchy_level,
          LPAD('000', 3, '0') || d.name as hierarchy_path,
          d.id as root_id
        FROM gloria_ops.departments d
        WHERE d.parent_id IS NULL
          AND ${hierarchyClause}

        UNION ALL

        -- Recursive case: Child departments
        SELECT
          d.id,
          d.code,
          d.name,
          d.school_id,
          d.parent_id,
          d.description,
          d.is_active,
          d.created_at,
          d.updated_at,
          d.created_by,
          d.modified_by,
          dh.hierarchy_level + 1 as hierarchy_level,
          dh.hierarchy_path || '.' || LPAD((dh.hierarchy_level + 1)::text, 3, '0') || d.name as hierarchy_path,
          dh.root_id
        FROM gloria_ops.departments d
        INNER JOIN department_hierarchy dh ON d.parent_id = dh.id
        WHERE ${hierarchyClause}
      )
      SELECT * FROM department_hierarchy
      WHERE ${searchClause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + searchParamOffset}`)}
      ORDER BY hierarchy_path ASC
      LIMIT $${paginationOffset + 1} OFFSET $${paginationOffset + 2}
    `;

    const departments = await this.prisma.$queryRawUnsafe<any[]>(
      departmentsQuery,
      ...allParams,
    );

    // Count total matching departments with same filter logic
    const countQuery = `
      WITH RECURSIVE department_hierarchy AS (
        SELECT d.id, d.name, d.code
        FROM gloria_ops.departments d
        WHERE d.parent_id IS NULL AND ${hierarchyClause}

        UNION ALL

        SELECT d.id, d.name, d.code
        FROM gloria_ops.departments d
        INNER JOIN department_hierarchy dh ON d.parent_id = dh.id
        WHERE ${hierarchyClause}
      )
      SELECT COUNT(*)::int as total FROM department_hierarchy
      WHERE ${searchClause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + searchParamOffset}`)}
    `;

    const countResult = await this.prisma.$queryRawUnsafe<
      Array<{ total: number }>
    >(countQuery, ...hierarchyParams, ...searchParams);
    const total = countResult[0]?.total || 0;

    // Fetch additional data (school, parent, counts)
    const departmentIds = departments.map((d) => d.id);

    if (departmentIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }

    type SchoolData = { id: string; name: string; code: string };
    type ParentData = { id: string; name: string; code: string };

    const [schoolsResult, parentsResult, positionCounts, childrenCounts] =
      await Promise.all([
        query.includeSchool
          ? this.prisma.school.findMany({
              where: {
                id: {
                  in: departments
                    .map((d) => d.school_id)
                    .filter(Boolean) as string[],
                },
              },
              select: { id: true, name: true, code: true },
            })
          : (Promise.resolve([]) as Promise<SchoolData[]>),
        query.includeParent
          ? this.prisma.department.findMany({
              where: {
                id: {
                  in: departments
                    .map((d) => d.parent_id)
                    .filter(Boolean) as string[],
                },
              },
              select: { id: true, name: true, code: true },
            })
          : (Promise.resolve([]) as Promise<ParentData[]>),
        this.prisma.position.groupBy({
          by: ['departmentId'],
          where: { departmentId: { in: departmentIds } },
          _count: true,
        }),
        this.prisma.department.groupBy({
          by: ['parentId'],
          where: { parentId: { in: departmentIds } },
          _count: true,
        }),
      ]);

    // Create lookup maps
    const schoolMap = new Map<string, SchoolData>();
    schoolsResult.forEach((s) => schoolMap.set(s.id, s));

    const parentMap = new Map<string, ParentData>();
    parentsResult.forEach((p) => parentMap.set(p.id, p));

    const positionCountMap = new Map<string, number>();
    positionCounts.forEach((p) => {
      if (p.departmentId) {
        positionCountMap.set(p.departmentId, p._count);
      }
    });

    const childrenCountMap = new Map<string, number>();
    childrenCounts.forEach((c) => {
      if (c.parentId) {
        childrenCountMap.set(c.parentId, c._count);
      }
    });

    // Get user counts
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

    // Format response
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const result: PaginatedDepartmentResponseDto = {
      data: departments.map((dept) => {
        const response: DepartmentResponseDto = {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          schoolId: dept.school_id,
          parentId: dept.parent_id,
          description: dept.description,
          isActive: dept.is_active,
          positionCount: positionCountMap.get(dept.id) || 0,
          userCount: userCountMap.get(dept.id) || 0,
          childDepartmentCount: childrenCountMap.get(dept.id) || 0,
          createdAt: dept.created_at,
          updatedAt: dept.updated_at,
          createdBy: dept.created_by,
          modifiedBy: dept.modified_by,
        };

        if (query.includeSchool && dept.school_id) {
          response.school = schoolMap.get(dept.school_id);
        }

        if (query.includeParent && dept.parent_id) {
          response.parent = parentMap.get(dept.parent_id);
        }

        return response;
      }),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };

    this.logger.debug(
      `Retrieved ${departments.length} departments with hierarchy ordering (total: ${total})`,
    );

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
        await this.checkDuplicateCode(
          updateDepartmentDto.code,
          existingDepartment.schoolId,
          id,
        );
      }

      // Verify parent department if provided
      if (updateDepartmentDto.parentId) {
        if (updateDepartmentDto.parentId === id) {
          throw new BadRequestException('Department cannot be its own parent');
        }

        const parentDept = await this.prisma.department.findUnique({
          where: { id: updateDepartmentDto.parentId },
        });

        if (!parentDept) {
          throw new NotFoundException(
            `Parent department with ID ${updateDepartmentDto.parentId} not found`,
          );
        }

        // Validate parent-child relationship
        await this.validateParentChildRelationship(
          existingDepartment.schoolId,
          parentDept.schoolId,
          updateDepartmentDto.parentId,
        );

        // Check for circular reference
        await this.checkCircularReference(updateDepartmentDto.parentId, id);
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

  /**
   * Checks for circular references in department hierarchy
   * Works for both foundation and school-specific departments
   * @param parentId - ID of the proposed parent department
   * @param departmentId - ID of the current department
   * @throws BadRequestException if circular reference detected
   */
  private async checkCircularReference(
    parentId: string,
    departmentId: string,
  ): Promise<void> {
    const visited = new Set<string>();
    let currentId: string | null = parentId;

    while (currentId) {
      if (visited.has(currentId)) {
        this.logger.error(
          `Circular reference detected in hierarchy: visited ${visited.size} departments`,
        );
        throw new BadRequestException(
          'Circular reference detected in department hierarchy',
        );
      }
      if (currentId === departmentId) {
        this.logger.error(
          `Circular reference: parent chain leads back to department ${departmentId}`,
        );
        throw new BadRequestException(
          'Setting this parent would create a circular reference',
        );
      }
      visited.add(currentId);

      // Check across ALL departments (foundation + schools)
      const parent = await this.prisma.department.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = parent?.parentId || null;
    }

    this.logger.debug(
      `Circular reference check passed (checked ${visited.size} departments)`,
    );
  }

  /**
   * Validates parent-child department relationship
   * @param childSchoolId - School ID of the child department (null/undefined = foundation)
   * @param parentSchoolId - School ID of the parent department (null/undefined = foundation)
   * @param parentId - ID of the parent department
   * @throws BadRequestException if relationship is invalid
   *
   * Rules:
   * - Foundation child → Any parent allowed
   * - School child + Foundation parent → Allowed
   * - School child + Same school parent → Allowed
   * - School child + Different school parent → BLOCKED
   */
  private async validateParentChildRelationship(
    childSchoolId: string | null | undefined,
    parentSchoolId: string | null | undefined,
    parentId: string,
  ): Promise<void> {
    // Foundation-level child → Any parent allowed
    if (!childSchoolId) {
      this.logger.debug(
        `Foundation-level department can have any parent (parent: ${parentId})`,
      );
      return;
    }

    // Foundation-level parent → Always allowed for school children
    if (!parentSchoolId) {
      this.logger.debug(
        `School department can have foundation-level parent (parent: ${parentId})`,
      );
      return;
    }

    // Both have schoolId → Must match
    if (childSchoolId !== parentSchoolId) {
      this.logger.warn(
        `Rejected cross-school parent assignment: child school ${childSchoolId}, parent school ${parentSchoolId}`,
      );
      throw new BadRequestException(
        'School-specific department can only have foundation-level parent or parent from the same school',
      );
    }

    this.logger.debug(
      `Same-school parent relationship validated (school: ${childSchoolId})`,
    );
  }

  /**
   * Checks for duplicate department code within appropriate scope
   * @param code - Department code to check
   * @param schoolId - School ID (null/undefined = foundation level)
   * @param excludeId - Department ID to exclude from check (for updates)
   * @throws ConflictException if duplicate code found
   *
   * Scope Rules:
   * - Foundation departments: code unique among foundation departments only
   * - School departments: code unique within that school only
   * - Foundation "HR" and School A "HR" can coexist (different scopes)
   */
  private async checkDuplicateCode(
    code: string,
    schoolId: string | null | undefined,
    excludeId?: string,
  ): Promise<void> {
    const where: Prisma.DepartmentWhereInput = {
      code,
      schoolId: schoolId || null, // Explicit null for foundation level
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existingDepartment = await this.prisma.department.findFirst({
      where,
    });

    if (existingDepartment) {
      const scope = schoolId ? 'in this school' : 'at foundation level';
      this.logger.warn(
        `Duplicate code detected: ${code} ${scope} (existing: ${existingDepartment.id})`,
      );
      throw new ConflictException(
        `Department code ${code} already exists ${scope}`,
      );
    }
  }

  async getCodeOptions(): Promise<string[]> {
    const cacheKey = `${this.cachePrefix}code-options`;
    const cached = await this.cache.get<string[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const results = await this.prisma.$queryRaw<
        Array<{ bidang_kerja: string }>
      >`
        SELECT DISTINCT bidang_kerja
        FROM gloria_master.data_karyawan
        WHERE bagian_kerja = 'YAYASAN'
          AND status_aktif = 'Aktif'
          AND bidang_kerja IS NOT NULL
        ORDER BY bidang_kerja ASC
      `;

      const options = results
        .map((r) => r.bidang_kerja)
        .filter((code) => code && code.trim().length > 0);

      await this.cache.set(cacheKey, options, this.cacheTTL);
      return options;
    } catch (error) {
      this.logger.error(
        `Failed to fetch department code options: ${error.message}`,
        error.stack,
      );
      return [];
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
      description: department.description,
      isActive: department.isActive,
      positionCount: department._count?.positions || 0,
      userCount,
      childDepartmentCount: department._count?.children || 0,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      createdBy: department.createdBy,
      modifiedBy: department.modifiedBy,
    };

    if (department.school) {
      response.school = department.school;
    }

    if (department.parent) {
      response.parent = department.parent;
    }

    return response;
  }
}

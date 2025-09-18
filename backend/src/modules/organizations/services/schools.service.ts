import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  QuerySchoolDto,
  SchoolResponseDto,
  PaginatedSchoolResponseDto,
} from '../dto/school.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);
  private readonly cachePrefix = 'school:';
  private readonly cacheTTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(createSchoolDto: CreateSchoolDto): Promise<SchoolResponseDto> {
    try {
      // Check for duplicate code
      const existingSchool = await this.prisma.school.findUnique({
        where: { code: createSchoolDto.code },
      });

      if (existingSchool) {
        throw new ConflictException(
          `School with code ${createSchoolDto.code} already exists`,
        );
      }

      const school = await this.prisma.school.create({
        data: {
          id: randomUUID(),
          ...createSchoolDto,
          isActive: createSchoolDto.isActive ?? true,
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Created school: ${school.name} (${school.code})`);
      return this.formatSchoolResponse(school);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Failed to create school: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create school');
    }
  }

  async findAll(query: QuerySchoolDto): Promise<PaginatedSchoolResponseDto> {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify(query)}`;
    const cached = await this.cache.get<PaginatedSchoolResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SchoolWhereInput = {};

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query.code) {
      where.code = { equals: query.code, mode: 'insensitive' };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              departments: true,
            },
          },
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const result: PaginatedSchoolResponseDto = {
      data: schools.map((school) => this.formatSchoolResponse(school)),
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

  async findOne(id: string): Promise<SchoolResponseDto> {
    const cacheKey = `${this.cachePrefix}${id}`;
    const cached = await this.cache.get<SchoolResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            departments: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }

    const result = this.formatSchoolResponse(school);
    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async findByCode(code: string): Promise<SchoolResponseDto> {
    const school = await this.prisma.school.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            departments: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException(`School with code ${code} not found`);
    }

    return this.formatSchoolResponse(school);
  }

  async update(
    id: string,
    updateSchoolDto: UpdateSchoolDto,
  ): Promise<SchoolResponseDto> {
    try {
      // Check if school exists
      const existingSchool = await this.prisma.school.findUnique({
        where: { id },
      });

      if (!existingSchool) {
        throw new NotFoundException(`School with ID ${id} not found`);
      }

      // Check for duplicate code if code is being updated
      if (
        updateSchoolDto.code &&
        updateSchoolDto.code !== existingSchool.code
      ) {
        const duplicateSchool = await this.prisma.school.findUnique({
          where: { code: updateSchoolDto.code },
        });

        if (duplicateSchool) {
          throw new ConflictException(
            `School with code ${updateSchoolDto.code} already exists`,
          );
        }
      }

      const school = await this.prisma.school.update({
        where: { id },
        data: updateSchoolDto,
        include: {
          _count: {
            select: {
              departments: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Updated school: ${school.name} (${school.id})`);
      return this.formatSchoolResponse(school);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update school: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to update school');
    }
  }

  async remove(id: string): Promise<SchoolResponseDto> {
    try {
      const school = await this.prisma.school.findUnique({
        where: { id },
        include: {
          departments: true,
          positions: {
            include: {
              userPositions: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (!school) {
        throw new NotFoundException(`School with ID ${id} not found`);
      }

      // Check if school has departments or users
      const hasActiveUsers =
        school.positions?.some((pos) => pos.userPositions?.length > 0) || false;
      if (school.departments.length > 0 || hasActiveUsers) {
        throw new BadRequestException(
          'Cannot delete school with existing departments or users. Please remove them first.',
        );
      }

      // Soft delete by setting isActive to false
      const deletedSchool = await this.prisma.school.update({
        where: { id },
        data: { isActive: false },
        include: {
          _count: {
            select: {
              departments: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Soft deleted school: ${deletedSchool.name} (${id})`);
      return this.formatSchoolResponse(deletedSchool);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to delete school: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to delete school');
    }
  }

  async restore(id: string): Promise<SchoolResponseDto> {
    try {
      const school = await this.prisma.school.findUnique({
        where: { id },
      });

      if (!school) {
        throw new NotFoundException(`School with ID ${id} not found`);
      }

      if (school.isActive) {
        throw new BadRequestException('School is already active');
      }

      const restoredSchool = await this.prisma.school.update({
        where: { id },
        data: { isActive: true },
        include: {
          _count: {
            select: {
              departments: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Restored school: ${restoredSchool.name} (${id})`);
      return this.formatSchoolResponse(restoredSchool);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to restore school: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to restore school');
    }
  }

  async getStatistics(schoolId?: string) {
    const where: Prisma.SchoolWhereInput = {};
    if (schoolId) {
      where.id = schoolId;
    }

    const [totalSchools, activeSchools, totalDepartments, totalUsers] =
      await Promise.all([
        this.prisma.school.count({ where }),
        this.prisma.school.count({ where: { ...where, isActive: true } }),
        this.prisma.department.count({
          where: schoolId
            ? {
                positions: {
                  some: {
                    schoolId,
                  },
                },
              }
            : {},
        }),
        this.prisma.userProfile.count({
          where: schoolId
            ? {
                positions: {
                  some: {
                    position: {
                      schoolId,
                    },
                  },
                },
              }
            : {},
        }),
      ]);

    return {
      totalSchools,
      activeSchools,
      inactiveSchools: totalSchools - activeSchools,
      totalDepartments,
      totalUsers,
    };
  }

  private formatSchoolResponse(school: any): SchoolResponseDto {
    return {
      id: school.id,
      name: school.name,
      code: school.code,
      address: school.address,
      phone: school.phone,
      email: school.email,
      website: school.website,
      principal: school.principal,
      description: school.description,
      isActive: school.isActive,
      departmentCount: school._count?.departments || 0,
      userCount:
        school.positions?.reduce(
          (sum, pos) => sum + (pos._count?.userPositions || 0),
          0,
        ) ||
        school._count?.positions ||
        0,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };
  }
}

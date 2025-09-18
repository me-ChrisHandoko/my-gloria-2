import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';

export interface OrganizationHierarchy {
  schools: Array<{
    id: string;
    name: string;
    code: string;
    isActive: boolean;
    departments: Array<{
      id: string;
      name: string;
      code: string;
      isActive: boolean;
      positions: Array<{
        id: string;
        name: string;
        code: string;
        level: string;
        isActive: boolean;
        userCount: number;
      }>;
    }>;
  }>;
}

export interface UserOrganizationPath {
  userId: string;
  schoolId: string;
  schoolName: string;
  departmentId: string;
  departmentName: string;
  positionId: string;
  positionName: string;
  level: string;
  path: string;
}

@Injectable()
export class OrganizationHierarchyService {
  private readonly logger = new Logger(OrganizationHierarchyService.name);
  private readonly cachePrefix = 'org-hierarchy:';
  private readonly cacheTTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getFullHierarchy(): Promise<OrganizationHierarchy> {
    const cacheKey = `${this.cachePrefix}full`;
    const cached = await this.cache.get<OrganizationHierarchy>(cacheKey);

    if (cached) {
      return cached;
    }

    const schools = await this.prisma.school.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        departments: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            positions: {
              where: { isActive: true },
              orderBy: [{ hierarchyLevel: 'desc' }, { name: 'asc' }],
              include: {
                _count: {
                  select: { userPositions: { where: { isActive: true } } },
                },
              },
            },
          },
        },
      },
    });

    const hierarchy: OrganizationHierarchy = {
      schools: schools.map((school) => ({
        id: school.id,
        name: school.name,
        code: school.code,
        isActive: school.isActive,
        departments: school.departments.map((dept) => ({
          id: dept.id,
          name: dept.name,
          code: dept.code,
          isActive: dept.isActive,
          positions: dept.positions.map((pos) => ({
            id: pos.id,
            name: pos.name,
            code: pos.code,
            level: pos.hierarchyLevel.toString(),
            isActive: pos.isActive,
            userCount: pos._count.userPositions,
          })),
        })),
      })),
    };

    await this.cache.set(cacheKey, hierarchy, this.cacheTTL);
    return hierarchy;
  }

  async getSchoolHierarchy(schoolId: string): Promise<any> {
    const cacheKey = `${this.cachePrefix}school:${schoolId}`;
    const cached = await this.cache.get<any>(cacheKey);

    if (cached) {
      return cached;
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        departments: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            positions: {
              where: { isActive: true },
              orderBy: [{ hierarchyLevel: 'desc' }, { name: 'asc' }],
              include: {
                _count: {
                  select: { userPositions: { where: { isActive: true } } },
                },
              },
            },
            _count: {
              select: { positions: true },
            },
          },
        },
        _count: {
          select: {
            departments: true,
            positions: true,
          },
        },
        positions: {
          select: {
            _count: {
              select: {
                userPositions: {
                  where: {
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!school) {
      return null;
    }

    const hierarchy = {
      id: school.id,
      name: school.name,
      code: school.code,
      isActive: school.isActive,
      stats: {
        totalDepartments: school._count.departments,
        totalUsers:
          school.positions?.reduce(
            (sum, pos) => sum + pos._count.userPositions,
            0,
          ) || 0,
      },
      departments: school.departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        parentId: dept.parentId,
        isActive: dept.isActive,
        positionCount: dept._count.positions,
        positions: dept.positions.map((pos) => ({
          id: pos.id,
          name: pos.name,
          code: pos.code,
          level: pos.hierarchyLevel,
          parentId: null,
          userCount: pos._count.userPositions,
        })),
      })),
    };

    await this.cache.set(cacheKey, hierarchy, this.cacheTTL);
    return hierarchy;
  }

  async getUserOrganizationPath(
    userId: string,
  ): Promise<UserOrganizationPath[]> {
    const cacheKey = `${this.cachePrefix}user:${userId}`;
    const cached = await this.cache.get<UserOrganizationPath[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const userPositions = await this.prisma.userPosition.findMany({
      where: {
        userProfile: {
          id: userId,
        },
        isActive: true,
      },
      include: {
        position: {
          include: {
            department: {
              include: {
                school: true,
              },
            },
          },
        },
      },
    });

    const paths: UserOrganizationPath[] = userPositions.map((up) => ({
      userId,
      schoolId:
        up.position.department?.school?.id || up.position.schoolId || '',
      schoolName: up.position.department?.school?.name || '',
      departmentId: up.position.department?.id || '',
      departmentName: up.position.department?.name || '',
      positionId: up.position.id,
      positionName: up.position.name,
      level: up.position.hierarchyLevel.toString(),
      path: up.position.department
        ? `${up.position.department.school?.name || 'Unknown'} > ${up.position.department.name} > ${up.position.name}`
        : `Unknown > ${up.position.name}`,
    }));

    await this.cache.set(cacheKey, paths, this.cacheTTL);
    return paths;
  }

  async getDepartmentUsers(departmentId: string): Promise<any[]> {
    const users = await this.prisma.userPosition.findMany({
      where: {
        position: {
          departmentId,
        },
        isActive: true,
      },
      include: {
        userProfile: {
          select: {
            id: true,
            nip: true,
            dataKaryawan: {
              select: {
                nama: true,
                email: true,
              },
            },
          },
        },
        position: {
          select: {
            id: true,
            name: true,
            code: true,
            hierarchyLevel: true,
          },
        },
      },
    });

    return users.map((up) => ({
      userId: up.userProfile.id,
      email: up.userProfile.dataKaryawan?.email || '',
      name: up.userProfile.dataKaryawan?.nama || '',
      nip: up.userProfile.nip,
      position: up.position,
      startDate: up.startDate,
    }));
  }

  async getPositionUsers(positionId: string): Promise<any[]> {
    const users = await this.prisma.userPosition.findMany({
      where: {
        positionId,
        isActive: true,
      },
      include: {
        userProfile: {
          select: {
            id: true,
            nip: true,
            dataKaryawan: {
              select: {
                nama: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return users.map((up) => ({
      userId: up.userProfile.id,
      email: up.userProfile.dataKaryawan?.email || '',
      name: up.userProfile.dataKaryawan?.nama || '',
      nip: up.userProfile.nip,
      startDate: up.startDate,
      isPrimary: !up.isPlt,
    }));
  }

  async getOrganizationStatistics() {
    const [
      totalSchools,
      activeSchools,
      totalDepartments,
      activeDepartments,
      totalPositions,
      activePositions,
      totalUsers,
      activeUsers,
      usersBySchool,
      usersByDepartment,
      positionOccupancy,
    ] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { isActive: true } }),
      this.prisma.department.count(),
      this.prisma.department.count({ where: { isActive: true } }),
      this.prisma.position.count(),
      this.prisma.position.count({ where: { isActive: true } }),
      this.prisma.userProfile.count(),
      this.prisma.userProfile.count({ where: { isActive: true } }),
      // Count users by school through positions
      this.prisma.userPosition.count({
        where: {
          isActive: true,
          position: {
            schoolId: { not: null },
          },
        },
      }),
      // Count users by department through positions
      this.prisma.userPosition.count({
        where: {
          isActive: true,
          position: {
            departmentId: { not: null },
          },
        },
      }),
      this.prisma.userPosition.groupBy({
        by: ['positionId'],
        where: { isActive: true },
        _count: { id: true },
      }),
    ]);

    const avgUsersPerSchool =
      totalSchools > 0 ? usersBySchool / totalSchools : 0;

    const avgUsersPerDepartment =
      totalDepartments > 0 ? usersByDepartment / totalDepartments : 0;

    const avgOccupancyPerPosition = positionOccupancy.length
      ? positionOccupancy.reduce((acc, p) => acc + p._count.id, 0) /
        positionOccupancy.length
      : 0;

    return {
      schools: {
        total: totalSchools,
        active: activeSchools,
        inactive: totalSchools - activeSchools,
      },
      departments: {
        total: totalDepartments,
        active: activeDepartments,
        inactive: totalDepartments - activeDepartments,
      },
      positions: {
        total: totalPositions,
        active: activePositions,
        inactive: totalPositions - activePositions,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      averages: {
        usersPerSchool: Math.round(avgUsersPerSchool),
        usersPerDepartment: Math.round(avgUsersPerDepartment),
        occupancyPerPosition: Math.round(avgOccupancyPerPosition),
      },
    };
  }

  async invalidateCache(
    type?: 'school' | 'department' | 'position' | 'user',
    id?: string,
  ) {
    if (!type) {
      // Invalidate all hierarchy caches
      await this.cache.del(`${this.cachePrefix}*`);
      this.logger.log('Invalidated all organization hierarchy caches');
    } else if (id) {
      // Invalidate specific entity cache
      await this.cache.del(`${this.cachePrefix}${type}:${id}`);
      this.logger.log(`Invalidated ${type} hierarchy cache for ID: ${id}`);
    }
  }
}

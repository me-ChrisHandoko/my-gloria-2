import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateUserDto, UpdateUserDto } from '../dto';
import {
  IUserFilters,
  IUserSortOptions,
  IPaginatedResult,
} from '../interfaces/user.interface';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto & { id: string }) {
    return this.prisma.userProfile.create({
      data: {
        id: data.id,
        clerkUserId: data.clerkUserId,
        nip: data.nip,
        isSuperadmin: data.isSuperadmin || false,
        isActive: data.isActive ?? true,
        preferences: data.preferences ? JSON.parse(data.preferences) : null,
      },
      include: this.getDefaultIncludes(),
    });
  }

  async findAll(
    page: number,
    limit: number,
    filters?: IUserFilters,
    sortOptions?: IUserSortOptions,
  ): Promise<IPaginatedResult<any>> {
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderByClause(sortOptions);

    const [data, total] = await Promise.all([
      this.prisma.userProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.getDefaultIncludes(),
      }),
      this.prisma.userProfile.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async findById(id: string) {
    return this.prisma.userProfile.findUnique({
      where: { id },
      include: this.getFullIncludes(),
    });
  }

  async findByClerkId(clerkUserId: string) {
    return this.prisma.userProfile.findUnique({
      where: { clerkUserId },
      include: this.getFullIncludes(),
    });
  }

  async findByNip(nip: string) {
    return this.prisma.userProfile.findUnique({
      where: { nip },
      include: this.getDefaultIncludes(),
    });
  }

  async update(id: string, data: UpdateUserDto) {
    const updateData: any = { ...data };

    if (data.preferences) {
      updateData.preferences = JSON.parse(data.preferences);
    }

    return this.prisma.userProfile.update({
      where: { id },
      data: updateData,
      include: this.getDefaultIncludes(),
    });
  }

  async softDelete(id: string) {
    return this.prisma.userProfile.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
      include: this.getDefaultIncludes(),
    });
  }

  async hardDelete(id: string) {
    return this.prisma.userProfile.delete({
      where: { id },
    });
  }

  async updateLastActive(id: string) {
    return this.prisma.userProfile.update({
      where: { id },
      data: {
        lastActive: new Date(),
      },
    });
  }

  async existsByClerkId(clerkUserId: string): Promise<boolean> {
    const count = await this.prisma.userProfile.count({
      where: { clerkUserId },
    });
    return count > 0;
  }

  async existsByNip(nip: string): Promise<boolean> {
    const count = await this.prisma.userProfile.count({
      where: { nip },
    });
    return count > 0;
  }

  async countActiveUsers(): Promise<number> {
    return this.prisma.userProfile.count({
      where: { isActive: true },
    });
  }

  async findUsersWithRoles(roleIds: string[]) {
    return this.prisma.userProfile.findMany({
      where: {
        roles: {
          some: {
            roleId: {
              in: roleIds,
            },
          },
        },
      },
      include: this.getDefaultIncludes(),
    });
  }

  private buildWhereClause(
    filters?: IUserFilters,
  ): Prisma.UserProfileWhereInput {
    const where: Prisma.UserProfileWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { nip: { contains: filters.search, mode: 'insensitive' } },
        {
          dataKaryawan: {
            OR: [
              { nama: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isSuperadmin !== undefined) {
      where.isSuperadmin = filters.isSuperadmin;
    }

    if (filters?.nip) {
      where.nip = filters.nip;
    }

    if (filters?.clerkUserId) {
      where.clerkUserId = filters.clerkUserId;
    }

    return where;
  }

  private buildOrderByClause(
    sortOptions?: IUserSortOptions,
  ): Prisma.UserProfileOrderByWithRelationInput {
    const sortBy = sortOptions?.sortBy || 'createdAt';
    const sortOrder = sortOptions?.sortOrder || 'desc';

    return {
      [sortBy]: sortOrder,
    };
  }

  private getDefaultIncludes() {
    return {
      dataKaryawan: true,
      roles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              code: true,
              description: true,
            },
          },
        },
      },
      positions: {
        include: {
          position: {
            select: {
              id: true,
              name: true,
              code: true,
              level: true,
            },
          },
        },
      },
    };
  }

  private getFullIncludes() {
    return {
      ...this.getDefaultIncludes(),
      userPermissions: {
        include: {
          permission: true,
        },
      },
      moduleAccess: {
        include: {
          module: true,
        },
      },
      overrides: true,
      permissionCache: true,
    };
  }
}

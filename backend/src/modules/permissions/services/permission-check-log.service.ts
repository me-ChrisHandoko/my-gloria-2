import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  GetCheckLogFilterDto,
  ExportCheckLogsDto,
  CheckLogResponseDto,
  AccessSummaryDto,
  SlowCheckDto,
  UserAccessHistoryDto,
  ResourceAccessHistoryDto,
} from '../dto/permission-check-log.dto';

@Injectable()
export class PermissionCheckLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get permission check logs with filters
   */
  async getCheckLogs(
    filters: GetCheckLogFilterDto,
  ): Promise<{ data: CheckLogResponseDto[]; total: number; page: number; limit: number }> {
    const {
      userProfileId,
      resource,
      action,
      scope,
      isAllowed,
      startDate,
      endDate,
      minDuration,
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {};

    if (userProfileId) where.userProfileId = userProfileId;
    if (resource) where.resource = resource;
    if (action) where.action = action;
    if (scope) where.scope = scope;
    if (typeof isAllowed === 'boolean') where.isAllowed = isAllowed;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (minDuration !== undefined) {
      where.checkDuration = { gte: minDuration };
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionCheckLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.permissionCheckLog.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get denied access attempts
   */
  async getDeniedAccessAttempts(
    filters: Partial<GetCheckLogFilterDto>,
  ): Promise<{ data: CheckLogResponseDto[]; total: number }> {
    const { userProfileId, resource, action, startDate, endDate, page = 1, limit = 20 } = filters;

    const where: any = {
      isAllowed: false,
    };

    if (userProfileId) where.userProfileId = userProfileId;
    if (resource) where.resource = resource;
    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionCheckLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.permissionCheckLog.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  /**
   * Get user's access history
   */
  async getUserAccessHistory(
    userId: string,
    filters: UserAccessHistoryDto,
  ): Promise<{ data: CheckLogResponseDto[]; total: number }> {
    const { startDate, endDate, resource, action, page = 1, limit = 20 } = filters;

    const where: any = {
      userProfileId: userId,
    };

    if (resource) where.resource = resource;
    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionCheckLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.permissionCheckLog.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  /**
   * Get resource access history
   */
  async getResourceAccessHistory(
    resource: string,
    filters: ResourceAccessHistoryDto,
  ): Promise<{ data: CheckLogResponseDto[]; total: number }> {
    const { startDate, endDate, action, userProfileId, page = 1, limit = 20 } = filters;

    const where: any = {
      resource,
    };

    if (action) where.action = action;
    if (userProfileId) where.userProfileId = userProfileId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionCheckLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.permissionCheckLog.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  /**
   * Get slow permission checks
   */
  async getSlowChecks(
    filters: SlowCheckDto,
  ): Promise<{ data: CheckLogResponseDto[]; total: number }> {
    const { minDuration = 100, page = 1, limit = 20 } = filters;

    const where = {
      checkDuration: { gte: minDuration },
    };

    const [data, total] = await Promise.all([
      this.prisma.permissionCheckLog.findMany({
        where,
        orderBy: { checkDuration: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.permissionCheckLog.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  /**
   * Get access summary statistics
   */
  async getAccessSummary(filters: Partial<GetCheckLogFilterDto>): Promise<AccessSummaryDto> {
    const { userProfileId, resource, action, startDate, endDate } = filters;

    const where: any = {};

    if (userProfileId) where.userProfileId = userProfileId;
    if (resource) where.resource = resource;
    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Get aggregate statistics
    const [totalChecks, allowedChecks, deniedChecks, avgDuration, maxDuration, uniqueUsers, uniqueResources] =
      await Promise.all([
        this.prisma.permissionCheckLog.count({ where }),
        this.prisma.permissionCheckLog.count({
          where: { ...where, isAllowed: true },
        }),
        this.prisma.permissionCheckLog.count({
          where: { ...where, isAllowed: false },
        }),
        this.prisma.permissionCheckLog.aggregate({
          where,
          _avg: { checkDuration: true },
        }),
        this.prisma.permissionCheckLog.aggregate({
          where,
          _max: { checkDuration: true },
        }),
        this.prisma.permissionCheckLog.groupBy({
          by: ['userProfileId'],
          where,
        }),
        this.prisma.permissionCheckLog.groupBy({
          by: ['resource'],
          where,
        }),
      ]);

    // Get top resources
    const topResourcesData = await this.prisma.permissionCheckLog.groupBy({
      by: ['resource'],
      where,
      _count: { resource: true },
      orderBy: { _count: { resource: 'desc' } },
      take: 10,
    });

    // Get top denied resources
    const topDeniedData = await this.prisma.permissionCheckLog.groupBy({
      by: ['resource'],
      where: { ...where, isAllowed: false },
      _count: { resource: true },
      orderBy: { _count: { resource: 'desc' } },
      take: 10,
    });

    return {
      totalChecks,
      allowedChecks,
      deniedChecks,
      allowRate: totalChecks > 0 ? (allowedChecks / totalChecks) * 100 : 0,
      denyRate: totalChecks > 0 ? (deniedChecks / totalChecks) * 100 : 0,
      avgDuration: avgDuration._avg.checkDuration || 0,
      maxDuration: maxDuration._max.checkDuration || 0,
      uniqueUsers: uniqueUsers.length,
      uniqueResources: uniqueResources.length,
      topResources: topResourcesData.map((item) => ({
        resource: item.resource,
        count: item._count.resource,
      })),
      topDenied: topDeniedData.map((item) => ({
        resource: item.resource,
        count: item._count.resource,
      })),
    };
  }

  /**
   * Get user's denied attempts
   */
  async getUserDeniedAttempts(
    userId: string,
    filters: Partial<UserAccessHistoryDto>,
  ): Promise<{ data: CheckLogResponseDto[]; total: number }> {
    const { startDate, endDate, resource, action, page = 1, limit = 20 } = filters;

    const where: any = {
      userProfileId: userId,
      isAllowed: false,
    };

    if (resource) where.resource = resource;
    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionCheckLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.permissionCheckLog.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  /**
   * Export check logs
   */
  async exportCheckLogs(dto: ExportCheckLogsDto): Promise<any> {
    const { filters = {}, format = 'JSON', includeMetadata = false } = dto;

    // Build where clause
    const where: any = {};

    if (filters.userProfileId) where.userProfileId = filters.userProfileId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;
    if (filters.scope) where.scope = filters.scope;
    if (typeof filters.isAllowed === 'boolean') where.isAllowed = filters.isAllowed;

    if (filters.startDate || filters.endDate) {
      where.checkedAt = {};
      if (filters.startDate) where.checkedAt.gte = filters.startDate;
      if (filters.endDate) where.checkedAt.lte = filters.endDate;
    }

    if (filters.minDuration !== undefined) {
      where.checkDuration = { gte: filters.minDuration };
    }

    // Get data (limit to 10000 records for export)
    const data = await this.prisma.permissionCheckLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    if (format === 'JSON') {
      return {
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        filters,
        data: data.map((item) => {
          const mapped = this.mapToResponseDto(item);
          if (!includeMetadata) {
            delete (mapped as any).metadata;
          }
          return mapped;
        }),
      };
    } else {
      // CSV format
      return this.convertToCSV(data, includeMetadata);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[], includeMetadata: boolean): string {
    if (data.length === 0) return '';

    const headers = [
      'ID',
      'User ID',
      'Resource',
      'Action',
      'Scope',
      'Resource ID',
      'Allowed',
      'Denial Reason',
      'Duration (ms)',
      'Checked At',
    ];
    if (includeMetadata) headers.push('Metadata');

    const rows = data.map((item) => {
      const row = [
        item.id,
        item.userProfileId,
        item.resource,
        item.action,
        item.scope,
        item.resourceId || '',
        item.isAllowed ? 'Yes' : 'No',
        item.denialReason || '',
        item.checkDuration,
        item.checkedAt.toISOString(),
      ];

      if (includeMetadata) {
        row.push(JSON.stringify(item.metadata || {}));
      }

      return row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Map database record to response DTO
   */
  private mapToResponseDto(item: any): CheckLogResponseDto {
    return {
      id: item.id,
      userProfileId: item.userProfileId,
      resource: item.resource,
      action: item.action,
      scope: item.scope,
      resourceId: item.resourceId,
      isAllowed: item.isAllowed,
      denialReason: item.denialReason,
      checkDuration: item.checkDuration,
      metadata: item.metadata || {},
      checkedAt: item.createdAt,
    };
  }
}

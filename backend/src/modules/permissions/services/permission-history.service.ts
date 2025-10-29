import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { AuditService } from '@/core/audit/audit.service';
import {
  GetHistoryFilterDto,
  RollbackChangeDto,
  CompareStatesDto,
  ExportHistoryDto,
  HistoryResponseDto,
  CompareStatesResponseDto,
  RollbackHistoryDto,
  HistoryEntityType,
  HistoryOperation,
} from '../dto/permission-history.dto';

@Injectable()
export class PermissionHistoryService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get change history with filters and pagination
   */
  async getChangeHistory(
    filters: GetHistoryFilterDto,
  ): Promise<{ data: HistoryResponseDto[]; total: number; page: number; limit: number }> {
    const { entityType, entityId, performedBy, startDate, endDate, operation, page = 1, limit = 20 } = filters;

    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (performedBy) where.performedBy = performedBy;
    if (operation) where.operation = operation;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionChangeHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          performer: {
            select: {
              id: true,
              nip: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.permissionChangeHistory.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get change history for a specific entity
   */
  async getEntityHistory(
    entityType: HistoryEntityType,
    entityId: string,
    filters: Partial<GetHistoryFilterDto>,
  ): Promise<{ data: HistoryResponseDto[]; total: number }> {
    const { startDate, endDate, operation, page = 1, limit = 20 } = filters;

    const where: any = {
      entityType,
      entityId,
    };

    if (operation) where.operation = operation;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionChangeHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          performer: {
            select: {
              id: true,
              nip: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.permissionChangeHistory.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  /**
   * Get changes performed by a specific user
   */
  async getUserChanges(
    userId: string,
    filters: Partial<GetHistoryFilterDto>,
  ): Promise<{ data: HistoryResponseDto[]; total: number }> {
    const { entityType, operation, startDate, endDate, page = 1, limit = 20 } = filters;

    const where: any = {
      performedBy: userId,
    };

    if (entityType) where.entityType = entityType;
    if (operation) where.operation = operation;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionChangeHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          performer: {
            select: {
              id: true,
              nip: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.permissionChangeHistory.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  /**
   * Get changes within a date range
   */
  async getChangesByDateRange(
    startDate: Date,
    endDate: Date,
    filters: Partial<GetHistoryFilterDto>,
  ): Promise<{ data: HistoryResponseDto[]; total: number }> {
    const { entityType, operation, performedBy, page = 1, limit = 20 } = filters;

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (entityType) where.entityType = entityType;
    if (operation) where.operation = operation;
    if (performedBy) where.performedBy = performedBy;

    const [data, total] = await Promise.all([
      this.prisma.permissionChangeHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          performer: {
            select: {
              id: true,
              nip: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.permissionChangeHistory.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  /**
   * Rollback a specific change
   */
  async rollbackChange(changeId: string, dto: RollbackChangeDto, performedBy: string): Promise<HistoryResponseDto> {
    // Get the original change
    const change = await this.prisma.permissionChangeHistory.findUnique({
      where: { id: changeId },
      include: {
        performer: {
          select: {
            id: true,
            nip: true,
            fullName: true,
          },
        },
      },
    });

    if (!change) {
      throw new NotFoundException(`Change history with ID ${changeId} not found`);
    }

    // Validate rollback is possible
    if (!change.isRollbackable) {
      throw new BadRequestException('This change cannot be rolled back');
    }

    if (change.rollbackOf) {
      throw new BadRequestException('Cannot rollback a rollback operation');
    }

    // Perform rollback based on entity type and operation
    await this.performRollback(change);

    // Create new history entry for the rollback
    const rollbackHistory = await this.prisma.permissionChangeHistory.create({
      data: {
        id: `rollback_${Date.now()}`,
        entityType: change.entityType,
        entityId: change.entityId,
        operation: `ROLLBACK_${change.operation}` as any,
        beforeState: change.afterState,
        afterState: change.beforeState,
        performedBy,
        reason: dto.reason,
        metadata: {
          rollbackOf: changeId,
          originalChange: {
            id: change.id,
            operation: change.operation,
            performedBy: change.performedBy,
            createdAt: change.createdAt,
          },
          confirmedBy: dto.confirmedBy,
        },
        isRollbackable: false,
        rollbackOf: changeId,
      },
      include: {
        performer: {
          select: {
            id: true,
            nip: true,
            fullName: true,
          },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'ROLLBACK_PERMISSION_CHANGE',
      userId: performedBy,
      resourceType: 'PermissionChangeHistory',
      resourceId: changeId,
      details: {
        originalChange: change.id,
        reason: dto.reason,
        confirmedBy: dto.confirmedBy,
      },
    });

    return this.mapToResponseDto(rollbackHistory);
  }

  /**
   * Perform the actual rollback operation
   */
  private async performRollback(change: any): Promise<void> {
    const { entityType, entityId, beforeState } = change;

    switch (entityType) {
      case 'ROLE':
        // Rollback role permission changes
        if (change.operation === 'GRANT') {
          await this.prisma.rolePermission.delete({
            where: { id: entityId },
          });
        } else if (change.operation === 'REVOKE') {
          await this.prisma.rolePermission.create({
            data: beforeState,
          });
        }
        break;

      case 'USER':
        // Rollback user permission changes
        if (change.operation === 'GRANT') {
          await this.prisma.userPermission.delete({
            where: { id: entityId },
          });
        } else if (change.operation === 'REVOKE') {
          await this.prisma.userPermission.create({
            data: beforeState,
          });
        }
        break;

      case 'RESOURCE':
        // Rollback resource permission changes
        if (change.operation === 'GRANT') {
          await this.prisma.resourcePermission.delete({
            where: { id: entityId },
          });
        } else if (change.operation === 'REVOKE') {
          await this.prisma.resourcePermission.create({
            data: beforeState,
          });
        }
        break;

      case 'DELEGATION':
        // Rollback delegation changes
        if (change.operation === 'CREATE') {
          await this.prisma.permissionDelegation.update({
            where: { id: entityId },
            data: { isActive: false },
          });
        } else if (change.operation === 'REVOKE') {
          await this.prisma.permissionDelegation.update({
            where: { id: entityId },
            data: { isActive: true },
          });
        }
        break;

      default:
        throw new BadRequestException(`Rollback not supported for entity type: ${entityType}`);
    }
  }

  /**
   * Compare two change states
   */
  async compareStates(dto: CompareStatesDto): Promise<CompareStatesResponseDto> {
    const [change1, change2] = await Promise.all([
      this.prisma.permissionChangeHistory.findUnique({
        where: { id: dto.changeId1 },
        include: {
          performer: {
            select: {
              id: true,
              nip: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.permissionChangeHistory.findUnique({
        where: { id: dto.changeId2 },
        include: {
          performer: {
            select: {
              id: true,
              nip: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    if (!change1 || !change2) {
      throw new NotFoundException('One or both change records not found');
    }

    // Calculate differences
    const differences = this.calculateDifferences(change1.afterState, change2.afterState);

    // Generate summary
    const summary = this.generateComparisonSummary(change1, change2, differences);

    return {
      change1: this.mapToResponseDto(change1),
      change2: this.mapToResponseDto(change2),
      differences,
      summary,
    };
  }

  /**
   * Calculate differences between two states
   */
  private calculateDifferences(state1: any, state2: any): any {
    const added: Record<string, any> = {};
    const removed: Record<string, any> = {};
    const modified: Record<string, any> = {};

    // Find added and modified
    for (const key in state2) {
      if (!(key in state1)) {
        added[key] = state2[key];
      } else if (JSON.stringify(state1[key]) !== JSON.stringify(state2[key])) {
        modified[key] = {
          from: state1[key],
          to: state2[key],
        };
      }
    }

    // Find removed
    for (const key in state1) {
      if (!(key in state2)) {
        removed[key] = state1[key];
      }
    }

    return { added, removed, modified };
  }

  /**
   * Generate comparison summary
   */
  private generateComparisonSummary(change1: any, change2: any, differences: any): string {
    const parts: string[] = [];

    parts.push(`Comparing changes from ${change1.createdAt.toISOString()} to ${change2.createdAt.toISOString()}`);

    const addedCount = Object.keys(differences.added).length;
    const removedCount = Object.keys(differences.removed).length;
    const modifiedCount = Object.keys(differences.modified).length;

    if (addedCount > 0) parts.push(`${addedCount} field(s) added`);
    if (removedCount > 0) parts.push(`${removedCount} field(s) removed`);
    if (modifiedCount > 0) parts.push(`${modifiedCount} field(s) modified`);

    if (addedCount === 0 && removedCount === 0 && modifiedCount === 0) {
      parts.push('No differences found');
    }

    return parts.join('. ');
  }

  /**
   * Get rollback history
   */
  async getRollbackHistory(filters: RollbackHistoryDto): Promise<{ data: HistoryResponseDto[]; total: number }> {
    const { page = 1, limit = 20 } = filters;

    const where = {
      rollbackOf: { not: null },
    };

    const [data, total] = await Promise.all([
      this.prisma.permissionChangeHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          performer: {
            select: {
              id: true,
              nip: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.permissionChangeHistory.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  /**
   * Export history data
   */
  async exportHistory(dto: ExportHistoryDto): Promise<any> {
    const { filters = {}, format = 'JSON', includeMetadata = false } = dto;

    // Get all matching records (up to 10000)
    const where: any = {};

    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.performedBy) where.performedBy = filters.performedBy;
    if (filters.operation) where.operation = filters.operation;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const data = await this.prisma.permissionChangeHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        performer: {
          select: {
            id: true,
            nip: true,
            fullName: true,
          },
        },
      },
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

    const headers = ['ID', 'Entity Type', 'Entity ID', 'Operation', 'Performed By', 'Reason', 'Created At'];
    if (includeMetadata) headers.push('Metadata');

    const rows = data.map((item) => {
      const row = [
        item.id,
        item.entityType,
        item.entityId,
        item.operation,
        item.performer?.fullName || item.performedBy,
        item.reason || '',
        item.createdAt.toISOString(),
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
  private mapToResponseDto(item: any): HistoryResponseDto {
    return {
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      performedBy: item.performedBy,
      beforeState: item.beforeState,
      afterState: item.afterState,
      reason: item.reason || '',
      metadata: item.metadata || {},
      isRollbackable: item.isRollbackable,
      rollbackOf: item.rollbackOf,
      createdAt: item.createdAt,
    };
  }
}

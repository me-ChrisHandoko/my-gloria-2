import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { PermissionCacheService } from './permission-cache.service';
import { nanoid } from 'nanoid';
import {
  CreatePermissionDelegationDto,
  RevokeDelegationDto,
  ExtendDelegationDto,
  GetDelegationsFilterDto,
} from '../dto/permission-delegation.dto';

@Injectable()
export class PermissionDelegationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PermissionCacheService,
  ) {}

  /**
   * Create a permission delegation
   */
  async createDelegation(
    delegatorId: string,
    dto: CreatePermissionDelegationDto,
    createdBy: string,
  ) {
    // Validate both users exist
    const [delegator, delegate] = await Promise.all([
      this.prisma.userProfile.findUnique({
        where: { id: delegatorId },
      }),
      this.prisma.userProfile.findUnique({
        where: { id: dto.delegateId },
      }),
    ]);

    if (!delegator) {
      throw new NotFoundException(`Delegator ${delegatorId} not found`);
    }
    if (!delegate) {
      throw new NotFoundException(`Delegate ${dto.delegateId} not found`);
    }

    // Prevent self-delegation
    if (delegatorId === dto.delegateId) {
      throw new BadRequestException('Cannot delegate permissions to yourself');
    }

    // Validate date ranges
    const validFrom = dto.validFrom || new Date();
    if (dto.validUntil <= validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    // Check for overlapping active delegations
    const overlapping = await this.prisma.permissionDelegation.findFirst({
      where: {
        delegatorId,
        delegateId: dto.delegateId,
        isRevoked: false,
        validUntil: { gte: validFrom },
        validFrom: { lte: dto.validUntil },
      },
    });

    if (overlapping) {
      throw new ConflictException(
        `Active delegation already exists for this period from ${overlapping.validFrom} to ${overlapping.validUntil}`,
      );
    }

    // Create delegation
    const delegation = await this.prisma.permissionDelegation.create({
      data: {
        id: nanoid(),
        delegatorId,
        delegateId: dto.delegateId,
        permissions: dto.permissions,
        reason: dto.reason,
        validFrom,
        validUntil: dto.validUntil,
        createdBy,
      },
      include: {
        delegator: {
          select: { id: true, fullName: true, email: true },
        },
        delegate: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Invalidate delegate cache to reflect new permissions
    await this.cacheService.invalidateUserCache(dto.delegateId);

    // Record change history
    await this.prisma.permissionChangeHistory.create({
      data: {
        id: nanoid(),
        action: 'DELEGATE',
        targetType: 'DELEGATION',
        targetId: delegation.id,
        changedBy: createdBy,
        reason: dto.reason,
        metadata: {
          delegatorId,
          delegateId: dto.delegateId,
          permissions: dto.permissions,
          validFrom,
          validUntil: dto.validUntil,
        },
      },
    });

    return {
      success: true,
      message: 'Permission delegation created successfully',
      data: delegation,
    };
  }

  /**
   * Revoke a delegation early
   */
  async revokeDelegation(
    delegationId: string,
    dto: RevokeDelegationDto,
    revokedBy: string,
  ) {
    const delegation = await this.prisma.permissionDelegation.findUnique({
      where: { id: delegationId },
      include: {
        delegator: true,
        delegate: true,
      },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation ${delegationId} not found`);
    }

    if (delegation.isRevoked) {
      throw new BadRequestException('Delegation is already revoked');
    }

    const updated = await this.prisma.permissionDelegation.update({
      where: { id: delegationId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy,
        revokedReason: dto.revokedReason,
      },
      include: {
        delegator: {
          select: { id: true, fullName: true, email: true },
        },
        delegate: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Invalidate delegate cache
    await this.cacheService.invalidateUserCache(delegation.delegateId);

    // Record change history
    await this.prisma.permissionChangeHistory.create({
      data: {
        id: nanoid(),
        action: 'REVOKE',
        targetType: 'DELEGATION',
        targetId: delegationId,
        changedBy: revokedBy,
        reason: dto.revokedReason,
        metadata: {
          delegatorId: delegation.delegatorId,
          delegateId: delegation.delegateId,
        },
      },
    });

    return {
      success: true,
      message: 'Delegation revoked successfully',
      data: updated,
    };
  }

  /**
   * Get delegations sent by a user
   */
  async getSentDelegations(
    delegatorId: string,
    filters: GetDelegationsFilterDto,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      delegatorId,
    };

    if (filters.isActive !== undefined) {
      const now = new Date();
      if (filters.isActive) {
        where.isRevoked = false;
        where.validFrom = { lte: now };
        where.validUntil = { gte: now };
      }
    }

    if (filters.isRevoked !== undefined) {
      where.isRevoked = filters.isRevoked;
    }

    if (filters.delegateId) {
      where.delegateId = filters.delegateId;
    }

    const [delegations, total] = await Promise.all([
      this.prisma.permissionDelegation.findMany({
        where,
        include: {
          delegate: {
            select: { id: true, fullName: true, email: true, nip: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.permissionDelegation.count({ where }),
    ]);

    return {
      data: delegations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get delegations received by a user
   */
  async getReceivedDelegations(
    delegateId: string,
    filters: GetDelegationsFilterDto,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      delegateId,
    };

    if (filters.isActive !== undefined) {
      const now = new Date();
      if (filters.isActive) {
        where.isRevoked = false;
        where.validFrom = { lte: now };
        where.validUntil = { gte: now };
      }
    }

    if (filters.isRevoked !== undefined) {
      where.isRevoked = filters.isRevoked;
    }

    if (filters.delegatorId) {
      where.delegatorId = filters.delegatorId;
    }

    const [delegations, total] = await Promise.all([
      this.prisma.permissionDelegation.findMany({
        where,
        include: {
          delegator: {
            select: { id: true, fullName: true, email: true, nip: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.permissionDelegation.count({ where }),
    ]);

    return {
      data: delegations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all active delegations
   */
  async getActiveDelegations(
    filters: GetDelegationsFilterDto,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: any = {
      isRevoked: false,
      validFrom: { lte: now },
      validUntil: { gte: now },
    };

    if (filters.delegatorId) {
      where.delegatorId = filters.delegatorId;
    }

    if (filters.delegateId) {
      where.delegateId = filters.delegateId;
    }

    const [delegations, total] = await Promise.all([
      this.prisma.permissionDelegation.findMany({
        where,
        include: {
          delegator: {
            select: { id: true, fullName: true, email: true, nip: true },
          },
          delegate: {
            select: { id: true, fullName: true, email: true, nip: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.permissionDelegation.count({ where }),
    ]);

    return {
      data: delegations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get delegations expiring soon
   */
  async getExpiringDelegations(daysThreshold: number = 7) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const delegations = await this.prisma.permissionDelegation.findMany({
      where: {
        isRevoked: false,
        validFrom: { lte: now },
        validUntil: {
          gte: now,
          lte: thresholdDate,
        },
      },
      include: {
        delegator: {
          select: { id: true, fullName: true, email: true },
        },
        delegate: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { validUntil: 'asc' },
    });

    return {
      data: delegations,
      total: delegations.length,
      threshold: daysThreshold,
    };
  }

  /**
   * Get delegation details
   */
  async getDelegationById(delegationId: string) {
    const delegation = await this.prisma.permissionDelegation.findUnique({
      where: { id: delegationId },
      include: {
        delegator: {
          select: { id: true, fullName: true, email: true, nip: true },
        },
        delegate: {
          select: { id: true, fullName: true, email: true, nip: true },
        },
      },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation ${delegationId} not found`);
    }

    const now = new Date();
    const isActive =
      !delegation.isRevoked &&
      delegation.validFrom <= now &&
      delegation.validUntil >= now;

    return {
      ...delegation,
      isActive,
      daysRemaining: isActive
        ? Math.ceil(
            (delegation.validUntil.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0,
    };
  }

  /**
   * Extend delegation expiration
   */
  async extendDelegation(
    delegationId: string,
    dto: ExtendDelegationDto,
    extendedBy: string,
  ) {
    const delegation = await this.prisma.permissionDelegation.findUnique({
      where: { id: delegationId },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation ${delegationId} not found`);
    }

    if (delegation.isRevoked) {
      throw new BadRequestException('Cannot extend revoked delegation');
    }

    if (dto.newValidUntil <= delegation.validFrom) {
      throw new BadRequestException(
        'New validUntil must be after validFrom',
      );
    }

    if (dto.newValidUntil <= delegation.validUntil) {
      throw new BadRequestException(
        'New validUntil must be after current validUntil',
      );
    }

    const updated = await this.prisma.permissionDelegation.update({
      where: { id: delegationId },
      data: {
        validUntil: dto.newValidUntil,
      },
      include: {
        delegator: {
          select: { id: true, fullName: true, email: true },
        },
        delegate: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Invalidate delegate cache
    await this.cacheService.invalidateUserCache(delegation.delegateId);

    // Record change history
    await this.prisma.permissionChangeHistory.create({
      data: {
        id: nanoid(),
        action: 'UPDATE',
        targetType: 'DELEGATION',
        targetId: delegationId,
        changedBy: extendedBy,
        reason: dto.reason,
        metadata: {
          oldValidUntil: delegation.validUntil,
          newValidUntil: dto.newValidUntil,
        },
      },
    });

    return {
      success: true,
      message: 'Delegation extended successfully',
      data: updated,
    };
  }

  /**
   * Get delegation summary for a user
   */
  async getUserDelegationSummary(userId: string) {
    const now = new Date();

    const [sentActive, sentTotal, receivedActive, receivedTotal, expiringSoon] =
      await Promise.all([
        this.prisma.permissionDelegation.count({
          where: {
            delegatorId: userId,
            isRevoked: false,
            validFrom: { lte: now },
            validUntil: { gte: now },
          },
        }),
        this.prisma.permissionDelegation.count({
          where: { delegatorId: userId },
        }),
        this.prisma.permissionDelegation.count({
          where: {
            delegateId: userId,
            isRevoked: false,
            validFrom: { lte: now },
            validUntil: { gte: now },
          },
        }),
        this.prisma.permissionDelegation.count({
          where: { delegateId: userId },
        }),
        this.prisma.permissionDelegation.count({
          where: {
            OR: [{ delegatorId: userId }, { delegateId: userId }],
            isRevoked: false,
            validFrom: { lte: now },
            validUntil: {
              gte: now,
              lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
          },
        }),
      ]);

    return {
      sent: {
        active: sentActive,
        total: sentTotal,
      },
      received: {
        active: receivedActive,
        total: receivedTotal,
      },
      expiringSoon,
    };
  }

  /**
   * Auto-expire delegations (scheduled job)
   */
  async autoExpireDelegations() {
    const now = new Date();

    const expired = await this.prisma.permissionDelegation.findMany({
      where: {
        isRevoked: false,
        validUntil: { lt: now },
      },
      select: { id: true, delegateId: true },
    });

    if (expired.length === 0) {
      return {
        success: true,
        message: 'No expired delegations found',
        expired: 0,
      };
    }

    // Invalidate caches for all affected delegates
    const delegateIds = [...new Set(expired.map((d) => d.delegateId))];
    await Promise.all(
      delegateIds.map((id) => this.cacheService.invalidateUserCache(id)),
    );

    return {
      success: true,
      message: `Processed ${expired.length} expired delegations`,
      expired: expired.length,
    };
  }
}

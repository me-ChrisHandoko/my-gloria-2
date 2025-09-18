import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { AuditService } from '@/core/audit/audit.service';
import { PermissionDelegation, AuditAction } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PermissionDelegationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Delegate permissions to another user
   */
  async delegatePermissions(
    delegatorId: string,
    delegateId: string,
    permissions: any[],
    reason: string,
    validUntil: Date,
  ): Promise<PermissionDelegation> {
    try {
      if (delegatorId === delegateId) {
        throw new BadRequestException(
          'Cannot delegate permissions to yourself',
        );
      }

      if (validUntil <= new Date()) {
        throw new BadRequestException(
          'Delegation end date must be in the future',
        );
      }

      const delegation = await this.prisma.permissionDelegation.create({
        data: {
          id: uuidv7(),
          delegatorId,
          delegateId,
          permissions,
          reason,
          validUntil,
        },
        include: {
          delegator: true,
          delegate: true,
        },
      });

      await this.auditService.log({
        action: AuditAction.CREATE,
        module: 'permissions',
        entityType: 'PermissionDelegation',
        entityId: delegation.id,
        metadata: {
          delegateId,
          permissionCount: permissions.length,
          validUntil,
        },
        context: {
          actorId: delegatorId,
        },
      });

      this.logger.log(
        `Permissions delegated from ${delegatorId} to ${delegateId}`,
        'PermissionDelegationService',
      );
      return delegation;
    } catch (error) {
      this.logger.error(
        'Error delegating permissions',
        error.stack,
        'PermissionDelegationService',
      );
      throw error;
    }
  }

  /**
   * Revoke delegated permissions
   */
  async revokeDelegation(
    delegationId: string,
    revokedBy: string,
    revokedReason: string,
  ): Promise<void> {
    try {
      await this.prisma.permissionDelegation.update({
        where: { id: delegationId },
        data: {
          isRevoked: true,
          revokedBy,
          revokedAt: new Date(),
          revokedReason,
        },
      });

      await this.auditService.log({
        action: AuditAction.UPDATE,
        module: 'permissions',
        entityType: 'PermissionDelegation',
        entityId: delegationId,
        metadata: {
          action: 'revoke',
          reason: revokedReason,
        },
        context: {
          actorId: revokedBy,
        },
      });

      this.logger.log(
        `Permission delegation ${delegationId} revoked`,
        'PermissionDelegationService',
      );
    } catch (error) {
      this.logger.error(
        'Error revoking delegation',
        error.stack,
        'PermissionDelegationService',
      );
      throw error;
    }
  }

  /**
   * Get active delegations for a user
   */
  async getUserDelegations(
    userId: string,
    type: 'delegator' | 'delegate',
  ): Promise<PermissionDelegation[]> {
    const where =
      type === 'delegator' ? { delegatorId: userId } : { delegateId: userId };

    return this.prisma.permissionDelegation.findMany({
      where: {
        ...where,
        isRevoked: false,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
      include: {
        delegator: true,
        delegate: true,
      },
    });
  }
}

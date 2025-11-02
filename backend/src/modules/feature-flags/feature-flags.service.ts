import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { LoggingService } from '../../core/logging/logging.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { EvaluateFeatureFlagDto } from './dto/evaluate-feature-flag.dto';
import { FeatureFlag, FeatureFlagEvaluation } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class FeatureFlagsService {
  private readonly logger: LoggingService;
  private readonly CACHE_PREFIX = 'feature-flag:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = this.loggingService.getLogger(FeatureFlagsService.name);
  }

  async create(dto: CreateFeatureFlagDto): Promise<FeatureFlag> {
    this.logger.debug(`Creating feature flag: ${dto.key}`);

    const featureFlag = await this.prisma.featureFlag.create({
      data: {
        id: uuidv7(),
        key: dto.key,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        enabled: dto.enabled ?? false,
        defaultValue: dto.defaultValue,
        rolloutPercentage: dto.rolloutPercentage ?? 0,
        conditions: dto.conditions ?? {},
        targetUsers: dto.targetUsers ?? [],
        targetRoles: dto.targetRoles ?? [],
        targetSchools: dto.targetSchools ?? [],
        startDate: dto.startDate,
        endDate: dto.endDate,
        metadata: dto.metadata ?? {},
        updatedAt: new Date(),
      },
    });

    await this.invalidateCache(featureFlag.key);
    this.logger.info(
      `Feature flag created: ${featureFlag.key} (ID: ${featureFlag.id})`,
    );

    return featureFlag;
  }

  async findAll(filters?: {
    enabled?: boolean;
    type?: string;
    search?: string;
  }): Promise<FeatureFlag[]> {
    const where: any = {};

    if (filters?.enabled !== undefined) {
      where.enabled = filters.enabled;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.search) {
      where.OR = [
        { key: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.featureFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<FeatureFlag> {
    const featureFlag = await this.prisma.featureFlag.findUnique({
      where: { id },
      // TODO: Add evaluations back when model is created
      // include: {
      //   evaluations: {
      //     take: 10,
      //     orderBy: { evaluatedAt: 'desc' },
      //   },
      // },
    });

    if (!featureFlag) {
      throw new NotFoundException(`Feature flag with ID ${id} not found`);
    }

    return featureFlag;
  }

  async findByKey(key: string): Promise<FeatureFlag | null> {
    // Check cache first
    const cached = await this.cacheService.get<FeatureFlag>(
      `${this.CACHE_PREFIX}${key}`,
    );
    if (cached) {
      return cached;
    }

    const featureFlag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });

    if (featureFlag) {
      await this.cacheService.set(
        `${this.CACHE_PREFIX}${key}`,
        featureFlag,
        this.CACHE_TTL,
      );
    }

    return featureFlag;
  }

  async update(id: string, dto: UpdateFeatureFlagDto): Promise<FeatureFlag> {
    const existing = await this.findOne(id);

    const updated = await this.prisma.featureFlag.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        enabled: dto.enabled,
        defaultValue: dto.defaultValue,
        rolloutPercentage: dto.rolloutPercentage,
        conditions: dto.conditions,
        targetUsers: dto.targetUsers,
        targetRoles: dto.targetRoles,
        targetSchools: dto.targetSchools,
        startDate: dto.startDate,
        endDate: dto.endDate,
        metadata: dto.metadata,
      },
    });

    await this.invalidateCache(existing.key);
    this.logger.info(`Feature flag updated: ${existing.key} (ID: ${id})`);

    return updated;
  }

  async toggle(id: string): Promise<FeatureFlag> {
    const existing = await this.findOne(id);

    const updated = await this.prisma.featureFlag.update({
      where: { id },
      data: {
        enabled: !existing.enabled,
      },
    });

    await this.invalidateCache(existing.key);
    this.logger.info(
      `Feature flag toggled: ${existing.key} (ID: ${id}, enabled: ${updated.enabled})`,
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findOne(id);

    await this.prisma.featureFlag.delete({
      where: { id },
    });

    await this.invalidateCache(existing.key);
    this.logger.info(`Feature flag deleted: ${existing.key} (ID: ${id})`);
  }

  async evaluate(dto: EvaluateFeatureFlagDto): Promise<{
    enabled: boolean;
    value: any;
    reason: string;
  }> {
    const flag = await this.findByKey(dto.flagKey);

    if (!flag) {
      return {
        enabled: false,
        value: null,
        reason: 'FLAG_NOT_FOUND',
      };
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      await this.recordEvaluation(flag.id, dto, false, 'FLAG_DISABLED');
      return {
        enabled: false,
        value: flag.defaultValue,
        reason: 'FLAG_DISABLED',
      };
    }

    // Check date range
    const now = new Date();
    if (flag.startDate && now < new Date(flag.startDate)) {
      await this.recordEvaluation(flag.id, dto, false, 'NOT_YET_ACTIVE');
      return {
        enabled: false,
        value: flag.defaultValue,
        reason: 'NOT_YET_ACTIVE',
      };
    }

    if (flag.endDate && now > new Date(flag.endDate)) {
      await this.recordEvaluation(flag.id, dto, false, 'EXPIRED');
      return {
        enabled: false,
        value: flag.defaultValue,
        reason: 'EXPIRED',
      };
    }

    // Check targeted users
    if (flag.targetUsers.length > 0 && dto.userId) {
      if (flag.targetUsers.includes(dto.userId)) {
        await this.recordEvaluation(flag.id, dto, true, 'USER_TARGETED');
        return {
          enabled: true,
          value: flag.defaultValue,
          reason: 'USER_TARGETED',
        };
      }
    }

    // Check targeted roles
    if (flag.targetRoles.length > 0 && dto.userRoles) {
      const hasTargetRole = flag.targetRoles.some((role) =>
        dto.userRoles?.includes(role),
      );
      if (hasTargetRole) {
        await this.recordEvaluation(flag.id, dto, true, 'ROLE_TARGETED');
        return {
          enabled: true,
          value: flag.defaultValue,
          reason: 'ROLE_TARGETED',
        };
      }
    }

    // Check targeted schools
    if (flag.targetSchools.length > 0 && dto.schoolId) {
      if (flag.targetSchools.includes(dto.schoolId)) {
        await this.recordEvaluation(flag.id, dto, true, 'SCHOOL_TARGETED');
        return {
          enabled: true,
          value: flag.defaultValue,
          reason: 'SCHOOL_TARGETED',
        };
      }
    }

    // Check custom conditions
    if (flag.conditions && Object.keys(flag.conditions).length > 0) {
      const conditionsMet = this.evaluateConditions(
        flag.conditions as any,
        dto.context,
      );
      if (conditionsMet) {
        await this.recordEvaluation(flag.id, dto, true, 'CONDITIONS_MET');
        return {
          enabled: true,
          value: flag.defaultValue,
          reason: 'CONDITIONS_MET',
        };
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage > 0) {
      const hash = this.hashString(dto.userId || dto.sessionId || '');
      const bucket = Math.abs(hash % 100);

      if (bucket < flag.rolloutPercentage) {
        await this.recordEvaluation(flag.id, dto, true, 'ROLLOUT_PERCENTAGE');
        return {
          enabled: true,
          value: flag.defaultValue,
          reason: 'ROLLOUT_PERCENTAGE',
        };
      }
    }

    // Default: return default value
    await this.recordEvaluation(flag.id, dto, false, 'DEFAULT');
    return {
      enabled: false,
      value: flag.defaultValue,
      reason: 'DEFAULT',
    };
  }

  async evaluateBulk(
    flagKeys: string[],
    context: EvaluateFeatureFlagDto,
  ): Promise<{
    [key: string]: {
      enabled: boolean;
      value: any;
      reason: string;
    };
  }> {
    const results: any = {};

    for (const key of flagKeys) {
      results[key] = await this.evaluate({
        ...context,
        flagKey: key,
      });
    }

    return results;
  }

  async getStatistics(flagId?: string): Promise<any> {
    const where = flagId ? { featureFlagId: flagId } : {};

    const [total, enabled, disabled, byReason] = await Promise.all([
      this.prisma.featureFlagEvaluation.count({ where }),
      this.prisma.featureFlagEvaluation.count({
        where: { ...where, result: true },
      }),
      this.prisma.featureFlagEvaluation.count({
        where: { ...where, result: false },
      }),
      this.prisma.featureFlagEvaluation.groupBy({
        by: ['reason'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      enabled,
      disabled,
      enabledPercentage: total > 0 ? (enabled / total) * 100 : 0,
      byReason: byReason.map((r) => ({
        reason: r.reason,
        count: r._count,
      })),
    };
  }

  private async recordEvaluation(
    featureFlagId: string,
    dto: EvaluateFeatureFlagDto,
    result: boolean,
    reason: string,
  ): Promise<void> {
    try {
      await this.prisma.featureFlagEvaluation.create({
        data: {
          id: uuidv7(),
          featureFlagId,
          userId: dto.userId,
          result,
          reason,
          context: dto.context ?? {},
          evaluatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to record feature flag evaluation', error);
    }
  }

  private evaluateConditions(conditions: any, context?: any): boolean {
    if (!context) return false;

    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators
        const operators = value as any;
        const contextValue = context[key];

        if (operators.$eq !== undefined && contextValue !== operators.$eq)
          return false;
        if (operators.$ne !== undefined && contextValue === operators.$ne)
          return false;
        if (operators.$gt !== undefined && contextValue <= operators.$gt)
          return false;
        if (operators.$gte !== undefined && contextValue < operators.$gte)
          return false;
        if (operators.$lt !== undefined && contextValue >= operators.$lt)
          return false;
        if (operators.$lte !== undefined && contextValue > operators.$lte)
          return false;
        if (
          operators.$in !== undefined &&
          !operators.$in.includes(contextValue)
        )
          return false;
        if (
          operators.$nin !== undefined &&
          operators.$nin.includes(contextValue)
        )
          return false;
      } else {
        // Simple equality check
        if (context[key] !== value) return false;
      }
    }

    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private async invalidateCache(key: string): Promise<void> {
    await this.cacheService.del(`${this.CACHE_PREFIX}${key}`);
  }
}

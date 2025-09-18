import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { LoggingService } from '../../core/logging/logging.service';
import { CreateSystemConfigDto } from './dto/create-system-config.dto';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { SystemConfiguration, SystemConfigHistory } from '@prisma/client';
import * as crypto from 'crypto';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class SystemConfigService {
  private readonly logger: LoggingService;
  private readonly CACHE_PREFIX = 'system-config:';
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly ENCRYPTION_KEY =
    process.env.CONFIG_ENCRYPTION_KEY ||
    'default-encryption-key-change-in-production';
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = this.loggingService.getLogger(SystemConfigService.name);
  }

  async create(
    dto: CreateSystemConfigDto,
    userId: string,
  ): Promise<SystemConfiguration> {
    this.logger.debug(`Creating system configuration: ${dto.key}`);

    // Validate the configuration value against rules
    if (dto.validationRules) {
      this.validateConfigValue(dto.value, dto.validationRules);
    }

    // Encrypt sensitive configurations
    let value = dto.value;
    if (dto.isEncrypted) {
      value = this.encryptValue(dto.value);
    }

    const config = await this.prisma.systemConfiguration.create({
      data: {
        id: crypto.randomUUID(),
        key: dto.key,
        value,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        isEncrypted: dto.isEncrypted ?? false,
        isPublic: dto.isPublic ?? false,
        metadata: dto.metadata ?? {},
        validationRules: dto.validationRules ?? {},
        updatedBy: userId,
      },
    });

    await this.invalidateCache(config.key);
    this.logger.info('System configuration created', {
      configId: config.id,
      key: config.key,
    });

    return this.sanitizeConfig(config);
  }

  async findAll(filters?: {
    category?: string;
    isPublic?: boolean;
    search?: string;
    includeEncrypted?: boolean;
  }): Promise<SystemConfiguration[]> {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    if (filters?.search) {
      where.OR = [
        { key: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const configs = await this.prisma.systemConfiguration.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return configs.map((config) =>
      filters?.includeEncrypted ? config : this.sanitizeConfig(config),
    );
  }

  async findOne(id: string): Promise<SystemConfiguration> {
    const config = await this.prisma.systemConfiguration.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `System configuration with ID ${id} not found`,
      );
    }

    return this.sanitizeConfig(config);
  }

  async findByKey(
    key: string,
    decrypt = false,
  ): Promise<SystemConfiguration | null> {
    // Check cache first
    const cacheKey = `${this.CACHE_PREFIX}${key}`;
    const cached = await this.cacheService.get<SystemConfiguration>(cacheKey);
    if (cached) {
      return decrypt && cached.isEncrypted
        ? this.decryptConfig(cached)
        : cached;
    }

    const config = await this.prisma.systemConfiguration.findUnique({
      where: { key },
    });

    if (config) {
      await this.cacheService.set(cacheKey, config, this.CACHE_TTL);
    }

    if (!config) {
      return null;
    }

    return decrypt && config.isEncrypted
      ? this.decryptConfig(config)
      : this.sanitizeConfig(config);
  }

  async getValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    const config = await this.findByKey(key, true);

    if (!config) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new NotFoundException(`Configuration key '${key}' not found`);
    }

    return config.value as T;
  }

  async getPublicConfigs(): Promise<Record<string, any>> {
    const configs = await this.prisma.systemConfiguration.findMany({
      where: { isPublic: true },
      orderBy: { key: 'asc' },
    });

    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }

    return result;
  }

  async update(
    id: string,
    dto: UpdateSystemConfigDto,
    userId: string,
  ): Promise<SystemConfiguration> {
    const existing = await this.findOne(id);

    // Validate the new value if validation rules are provided
    if (dto.validationRules || existing.validationRules) {
      const rules = dto.validationRules || existing.validationRules;
      this.validateConfigValue(dto.value || existing.value, rules as any);
    }

    // Create history record
    await this.createHistory(
      existing,
      dto.value || existing.value,
      userId,
      dto.reason,
    );

    // Encrypt if needed
    let value = dto.value;
    if (dto.isEncrypted || existing.isEncrypted) {
      value = this.encryptValue(dto.value || existing.value);
    }

    const updated = await this.prisma.systemConfiguration.update({
      where: { id },
      data: {
        value: value !== undefined ? value : existing.value,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        isEncrypted: dto.isEncrypted,
        isPublic: dto.isPublic,
        metadata: dto.metadata,
        validationRules: dto.validationRules,
        updatedBy: userId,
      },
    });

    await this.invalidateCache(existing.key);
    this.logger.info('System configuration updated', {
      configId: id,
      key: existing.key,
    });

    return this.sanitizeConfig(updated);
  }

  async updateByKey(
    key: string,
    value: any,
    userId: string,
    reason?: string,
  ): Promise<SystemConfiguration> {
    const config = await this.prisma.systemConfiguration.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException(`Configuration key '${key}' not found`);
    }

    return this.update(config.id, { value, reason }, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.findOne(id);

    // Check if it's a system configuration
    if (existing.metadata && (existing.metadata as any).isSystem) {
      throw new BadRequestException('Cannot delete system configurations');
    }

    await this.prisma.systemConfiguration.delete({
      where: { id },
    });

    await this.invalidateCache(existing.key);
    this.logger.info('System configuration deleted', {
      configId: id,
      key: existing.key,
    });
  }

  async bulkUpdate(
    updates: Array<{ key: string; value: any }>,
    userId: string,
    reason?: string,
  ): Promise<SystemConfiguration[]> {
    const results: SystemConfiguration[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateByKey(
          update.key,
          update.value,
          userId,
          reason,
        );
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to update config key: ${update.key}`, error);
      }
    }

    return results;
  }

  async getHistory(
    configId: string,
    limit = 10,
  ): Promise<SystemConfigHistory[]> {
    return this.prisma.systemConfigHistory.findMany({
      where: { configId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  async exportConfigs(category?: string): Promise<Record<string, any>> {
    const where = category ? { category } : {};
    const configs = await this.prisma.systemConfiguration.findMany({
      where,
      orderBy: { key: 'asc' },
    });

    const result: Record<string, any> = {};
    for (const config of configs) {
      const value = config.isEncrypted ? '[ENCRYPTED]' : config.value;
      result[config.key] = {
        value,
        type: config.type,
        category: config.category,
        description: config.description,
        isEncrypted: config.isEncrypted,
        isPublic: config.isPublic,
        metadata: config.metadata,
      };
    }

    return result;
  }

  async importConfigs(
    configs: Record<string, any>,
    userId: string,
    overwrite = false,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [key, config] of Object.entries(configs)) {
      try {
        const existing = await this.findByKey(key);

        if (existing && !overwrite) {
          skipped++;
          continue;
        }

        if (existing) {
          await this.updateByKey(key, config.value, userId, 'Config import');
        } else {
          await this.create(
            {
              key,
              value: config.value,
              type: config.type || 'string',
              category: config.category || 'general',
              description: config.description,
              isEncrypted: config.isEncrypted ?? false,
              isPublic: config.isPublic ?? false,
              metadata: config.metadata,
              validationRules: config.validationRules,
            },
            userId,
          );
        }
        imported++;
      } catch (error: any) {
        errors.push(`${key}: ${error.message}`);
      }
    }

    return { imported, skipped, errors };
  }

  async refreshCache(): Promise<void> {
    const configs = await this.prisma.systemConfiguration.findMany();

    for (const config of configs) {
      const cacheKey = `${this.CACHE_PREFIX}${config.key}`;
      await this.cacheService.set(cacheKey, config, this.CACHE_TTL);
    }

    this.logger.info('System configuration cache refreshed', {
      count: configs.length,
    });
  }

  private async createHistory(
    config: SystemConfiguration,
    newValue: any,
    userId: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.systemConfigHistory.create({
      data: {
        id: crypto.randomUUID(),
        configId: config.id,
        previousValue: config.value as any, // Cast to any to handle JsonValue -> InputJsonValue conversion
        newValue,
        changedBy: userId,
        reason,
      },
    });
  }

  private validateConfigValue(value: any, rules: any): void {
    if (!rules) return;

    // Type validation
    if (rules.type) {
      const actualType = typeof value;
      if (actualType !== rules.type) {
        throw new BadRequestException(
          `Value must be of type ${rules.type}, got ${actualType}`,
        );
      }
    }

    // Range validation for numbers
    if (rules.min !== undefined && value < rules.min) {
      throw new BadRequestException(`Value must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      throw new BadRequestException(`Value must be at most ${rules.max}`);
    }

    // String validation
    if (rules.pattern && typeof value === 'string') {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        throw new BadRequestException(
          `Value must match pattern: ${rules.pattern}`,
        );
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      throw new BadRequestException(
        `Value must be one of: ${rules.enum.join(', ')}`,
      );
    }

    // Custom validation function
    if (rules.custom && typeof rules.custom === 'function') {
      const isValid = rules.custom(value);
      if (!isValid) {
        throw new BadRequestException('Value failed custom validation');
      }
    }
  }

  private encryptValue(value: any): any {
    try {
      const text = JSON.stringify(value);
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = (cipher as any).getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      this.logger.error('Failed to encrypt configuration value', error);
      throw new BadRequestException('Failed to encrypt configuration value');
    }
  }

  private decryptValue(encryptedData: any): any {
    try {
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const decipher = crypto.createDecipheriv(
        this.ENCRYPTION_ALGORITHM,
        key,
        iv,
      );

      (decipher as any).setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Failed to decrypt configuration value', error);
      throw new BadRequestException('Failed to decrypt configuration value');
    }
  }

  private decryptConfig(config: SystemConfiguration): SystemConfiguration {
    if (config.isEncrypted && config.value) {
      return {
        ...config,
        value: this.decryptValue(config.value),
      };
    }
    return config;
  }

  private sanitizeConfig(config: SystemConfiguration): SystemConfiguration {
    if (config.isEncrypted) {
      return {
        ...config,
        value: '[ENCRYPTED]' as any,
      };
    }
    return config;
  }

  private async invalidateCache(key: string): Promise<void> {
    await this.cacheService.del(`${this.CACHE_PREFIX}${key}`);
  }
}

import crypto from 'crypto';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';

/**
 * API Key configuration
 */
export interface APIKeyConfig {
  prefix?: string;
  length?: number;
  hashAlgorithm?: string;
  expirationDays?: number;
  maxUsageCount?: number;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

/**
 * API Key metadata
 */
export interface APIKeyMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  maxUsageCount?: number;
  scopes: string[];
  metadata?: Record<string, any>;
  ipWhitelist?: string[];
  isActive: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

/**
 * API Key validation result
 */
export interface APIKeyValidationResult {
  valid: boolean;
  reason?: string;
  metadata?: APIKeyMetadata;
  remainingUsage?: number;
  expiresIn?: number;
}

/**
 * API Key generation result
 */
export interface APIKeyGenerationResult {
  key: string;
  hashedKey: string;
  metadata: APIKeyMetadata;
}

/**
 * API Key usage tracking
 */
interface APIKeyUsage {
  count: number;
  lastUsed: Date;
  timestamps: Date[];
}

/**
 * API Key Management Service
 */
export class APIKeyManager {
  private readonly defaultConfig: Required<APIKeyConfig> = {
    prefix: 'sk_live_',
    length: 32,
    hashAlgorithm: 'sha256',
    expirationDays: 365,
    maxUsageCount: 0, // 0 means unlimited
    rateLimit: {
      requests: 1000,
      windowMs: 60000, // 1 minute
    },
  };

  private config: Required<APIKeyConfig>;
  private keyStore: Map<string, APIKeyMetadata> = new Map();
  private usageTracking: Map<string, APIKeyUsage> = new Map();

  constructor(config?: APIKeyConfig) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Generate a new API key
   */
  generateKey(
    name: string,
    options?: {
      description?: string;
      scopes?: string[];
      expirationDays?: number;
      maxUsageCount?: number;
      ipWhitelist?: string[];
      metadata?: Record<string, any>;
      rateLimit?: { requests: number; windowMs: number };
    }
  ): APIKeyGenerationResult {
    // Generate random key
    const keyBytes = crypto.randomBytes(this.config.length);
    const rawKey = keyBytes.toString('base64url');
    const key = `${this.config.prefix}${rawKey}`;

    // Hash the key for storage
    const hashedKey = this.hashKey(key);

    // Create metadata
    const now = new Date();
    const expirationDays = options?.expirationDays ?? this.config.expirationDays;
    const expiresAt = expirationDays > 0 ?
      new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000) :
      undefined;

    const metadata: APIKeyMetadata = {
      id: uuidv7(),
      name,
      description: options?.description,
      createdAt: now,
      expiresAt,
      usageCount: 0,
      maxUsageCount: options?.maxUsageCount ?? this.config.maxUsageCount,
      scopes: options?.scopes || [],
      metadata: options?.metadata,
      ipWhitelist: options?.ipWhitelist,
      isActive: true,
      rateLimit: options?.rateLimit || this.config.rateLimit,
    };

    // Store the key metadata
    this.keyStore.set(hashedKey, metadata);

    return {
      key,
      hashedKey,
      metadata,
    };
  }

  /**
   * Validate an API key
   */
  validateKey(
    key: string,
    options?: {
      requiredScopes?: string[];
      ipAddress?: string;
    }
  ): APIKeyValidationResult {
    // Hash the key to look it up
    const hashedKey = this.hashKey(key);
    const metadata = this.keyStore.get(hashedKey);

    if (!metadata) {
      return {
        valid: false,
        reason: 'Invalid API key',
      };
    }

    // Check if key is active
    if (!metadata.isActive) {
      return {
        valid: false,
        reason: 'API key is deactivated',
      };
    }

    // Check expiration
    if (metadata.expiresAt && new Date() > metadata.expiresAt) {
      return {
        valid: false,
        reason: 'API key has expired',
      };
    }

    // Check usage limit
    if (metadata?.maxUsageCount && metadata.maxUsageCount > 0 && metadata.usageCount >= metadata.maxUsageCount) {
      return {
        valid: false,
        reason: 'API key usage limit exceeded',
      };
    }

    // Check IP whitelist
    if (metadata.ipWhitelist && metadata.ipWhitelist.length > 0) {
      if (!options?.ipAddress || !this.isIPWhitelisted(options.ipAddress, metadata.ipWhitelist)) {
        return {
          valid: false,
          reason: 'IP address not whitelisted',
        };
      }
    }

    // Check required scopes
    if (options?.requiredScopes && options.requiredScopes.length > 0) {
      const hasAllScopes = options.requiredScopes.every(scope =>
        metadata.scopes.includes(scope)
      );

      if (!hasAllScopes) {
        return {
          valid: false,
          reason: 'Insufficient permissions',
        };
      }
    }

    // Check rate limit
    if (!this.checkRateLimit(hashedKey, metadata)) {
      return {
        valid: false,
        reason: 'Rate limit exceeded',
      };
    }

    // Update usage tracking
    this.trackUsage(hashedKey, metadata);

    // Calculate remaining usage and expiration
    const remainingUsage = metadata?.maxUsageCount && metadata.maxUsageCount > 0 ?
      metadata.maxUsageCount - metadata.usageCount :
      undefined;

    const expiresIn = metadata.expiresAt ?
      Math.max(0, metadata.expiresAt.getTime() - Date.now()) :
      undefined;

    return {
      valid: true,
      metadata,
      remainingUsage,
      expiresIn,
    };
  }

  /**
   * Revoke an API key
   */
  revokeKey(keyOrId: string): boolean {
    // Try as key first
    const hashedKey = this.hashKey(keyOrId);
    let metadata = this.keyStore.get(hashedKey);

    // If not found, try as ID
    if (!metadata) {
      for (const [hash, meta] of this.keyStore.entries()) {
        if (meta.id === keyOrId) {
          metadata = meta;
          this.keyStore.delete(hash);
          this.usageTracking.delete(hash);
          return true;
        }
      }
      return false;
    }

    // Delete by hashed key
    this.keyStore.delete(hashedKey);
    this.usageTracking.delete(hashedKey);
    return true;
  }

  /**
   * Deactivate an API key (soft delete)
   */
  deactivateKey(keyOrId: string): boolean {
    const metadata = this.findKeyMetadata(keyOrId);
    if (metadata) {
      metadata.isActive = false;
      return true;
    }
    return false;
  }

  /**
   * Reactivate an API key
   */
  reactivateKey(keyOrId: string): boolean {
    const metadata = this.findKeyMetadata(keyOrId);
    if (metadata) {
      metadata.isActive = true;
      return true;
    }
    return false;
  }

  /**
   * Update API key metadata
   */
  updateKeyMetadata(
    keyOrId: string,
    updates: Partial<Omit<APIKeyMetadata, 'id' | 'createdAt'>>
  ): boolean {
    const metadata = this.findKeyMetadata(keyOrId);
    if (metadata) {
      Object.assign(metadata, updates);
      return true;
    }
    return false;
  }

  /**
   * List all API keys
   */
  listKeys(filters?: {
    isActive?: boolean;
    hasExpired?: boolean;
    scopes?: string[];
  }): APIKeyMetadata[] {
    const keys = Array.from(this.keyStore.values());
    const now = new Date();

    return keys.filter(key => {
      if (filters?.isActive !== undefined && key.isActive !== filters.isActive) {
        return false;
      }

      if (filters?.hasExpired !== undefined) {
        const isExpired = key.expiresAt && key.expiresAt < now;
        if (filters.hasExpired !== isExpired) {
          return false;
        }
      }

      if (filters?.scopes && filters.scopes.length > 0) {
        const hasAllScopes = filters.scopes.every(scope =>
          key.scopes.includes(scope)
        );
        if (!hasAllScopes) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get API key statistics
   */
  getStatistics(): {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    revokedKeys: number;
    totalUsage: number;
    averageUsage: number;
  } {
    const keys = Array.from(this.keyStore.values());
    const now = new Date();

    const activeKeys = keys.filter(k => k.isActive).length;
    const expiredKeys = keys.filter(k => k.expiresAt && k.expiresAt < now).length;
    const totalUsage = keys.reduce((sum, k) => sum + k.usageCount, 0);
    const averageUsage = keys.length > 0 ? totalUsage / keys.length : 0;

    return {
      totalKeys: keys.length,
      activeKeys,
      expiredKeys,
      revokedKeys: keys.length - activeKeys,
      totalUsage,
      averageUsage,
    };
  }

  /**
   * Rotate an API key
   */
  rotateKey(oldKey: string, name?: string): APIKeyGenerationResult | null {
    const hashedKey = this.hashKey(oldKey);
    const oldMetadata = this.keyStore.get(hashedKey);

    if (!oldMetadata) {
      return null;
    }

    // Deactivate old key
    oldMetadata.isActive = false;

    // Generate new key with same metadata
    return this.generateKey(name || oldMetadata.name, {
      description: oldMetadata.description,
      scopes: oldMetadata.scopes,
      maxUsageCount: oldMetadata.maxUsageCount,
      ipWhitelist: oldMetadata.ipWhitelist,
      metadata: { ...oldMetadata.metadata, rotatedFrom: oldMetadata.id },
      rateLimit: oldMetadata.rateLimit,
    });
  }

  /**
   * Hash an API key
   */
  private hashKey(key: string): string {
    return crypto
      .createHash(this.config.hashAlgorithm)
      .update(key)
      .digest('hex');
  }

  /**
   * Find key metadata by key or ID
   */
  private findKeyMetadata(keyOrId: string): APIKeyMetadata | undefined {
    // Try as key first
    const hashedKey = this.hashKey(keyOrId);
    let metadata = this.keyStore.get(hashedKey);

    // If not found, try as ID
    if (!metadata) {
      for (const meta of this.keyStore.values()) {
        if (meta.id === keyOrId) {
          return meta;
        }
      }
    }

    return metadata;
  }

  /**
   * Check if IP is whitelisted
   */
  private isIPWhitelisted(ip: string, whitelist: string[]): boolean {
    return whitelist.some(pattern => {
      // Support wildcards (e.g., 192.168.1.*)
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
      );
      return regex.test(ip);
    });
  }

  /**
   * Check rate limit for a key
   */
  private checkRateLimit(hashedKey: string, metadata: APIKeyMetadata): boolean {
    if (!metadata.rateLimit) {
      return true;
    }

    const usage = this.usageTracking.get(hashedKey);
    if (!usage) {
      return true;
    }

    const now = Date.now();
    const windowStart = now - metadata.rateLimit.windowMs;

    // Count requests within the window
    const recentRequests = usage.timestamps.filter(
      timestamp => timestamp.getTime() > windowStart
    );

    return recentRequests.length < metadata.rateLimit.requests;
  }

  /**
   * Track API key usage
   */
  private trackUsage(hashedKey: string, metadata: APIKeyMetadata): void {
    const now = new Date();

    // Update metadata
    metadata.usageCount++;
    metadata.lastUsedAt = now;

    // Update usage tracking
    let usage = this.usageTracking.get(hashedKey);
    if (!usage) {
      usage = {
        count: 0,
        lastUsed: now,
        timestamps: [],
      };
      this.usageTracking.set(hashedKey, usage);
    }

    usage.count++;
    usage.lastUsed = now;
    usage.timestamps.push(now);

    // Clean old timestamps (keep only last hour)
    const oneHourAgo = now.getTime() - 3600000;
    usage.timestamps = usage.timestamps.filter(
      t => t.getTime() > oneHourAgo
    );
  }

  /**
   * Export keys for backup
   */
  exportKeys(): string {
    const data = {
      version: '1.0',
      exported: new Date().toISOString(),
      keys: Array.from(this.keyStore.entries()).map(([hash, metadata]) => ({
        hash,
        metadata,
      })),
      usage: Array.from(this.usageTracking.entries()).map(([hash, usage]) => ({
        hash,
        usage,
      })),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import keys from backup
   */
  importKeys(data: string): void {
    const parsed = JSON.parse(data);

    // Clear existing data
    this.keyStore.clear();
    this.usageTracking.clear();

    // Import keys
    for (const entry of parsed.keys) {
      this.keyStore.set(entry.hash, {
        ...entry.metadata,
        createdAt: new Date(entry.metadata.createdAt),
        expiresAt: entry.metadata.expiresAt ?
          new Date(entry.metadata.expiresAt) :
          undefined,
        lastUsedAt: entry.metadata.lastUsedAt ?
          new Date(entry.metadata.lastUsedAt) :
          undefined,
      });
    }

    // Import usage
    for (const entry of parsed.usage) {
      this.usageTracking.set(entry.hash, {
        ...entry.usage,
        lastUsed: new Date(entry.usage.lastUsed),
        timestamps: entry.usage.timestamps.map((t: string) => new Date(t)),
      });
    }
  }
}

/**
 * API Key validation schema
 */
export const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  scopes: z.array(z.string()).default([]),
  expirationDays: z.number().min(0).max(3650).optional(),
  maxUsageCount: z.number().min(0).optional(),
  ipWhitelist: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  rateLimit: z.object({
    requests: z.number().min(1),
    windowMs: z.number().min(1000),
  }).optional(),
});

/**
 * Express/Next.js middleware for API key authentication
 */
export function createAPIKeyMiddleware(
  manager: APIKeyManager,
  options?: {
    requiredScopes?: string[];
    headerName?: string;
    queryParam?: string;
  }
) {
  const headerName = options?.headerName || 'X-API-Key';
  const queryParam = options?.queryParam || 'api_key';

  return (req: any, res: any, next: any) => {
    // Extract API key from header or query
    const apiKey = req.headers[headerName.toLowerCase()] ||
                   req.headers[headerName] ||
                   req.query[queryParam];

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key',
      });
    }

    // Validate the key
    const result = manager.validateKey(apiKey, {
      requiredScopes: options?.requiredScopes,
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    if (!result.valid) {
      return res.status(403).json({
        error: 'Invalid API key',
        message: result.reason,
      });
    }

    // Attach metadata to request
    req.apiKey = result.metadata;

    // Set rate limit headers
    if (result.metadata?.rateLimit) {
      res.setHeader('X-RateLimit-Limit', result.metadata.rateLimit.requests);
      res.setHeader('X-RateLimit-Window', result.metadata.rateLimit.windowMs);
    }

    if (result.remainingUsage !== undefined) {
      res.setHeader('X-RateLimit-Remaining', result.remainingUsage);
    }

    if (result.expiresIn !== undefined) {
      res.setHeader('X-API-Key-Expires-In', Math.floor(result.expiresIn / 1000));
    }

    next();
  };
}

/**
 * React hook for API key management
 */
export function useAPIKey(apiKey?: string): {
  isValid: boolean;
  metadata?: APIKeyMetadata;
  error?: string;
} {
  const [state, setState] = useState<{
    isValid: boolean;
    metadata?: APIKeyMetadata;
    error?: string;
  }>({
    isValid: false,
  });

  useEffect(() => {
    if (!apiKey) {
      setState({ isValid: false, error: 'No API key provided' });
      return;
    }

    // In a real implementation, this would validate against a backend
    // For now, just check format
    const isValid = apiKey.startsWith('sk_live_') || apiKey.startsWith('sk_test_');

    setState({
      isValid,
      error: isValid ? undefined : 'Invalid API key format',
    });
  }, [apiKey]);

  return state;
}

// Create singleton instance
export const apiKeyManager = new APIKeyManager();

// For React 18
import { useState, useEffect } from 'react';
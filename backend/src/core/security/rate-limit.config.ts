import { Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

export interface RateLimitConfig {
  max: number;
  timeWindow: number;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (request: FastifyRequest) => string;
}

export interface EndpointRateLimitConfig {
  [endpoint: string]: RateLimitConfig;
}

@Injectable()
export class RateLimitConfigService {
  private readonly defaultConfig: RateLimitConfig = {
    max: 100,
    timeWindow: 60000, // 1 minute
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
  };

  private readonly endpointConfigs: EndpointRateLimitConfig = {
    // Authentication endpoints - stricter limits
    '/auth/login': {
      max: 5,
      timeWindow: 300000, // 5 minutes
      skipSuccessfulRequests: true,
    },
    '/auth/register': {
      max: 3,
      timeWindow: 600000, // 10 minutes
    },
    '/auth/forgot-password': {
      max: 3,
      timeWindow: 600000, // 10 minutes
    },
    '/auth/reset-password': {
      max: 3,
      timeWindow: 600000, // 10 minutes
    },

    // Feature flag evaluation - higher limits for reads
    '/feature-flags/evaluate': {
      max: 500,
      timeWindow: 60000, // 1 minute
    },
    '/feature-flags/evaluate-bulk': {
      max: 100,
      timeWindow: 60000, // 1 minute
    },

    // System config - moderate limits
    '/system-config': {
      max: 50,
      timeWindow: 60000, // 1 minute
    },
    '/system-config/public': {
      max: 100,
      timeWindow: 60000, // 1 minute
    },

    // Workflow execution - resource intensive
    '/workflows/execute': {
      max: 10,
      timeWindow: 60000, // 1 minute
    },
    '/workflows/bulk': {
      max: 5,
      timeWindow: 60000, // 1 minute
    },

    // Notification sending - prevent spam
    '/notifications/send': {
      max: 20,
      timeWindow: 60000, // 1 minute
    },
    '/notifications/bulk': {
      max: 5,
      timeWindow: 60000, // 1 minute
    },

    // Data export - resource intensive
    '/audit/export': {
      max: 5,
      timeWindow: 300000, // 5 minutes
    },
    '/system-config/export': {
      max: 5,
      timeWindow: 300000, // 5 minutes
    },

    // Search endpoints - moderate limits
    '/users/search': {
      max: 30,
      timeWindow: 60000, // 1 minute
    },
    '/permissions/check': {
      max: 100,
      timeWindow: 60000, // 1 minute
    },

    // Organization endpoints - optimized for search functionality
    '/organizations/departments': {
      max: 20, // 20 requests per 10 seconds = safe search rate
      timeWindow: 10000, // 10 seconds window for better distribution
      skipSuccessfulRequests: false,
    },
    '/organizations/schools': {
      max: 20,
      timeWindow: 10000, // 10 seconds
    },
    '/organizations/positions': {
      max: 20,
      timeWindow: 10000, // 10 seconds
    },

    // File uploads - strict limits
    '/files/upload': {
      max: 10,
      timeWindow: 60000, // 1 minute
    },

    // Bulk operations - strict limits
    '/permissions/bulk-assign': {
      max: 5,
      timeWindow: 60000, // 1 minute
    },
    '/users/bulk-import': {
      max: 2,
      timeWindow: 600000, // 10 minutes
    },

    // Health endpoints - no limits
    '/health': {
      max: 0, // Unlimited
      timeWindow: 0,
    },
    '/health/live': {
      max: 0, // Unlimited
      timeWindow: 0,
    },
    '/health/ready': {
      max: 0, // Unlimited
      timeWindow: 0,
    },
    '/metrics': {
      max: 0, // Unlimited
      timeWindow: 0,
    },
  };

  getConfigForEndpoint(endpoint: string): RateLimitConfig {
    // Check for exact match
    if (this.endpointConfigs[endpoint]) {
      return { ...this.defaultConfig, ...this.endpointConfigs[endpoint] };
    }

    // Check for pattern match (e.g., /users/:id)
    for (const [pattern, config] of Object.entries(this.endpointConfigs)) {
      const regex = this.patternToRegex(pattern);
      if (regex.test(endpoint)) {
        return { ...this.defaultConfig, ...config };
      }
    }

    // Return default config
    return this.defaultConfig;
  }

  getDefaultKeyGenerator(): (request: FastifyRequest) => string {
    return (request: FastifyRequest) => {
      // Use a combination of IP and user ID if available
      const ip = this.getClientIp(request);
      const userId = (request as any).user?.id;

      if (userId) {
        return `${ip}:${userId}`;
      }

      return ip;
    };
  }

  private getClientIp(request: FastifyRequest): string {
    // Check various headers for the real IP (when behind a proxy)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    const cfIp = request.headers['cf-connecting-ip'];
    if (cfIp) {
      return cfIp as string;
    }

    // Fallback to request IP
    return request.ip || '127.0.0.1';
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert route pattern to regex
    // e.g., /users/:id -> /users/[^/]+
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+')
      .replace(/\*/g, '.*');

    return new RegExp(`^${regexPattern}$`);
  }

  updateEndpointConfig(
    endpoint: string,
    config: Partial<RateLimitConfig>,
  ): void {
    this.endpointConfigs[endpoint] = {
      ...this.defaultConfig,
      ...this.endpointConfigs[endpoint],
      ...config,
    };
  }

  removeEndpointConfig(endpoint: string): void {
    delete this.endpointConfigs[endpoint];
  }

  getAllConfigs(): EndpointRateLimitConfig {
    return { ...this.endpointConfigs };
  }
}

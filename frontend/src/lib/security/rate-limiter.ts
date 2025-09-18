import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs?: number;           // Time window in milliseconds
  max?: number;                // Max requests per window
  message?: string;             // Error message
  statusCode?: number;          // HTTP status code
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
  handler?: (req: any, res: any) => void;
  onLimitReached?: (req: any, res: any, options: RateLimitConfig) => void;
  store?: RateLimitStore;
  legacyHeaders?: boolean;
  standardHeaders?: boolean;
  requestPropertyName?: string;
}

/**
 * Rate limit store interface
 */
export interface RateLimitStore {
  increment(key: string): Promise<RateLimitInfo>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
  resetAll(): Promise<void>;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  totalHits: number;
  resetTime: Date;
  limit: number;
  remaining: number;
  retryAfter: number;
}

/**
 * Token bucket algorithm configuration
 */
export interface TokenBucketConfig {
  capacity: number;        // Maximum tokens in bucket
  refillRate: number;      // Tokens per second
  initialTokens?: number;  // Initial token count
}

/**
 * Sliding window configuration
 */
export interface SlidingWindowConfig {
  windowMs: number;        // Window size in milliseconds
  max: number;            // Maximum requests per window
}

/**
 * Memory store for rate limiting
 */
export class MemoryStore implements RateLimitStore {
  private cache: LRUCache<string, { count: number; resetTime: number }>;
  private windowMs: number;
  private max: number;

  constructor(windowMs = 60000, max = 100) {
    this.windowMs = windowMs;
    this.max = max;
    this.cache = new LRUCache({
      max: 10000, // Maximum number of items
      ttl: windowMs, // TTL in milliseconds
    });
  }

  async increment(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const resetTime = now + this.windowMs;

    let record = this.cache.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime,
      };
    } else {
      record.count++;
    }

    this.cache.set(key, record);

    const remaining = Math.max(0, this.max - record.count);
    const retryAfter = remaining === 0 ? Math.ceil((record.resetTime - now) / 1000) : 0;

    return {
      totalHits: record.count,
      resetTime: new Date(record.resetTime),
      limit: this.max,
      remaining,
      retryAfter,
    };
  }

  async decrement(key: string): Promise<void> {
    const record = this.cache.get(key);
    if (record && record.count > 0) {
      record.count--;
      this.cache.set(key, record);
    }
  }

  async reset(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async resetAll(): Promise<void> {
    this.cache.clear();
  }
}

/**
 * Token bucket implementation
 */
export class TokenBucket {
  private capacity: number;
  private tokens: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(config: TokenBucketConfig) {
    this.capacity = config.capacity;
    this.tokens = config.initialTokens ?? config.capacity;
    this.refillRate = config.refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens
   */
  consume(tokens = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Get available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get time until next token is available
   */
  getRetryAfter(): number {
    if (this.tokens >= 1) {
      return 0;
    }

    const tokensNeeded = 1 - this.tokens;
    return Math.ceil((tokensNeeded / this.refillRate) * 1000);
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Reset bucket to full capacity
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

/**
 * Token bucket store for distributed systems
 */
export class TokenBucketStore implements RateLimitStore {
  private buckets: Map<string, TokenBucket>;
  private config: TokenBucketConfig;

  constructor(config: TokenBucketConfig) {
    this.buckets = new Map();
    this.config = config;
  }

  async increment(key: string): Promise<RateLimitInfo> {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = new TokenBucket(this.config);
      this.buckets.set(key, bucket);
    }

    const consumed = bucket.consume(1);
    const remaining = bucket.getAvailableTokens();
    const retryAfter = bucket.getRetryAfter();

    return {
      totalHits: consumed ? 1 : 0,
      resetTime: new Date(Date.now() + retryAfter),
      limit: this.config.capacity,
      remaining,
      retryAfter: Math.ceil(retryAfter / 1000),
    };
  }

  async decrement(key: string): Promise<void> {
    // Token bucket doesn't support decrement
    // Tokens are automatically refilled over time
  }

  async reset(key: string): Promise<void> {
    const bucket = this.buckets.get(key);
    if (bucket) {
      bucket.reset();
    }
  }

  async resetAll(): Promise<void> {
    this.buckets.clear();
  }
}

/**
 * Sliding window log implementation
 */
export class SlidingWindowLog {
  private requests: Map<string, number[]>;
  private windowMs: number;
  private max: number;

  constructor(config: SlidingWindowConfig) {
    this.requests = new Map();
    this.windowMs = config.windowMs;
    this.max = config.max;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create request log
    let requestLog = this.requests.get(key) || [];

    // Remove old requests outside the window
    requestLog = requestLog.filter(timestamp => timestamp > windowStart);

    // Check if limit is exceeded
    if (requestLog.length >= this.max) {
      this.requests.set(key, requestLog);
      return false;
    }

    // Add current request
    requestLog.push(now);
    this.requests.set(key, requestLog);
    return true;
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let requestLog = this.requests.get(key) || [];
    requestLog = requestLog.filter(timestamp => timestamp > windowStart);

    return Math.max(0, this.max - requestLog.length);
  }

  /**
   * Reset key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Reset all keys
   */
  resetAll(): void {
    this.requests.clear();
  }
}

/**
 * Distributed rate limiter using Redis-like interface
 */
export class DistributedRateLimiter {
  private scriptSha: string | null = null;
  private script = `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local max = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    local current = redis.call('GET', key)
    if current == false then
      redis.call('SET', key, 1)
      redis.call('EXPIRE', key, window)
      return {1, max - 1}
    end

    local count = tonumber(current)
    if count < max then
      redis.call('INCR', key)
      return {count + 1, max - count - 1}
    end

    return {count, 0}
  `;

  constructor(private redisClient?: any) {}

  /**
   * Check rate limit
   */
  async checkLimit(key: string, windowMs: number, max: number): Promise<{
    allowed: boolean;
    count: number;
    remaining: number;
    resetTime: number;
  }> {
    if (!this.redisClient) {
      throw new Error('Redis client not configured');
    }

    const now = Date.now();
    const window = Math.ceil(windowMs / 1000);

    try {
      const result = await this.redisClient.eval(
        this.script,
        1,
        key,
        window,
        max,
        now
      );

      const [count, remaining] = result;
      const ttl = await this.redisClient.ttl(key);

      return {
        allowed: remaining > 0,
        count,
        remaining,
        resetTime: now + (ttl * 1000),
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        count: 0,
        remaining: max,
        resetTime: now + windowMs,
      };
    }
  }
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private store: RateLimitStore;

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      windowMs: 60000,           // 1 minute
      max: 100,                  // 100 requests per minute
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      legacyHeaders: false,
      standardHeaders: true,
      requestPropertyName: 'rateLimit',
      ...config,
    };

    this.store = this.config.store || new MemoryStore(this.config.windowMs, this.config.max);
  }

  /**
   * Express/Next.js middleware
   */
  middleware() {
    return async (req: any, res: any, next: any) => {
      // Check if should skip
      if (this.config.skip && await this.config.skip(req)) {
        return next();
      }

      // Generate key
      const key = this.config.keyGenerator ?
        this.config.keyGenerator(req) :
        this.getDefaultKey(req);

      // Get rate limit info
      const info = await this.store.increment(key);

      // Add rate limit info to request
      if (this.config.requestPropertyName) {
        req[this.config.requestPropertyName] = info;
      }

      // Set headers
      this.setHeaders(res, info);

      // Check if limit exceeded
      if (info.remaining < 0) {
        // Call limit reached handler
        if (this.config.onLimitReached) {
          this.config.onLimitReached(req, res, this.config);
        }

        // Use custom handler if provided
        if (this.config.handler) {
          return this.config.handler(req, res);
        }

        // Default response
        return res.status(this.config.statusCode).json({
          error: 'Too Many Requests',
          message: this.config.message,
          retryAfter: info.retryAfter,
        });
      }

      // Continue to next middleware
      next();

      // Handle response for conditional limiting
      if (this.config.skipSuccessfulRequests || this.config.skipFailedRequests) {
        res.on('finish', async () => {
          const shouldSkip =
            (this.config.skipSuccessfulRequests && res.statusCode < 400) ||
            (this.config.skipFailedRequests && res.statusCode >= 400);

          if (shouldSkip) {
            await this.store.decrement(key);
          }
        });
      }
    };
  }

  /**
   * Get default key from request
   */
  private getDefaultKey(req: any): string {
    // Use IP address as default key
    const ip = req.ip ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.connection?.remoteAddress ||
               'unknown';

    return `rate-limit:${ip}`;
  }

  /**
   * Set rate limit headers
   */
  private setHeaders(res: any, info: RateLimitInfo): void {
    if (this.config.standardHeaders) {
      res.setHeader('RateLimit-Limit', info.limit);
      res.setHeader('RateLimit-Remaining', Math.max(0, info.remaining));
      res.setHeader('RateLimit-Reset', new Date(info.resetTime).toISOString());
    }

    if (this.config.legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', info.limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining));
      res.setHeader('X-RateLimit-Reset', Math.floor(info.resetTime.getTime() / 1000));
    }

    if (info.retryAfter > 0) {
      res.setHeader('Retry-After', info.retryAfter);
    }
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    await this.store.reset(key);
  }

  /**
   * Reset all rate limits
   */
  async resetAll(): Promise<void> {
    await this.store.resetAll();
  }
}

/**
 * Create rate limiter with different strategies
 */
export function createRateLimiter(
  strategy: 'fixed' | 'sliding' | 'token',
  config: any
): RateLimiter {
  let store: RateLimitStore;

  switch (strategy) {
    case 'sliding':
      // Sliding window not implemented as store yet
      // Using memory store as fallback
      store = new MemoryStore(config.windowMs, config.max);
      break;

    case 'token':
      store = new TokenBucketStore({
        capacity: config.max || 100,
        refillRate: config.refillRate || 10,
        initialTokens: config.initialTokens,
      });
      break;

    case 'fixed':
    default:
      store = new MemoryStore(config.windowMs, config.max);
      break;
  }

  return new RateLimiter({
    ...config,
    store,
  });
}

/**
 * Rate limiter for specific endpoints
 */
export const rateLimiters = {
  // Strict rate limit for authentication endpoints
  auth: createRateLimiter('fixed', {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
  }),

  // Standard API rate limit
  api: createRateLimiter('token', {
    max: 100, // 100 tokens capacity
    refillRate: 10, // 10 tokens per second
    message: 'API rate limit exceeded.',
  }),

  // Relaxed rate limit for static resources
  static: createRateLimiter('fixed', {
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 requests per minute
    message: 'Too many requests for static resources.',
  }),

  // Strict rate limit for file uploads
  upload: createRateLimiter('fixed', {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: 'Upload limit exceeded, please try again later.',
  }),
};

/**
 * React hook for client-side rate limiting
 */
export function useRateLimiter(
  key: string,
  max = 10,
  windowMs = 60000
): {
  canProceed: () => boolean;
  remaining: number;
  resetTime: Date;
} {
  const [requests, setRequests] = useState<number[]>([]);

  const canProceed = (): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Filter out old requests
    const recentRequests = requests.filter(time => time > windowStart);

    if (recentRequests.length >= max) {
      setRequests(recentRequests);
      return false;
    }

    // Add new request
    setRequests([...recentRequests, now]);
    return true;
  };

  const remaining = Math.max(0, max - requests.length);
  const oldestRequest = requests[0] || Date.now();
  const resetTime = new Date(oldestRequest + windowMs);

  return {
    canProceed,
    remaining,
    resetTime,
  };
}

// For React 18
import { useState } from 'react';
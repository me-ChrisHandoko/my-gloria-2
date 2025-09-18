import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly API_KEY_LENGTH = 32;
  private readonly TOKEN_LENGTH = 32;

  // Argon2id configuration - OWASP recommended settings for production
  private readonly ARGON2_OPTIONS: argon2.Options = {
    type: argon2.argon2id, // Hybrid mode - best balance of security
    memoryCost: 65536, // 64MB memory cost
    timeCost: 3, // Number of iterations
    parallelism: 4, // Number of parallel threads
    hashLength: 32, // Output hash length in bytes
  };

  /**
   * Generate a secure API key with specified prefix
   * @param prefix - Key prefix (e.g., 'sk' for secret key, 'pk' for public key)
   * @returns Formatted API key
   */
  async generateApiKey(prefix = 'sk'): Promise<string> {
    const randomBytes = crypto.randomBytes(this.API_KEY_LENGTH);
    const key = randomBytes.toString('base64url');
    return `${prefix}_${key}`;
  }

  /**
   * Hash an API key for secure storage using Argon2id
   * @param apiKey - The plain text API key to hash
   * @returns The hashed API key using Argon2id
   */
  async hashApiKey(apiKey: string): Promise<string> {
    try {
      // Use Argon2id for secure hashing
      const hash = await argon2.hash(apiKey, this.ARGON2_OPTIONS);

      // Never log the actual hash value for security
      this.logger.debug('API key hashed successfully using Argon2id');

      return hash;
    } catch (error) {
      this.logger.error('Failed to hash API key with Argon2', error.message);
      throw new Error('Failed to hash API key');
    }
  }

  /**
   * Verify an API key against its Argon2 hash
   * @param apiKey - The plain text API key to verify
   * @param hashedKey - The Argon2 hash to verify against
   * @returns Whether the API key matches the hash
   */
  async verifyApiKey(apiKey: string, hashedKey: string): Promise<boolean> {
    try {
      // Verify using Argon2's built-in timing-safe comparison
      const isValid = await argon2.verify(hashedKey, apiKey);

      // Log verification attempt without revealing sensitive data
      this.logger.debug(
        `API key verification ${isValid ? 'succeeded' : 'failed'}`,
      );

      return isValid;
    } catch (error) {
      this.logger.error('Failed to verify API key', error.message);
      return false;
    }
  }

  /**
   * Get information about a hash (for debugging/monitoring)
   * @param hash - The Argon2 hash to analyze
   * @returns Hash parameters or null if invalid
   */
  async getHashInfo(hash: string): Promise<{
    algorithm: string;
    version: number;
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  } | null> {
    try {
      // Parse Argon2 hash format: $argon2id$v=19$m=65536,t=3,p=4$...
      if (!hash.startsWith('$argon2')) {
        return null;
      }

      const parts = hash.split('$');
      if (parts.length < 4) {
        return null;
      }

      const algorithm = parts[1];
      const version = parseInt(parts[2].replace('v=', ''), 10);
      const params = parts[3].split(',');

      const memoryCost = parseInt(params[0].replace('m=', ''), 10);
      const timeCost = parseInt(params[1].replace('t=', ''), 10);
      const parallelism = parseInt(params[2].replace('p=', ''), 10);

      return {
        algorithm,
        version,
        memoryCost,
        timeCost,
        parallelism,
      };
    } catch (error) {
      this.logger.error('Failed to parse hash info', error.message);
      return null;
    }
  }

  /**
   * Check if the hash needs rehashing (e.g., parameters changed)
   * @param hash - The existing hash to check
   * @returns Whether the hash should be regenerated with current parameters
   */
  async needsRehash(hash: string): Promise<boolean> {
    try {
      return argon2.needsRehash(hash, this.ARGON2_OPTIONS);
    } catch (error) {
      this.logger.error('Failed to check rehash status', error.message);
      return true; // Safer to rehash if we can't determine
    }
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length = this.TOKEN_LENGTH): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a CSRF token
   */
  generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify a CSRF token
   */
  verifyCsrfToken(token: string, storedToken: string): boolean {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
  }

  /**
   * Hash sensitive data with SHA-256
   */
  hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC signature
   */
  generateHmac(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHmac(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHmac(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(
    text: string,
    key: string,
  ): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    const algorithm = 'aes-256-gcm';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as any).getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(
    encryptedData: {
      encrypted: string;
      iv: string;
      authTag: string;
    },
    key: string,
  ): string {
    const algorithm = 'aes-256-gcm';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);

    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Sanitize user input to prevent XSS
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate OTP (One-Time Password)
   */
  generateOTP(length = 6): string {
    const digits = '0123456789';
    let otp = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }

    return otp;
  }

  /**
   * Generate secure session ID
   */
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Check if IP is in whitelist
   */
  isIpWhitelisted(ip: string, whitelist: string[]): boolean {
    return whitelist.some((allowedIp) => {
      if (allowedIp.includes('*')) {
        const pattern = allowedIp.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(ip);
      }
      return allowedIp === ip;
    });
  }

  /**
   * Rate limit key generator
   */
  generateRateLimitKey(identifier: string, window: number): string {
    const windowStart = Math.floor(Date.now() / window) * window;
    return `rate-limit:${identifier}:${windowStart}`;
  }
}

import crypto from 'crypto';
import { z } from 'zod';

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
  saltLength?: number;
  tagLength?: number;
  iterations?: number;
  digest?: string;
  encoding?: BufferEncoding;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  tag?: string;
  algorithm: string;
  iterations: number;
}

/**
 * Key derivation options
 */
export interface KeyDerivationOptions {
  salt?: Buffer;
  iterations?: number;
  keyLength?: number;
  digest?: string;
}

/**
 * Encryption service for sensitive data
 */
export class EncryptionService {
  private readonly defaultConfig: Required<EncryptionConfig> = {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    tagLength: 16,
    iterations: 100000,
    digest: 'sha256',
    encoding: 'base64',
  };

  private config: Required<EncryptionConfig>;

  constructor(config?: EncryptionConfig) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Encrypt data with password
   */
  encrypt(data: string, password: string): EncryptedData {
    // Generate salt and IV
    const salt = crypto.randomBytes(this.config.saltLength);
    const iv = crypto.randomBytes(this.config.ivLength);

    // Derive key from password
    const key = this.deriveKey(password, {
      salt,
      iterations: this.config.iterations,
      keyLength: this.config.keyLength,
      digest: this.config.digest,
    });

    // Create cipher
    const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', this.config.encoding);
    encrypted += cipher.final(this.config.encoding);

    // Get auth tag for GCM mode
    let tag: string | undefined;
    if (this.config.algorithm.includes('gcm')) {
      tag = cipher.getAuthTag().toString(this.config.encoding);
    }

    return {
      data: encrypted,
      iv: iv.toString(this.config.encoding),
      salt: salt.toString(this.config.encoding),
      tag,
      algorithm: this.config.algorithm,
      iterations: this.config.iterations,
    };
  }

  /**
   * Decrypt data with password
   */
  decrypt(encryptedData: EncryptedData, password: string): string {
    // Convert from base64
    const salt = Buffer.from(encryptedData.salt, this.config.encoding);
    const iv = Buffer.from(encryptedData.iv, this.config.encoding);
    const data = Buffer.from(encryptedData.data, this.config.encoding);

    // Derive key from password
    const key = this.deriveKey(password, {
      salt,
      iterations: encryptedData.iterations || this.config.iterations,
      keyLength: this.config.keyLength,
      digest: this.config.digest,
    });

    // Create decipher
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm || this.config.algorithm,
      key,
      iv
    );

    // Set auth tag for GCM mode
    if (encryptedData.tag && encryptedData.algorithm.includes('gcm')) {
      const tag = Buffer.from(encryptedData.tag, this.config.encoding);
      decipher.setAuthTag(tag);
    }

    // Decrypt data
    let decrypted = decipher.update(data, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt with public key (asymmetric)
   */
  encryptWithPublicKey(data: string, publicKey: string): string {
    const buffer = Buffer.from(data, 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer
    );

    return encrypted.toString(this.config.encoding);
  }

  /**
   * Decrypt with private key (asymmetric)
   */
  decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
    const buffer = Buffer.from(encryptedData, this.config.encoding);
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer
    );

    return decrypted.toString('utf8');
  }

  /**
   * Generate key pair for asymmetric encryption
   */
  generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        'rsa',
        {
          modulusLength: 4096,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
          },
        },
        (err, publicKey, privateKey) => {
          if (err) {
            reject(err);
          } else {
            resolve({ publicKey, privateKey });
          }
        }
      );
    });
  }

  /**
   * Derive key from password
   */
  private deriveKey(password: string, options: KeyDerivationOptions): Buffer {
    return crypto.pbkdf2Sync(
      password,
      options.salt || crypto.randomBytes(this.config.saltLength),
      options.iterations || this.config.iterations,
      options.keyLength || this.config.keyLength,
      options.digest || this.config.digest
    );
  }

  /**
   * Hash data with salt
   */
  hashWithSalt(data: string, salt?: string): {
    hash: string;
    salt: string;
  } {
    const saltBuffer = salt ?
      Buffer.from(salt, this.config.encoding) :
      crypto.randomBytes(this.config.saltLength);

    const hash = crypto
      .createHash(this.config.digest)
      .update(data + saltBuffer.toString('hex'))
      .digest(this.config.encoding);

    return {
      hash,
      salt: saltBuffer.toString(this.config.encoding),
    };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    const computed = this.hashWithSalt(data, salt);
    return this.constantTimeCompare(computed.hash, hash);
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

/**
 * Field-level encryption for specific data fields
 */
export class FieldEncryption {
  private encryptionService: EncryptionService;
  private masterKey: string;

  constructor(masterKey: string, config?: EncryptionConfig) {
    this.encryptionService = new EncryptionService(config);
    this.masterKey = masterKey;
  }

  /**
   * Encrypt specific fields in an object
   */
  encryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): T {
    const encrypted = { ...data };

    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== null) {
        const value = String(data[field]);
        const encryptedData = this.encryptionService.encrypt(value, this.masterKey);
        encrypted[field] = JSON.stringify(encryptedData) as any;
      }
    }

    return encrypted;
  }

  /**
   * Decrypt specific fields in an object
   */
  decryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): T {
    const decrypted = { ...data };

    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== null) {
        try {
          const encryptedData = typeof data[field] === 'string' ?
            JSON.parse(data[field] as string) :
            data[field];

          const value = this.encryptionService.decrypt(
            encryptedData,
            this.masterKey
          );
          decrypted[field] = value as any;
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error);
          // Keep original value if decryption fails
        }
      }
    }

    return decrypted;
  }
}

/**
 * Tokenization service for sensitive data
 */
export class TokenizationService {
  private tokenMap: Map<string, string> = new Map();
  private reverseMap: Map<string, string> = new Map();
  private tokenPrefix = 'tok_';

  /**
   * Tokenize sensitive data
   */
  tokenize(data: string): string {
    // Check if already tokenized
    const existingToken = this.reverseMap.get(data);
    if (existingToken) {
      return existingToken;
    }

    // Generate new token
    const token = this.tokenPrefix + crypto.randomBytes(24).toString('hex');

    // Store mappings
    this.tokenMap.set(token, data);
    this.reverseMap.set(data, token);

    return token;
  }

  /**
   * Detokenize to get original data
   */
  detokenize(token: string): string | null {
    return this.tokenMap.get(token) || null;
  }

  /**
   * Batch tokenize multiple values
   */
  tokenizeBatch(data: string[]): string[] {
    return data.map(item => this.tokenize(item));
  }

  /**
   * Batch detokenize multiple tokens
   */
  detokenizeBatch(tokens: string[]): (string | null)[] {
    return tokens.map(token => this.detokenize(token));
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.tokenMap.clear();
    this.reverseMap.clear();
  }

  /**
   * Get token statistics
   */
  getStats(): {
    totalTokens: number;
    memoryUsage: number;
  } {
    const totalTokens = this.tokenMap.size;
    const memoryUsage = Array.from(this.tokenMap.entries()).reduce(
      (total, [key, value]) => total + key.length + value.length,
      0
    );

    return {
      totalTokens,
      memoryUsage,
    };
  }
}

/**
 * Secure key storage with encryption
 */
export class SecureKeyStorage {
  private encryptionService: EncryptionService;
  private storageKey = 'secure_keys';

  constructor(private masterPassword: string) {
    this.encryptionService = new EncryptionService();
  }

  /**
   * Store a key securely
   */
  storeKey(name: string, value: string): void {
    const keys = this.getAllKeys();
    keys[name] = this.encryptionService.encrypt(value, this.masterPassword);

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(keys));
    }
  }

  /**
   * Retrieve a key
   */
  getKey(name: string): string | null {
    const keys = this.getAllKeys();
    const encryptedData = keys[name];

    if (!encryptedData) {
      return null;
    }

    try {
      return this.encryptionService.decrypt(encryptedData, this.masterPassword);
    } catch (error) {
      console.error(`Failed to decrypt key ${name}:`, error);
      return null;
    }
  }

  /**
   * Delete a key
   */
  deleteKey(name: string): void {
    const keys = this.getAllKeys();
    delete keys[name];

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(keys));
    }
  }

  /**
   * Get all stored keys (encrypted)
   */
  private getAllKeys(): Record<string, EncryptedData> {
    if (typeof window === 'undefined') {
      return {};
    }

    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Clear all keys
   */
  clearAll(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}

/**
 * Data masking utilities
 */
export class DataMasking {
  /**
   * Mask email address
   */
  static maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) return '***';

    const maskedLocal = localPart.length > 2 ?
      localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1] :
      '*'.repeat(localPart.length);

    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask phone number
   */
  static maskPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '*'.repeat(cleaned.length);

    const visibleDigits = 4;
    const maskedPart = '*'.repeat(cleaned.length - visibleDigits);
    const visiblePart = cleaned.slice(-visibleDigits);

    return maskedPart + visiblePart;
  }

  /**
   * Mask credit card number
   */
  static maskCreditCard(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 8) return '*'.repeat(cleaned.length);

    const firstFour = cleaned.slice(0, 4);
    const lastFour = cleaned.slice(-4);
    const middleMask = '*'.repeat(cleaned.length - 8);

    return `${firstFour}${middleMask}${lastFour}`;
  }

  /**
   * Mask SSN
   */
  static maskSSN(ssn: string): string {
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length !== 9) return '*'.repeat(cleaned.length);

    return `***-**-${cleaned.slice(-4)}`;
  }

  /**
   * Generic masking function
   */
  static mask(
    value: string,
    showFirst = 0,
    showLast = 0,
    maskChar = '*'
  ): string {
    if (value.length <= showFirst + showLast) {
      return maskChar.repeat(value.length);
    }

    const firstPart = value.slice(0, showFirst);
    const lastPart = value.slice(-showLast);
    const middlePart = maskChar.repeat(value.length - showFirst - showLast);

    return firstPart + middlePart + lastPart;
  }
}

/**
 * Secure random generators
 */
export class SecureRandom {
  /**
   * Generate secure random string
   */
  static generateString(length: number, charset?: string): string {
    const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const chars = charset || defaultCharset;
    const randomBytes = crypto.randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }

    return result;
  }

  /**
   * Generate secure random number
   */
  static generateNumber(min: number, max: number): number {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValue = Math.pow(256, bytesNeeded);
    const threshold = maxValue - (maxValue % range);

    let randomValue;
    do {
      randomValue = crypto.randomBytes(bytesNeeded).readUIntBE(0, bytesNeeded);
    } while (randomValue >= threshold);

    return min + (randomValue % range);
  }

  /**
   * Generate UUID v4
   */
  static generateUUID(): string {
    const bytes = crypto.randomBytes(16);

    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytes.toString('hex');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  /**
   * Generate secure token
   */
  static generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }
}

// Export singleton instances
export const encryptionService = new EncryptionService();
export const tokenizationService = new TokenizationService();

// Export types
export type {
  EncryptedData,
  EncryptionConfig,
  KeyDerivationOptions,
};
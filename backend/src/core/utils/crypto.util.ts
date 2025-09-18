import * as crypto from 'crypto';
import { v7 as uuidv7 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CryptoUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('auth.encryptionKey');
    if (!key) {
      throw new Error('Encryption key is required');
    }

    // Support both hex-encoded (64 chars) and raw (32 chars) keys
    if (key.length === 64) {
      // Hex-encoded key (64 hex chars = 32 bytes)
      this.encryptionKey = Buffer.from(key, 'hex');
    } else if (key.length === 32) {
      // Raw 32-character key
      this.encryptionKey = Buffer.from(key);
    } else {
      throw new Error(
        'Encryption key must be exactly 32 characters or 64 hex characters',
      );
    }
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateUUID(): string {
    return uuidv7();
  }

  compareHash(text: string, hash: string): boolean {
    return this.hash(text) === hash;
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { SecurityService } from './security.service';
import * as argon2 from 'argon2';

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityService],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('API Key Generation', () => {
    it('should generate a secure API key with default prefix', async () => {
      const apiKey = await service.generateApiKey();
      expect(apiKey).toMatch(/^sk_[A-Za-z0-9_-]{40,}$/);
    });

    it('should generate a secure API key with custom prefix', async () => {
      const apiKey = await service.generateApiKey('pk');
      expect(apiKey).toMatch(/^pk_[A-Za-z0-9_-]{40,}$/);
    });

    it('should generate unique API keys', async () => {
      const key1 = await service.generateApiKey();
      const key2 = await service.generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('API Key Hashing with Argon2', () => {
    const testApiKey = 'sk_test1234567890abcdefghijklmnopqrs';

    it('should hash an API key using Argon2id', async () => {
      const hash = await service.hashApiKey(testApiKey);

      // Verify it's an Argon2 hash
      expect(hash).toMatch(/^\$argon2id\$/);

      // Verify the hash contains expected parameters
      expect(hash).toContain('m=65536'); // Memory cost
      expect(hash).toContain('t=3'); // Time cost
      expect(hash).toContain('p=4'); // Parallelism
    });

    it('should generate different hashes for the same input (different salts)', async () => {
      const hash1 = await service.hashApiKey(testApiKey);
      const hash2 = await service.hashApiKey(testApiKey);

      // Hashes should be different due to different salts
      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await service.verifyApiKey(testApiKey, hash1)).toBe(true);
      expect(await service.verifyApiKey(testApiKey, hash2)).toBe(true);
    });

    it('should throw error on hashing failure', async () => {
      // Test with invalid input
      await expect(service.hashApiKey(null as any)).rejects.toThrow(
        'Failed to hash API key',
      );
    });
  });

  describe('API Key Verification with Argon2', () => {
    const testApiKey = 'sk_test1234567890abcdefghijklmnopqrs';
    const wrongApiKey = 'sk_wrong1234567890abcdefghijklmnopqrs';

    it('should verify a valid API key', async () => {
      const hash = await service.hashApiKey(testApiKey);
      const isValid = await service.verifyApiKey(testApiKey, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid API key', async () => {
      const hash = await service.hashApiKey(testApiKey);
      const isValid = await service.verifyApiKey(wrongApiKey, hash);
      expect(isValid).toBe(false);
    });

    it('should handle verification errors gracefully', async () => {
      const isValid = await service.verifyApiKey(testApiKey, 'invalid-hash');
      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison (built into Argon2)', async () => {
      const hash = await service.hashApiKey(testApiKey);

      // Argon2's verify function includes timing-safe comparison
      const startTime = process.hrtime.bigint();
      await service.verifyApiKey(wrongApiKey, hash);
      const wrongKeyTime = process.hrtime.bigint() - startTime;

      const startTime2 = process.hrtime.bigint();
      await service.verifyApiKey(testApiKey, hash);
      const correctKeyTime = process.hrtime.bigint() - startTime2;

      // Times should be relatively similar (timing-safe)
      // This is a basic check - Argon2 handles this internally
      expect(Math.abs(Number(wrongKeyTime - correctKeyTime))).toBeLessThan(
        100000000,
      ); // 100ms tolerance
    });
  });

  describe('Hash Information and Rehashing', () => {
    it('should extract information from Argon2 hash', async () => {
      const testApiKey = 'sk_test1234567890abcdefghijklmnopqrs';
      const hash = await service.hashApiKey(testApiKey);

      const info = await service.getHashInfo(hash);

      expect(info).toBeDefined();
      expect(info).not.toBeNull();
      expect(info!.algorithm).toBe('argon2id');
      expect(info!.memoryCost).toBe(65536);
      expect(info!.timeCost).toBe(3);
      expect(info!.parallelism).toBe(4);
    });

    it('should return null for invalid hash format', async () => {
      const info = await service.getHashInfo('not-a-valid-hash');
      expect(info).toBeNull();
    });

    it('should detect when rehashing is needed', async () => {
      const testApiKey = 'sk_test1234567890abcdefghijklmnopqrs';

      // Create a hash with different parameters
      const oldHash = await argon2.hash(testApiKey, {
        type: argon2.argon2id,
        memoryCost: 32768, // Different from our standard 65536
        timeCost: 2,
        parallelism: 2,
      });

      // Should detect that parameters are different
      const needsRehash = await service.needsRehash(oldHash);
      expect(needsRehash).toBe(true);
    });

    it('should not need rehashing for current parameters', async () => {
      const testApiKey = 'sk_test1234567890abcdefghijklmnopqrs';
      const hash = await service.hashApiKey(testApiKey);

      const needsRehash = await service.needsRehash(hash);
      expect(needsRehash).toBe(false);
    });
  });

  describe('Security Best Practices', () => {
    it('should never expose hash values in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const testApiKey = 'sk_test1234567890abcdefghijklmnopqrs';

      const hash = await service.hashApiKey(testApiKey);
      await service.verifyApiKey(testApiKey, hash);

      // Check that the hash was never logged
      consoleSpy.mock.calls.forEach((call) => {
        call.forEach((arg) => {
          if (typeof arg === 'string') {
            expect(arg).not.toContain(hash);
            expect(arg).not.toContain(testApiKey);
          }
        });
      });

      consoleSpy.mockRestore();
    });

    it('should use production-ready Argon2 parameters', async () => {
      const testApiKey = 'sk_test1234567890abcdefghijklmnopqrs';
      const hash = await service.hashApiKey(testApiKey);

      // Verify OWASP recommended parameters
      expect(hash).toContain('m=65536'); // At least 64MB memory
      expect(hash).toContain('t=3'); // At least 3 iterations
      expect(hash).toContain('p=4'); // Reasonable parallelism
    });
  });

  describe('Performance', () => {
    it('should hash within reasonable time limits', async () => {
      const testApiKey = 'sk_test1234567890abcdefghijklmnopqrs';

      const startTime = Date.now();
      await service.hashApiKey(testApiKey);
      const duration = Date.now() - startTime;

      // Should complete within 1 second (typical Argon2 with our parameters)
      expect(duration).toBeLessThan(1000);
    });

    it('should verify within reasonable time limits', async () => {
      const testApiKey = 'sk_test1234567890abcdefghijklmnopqrs';
      const hash = await service.hashApiKey(testApiKey);

      const startTime = Date.now();
      await service.verifyApiKey(testApiKey, hash);
      const duration = Date.now() - startTime;

      // Verification should also complete within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});

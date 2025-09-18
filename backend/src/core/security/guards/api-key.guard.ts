import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { SecurityService } from '../security.service';
import { PrismaService } from '../../database/prisma.service';

export const API_KEY_HEADER = 'x-api-key';
export const REQUIRE_API_KEY = 'require-api-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly securityService: SecurityService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireApiKey = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_API_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireApiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const apiKey = request.headers[API_KEY_HEADER] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key format
    if (!this.isValidApiKeyFormat(apiKey)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // Check if API key exists and is valid
    const isValid = await this.validateApiKey(apiKey);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    return true;
  }

  private isValidApiKeyFormat(apiKey: string): boolean {
    // Expected format: prefix_base64urlString (e.g., sk_xxxxx or pk_xxxxx)
    const pattern = /^(sk|pk|test)_[A-Za-z0-9_-]{32,}$/;
    return pattern.test(apiKey);
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Extract the prefix from the API key (e.g., 'sk_' or 'pk_')
      const prefix = apiKey.substring(0, apiKey.indexOf('_') + 1);

      // Get the last 4 characters for additional verification
      const lastFourChars = apiKey.slice(-4);

      // Find all API keys with matching prefix and last 4 chars
      // This reduces the number of Argon2 verifications needed
      const potentialKeys = await this.prisma.apiKey.findMany({
        where: {
          prefix: prefix,
          lastFourChars: lastFourChars,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          id: true,
          keyHash: true,
          rateLimit: true,
          allowedIps: true,
          usageCount: true,
        },
      });

      // Verify the API key against each potential match
      for (const keyRecord of potentialKeys) {
        const isValid = await this.securityService.verifyApiKey(
          apiKey,
          keyRecord.keyHash,
        );

        if (isValid) {
          // Check if rehashing is needed (in case Argon2 parameters changed)
          const needsRehash = await this.securityService.needsRehash(
            keyRecord.keyHash,
          );

          // Update usage statistics and optionally rehash
          const updateData: any = {
            lastUsedAt: new Date(),
            usageCount: keyRecord.usageCount + 1,
          };

          // If parameters changed, rehash with new parameters
          if (needsRehash) {
            updateData.keyHash = await this.securityService.hashApiKey(apiKey);
            updateData.algorithm = 'argon2id';
          }

          // Get client IP for logging
          const request = this.getRequestFromContext();
          if (request) {
            updateData.lastUsedIp = request.ip || request.socket?.remoteAddress;

            // Check IP whitelist if configured
            if (keyRecord.allowedIps && keyRecord.allowedIps.length > 0) {
              const clientIp = updateData.lastUsedIp;
              if (!this.isIpAllowed(clientIp, keyRecord.allowedIps)) {
                return false; // IP not in whitelist
              }
            }
          }

          // Update the API key record
          await this.prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: updateData,
          });

          return true;
        }
      }

      return false; // No matching API key found
    } catch (error) {
      // Use logger instead of console.error for production
      this.securityService['logger'].error('Failed to validate API key', error);
      return false;
    }
  }

  /**
   * Check if an IP address is in the allowed list
   */
  private isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    if (!clientIp) return false;

    return allowedIps.some((allowedIp) => {
      // Support wildcards (e.g., '192.168.1.*')
      if (allowedIp.includes('*')) {
        const pattern = allowedIp.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(clientIp);
      }
      return allowedIp === clientIp;
    });
  }

  /**
   * Get request from execution context (helper method)
   */
  private getRequestFromContext(): FastifyRequest | null {
    try {
      // This is a simplified version - in actual implementation,
      // you'd need to pass the ExecutionContext properly
      return null;
    } catch {
      return null;
    }
  }
}

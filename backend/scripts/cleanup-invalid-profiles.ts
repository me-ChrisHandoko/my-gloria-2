#!/usr/bin/env ts-node

/**
 * Cleanup Script for Invalid UserProfiles
 *
 * This script audits and removes UserProfiles that don't have
 * corresponding active DataKaryawan records.
 *
 * Usage:
 * - Dry run (audit only): npm run cleanup:profiles -- --dry-run
 * - Execute cleanup: npm run cleanup:profiles
 * - With detailed logging: npm run cleanup:profiles -- --verbose
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();
const logger = new Logger('ProfileCleanupScript');

interface CleanupOptions {
  dryRun: boolean;
  verbose: boolean;
}

interface InvalidProfile {
  id: string;
  clerkUserId: string;
  nip: string;
  createdAt: Date;
  reason: string;
  dataKaryawanStatus?: string | null;
  dataKaryawanEmail?: string | null;
}

class ProfileCleanupService {
  private invalidProfiles: InvalidProfile[] = [];
  private validProfiles: number = 0;
  private totalProfiles: number = 0;

  constructor(private readonly options: CleanupOptions) {}

  async execute(): Promise<void> {
    try {
      logger.log('Starting UserProfile cleanup audit...');

      await this.auditProfiles();
      await this.generateReport();

      if (!this.options.dryRun && this.invalidProfiles.length > 0) {
        await this.cleanupInvalidProfiles();
      }

      logger.log('Cleanup process completed successfully');
    } catch (error) {
      logger.error('Cleanup process failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async auditProfiles(): Promise<void> {
    // Get all UserProfiles
    const profiles = await prisma.userProfile.findMany({
      select: {
        id: true,
        clerkUserId: true,
        nip: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    this.totalProfiles = profiles.length;
    logger.log(`Found ${this.totalProfiles} UserProfiles to audit`);

    // Audit each profile
    for (const profile of profiles) {
      if (this.options.verbose) {
        logger.debug(`Auditing profile: ${profile.id} (NIP: ${profile.nip})`);
      }

      // Check if DataKaryawan exists and is active
      const dataKaryawan = await prisma.dataKaryawan.findUnique({
        where: { nip: profile.nip },
        select: {
          nip: true,
          email: true,
          statusAktif: true,
        },
      });

      if (!dataKaryawan) {
        // No DataKaryawan record found
        this.invalidProfiles.push({
          id: profile.id,
          clerkUserId: profile.clerkUserId,
          nip: profile.nip,
          createdAt: profile.createdAt,
          reason: 'NO_DATA_KARYAWAN',
        });
      } else if (dataKaryawan.statusAktif !== 'Aktif') {
        // DataKaryawan exists but is not active
        this.invalidProfiles.push({
          id: profile.id,
          clerkUserId: profile.clerkUserId,
          nip: profile.nip,
          createdAt: profile.createdAt,
          reason: 'EMPLOYEE_NOT_ACTIVE',
          dataKaryawanStatus: dataKaryawan.statusAktif,
          dataKaryawanEmail: dataKaryawan.email || undefined,
        });
      } else {
        // Valid profile
        this.validProfiles++;
      }
    }
  }

  private async generateReport(): Promise<void> {
    logger.log('\n========== AUDIT REPORT ==========');
    logger.log(`Total UserProfiles: ${this.totalProfiles}`);
    logger.log(`Valid Profiles: ${this.validProfiles}`);
    logger.log(`Invalid Profiles: ${this.invalidProfiles.length}`);

    if (this.invalidProfiles.length > 0) {
      logger.warn('\n--- Invalid Profiles Found ---');

      // Group by reason
      const byReason = this.invalidProfiles.reduce((acc, profile) => {
        acc[profile.reason] = (acc[profile.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(byReason).forEach(([reason, count]) => {
        logger.warn(`  ${reason}: ${count} profiles`);
      });

      if (this.options.verbose) {
        logger.log('\n--- Detailed Invalid Profiles ---');
        this.invalidProfiles.forEach((profile) => {
          logger.warn(`Profile ID: ${profile.id}`);
          logger.warn(`  - Clerk User ID: ${profile.clerkUserId}`);
          logger.warn(`  - NIP: ${profile.nip}`);
          logger.warn(`  - Created: ${profile.createdAt.toISOString()}`);
          logger.warn(`  - Reason: ${profile.reason}`);
          if (profile.dataKaryawanStatus) {
            logger.warn(`  - DataKaryawan Status: ${profile.dataKaryawanStatus}`);
          }
          if (profile.dataKaryawanEmail) {
            logger.warn(`  - DataKaryawan Email: ${profile.dataKaryawanEmail}`);
          }
          logger.warn('');
        });
      }

      // Export to JSON for backup
      await this.exportInvalidProfiles();
    }

    logger.log('========== END OF REPORT ==========\n');
  }

  private async exportInvalidProfiles(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `invalid-profiles-${timestamp}.json`;

    const exportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.totalProfiles,
        valid: this.validProfiles,
        invalid: this.invalidProfiles.length,
      },
      profiles: this.invalidProfiles,
    };

    // In production, you might want to save this to a file or S3
    logger.log(`Export data prepared: ${filename}`);
    if (this.options.verbose) {
      console.log(JSON.stringify(exportData, null, 2));
    }
  }

  private async cleanupInvalidProfiles(): Promise<void> {
    logger.log('\n--- Starting Cleanup Process ---');

    const profileIds = this.invalidProfiles.map(p => p.id);

    // Create audit log entries before deletion
    for (const profile of this.invalidProfiles) {
      try {
        await prisma.auditLog.create({
          data: {
            id: uuidv7(),
            actorId: 'SYSTEM_CLEANUP',
            action: 'DELETE',
            module: 'PROFILE_CLEANUP',
            entityType: 'USER_PROFILE',
            entityId: profile.id,
            entityDisplay: `${profile.nip} - ${profile.reason}`,
            metadata: {
              nip: profile.nip,
              clerkUserId: profile.clerkUserId,
              reason: profile.reason,
              cleanupScript: true,
              timestamp: new Date().toISOString(),
            },
            ipAddress: '0.0.0.0',
            userAgent: 'ProfileCleanupScript',
          },
        });
      } catch (error) {
        logger.warn(`Failed to create audit log for profile ${profile.id}:`, error);
      }
    }

    // Delete related records first (due to foreign key constraints)
    logger.log('Deleting related records...');

    // Delete UserRoles
    const deletedRoles = await prisma.userRole.deleteMany({
      where: { userProfileId: { in: profileIds } },
    });
    logger.log(`  Deleted ${deletedRoles.count} UserRole records`);

    // Delete UserPermissions
    const deletedPermissions = await prisma.userPermission.deleteMany({
      where: { userProfileId: { in: profileIds } },
    });
    logger.log(`  Deleted ${deletedPermissions.count} UserPermission records`);

    // Delete UserPositions
    const deletedPositions = await prisma.userPosition.deleteMany({
      where: { userProfileId: { in: profileIds } },
    });
    logger.log(`  Deleted ${deletedPositions.count} UserPosition records`);

    // Delete UserModuleAccess
    const deletedModuleAccess = await prisma.userModuleAccess.deleteMany({
      where: { userProfileId: { in: profileIds } },
    });
    logger.log(`  Deleted ${deletedModuleAccess.count} UserModuleAccess records`);

    // Finally, delete the UserProfiles
    const deletedProfiles = await prisma.userProfile.deleteMany({
      where: { id: { in: profileIds } },
    });

    logger.log(`\n✅ Successfully deleted ${deletedProfiles.count} invalid UserProfiles`);
    logger.log('--- Cleanup Process Completed ---\n');
  }
}

// Parse command line arguments
function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
  };
}

// Main execution
async function main() {
  const options = parseArgs();

  logger.log('Profile Cleanup Script');
  logger.log(`Mode: ${options.dryRun ? 'DRY RUN (Audit Only)' : 'EXECUTE CLEANUP'}`);
  logger.log(`Verbose: ${options.verbose ? 'Yes' : 'No'}`);
  logger.log('');

  if (!options.dryRun) {
    logger.warn('⚠️  WARNING: This will DELETE invalid UserProfiles!');
    logger.warn('⚠️  Run with --dry-run flag first to audit before deletion.');
    logger.log('');

    // In production, you might want to add a confirmation prompt here
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay
  }

  const service = new ProfileCleanupService(options);
  await service.execute();
}

// Run the script
main().catch((error) => {
  logger.error('Script failed:', error);
  process.exit(1);
});
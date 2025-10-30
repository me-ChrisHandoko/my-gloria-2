/**
 * Phase 2 Migration 2: Merge ResourcePermission into UserPermission
 *
 * Migrates resource-specific permissions into user_permissions table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mergeResourcePermissions() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Phase 2 Migration 2: Merge ResourcePermission         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // Check if old resource_permissions table still exists
    const resourcePermsExist = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'gloria_ops'
        AND table_name = 'resource_permissions'
      ) as exists;
    `;

    if (!resourcePermsExist[0]?.exists) {
      console.log('ℹ️  Table resource_permissions does not exist. Migration already completed or not needed.\n');
      return;
    }

    // Get count of resource permissions to migrate
    const resourcePerms = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM gloria_ops.resource_permissions;
    `;

    const count = Number(resourcePerms[0]?.count || 0);
    console.log(`📊 Found ${count} resource permissions to migrate\n`);

    if (count === 0) {
      console.log('ℹ️  No resource permissions to migrate.\n');
      return;
    }

    // Check for conflicts - existing user_permissions with same user+permission+resource
    const conflicts = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM gloria_ops.resource_permissions rp
      INNER JOIN gloria_ops.user_permissions up
        ON rp.user_profile_id = up.user_profile_id
        AND rp.permission_id = up.permission_id
      WHERE up.resource_type IS NOT NULL
        OR up.resource_id IS NOT NULL;
    `;

    const conflictCount = Number(conflicts[0]?.count || 0);
    if (conflictCount > 0) {
      console.log(`⚠️  WARNING: Found ${conflictCount} potential conflicts`);
      console.log('   These will be skipped during migration.\n');
    }

    // Migrate resource permissions to user_permissions
    // Insert new records where no conflict exists
    const result = await prisma.$executeRaw`
      INSERT INTO gloria_ops.user_permissions (
        id,
        user_profile_id,
        permission_id,
        resource_type,
        resource_id,
        is_granted,
        conditions,
        valid_from,
        valid_until,
        granted_by,
        grant_reason,
        priority,
        is_temporary,
        created_at,
        updated_at
      )
      SELECT
        rp.id,
        rp.user_profile_id,
        rp.permission_id,
        rp.resource_type,
        rp.resource_id,
        rp.is_granted,
        NULL as conditions,
        rp.valid_from,
        rp.valid_until,
        rp.granted_by,
        rp.grant_reason,
        100 as priority,
        false as is_temporary,
        rp.created_at,
        rp.updated_at
      FROM gloria_ops.resource_permissions rp
      WHERE NOT EXISTS (
        SELECT 1
        FROM gloria_ops.user_permissions up
        WHERE up.user_profile_id = rp.user_profile_id
          AND up.permission_id = rp.permission_id
          AND (up.resource_type IS NOT NULL OR up.resource_id IS NOT NULL)
      )
      ON CONFLICT (user_profile_id, permission_id, resource_type, resource_id) DO NOTHING;
    `;

    console.log(`✅ Migrated ${result} resource permissions to user_permissions\n`);

    // Summary
    if (conflictCount > 0) {
      console.log(`⚠️  ${conflictCount} permissions skipped due to conflicts\n`);
    }

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  SUCCESS                                                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log('✅ Resource permissions successfully merged into user_permissions!');
    console.log('\n⚠️  NEXT STEPS:');
    console.log('   1. Verify user_permissions have correct resource data');
    console.log('   2. Test permission checks with resource-specific permissions');
    console.log('   3. After verification, drop old resource_permissions table\n');

  } catch (error) {
    console.error('\n❌ Error merging resource permissions:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

mergeResourcePermissions();

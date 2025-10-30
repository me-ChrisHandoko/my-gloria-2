/**
 * Phase 2 Migration 1: Merge PermissionGroup into Permission
 *
 * Denormalizes PermissionGroup data into Permission table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mergePermissionGroups() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Phase 2 Migration 1: Merge PermissionGroup            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // Check if old permission_groups table still exists
    const groupsExist = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'gloria_ops'
        AND table_name = 'permission_groups'
      ) as exists;
    `;

    if (!groupsExist[0]?.exists) {
      console.log('ℹ️  Table permission_groups does not exist. Migration already completed or not needed.\n');
      return;
    }

    // Get all permission groups
    const groups = await prisma.$queryRaw<
      Array<{
        id: string;
        code: string;
        name: string;
        category: string | null;
        icon: string | null;
        sort_order: number;
      }>
    >`
      SELECT id, code, name, category, icon, sort_order
      FROM gloria_ops.permission_groups
      WHERE is_active = true;
    `;

    console.log(`📊 Found ${groups.length} active permission groups to migrate\n`);

    // For each group, update permissions with group data
    let updatedCount = 0;
    for (const group of groups) {
      const result = await prisma.$executeRaw`
        UPDATE gloria_ops.permissions
        SET
          category = ${group.category}::gloria_ops."ModuleCategory",
          group_name = ${group.name},
          group_icon = ${group.icon},
          group_sort_order = ${group.sort_order}
        WHERE group_id = ${group.id};
      `;

      if (result > 0) {
        console.log(`   ✅ Updated ${result} permissions for group: ${group.name}`);
        updatedCount += result;
      }
    }

    console.log(`\n✅ Total permissions updated: ${updatedCount}\n`);

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  SUCCESS                                                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log('✅ Permission group data successfully merged into permissions!');
    console.log('\n⚠️  NEXT STEPS:');
    console.log('   1. Verify permissions have correct group data');
    console.log('   2. Run migration 04-merge-resource-permissions.ts');
    console.log('   3. After verification, drop old permission_groups table\n');

  } catch (error) {
    console.error('\n❌ Error merging permission groups:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

mergePermissionGroups();

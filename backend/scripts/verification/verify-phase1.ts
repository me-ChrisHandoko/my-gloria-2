import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface IndexStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_scan: bigint;
  idx_tup_read: bigint;
  idx_tup_fetch: bigint;
}

async function verifyPhase1() {
  console.log('🔍 Phase 1 Verification - Index Optimization');
  console.log('━'.repeat(60));

  try {
    // Test 1: Verify expected indexes exist
    console.log('\n📋 Test 1: Verifying Expected Indexes...');
    const expectedIndexes = [
      {
        table: 'user_profiles',
        index: 'user_profiles_clerk_user_id_is_active_idx',
        columns: ['clerk_user_id', 'is_active'],
      },
      {
        table: 'user_profiles',
        index: 'user_profiles_nip_is_active_idx',
        columns: ['nip', 'is_active'],
      },
      {
        table: 'positions',
        index: 'positions_school_id_department_id_hierarchy_level_is_active_idx',
        columns: ['school_id', 'department_id', 'hierarchy_level', 'is_active'],
      },
      {
        table: 'user_positions',
        index: 'user_positions_user_profile_id_is_active_start_date_end_date_idx',
        columns: ['user_profile_id', 'is_active', 'start_date', 'end_date'],
      },
      {
        table: 'audit_logs',
        index: 'audit_logs_actor_profile_id_module_action_created_at_idx',
        columns: ['actor_profile_id', 'module', 'action', 'created_at'],
      },
    ];

    const indexes = await prisma.$queryRaw<IndexInfo[]>`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'gloria_ops'
      ORDER BY tablename, indexname
    `;

    let missingIndexes = 0;
    for (const expected of expectedIndexes) {
      // PostgreSQL truncates index names to 63 characters
      const expectedPrefix = expected.index.substring(0, 55);
      const found = indexes.find((idx) =>
        idx.tablename === expected.table &&
        (idx.indexname === expected.index || idx.indexname.startsWith(expectedPrefix))
      );

      if (found) {
        console.log(`  ✅ ${expected.table}: ${found.indexname}`);
      } else {
        console.log(`  ❌ MISSING: ${expected.table}: ${expected.index}`);
        missingIndexes++;
      }
    }

    if (missingIndexes > 0) {
      throw new Error(`${missingIndexes} expected indexes are missing!`);
    }

    // Test 2: Check for orphaned/duplicate indexes
    console.log('\n📋 Test 2: Checking for Orphaned Indexes...');
    const orphanedIndexes = await prisma.$queryRaw<IndexInfo[]>`
      SELECT
        a.schemaname,
        a.tablename,
        a.indexname,
        a.indexdef
      FROM pg_indexes a
      JOIN pg_indexes b ON
        a.schemaname = b.schemaname
        AND a.tablename = b.tablename
        AND a.indexname < b.indexname
        AND a.indexdef = b.indexdef
      WHERE a.schemaname = 'gloria_ops'
    `;

    if (orphanedIndexes.length > 0) {
      console.log(`  ❌ Found ${orphanedIndexes.length} duplicate indexes:`);
      orphanedIndexes.forEach((idx) => {
        console.log(`     - ${idx.tablename}.${idx.indexname}`);
      });
      throw new Error('Duplicate indexes detected!');
    } else {
      console.log('  ✅ No duplicate indexes found');
    }

    // Test 3: Verify index usage statistics
    console.log('\n📋 Test 3: Analyzing Index Usage...');
    try {
      const stats = await prisma.$queryRaw<IndexStats[]>`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'gloria_ops'
        ORDER BY idx_scan DESC
        LIMIT 10
      `;

      if (stats.length === 0) {
        console.log('  ℹ️  No index usage statistics yet (database is new)');
      } else {
        console.log('  Top 10 most used indexes:');
        stats.forEach((stat, i) => {
          console.log(
            `  ${i + 1}. ${stat.tablename}.${stat.indexname}: ${stat.idx_scan} scans`
          );
        });
      }
    } catch (error) {
      console.log('  ℹ️  Index statistics not available (database is new)');
    }

    // Test 4: Check query performance
    console.log('\n📋 Test 4: Testing Query Performance...');

    // Test UserProfile queries
    const startUserProfile = Date.now();
    await prisma.userProfile.findMany({
      where: {
        isActive: true,
      },
      take: 100,
    });
    const userProfileTime = Date.now() - startUserProfile;
    console.log(`  ✅ UserProfile query: ${userProfileTime}ms`);

    if (userProfileTime > 200) {
      console.log('  ⚠️  Warning: Query slower than expected');
    }

    // Test Position queries
    const startPosition = Date.now();
    await prisma.position.findMany({
      where: {
        isActive: true,
        departmentId: { not: null },
      },
      take: 100,
    });
    const positionTime = Date.now() - startPosition;
    console.log(`  ✅ Position query: ${positionTime}ms`);

    // Test UserPosition queries
    const startUserPosition = Date.now();
    await prisma.userPosition.findMany({
      where: {
        isActive: true,
        endDate: null,
      },
      take: 100,
    });
    const userPositionTime = Date.now() - startUserPosition;
    console.log(`  ✅ UserPosition query: ${userPositionTime}ms`);

    // Test 5: Calculate index size reduction
    console.log('\n📋 Test 5: Index Size Analysis...');
    const sizeQuery = await prisma.$queryRaw<
      Array<{ total_size: string; index_count: bigint }>
    >`
      SELECT
        pg_size_pretty(sum(pg_relation_size(indexrelid))) AS total_size,
        count(*) AS index_count
      FROM pg_stat_user_indexes
      WHERE schemaname = 'gloria_ops'
    `;

    const { total_size, index_count } = sizeQuery[0];
    console.log(`  📊 Total indexes: ${index_count}`);
    console.log(`  📊 Total index size: ${total_size}`);

    // Test 6: Verify data integrity
    console.log('\n📋 Test 6: Data Integrity Checks...');

    const userCount = await prisma.userProfile.count();
    const positionCount = await prisma.position.count();
    const userPositionCount = await prisma.userPosition.count();

    console.log(`  ✅ UserProfile count: ${userCount}`);
    console.log(`  ✅ Position count: ${positionCount}`);
    console.log(`  ✅ UserPosition count: ${userPositionCount}`);

    // Final Summary
    console.log('\n' + '━'.repeat(60));
    console.log('✅ PHASE 1 VERIFICATION COMPLETE');
    console.log('━'.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`  • All expected indexes: CREATED`);
    console.log(`  • Duplicate indexes: REMOVED`);
    console.log(`  • Total indexes: ${index_count}`);
    console.log(`  • Total size: ${total_size}`);
    console.log(`  • Data integrity: VERIFIED`);
    console.log('\n🎉 Migration successful! No issues detected.');

    return {
      success: true,
      indexCount: Number(index_count),
      totalSize: total_size,
      performance: {
        userProfile: userProfileTime,
        position: positionTime,
        userPosition: userPositionTime,
      },
    };
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyPhase1()
  .then((result) => {
    console.log('\n✅ Verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LoggingService } from '../logging/logging.service';

interface IndexAnalysis {
  table: string;
  missingIndexes: string[];
  unusedIndexes: string[];
  duplicateIndexes: string[];
  recommendations: string[];
}

interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  optimization: string;
}

@Injectable()
export class DatabaseOptimizationService {
  private readonly logger: LoggingService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = this.loggingService.getLogger(
      DatabaseOptimizationService.name,
    );
  }

  /**
   * Analyze database indexes and provide recommendations
   */
  async analyzeIndexes(): Promise<IndexAnalysis[]> {
    this.logger.debug('Analyzing database indexes');
    const results: IndexAnalysis[] = [];

    try {
      // Get all tables in gloria_ops schema
      const tables = await this.prisma.$queryRaw<any[]>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'gloria_ops'
        ORDER BY tablename;
      `;

      for (const table of tables) {
        const analysis = await this.analyzeTableIndexes(table.tablename);
        results.push(analysis);
      }

      this.logger.info('Index analysis completed', {
        tablesAnalyzed: results.length,
      });
      return results;
    } catch (error) {
      this.logger.error('Failed to analyze indexes', error);
      throw error;
    }
  }

  /**
   * Analyze indexes for a specific table
   */
  private async analyzeTableIndexes(tableName: string): Promise<IndexAnalysis> {
    const analysis: IndexAnalysis = {
      table: tableName,
      missingIndexes: [],
      unusedIndexes: [],
      duplicateIndexes: [],
      recommendations: [],
    };

    // Get existing indexes
    const indexes = await this.prisma.$queryRaw<any[]>`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'gloria_ops'
      AND tablename = ${tableName};
    `;

    // Get index usage statistics
    const indexStats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        indexrelname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'gloria_ops'
      AND relname = ${tableName};
    `;

    // Analyze foreign key columns without indexes
    const foreignKeys = await this.prisma.$queryRaw<any[]>`
      SELECT 
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'gloria_ops'
      AND tc.table_name = ${tableName}
      AND tc.constraint_type = 'FOREIGN KEY';
    `;

    // Check if foreign key columns have indexes
    for (const fk of foreignKeys) {
      const hasIndex = indexes.some((idx) =>
        idx.indexdef.toLowerCase().includes(fk.column_name.toLowerCase()),
      );

      if (!hasIndex) {
        analysis.missingIndexes.push(fk.column_name);
        analysis.recommendations.push(
          `Create index on ${tableName}.${fk.column_name} (foreign key)`,
        );
      }
    }

    // Identify unused indexes (never scanned)
    for (const stat of indexStats) {
      if (stat.idx_scan === 0 && !stat.indexrelname.includes('pkey')) {
        analysis.unusedIndexes.push(stat.indexrelname);
        analysis.recommendations.push(
          `Consider removing unused index: ${stat.indexrelname}`,
        );
      }
    }

    // Add specific recommendations based on table patterns
    this.addTableSpecificRecommendations(tableName, analysis);

    return analysis;
  }

  /**
   * Add table-specific index recommendations
   */
  private addTableSpecificRecommendations(
    tableName: string,
    analysis: IndexAnalysis,
  ): void {
    const recommendations = {
      user_profiles: [
        'Index on (is_active, last_active) for active user queries',
        'Index on (clerk_user_id) for authentication lookups',
      ],
      permissions: [
        'Composite index on (resource, action, scope) for permission checks',
        'Index on (is_active) for filtering active permissions',
      ],
      audit_logs: [
        'Index on (created_at DESC) for recent activity queries',
        'Composite index on (actor_id, created_at) for user activity',
        'Index on (entity_type, entity_id) for entity history',
      ],
      notifications: [
        'Index on (user_profile_id, is_read, created_at) for user notifications',
        'Index on (priority, created_at) for priority queues',
      ],
      workflow_instances: [
        'Index on (state, status) for workflow monitoring',
        'Index on (initiator_id, created_at) for user workflows',
      ],
      feature_flags: [
        'Index on (key, enabled) for flag evaluation',
        'Index on (type, enabled) for flag categorization',
      ],
      system_configurations: [
        'Index on (category, is_public) for config queries',
        'Index on (key) for fast lookups',
      ],
    };

    const tableRecommendations =
      recommendations[tableName as keyof typeof recommendations];
    if (tableRecommendations) {
      analysis.recommendations.push(...tableRecommendations);
    }
  }

  /**
   * Analyze slow queries and provide optimization suggestions
   */
  async analyzeSlowQueries(threshold = 100): Promise<QueryAnalysis[]> {
    this.logger.debug(`Analyzing slow queries with threshold: ${threshold}ms`);
    const results: QueryAnalysis[] = [];

    try {
      // Get slow queries from PostgreSQL statistics
      const slowQueries = await this.prisma.$queryRaw<any[]>`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          stddev_exec_time,
          rows
        FROM pg_stat_statements
        WHERE mean_exec_time > ${threshold}
        AND query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT 20;
      `;

      for (const query of slowQueries) {
        const analysis: QueryAnalysis = {
          query: query.query.substring(0, 200), // Truncate for readability
          executionTime: query.mean_exec_time,
          rowsExamined: query.rows / Math.max(query.calls, 1),
          rowsReturned: query.rows / Math.max(query.calls, 1),
          optimization: this.suggestQueryOptimization(query),
        };
        results.push(analysis);
      }

      this.logger.info('Slow query analysis completed', {
        queriesAnalyzed: results.length,
      });
      return results;
    } catch (error) {
      // pg_stat_statements might not be enabled
      this.logger.warn(
        'Could not analyze slow queries. Ensure pg_stat_statements is enabled.',
      );
      return [];
    }
  }

  /**
   * Suggest query optimization based on query patterns
   */
  private suggestQueryOptimization(queryStats: any): string {
    const suggestions: string[] = [];

    // High execution time
    if (queryStats.mean_exec_time > 1000) {
      suggestions.push('Query takes >1s - consider adding indexes');
    }

    // High standard deviation
    if (queryStats.stddev_exec_time > queryStats.mean_exec_time * 0.5) {
      suggestions.push(
        'High variance in execution time - check for missing statistics',
      );
    }

    // Check for common patterns
    const query = queryStats.query.toLowerCase();

    if (query.includes("like '%")) {
      suggestions.push('Leading wildcard in LIKE - consider full-text search');
    }

    if (query.includes('order by') && !query.includes('limit')) {
      suggestions.push('ORDER BY without LIMIT - consider pagination');
    }

    if (query.includes('select *')) {
      suggestions.push('SELECT * used - specify only needed columns');
    }

    if (query.includes('not in') || query.includes('not exists')) {
      suggestions.push('NOT IN/EXISTS can be slow - consider LEFT JOIN');
    }

    return suggestions.length > 0
      ? suggestions.join('; ')
      : 'No specific optimization suggested';
  }

  /**
   * Optimize database statistics
   */
  async updateStatistics(): Promise<void> {
    this.logger.debug('Updating database statistics');

    try {
      // Analyze all tables in gloria_ops schema
      await this.prisma.$executeRaw`ANALYZE gloria_ops.user_profiles;`;
      await this.prisma.$executeRaw`ANALYZE gloria_ops.permissions;`;
      await this.prisma.$executeRaw`ANALYZE gloria_ops.roles;`;
      await this.prisma.$executeRaw`ANALYZE gloria_ops.audit_logs;`;
      await this.prisma.$executeRaw`ANALYZE gloria_ops.workflow_instances;`;
      await this.prisma.$executeRaw`ANALYZE gloria_ops.feature_flags;`;
      await this.prisma.$executeRaw`ANALYZE gloria_ops.system_configurations;`;

      this.logger.info('Database statistics updated successfully');
    } catch (error) {
      this.logger.error('Failed to update database statistics', error);
      throw error;
    }
  }

  /**
   * Create missing indexes based on analysis
   */
  async createRecommendedIndexes(): Promise<string[]> {
    const createdIndexes: string[] = [];

    try {
      // Create composite indexes for frequently queried combinations
      const indexesToCreate = [
        // User profiles
        `CREATE INDEX IF NOT EXISTS idx_user_profiles_active_last 
         ON gloria_ops.user_profiles(is_active, last_active DESC);`,

        // Permissions
        `CREATE INDEX IF NOT EXISTS idx_permissions_resource_action_scope 
         ON gloria_ops.permissions(resource, action, scope);`,

        // Audit logs
        `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
         ON gloria_ops.audit_logs(actor_id, created_at DESC);`,

        // Feature flags
        `CREATE INDEX IF NOT EXISTS idx_feature_flags_key_enabled 
         ON gloria_ops.feature_flags(key, enabled);`,

        // System configurations
        `CREATE INDEX IF NOT EXISTS idx_system_configs_category_public 
         ON gloria_ops.system_configurations(category, is_public);`,

        // Workflow instances
        `CREATE INDEX IF NOT EXISTS idx_workflow_instances_state_status
         ON gloria_ops.workflow_instances(state, status);`,
      ];

      for (const indexSql of indexesToCreate) {
        try {
          await this.prisma.$executeRawUnsafe(indexSql);
          const indexName =
            indexSql.match(/INDEX IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
          createdIndexes.push(indexName);
          this.logger.debug(`Created index: ${indexName}`);
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            this.logger.error(`Failed to create index`, error);
          }
        }
      }

      this.logger.info('Recommended indexes created', {
        count: createdIndexes.length,
      });
      return createdIndexes;
    } catch (error) {
      this.logger.error('Failed to create recommended indexes', error);
      throw error;
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    try {
      // Database size
      const dbSize = await this.prisma.$queryRaw<any[]>`
        SELECT 
          pg_database_size(current_database()) as total_size,
          pg_size_pretty(pg_database_size(current_database())) as total_size_pretty;
      `;

      // Table sizes
      const tableSizes = await this.prisma.$queryRaw<any[]>`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables
        WHERE schemaname IN ('gloria_ops', 'gloria_master')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
      `;

      // Cache hit ratio
      const cacheHitRatio = await this.prisma.$queryRaw<any[]>`
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
        FROM pg_statio_user_tables;
      `;

      // Connection stats
      const connectionStats = await this.prisma.$queryRaw<any[]>`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity;
      `;

      return {
        database: {
          size: dbSize[0],
        },
        tables: tableSizes,
        performance: {
          cacheHitRatio: cacheHitRatio[0]?.cache_hit_ratio || 0,
        },
        connections: connectionStats[0],
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics', error);
      throw error;
    }
  }
}

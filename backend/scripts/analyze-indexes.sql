-- Schema Index Analysis Script
-- Identifies duplicate, unused, and redundant indexes

-- 1. List all indexes with usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  CASE
    WHEN idx_scan = 0 THEN '⚠️ UNUSED'
    WHEN idx_scan < 100 THEN '⚠️ LOW USAGE'
    ELSE '✅ ACTIVE'
  END AS status
FROM pg_stat_user_indexes
WHERE schemaname IN ('gloria_master', 'gloria_ops')
ORDER BY schemaname, tablename, idx_scan ASC;

-- 2. Identify duplicate indexes (same columns, different names)
SELECT
  a.schemaname,
  a.tablename,
  a.indexname AS index1,
  b.indexname AS index2,
  a.indexdef AS definition1,
  b.indexdef AS definition2
FROM pg_indexes a
JOIN pg_indexes b ON
  a.schemaname = b.schemaname
  AND a.tablename = b.tablename
  AND a.indexname < b.indexname
  AND a.indexdef = b.indexdef
WHERE a.schemaname IN ('gloria_master', 'gloria_ops');

-- 3. Find indexes that are prefixes of other indexes (redundant)
WITH index_columns AS (
  SELECT
    schemaname,
    tablename,
    indexname,
    array_agg(attname ORDER BY attnum) AS columns
  FROM pg_indexes
  JOIN pg_class ON indexrelid = pg_class.oid
  JOIN pg_index ON indexrelid = pg_index.indexrelid
  JOIN pg_attribute ON attrelid = pg_index.indrelid AND attnum = ANY(indkey)
  WHERE schemaname IN ('gloria_master', 'gloria_ops')
  GROUP BY schemaname, tablename, indexname
)
SELECT
  a.schemaname,
  a.tablename,
  a.indexname AS redundant_index,
  a.columns AS redundant_columns,
  b.indexname AS covered_by_index,
  b.columns AS covering_columns
FROM index_columns a
JOIN index_columns b ON
  a.schemaname = b.schemaname
  AND a.tablename = b.tablename
  AND a.indexname != b.indexname
  AND a.columns <@ b.columns
WHERE array_length(a.columns, 1) < array_length(b.columns, 1);

-- 4. Index size summary by table
SELECT
  schemaname,
  tablename,
  count(*) AS index_count,
  pg_size_pretty(sum(pg_relation_size(indexrelid))) AS total_index_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) AS table_size
FROM pg_stat_user_indexes
WHERE schemaname IN ('gloria_master', 'gloria_ops')
GROUP BY schemaname, tablename
ORDER BY sum(pg_relation_size(indexrelid)) DESC;

-- 5. Recommend indexes to drop (unused for >30 days)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS wasted_space,
  'DROP INDEX IF EXISTS ' || schemaname || '.' || indexname || ';' AS drop_command
FROM pg_stat_user_indexes
WHERE
  schemaname IN ('gloria_master', 'gloria_ops')
  AND idx_scan = 0
  AND pg_relation_size(indexrelid) > 1024 * 1024 -- > 1MB
ORDER BY pg_relation_size(indexrelid) DESC;

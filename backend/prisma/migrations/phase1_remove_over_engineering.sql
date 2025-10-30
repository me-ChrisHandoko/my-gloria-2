-- Phase 1: Remove Over-Engineering
-- This migration removes 5 tables and 1 enum that are over-engineered

-- Drop tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS "gloria_ops"."data_migration_logs" CASCADE;
DROP TABLE IF EXISTS "gloria_ops"."data_migrations" CASCADE;
DROP TABLE IF EXISTS "gloria_ops"."backup_history" CASCADE;
DROP TABLE IF EXISTS "gloria_ops"."restore_history" CASCADE;
DROP TABLE IF EXISTS "gloria_ops"."system_configs" CASCADE;

-- Drop duplicate enum
DROP TYPE IF EXISTS "gloria_ops"."permission_action" CASCADE;

-- Phase 3A: Remove Unused user_overrides Model
-- This migration removes the unused user_overrides table
--
-- Safety: LOW RISK
-- - 0 rows of data in the table
-- - 0 code references found
-- - Model is completely unused

-- Drop the user_overrides table
DROP TABLE IF EXISTS "gloria_ops"."user_overrides" CASCADE;

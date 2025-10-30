-- Phase 2: Simplify NotificationPreference and Delegation Models
-- This migration removes redundant fields to reduce complexity

-- 1. Simplify notification_preferences: Remove redundant disabledTypes field
-- Keep only enabledTypes (whitelist approach is safer)
ALTER TABLE "gloria_ops"."notification_preferences"
DROP COLUMN IF EXISTS "disabledTypes" CASCADE;

-- 2. Simplify delegations: Remove redundant revocation tracking fields
-- Use is_active instead, track revocation details in audit_logs
ALTER TABLE "gloria_ops"."delegations"
DROP COLUMN IF EXISTS "is_revoked" CASCADE,
DROP COLUMN IF EXISTS "revoked_by" CASCADE,
DROP COLUMN IF EXISTS "revoked_at" CASCADE,
DROP COLUMN IF EXISTS "revoked_reason" CASCADE;

-- 3. Drop the redundant index that used is_revoked
DROP INDEX IF EXISTS "gloria_ops"."delegations_is_active_is_revoked_idx";

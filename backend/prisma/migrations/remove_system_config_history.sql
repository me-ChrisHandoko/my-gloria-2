-- Remove system_config_history model
-- Reason: Redundant with audit_logs table which already tracks all changes
-- audit_logs provides more comprehensive tracking with:
--   - old_values, new_values, changed_fields (same as system_config_history)
--   - actor_id, ip_address, user_agent (better audit trail)
--   - category, action (standardized across all entities)
--   - metadata (flexible additional context)

DROP TABLE IF EXISTS "gloria_ops"."system_config_history" CASCADE;

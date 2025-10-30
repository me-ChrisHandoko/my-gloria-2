-- Remove system_backups model
-- This model is infrastructure concern, should be handled by external backup tools

DROP TABLE IF EXISTS "gloria_ops"."system_backups" CASCADE;

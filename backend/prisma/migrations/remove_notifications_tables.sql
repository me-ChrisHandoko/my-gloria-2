-- Remove notifications and notification_preferences models
-- Reason: User requested removal of notification system tables

-- Drop notifications table
DROP TABLE IF EXISTS "gloria_ops"."notifications" CASCADE;

-- Drop notification_preferences table
DROP TABLE IF EXISTS "gloria_ops"."notification_preferences" CASCADE;

-- Rename table workflow_history to workflow
-- This makes the database table name match the Prisma model name

ALTER TABLE "gloria_ops"."workflow_history"
RENAME TO "workflow";

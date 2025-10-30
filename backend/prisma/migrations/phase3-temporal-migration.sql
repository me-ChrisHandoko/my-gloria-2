-- Phase 3: Temporal Migration
-- This migration removes old workflow tables and creates simplified WorkflowHistory
-- Run this AFTER migrating active workflows to Temporal

-- ==============================================
-- Step 1: Backup existing data (optional but recommended)
-- ==============================================

-- Optional: Create backup tables
-- CREATE TABLE gloria_ops.workflow_instances_backup AS SELECT * FROM gloria_ops.workflow_instances;
-- CREATE TABLE gloria_ops.workflow_step_instances_backup AS SELECT * FROM gloria_ops.workflow_step_instances;
-- etc.

-- ==============================================
-- Step 2: Remove foreign key constraints
-- ==============================================

-- Drop UserProfile workflow-related foreign keys
ALTER TABLE gloria_ops.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_delegated_workflows_fkey;
ALTER TABLE gloria_ops.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_received_delegations_fkey;
ALTER TABLE gloria_ops.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_escalated_workflows_fkey;
ALTER TABLE gloria_ops.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_received_escalations_fkey;

-- Drop School foreign keys
ALTER TABLE gloria_ops.schools DROP CONSTRAINT IF EXISTS schools_workflows_fkey;

-- Drop Department foreign keys
ALTER TABLE gloria_ops.departments DROP CONSTRAINT IF EXISTS departments_workflows_fkey;

-- ==============================================
-- Step 3: Drop old workflow tables
-- ==============================================

-- Drop tables in dependency order (child tables first)
DROP TABLE IF EXISTS gloria_ops.workflow_actions CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflow_transitions CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflow_escalations CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflow_delegations CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflow_step_instances CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflow_instances CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflow_templates CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflow_history CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflows CASCADE;

-- ==============================================
-- Step 4: Create simplified WorkflowHistory table
-- ==============================================

CREATE TABLE gloria_ops.workflow_history (
  id VARCHAR(255) PRIMARY KEY,
  workflow_type VARCHAR(100) NOT NULL,
  request_id VARCHAR(255) NOT NULL,
  temporal_workflow_id VARCHAR(255),
  temporal_run_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  initiator_id VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT idx_workflow_history_request_id UNIQUE(request_id)
);

-- Create indexes for performance
CREATE INDEX idx_workflow_history_type ON gloria_ops.workflow_history(workflow_type);
CREATE INDEX idx_workflow_history_status ON gloria_ops.workflow_history(status);
CREATE INDEX idx_workflow_history_temporal_id ON gloria_ops.workflow_history(temporal_workflow_id);
CREATE INDEX idx_workflow_history_initiator ON gloria_ops.workflow_history(initiator_id);
CREATE INDEX idx_workflow_history_started_at ON gloria_ops.workflow_history(started_at DESC);

-- ==============================================
-- Step 5: Drop workflow-related enums
-- ==============================================

DROP TYPE IF EXISTS gloria_ops."WorkflowType" CASCADE;
DROP TYPE IF EXISTS gloria_ops."WorkflowStatus" CASCADE;
DROP TYPE IF EXISTS gloria_ops."WorkflowTriggerType" CASCADE;
DROP TYPE IF EXISTS gloria_ops."WorkflowState" CASCADE;
DROP TYPE IF EXISTS gloria_ops."StepType" CASCADE;
DROP TYPE IF EXISTS gloria_ops."StepStatus" CASCADE;
DROP TYPE IF EXISTS gloria_ops."ActionType" CASCADE;
DROP TYPE IF EXISTS gloria_ops."TransitionType" CASCADE;

-- ==============================================
-- Step 6: Clean up UserProfile columns
-- ==============================================

-- Remove workflow-related columns from user_profiles if they were added for workflow references
-- (Check your schema first - these may not exist)
-- ALTER TABLE gloria_ops.user_profiles DROP COLUMN IF EXISTS delegated_workflows;
-- ALTER TABLE gloria_ops.user_profiles DROP COLUMN IF EXISTS received_delegations;
-- ALTER TABLE gloria_ops.user_profiles DROP COLUMN IF EXISTS escalated_workflows;
-- ALTER TABLE gloria_ops.user_profiles DROP COLUMN IF EXISTS received_escalations;

-- ==============================================
-- Migration Complete
-- ==============================================

-- Verification queries:
-- SELECT COUNT(*) FROM gloria_ops.workflow_history; -- Should be 0 initially
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'gloria_ops' AND table_name LIKE '%workflow%';

-- Drop the bagian_kerja column and index from departments table
DROP INDEX IF EXISTS "gloria_master"."departments_bagian_kerja_idx";
ALTER TABLE "gloria_master"."departments" DROP COLUMN IF EXISTS "bagian_kerja";

-- =====================================================
-- FOUNDATION DEPARTMENTS INSERT QUERIES
-- =====================================================
-- Purpose: Create foundation-level departments with YAYASAN as root
-- Schema: gloria_ops
-- Date: 2025-10-12
-- Instructions: Execute these queries in pgAdmin
-- =====================================================

-- =====================================================
-- STEP 1: CHECK EXISTING DEPARTMENTS
-- =====================================================
-- Run this first to see if YAYASAN already exists

SELECT
    id,
    code,
    name,
    "schoolId",
    "parentId",
    "isActive",
    "createdAt"
FROM gloria_ops.departments
WHERE "schoolId" IS NULL
ORDER BY "createdAt" DESC;

-- Check if YAYASAN code already exists
SELECT * FROM gloria_ops.departments WHERE code = 'YAYASAN';


-- =====================================================
-- OPTION 1: INSERT ONLY YAYASAN (ROOT DEPARTMENT)
-- =====================================================
-- This creates a single root foundation-level department

INSERT INTO gloria_ops.departments (
    id,
    code,
    name,
    "schoolId",
    "parentId",
    description,
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),                              -- Auto-generate UUID
    'YAYASAN',                                      -- Department code
    'YAYASAN',                                      -- Department name
    NULL,                                           -- Foundation level (no school)
    NULL,                                           -- Root department (no parent)
    'Yayasan - Root foundation department',        -- Description
    true,                                           -- Active
    NOW(),                                          -- Created at
    NOW()                                           -- Updated at
);


-- =====================================================
-- OPTION 2: INSERT YAYASAN + COMMON FOUNDATION DEPARTMENTS
-- =====================================================
-- This creates YAYASAN as root plus common foundation departments

-- Step 2.1: Insert YAYASAN root department
INSERT INTO gloria_ops.departments (
    id,
    code,
    name,
    "schoolId",
    "parentId",
    description,
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'YAYASAN',
    'YAYASAN',
    NULL,
    NULL,
    'Yayasan - Root foundation department',
    true,
    NOW(),
    NOW()
)
RETURNING id, code, name;  -- Show the created department


-- Step 2.2: Get YAYASAN ID for use as parent
-- Copy the UUID from the result above and replace 'YOUR_YAYASAN_ID' below

-- OR use this query to automatically insert child departments:
WITH yayasan AS (
    SELECT id FROM gloria_ops.departments
    WHERE code = 'YAYASAN' AND "schoolId" IS NULL
    LIMIT 1
)
INSERT INTO gloria_ops.departments (
    id,
    code,
    name,
    "schoolId",
    "parentId",
    description,
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    data.code,
    data.name,
    NULL,                   -- Foundation level
    yayasan.id,            -- Parent is YAYASAN
    data.description,
    true,
    NOW(),
    NOW()
FROM yayasan,
(VALUES
    ('HR', 'Human Resources', 'Manages employee relations, recruitment, and organizational development'),
    ('FIN', 'Finance', 'Handles financial planning, budgeting, and accounting'),
    ('IT', 'Information Technology', 'Manages technology infrastructure and digital systems'),
    ('OPS', 'Operations', 'Oversees daily operational activities and logistics'),
    ('ADM', 'Administration', 'General administrative and office management'),
    ('LEGAL', 'Legal', 'Handles legal compliance and regulatory matters'),
    ('MARKETING', 'Marketing', 'Manages marketing, communications, and public relations'),
    ('ACADEMIC', 'Academic Affairs', 'Oversees academic programs and curriculum development')
) AS data(code, name, description);


-- =====================================================
-- OPTION 3: INSERT COMPLETE HIERARCHICAL STRUCTURE
-- =====================================================
-- This creates YAYASAN with organized sub-departments

-- Step 3.1: Insert YAYASAN
INSERT INTO gloria_ops.departments (
    id, code, name, "schoolId", "parentId", description, "isActive", "createdAt", "updatedAt"
) VALUES (
    gen_random_uuid(),
    'YAYASAN',
    'YAYASAN',
    NULL,
    NULL,
    'Yayasan - Root foundation organization',
    true,
    NOW(),
    NOW()
);

-- Step 3.2: Insert Level 1 - Main Divisions
WITH yayasan AS (
    SELECT id FROM gloria_ops.departments
    WHERE code = 'YAYASAN' AND "schoolId" IS NULL
)
INSERT INTO gloria_ops.departments (
    id, code, name, "schoolId", "parentId", description, "isActive", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    data.code,
    data.name,
    NULL,
    yayasan.id,
    data.description,
    true,
    NOW(),
    NOW()
FROM yayasan,
(VALUES
    -- Core Administrative Functions
    ('SEKRETARIAT', 'Sekretariat', 'Secretariat and general administration'),
    ('KEUANGAN', 'Keuangan', 'Finance and treasury'),
    ('SDM', 'Sumber Daya Manusia', 'Human resources management'),

    -- Academic & Educational
    ('AKADEMIK', 'Akademik', 'Academic affairs and curriculum'),
    ('KURIKULUM', 'Kurikulum', 'Curriculum development and standards'),

    -- Support Functions
    ('HUMAS', 'Hubungan Masyarakat', 'Public relations and communications'),
    ('IT', 'Teknologi Informasi', 'Information technology and systems'),
    ('SARANA', 'Sarana & Prasarana', 'Facilities and infrastructure'),

    -- Compliance & Quality
    ('PENJAMINAN_MUTU', 'Penjaminan Mutu', 'Quality assurance'),
    ('LEGAL', 'Legal & Compliance', 'Legal affairs and regulatory compliance')
) AS data(code, name, description);


-- =====================================================
-- STEP 2: VERIFY INSERTED DEPARTMENTS
-- =====================================================
-- Run after insert to verify

-- Check all foundation-level departments
SELECT
    d.id,
    d.code,
    d.name,
    d."schoolId",
    d."parentId",
    p.name AS parent_name,
    d.description,
    d."isActive",
    d."createdAt"
FROM gloria_ops.departments d
LEFT JOIN gloria_ops.departments p ON d."parentId" = p.id
WHERE d."schoolId" IS NULL
ORDER BY d."parentId" NULLS FIRST, d.code;


-- Check department hierarchy (tree view)
WITH RECURSIVE dept_tree AS (
    -- Root departments (no parent)
    SELECT
        id,
        code,
        name,
        "parentId",
        0 AS level,
        name AS path
    FROM gloria_ops.departments
    WHERE "schoolId" IS NULL AND "parentId" IS NULL

    UNION ALL

    -- Child departments
    SELECT
        d.id,
        d.code,
        d.name,
        d."parentId",
        dt.level + 1,
        dt.path || ' > ' || d.name
    FROM gloria_ops.departments d
    INNER JOIN dept_tree dt ON d."parentId" = dt.id
    WHERE d."schoolId" IS NULL
)
SELECT
    REPEAT('  ', level) || code AS hierarchy,
    name,
    level,
    path
FROM dept_tree
ORDER BY path;


-- =====================================================
-- STEP 3: COUNT VERIFICATION
-- =====================================================

SELECT
    COUNT(*) FILTER (WHERE "parentId" IS NULL) AS root_count,
    COUNT(*) FILTER (WHERE "parentId" IS NOT NULL) AS child_count,
    COUNT(*) AS total_foundation_departments
FROM gloria_ops.departments
WHERE "schoolId" IS NULL;


-- =====================================================
-- OPTIONAL: DELETE FOUNDATION DEPARTMENTS (ROLLBACK)
-- =====================================================
-- ⚠️ WARNING: Only use if you need to start over
-- This will delete ALL foundation-level departments

-- First, check what will be deleted
SELECT id, code, name
FROM gloria_ops.departments
WHERE "schoolId" IS NULL
ORDER BY "parentId" NULLS FIRST;

-- Uncomment below to actually delete (be careful!)
/*
DELETE FROM gloria_ops.departments
WHERE "schoolId" IS NULL;
*/


-- =====================================================
-- NOTES & BEST PRACTICES
-- =====================================================
/*
1. YAYASAN Department:
   - This is the root foundation-level department
   - Has NULL schoolId (foundation level)
   - Has NULL parentId (top-level)
   - Code: YAYASAN

2. Child Foundation Departments:
   - All have NULL schoolId (foundation level)
   - ParentId points to YAYASAN or other foundation dept
   - Can be used as parents for school-specific departments

3. Validation Rules (from backend):
   - Foundation child → Any parent allowed
   - School child + Foundation parent → Allowed
   - School child + Same school parent → Allowed
   - School child + Different school parent → BLOCKED

4. Code Uniqueness:
   - Foundation "HR" and School A "HR" can coexist
   - Foundation "HR" and Foundation "HR" will conflict
   - Each scope (foundation/school) has separate code namespace

5. Recommended Execution Order:
   - Run STEP 1 (check existing)
   - Choose ONE option (1, 2, or 3)
   - Run STEP 2 (verify)
   - Run STEP 3 (count verification)

6. If Using Option 2 or 3:
   - Execute in order (YAYASAN first, then children)
   - Copy UUID if manually assigning parent IDs
   - Or use the WITH CTE queries for automatic parent assignment
*/


-- =====================================================
-- QUICK START (RECOMMENDED)
-- =====================================================
-- Copy and execute these queries in order:

-- 1. Check existing
SELECT * FROM gloria_ops.departments WHERE "schoolId" IS NULL;

-- 2. Insert YAYASAN only
INSERT INTO gloria_ops.departments (
    id, code, name, "schoolId", "parentId", description, "isActive", "createdAt", "updatedAt"
) VALUES (
    gen_random_uuid(), 'YAYASAN', 'YAYASAN', NULL, NULL,
    'Yayasan - Root foundation department', true, NOW(), NOW()
);

-- 3. Verify
SELECT id, code, name, "parentId"
FROM gloria_ops.departments
WHERE "schoolId" IS NULL;

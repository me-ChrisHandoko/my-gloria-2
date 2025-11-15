-- =====================================================
-- School Code Population Query
-- =====================================================
-- Purpose: Get distinct bagian_kerja values for school code dropdown
-- Source: gloria_master.data_karyawan table
-- Used in: /organizations/schools Add School form
-- =====================================================

-- Main Query (Production)
SELECT bagian_kerja
FROM gloria_master.data_karyawan
WHERE bagian_kerja NOT IN ('YAYASAN', 'SATPAM', 'UMUM')
  AND status_aktif = 'Aktif'
GROUP BY bagian_kerja
ORDER BY bagian_kerja ASC;

-- =====================================================
-- Alternative Queries for Analysis
-- =====================================================

-- 1. With Count (to see how many employees per bagian_kerja)
SELECT
    bagian_kerja,
    COUNT(*) as total_karyawan
FROM gloria_master.data_karyawan
WHERE bagian_kerja NOT IN ('YAYASAN', 'SATPAM', 'UMUM')
  AND status_aktif = 'Aktif'
GROUP BY bagian_kerja
ORDER BY bagian_kerja ASC;

-- 2. See all bagian_kerja (including excluded ones)
SELECT
    bagian_kerja,
    COUNT(*) as total_karyawan,
    CASE
        WHEN bagian_kerja IN ('YAYASAN', 'SATPAM', 'UMUM') THEN 'Excluded'
        ELSE 'Included'
    END as status
FROM gloria_master.data_karyawan
WHERE status_aktif = 'Aktif'
GROUP BY bagian_kerja
ORDER BY bagian_kerja ASC;

-- 3. With status breakdown
SELECT
    bagian_kerja,
    status_aktif,
    COUNT(*) as total
FROM gloria_master.data_karyawan
WHERE bagian_kerja NOT IN ('YAYASAN', 'SATPAM', 'UMUM')
GROUP BY bagian_kerja, status_aktif
ORDER BY bagian_kerja ASC, status_aktif;

-- 4. See sample data per bagian_kerja
SELECT
    bagian_kerja,
    nama_lengkap,
    status_aktif
FROM gloria_master.data_karyawan
WHERE bagian_kerja NOT IN ('YAYASAN', 'SATPAM', 'UMUM')
  AND status_aktif = 'Aktif'
ORDER BY bagian_kerja ASC, nama_lengkap ASC
LIMIT 100;

-- =====================================================
-- Testing Queries
-- =====================================================

-- Check if table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'gloria_master'
  AND table_name = 'data_karyawan';

-- Check table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'gloria_master'
  AND table_name = 'data_karyawan'
ORDER BY ordinal_position;

-- Check distinct status values
SELECT DISTINCT status_aktif, COUNT(*) as total
FROM gloria_master.data_karyawan
GROUP BY status_aktif;

-- Check all distinct bagian_kerja values (no filter)
SELECT DISTINCT bagian_kerja
FROM gloria_master.data_karyawan
ORDER BY bagian_kerja;

-- =====================================================
-- Performance Analysis
-- =====================================================

-- Explain query execution plan
EXPLAIN ANALYZE
SELECT bagian_kerja
FROM gloria_master.data_karyawan
WHERE bagian_kerja NOT IN ('YAYASAN', 'SATPAM', 'UMUM')
  AND status_aktif = 'Aktif'
GROUP BY bagian_kerja
ORDER BY bagian_kerja ASC;

-- =====================================================
-- Index Recommendations
-- =====================================================

-- Recommended indexes for optimal performance:
-- CREATE INDEX idx_data_karyawan_bagian_status
--     ON gloria_master.data_karyawan(bagian_kerja, status_aktif);
--
-- CREATE INDEX idx_data_karyawan_status
--     ON gloria_master.data_karyawan(status_aktif);

-- =====================================================
-- Sample Expected Output
-- =====================================================

-- Expected result format:
-- bagian_kerja
-- ----------------
-- GURU SD
-- GURU SMP
-- GURU SMA
-- KEPALA SEKOLAH SD
-- KEPALA SEKOLAH SMP
-- KEPALA SEKOLAH SMA
-- STAFF ADMINISTRASI
-- etc...

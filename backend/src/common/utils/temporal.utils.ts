/**
 * Phase 4: Temporal Utilities
 * Helper functions for standardized temporal pattern queries
 */

/**
 * Build WHERE clause for temporal validity checks
 * @param asOf Date to check validity against (defaults to now)
 * @returns Prisma WHERE clause for temporal fields
 */
export function buildTemporalWhereClause(asOf: Date = new Date()) {
  return {
    isActive: true,
    deletedAt: null,
    effectiveFrom: { lte: asOf },
    OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: asOf } }],
  };
}

/**
 * Build WHERE clause for temporal validity checks (without isActive/deletedAt)
 * Use this for models that don't have these fields
 */
export function buildTemporalWhereClauseSimple(asOf: Date = new Date()) {
  return {
    effectiveFrom: { lte: asOf },
    OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: asOf } }],
  };
}

/**
 * Check if a record is currently valid based on temporal fields
 */
export function isCurrentlyValid(
  effectiveFrom: Date,
  effectiveUntil: Date | null,
  asOf: Date = new Date(),
): boolean {
  const isAfterStart = asOf >= effectiveFrom;
  const isBeforeEnd = effectiveUntil === null || asOf <= effectiveUntil;
  return isAfterStart && isBeforeEnd;
}

/**
 * Check if two temporal periods overlap
 */
export function doPeriodsOverlap(
  start1: Date,
  end1: Date | null,
  start2: Date,
  end2: Date | null,
): boolean {
  const effectiveEnd1 = end1 || new Date('9999-12-31');
  const effectiveEnd2 = end2 || new Date('9999-12-31');

  return start1 <= effectiveEnd2 && start2 <= effectiveEnd1;
}

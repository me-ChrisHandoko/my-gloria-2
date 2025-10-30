/**
 * Temporal Utility Functions
 * Phase 4: Standardized temporal patterns for effectiveFrom/effectiveUntil
 */

export interface TemporalOptions {
  /**
   * Reference date for temporal queries (defaults to now)
   */
  referenceDate?: Date;

  /**
   * Include records that are not yet effective (future records)
   */
  includeFuture?: boolean;

  /**
   * Include expired records (past records)
   */
  includeExpired?: boolean;
}

/**
 * Build Prisma where clause for temporal validity
 *
 * @param options Temporal query options
 * @returns Prisma where clause for effectiveFrom/effectiveUntil
 *
 * @example
 * // Get currently active records
 * const whereClause = buildTemporalWhereClause();
 * const activeRoles = await prisma.userRole.findMany({ where: whereClause });
 *
 * @example
 * // Get records active on specific date
 * const whereClause = buildTemporalWhereClause({
 *   referenceDate: new Date('2024-01-01')
 * });
 *
 * @example
 * // Include future records
 * const whereClause = buildTemporalWhereClause({ includeFuture: true });
 */
export function buildTemporalWhereClause(options: TemporalOptions = {}) {
  const { referenceDate = new Date(), includeFuture = false, includeExpired = false } = options;

  // Include all records (no temporal filtering)
  if (includeFuture && includeExpired) {
    return {};
  }

  // Include only expired records
  if (!includeFuture && includeExpired) {
    return {
      effectiveUntil: {
        lte: referenceDate,
      },
    };
  }

  // Include only future records
  if (includeFuture && !includeExpired) {
    return {
      effectiveFrom: {
        gte: referenceDate,
      },
    };
  }

  // Default: Include only currently active records
  return {
    AND: [
      {
        OR: [
          { effectiveFrom: null },
          { effectiveFrom: { lte: referenceDate } },
        ],
      },
      {
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: referenceDate } },
        ],
      },
    ],
  };
}

/**
 * Check if a temporal record is currently active
 *
 * @param record Record with effectiveFrom/effectiveUntil fields
 * @param referenceDate Reference date (defaults to now)
 * @returns True if record is active on reference date
 *
 * @example
 * const role = await prisma.userRole.findFirst({ where: { id: roleId } });
 * if (isTemporallyActive(role)) {
 *   // Role is currently active
 * }
 */
export function isTemporallyActive(
  record: { effectiveFrom?: Date | null; effectiveUntil?: Date | null },
  referenceDate: Date = new Date(),
): boolean {
  const effectiveFromValid = !record.effectiveFrom || record.effectiveFrom <= referenceDate;
  const effectiveUntilValid = !record.effectiveUntil || record.effectiveUntil >= referenceDate;

  return effectiveFromValid && effectiveUntilValid;
}

/**
 * Validate temporal date range
 *
 * @param effectiveFrom Start date
 * @param effectiveUntil End date
 * @throws Error if date range is invalid
 *
 * @example
 * // In DTO validation or service layer
 * validateTemporalRange(dto.effectiveFrom, dto.effectiveUntil);
 */
export function validateTemporalRange(
  effectiveFrom?: Date | null,
  effectiveUntil?: Date | null,
): void {
  if (effectiveFrom && effectiveUntil && effectiveFrom > effectiveUntil) {
    throw new Error('effectiveFrom must be before or equal to effectiveUntil');
  }
}

/**
 * Get overlapping temporal records
 *
 * @param effectiveFrom Start date of range to check
 * @param effectiveUntil End date of range to check
 * @returns Prisma where clause to find overlapping records
 *
 * @example
 * // Check for overlapping user positions
 * const whereClause = getOverlappingTemporalRecords(newPosition.effectiveFrom, newPosition.effectiveUntil);
 * const overlapping = await prisma.userPosition.findMany({
 *   where: {
 *     userProfileId: userId,
 *     ...whereClause,
 *   },
 * });
 */
export function getOverlappingTemporalRecords(
  effectiveFrom?: Date | null,
  effectiveUntil?: Date | null,
) {
  // No dates specified = overlaps with everything
  if (!effectiveFrom && !effectiveUntil) {
    return {};
  }

  // Only start date specified
  if (effectiveFrom && !effectiveUntil) {
    return {
      OR: [
        // Records that start before or at the same time
        { effectiveFrom: { lte: effectiveFrom } },
        // Records with no end date
        { effectiveUntil: null },
        // Records that end after the start date
        { effectiveUntil: { gte: effectiveFrom } },
      ],
    };
  }

  // Only end date specified
  if (!effectiveFrom && effectiveUntil) {
    return {
      OR: [
        // Records that end after or at the same time
        { effectiveUntil: { gte: effectiveUntil } },
        // Records with no start date
        { effectiveFrom: null },
        // Records that start before the end date
        { effectiveFrom: { lte: effectiveUntil } },
      ],
    };
  }

  // Both dates specified - check for any overlap
  return {
    OR: [
      // Case 1: Existing record starts within new range
      {
        AND: [
          { effectiveFrom: { gte: effectiveFrom } },
          { effectiveFrom: { lte: effectiveUntil } },
        ],
      },
      // Case 2: Existing record ends within new range
      {
        AND: [
          { effectiveUntil: { gte: effectiveFrom } },
          { effectiveUntil: { lte: effectiveUntil } },
        ],
      },
      // Case 3: Existing record completely contains new range
      {
        AND: [
          { effectiveFrom: { lte: effectiveFrom } },
          { effectiveUntil: { gte: effectiveUntil } },
        ],
      },
      // Case 4: Existing record with no end date that starts before new range ends
      {
        AND: [
          { effectiveFrom: { lte: effectiveUntil } },
          { effectiveUntil: null },
        ],
      },
      // Case 5: Existing record with no start date that ends after new range starts
      {
        AND: [
          { effectiveFrom: null },
          { effectiveUntil: { gte: effectiveFrom } },
        ],
      },
    ],
  };
}

/**
 * Build temporal snapshot query for historical data
 *
 * @param snapshotDate Date to query historical state
 * @returns Prisma where clause for historical snapshot
 *
 * @example
 * // Get user's roles as of specific date
 * const whereClause = buildTemporalSnapshot(new Date('2024-01-01'));
 * const historicalRoles = await prisma.userRole.findMany({
 *   where: {
 *     userProfileId: userId,
 *     ...whereClause,
 *   },
 * });
 */
export function buildTemporalSnapshot(snapshotDate: Date) {
  return buildTemporalWhereClause({ referenceDate: snapshotDate });
}

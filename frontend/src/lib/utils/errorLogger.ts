/**
 * Error logging utility for handling frozen RTK Query error objects
 *
 * RTK Query error objects are frozen/sealed and cannot be modified.
 * Next.js 13+ error boundaries try to attach Symbol(next.console.error.digest)
 * which causes "Cannot add property, object is not extensible" errors.
 *
 * This utility extracts meaningful error information before logging.
 */

import { SerializedError } from '@reduxjs/toolkit';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

type RTKQueryError = FetchBaseQueryError | SerializedError;

/**
 * Safely extracts error message from RTK Query error objects or unknown errors
 * @param error - RTK Query error object (frozen/sealed) or any error
 * @returns Serializable error message string
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';

  // Type guard for objects
  if (typeof error !== 'object' || error === null) {
    return String(error);
  }

  // Handle FetchBaseQueryError
  if ('status' in error) {
    const fetchError = error as FetchBaseQueryError;
    if ('error' in fetchError && fetchError.error) {
      return typeof fetchError.error === 'string' ? fetchError.error : JSON.stringify(fetchError.error);
    }
    if ('data' in fetchError && fetchError.data) {
      return JSON.stringify(fetchError.data);
    }
    return `HTTP ${String(fetchError.status)}`;
  }

  // Handle SerializedError or standard Error with message
  if ('message' in error) {
    const message = (error as { message?: string }).message;
    if (message && typeof message === 'string') {
      return message;
    }
  }

  // Fallback - stringify the error
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Safely logs RTK Query errors without triggering Next.js error boundary issues
 * @param context - Context message describing where the error occurred
 * @param error - RTK Query error object or any error
 */
export function logRTKError(context: string, error: unknown): void {
  const errorMessage = extractErrorMessage(error);
  console.error(`${context}:`, errorMessage);
}

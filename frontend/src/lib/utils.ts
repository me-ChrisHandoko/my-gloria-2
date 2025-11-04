import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date string or Date object to readable format
 * @param date - Date string or Date object
 * @param formatStr - Format string (default: 'PPP' for long format)
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, formatStr: "short" | "long" = "long"): string {
  if (!date) return "-";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (formatStr === "short") {
      return format(dateObj, "PP"); // Jan 1, 2024
    }

    return format(dateObj, "PPP"); // January 1st, 2024
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
}

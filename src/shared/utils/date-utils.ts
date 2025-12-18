/**
 * Utilities for handling date formatting without timezone conversion issues
 * These functions extract the date portion directly from ISO strings to avoid
 * timezone conversion problems when displaying dates from the database.
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Extracts the date portion from an ISO string without timezone conversion
 * This prevents dates like "2025-12-17T00:00:00+00:00" from showing as the previous day
 * in timezones with negative offsets (e.g., UTC-5)
 *
 * @param isoString ISO date string from database (e.g., "2025-12-17T00:00:00+00:00")
 * @returns Date object with the date portion extracted in UTC
 */
export const parseDateFromISO = (
  isoString: string | null | undefined,
): Date | null => {
  if (!isoString) return null;

  try {
    // Extract just the date portion (YYYY-MM-DD) from the ISO string
    const dateMatch = isoString.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
      // Fallback to standard parsing if format is unexpected
      return new Date(isoString);
    }

    // Create a date using UTC to avoid timezone conversion
    // This ensures "2025-12-17T00:00:00+00:00" stays as Dec 17, not Dec 16
    const [year, month, day] = dateMatch[1].split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  } catch (error) {
    console.error('Error parsing date:', error, isoString);
    return null;
  }
};

/**
 * Formats a date from an ISO string to dd/MM/yyyy format
 * Uses UTC date extraction to avoid timezone conversion issues
 * Formats directly from the ISO string to avoid any timezone conversion
 *
 * @param isoString ISO date string from database
 * @returns Formatted date string (e.g., "17/12/2025") or "N/A" if invalid
 */
export const formatDateFromISO = (
  isoString: string | null | undefined,
): string => {
  if (!isoString) return 'N/A';

  try {
    // Extract just the date portion (YYYY-MM-DD) from the ISO string
    const dateMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) {
      // Fallback: try to parse as Date and use UTC methods
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'N/A';
      // Use UTC methods to avoid timezone conversion
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }

    // Format directly from the extracted date parts (YYYY-MM-DD -> DD/MM/YYYY)
    const [, year, month, day] = dateMatch;
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error, isoString);
    return 'N/A';
  }
};

/**
 * Formats a date from an ISO string to a custom format
 * Uses UTC date extraction to avoid timezone conversion issues
 *
 * @param isoString ISO date string from database
 * @param dateFormat Format string (e.g., 'dd/MM/yyyy', 'yyyy-MM-dd')
 * @returns Formatted date string or "N/A" if invalid
 */
export const formatDateFromISOWithFormat = (
  isoString: string | null | undefined,
  dateFormat: string = 'dd/MM/yyyy',
): string => {
  if (!isoString) return 'N/A';

  try {
    // Extract just the date portion (YYYY-MM-DD) from the ISO string
    const dateMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) {
      // Fallback: use Date with UTC methods
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'N/A';
      // Create a date at noon UTC to avoid day shifts when formatting
      const utcDate = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          12,
          0,
          0,
        ),
      );
      return format(utcDate, dateFormat, { locale: es });
    }

    const [, year, month, day] = dateMatch;

    // Handle common formats directly without Date conversion
    if (dateFormat === 'dd/MM/yyyy') {
      return `${day}/${month}/${year}`;
    } else if (dateFormat === 'yyyy-MM-dd') {
      return `${year}-${month}-${day}`;
    } else if (dateFormat === 'MM/dd/yyyy') {
      return `${month}/${day}/${year}`;
    }

    // For other formats, create a Date at noon UTC to avoid day shifts
    const utcDate = new Date(
      Date.UTC(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        12,
        0,
        0,
      ),
    );
    return format(utcDate, dateFormat, { locale: es });
  } catch (error) {
    console.error('Error formatting date:', error, isoString);
    return 'N/A';
  }
};

/**
 * Formats a date with time from an ISO string
 * For timestamps, we want to show the actual time, so we use standard parsing
 * but extract the date portion separately to avoid day shifts
 *
 * @param isoString ISO date string from database
 * @param dateFormat Format for date portion (default: 'dd/MM/yyyy')
 * @param timeFormat Format for time portion (default: 'HH:mm:ss')
 * @returns Formatted date and time string or "N/A" if invalid
 */
export const formatDateTimeFromISO = (
  isoString: string | null | undefined,
  dateFormat: string = 'dd/MM/yyyy',
  timeFormat: string = 'HH:mm',
): string => {
  if (!isoString) return 'N/A';

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'N/A';

    // Extract date portion directly from ISO string to avoid day shifts
    const dateMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let dateStr: string;

    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      // Format date directly from string parts
      if (dateFormat === 'dd/MM/yyyy') {
        dateStr = `${day}/${month}/${year}`;
      } else {
        // For other formats, create Date at noon UTC
        const utcDate = new Date(
          Date.UTC(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            12,
            0,
            0,
          ),
        );
        dateStr = format(utcDate, dateFormat, { locale: es });
      }
    } else {
      // Fallback: use UTC methods
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      dateStr = `${day}/${month}/${year}`;
    }

    // Extract time portion - use local time for display
    const timeStr = format(date, timeFormat, { locale: es });

    return `${dateStr} ${timeStr}`;
  } catch (error) {
    console.error('Error formatting date-time:', error, isoString);
    return 'N/A';
  }
};

/**
 * Gets only the date portion (without time) from an ISO string
 * Useful for comparisons and date-only operations
 *
 * @param isoString ISO date string from database
 * @returns Date object at midnight UTC of the date, or null if invalid
 */
export const getDateOnly = (
  isoString: string | null | undefined,
): Date | null => {
  return parseDateFromISO(isoString);
};

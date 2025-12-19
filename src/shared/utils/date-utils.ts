/**
 * Date utility functions for formatting dates
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formats an ISO date string to a readable format
 * @param isoString - ISO date string (e.g., "2025-12-18T15:30:00Z")
 * @param formatString - Date format string (default: "dd/MM/yyyy HH:mm")
 * @returns Formatted date string or empty string if invalid
 */
export const formatDateFromISO = (
  isoString: string | null | undefined,
  formatString: string = 'dd/MM/yyyy HH:mm'
): string => {
  if (!isoString) return '';

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    return format(date, formatString, { locale: es });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Formats an ISO date string to date only (without time)
 * @param isoString - ISO date string
 * @returns Formatted date string (dd/MM/yyyy)
 */
export const formatDateOnly = (isoString: string | null | undefined): string => {
  return formatDateFromISO(isoString, 'dd/MM/yyyy');
};

/**
 * Formats an ISO date string to time only
 * @param isoString - ISO date string
 * @returns Formatted time string (HH:mm)
 */
export const formatTimeOnly = (isoString: string | null | undefined): string => {
  return formatDateFromISO(isoString, 'HH:mm');
};

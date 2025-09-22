/**
 * Date formatting utilities for handling timezone conversion
 */

/**
 * Format a UTC date string from backend to local time display
 * Assumes backend sends dates in UTC without timezone suffix
 */
export const formatBackendDate = (dateString: string): string => {
  if (!dateString) return '';

  // Backend sends UTC datetime strings without timezone info
  // We need to explicitly treat them as UTC and convert to local time
  const utcDate = new Date(dateString + 'Z'); // Add 'Z' to indicate UTC

  return utcDate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Format date for display with fallback for null/undefined values
 */
export const formatDateWithFallback = (dateString: string | null | undefined, fallback: string = '未知'): string => {
  if (!dateString) return fallback;
  return formatBackendDate(dateString);
};
/**
 * Chronometric Module - Utility Functions
 * 
 * Common utility functions for time calculations, ID generation, and data processing.
 * Addresses security concerns about Math.random() and improves maintainability.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MILLISECONDS_PER_MINUTE,
  ID_PREFIX_SEPARATOR,
  DEFAULT_BILLING_INCREMENT_MINUTES,
} from './constants.js';

/**
 * Generate a unique ID for source events and entries.
 * Uses UUID v4 for cryptographically strong random IDs.
 * 
 * @param prefix Optional prefix for the ID (e.g., 'email', 'westlaw')
 * @returns A unique identifier
 */
export function generateId(prefix?: string): string {
  const uuid = uuidv4();
  return prefix ? `${prefix}${ID_PREFIX_SEPARATOR}${uuid}` : uuid;
}

/**
 * Calculate minutes between two ISO datetime strings.
 * 
 * @param start Start datetime (ISO 8601)
 * @param end End datetime (ISO 8601)
 * @returns Minutes elapsed, or undefined if calculation fails
 */
export function minutesBetween(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  
  if (!isFinite(startMs) || !isFinite(endMs)) return undefined;
  if (endMs <= startMs) return 0;
  
  return Math.round((endMs - startMs) / MILLISECONDS_PER_MINUTE);
}

/**
 * Round minutes to a billing increment.
 * 
 * @param minutes Minutes to round
 * @param increment Rounding increment (default: 6 minutes)
 * @param roundUp If true, always round up; otherwise round to nearest
 * @returns Rounded minutes
 */
export function roundToIncrement(
  minutes: number,
  increment: number = DEFAULT_BILLING_INCREMENT_MINUTES,
  roundUp: boolean = true
): number {
  if (increment <= 0) return minutes;
  if (minutes <= 0) return 0;
  
  const remainder = minutes % increment;
  
  if (remainder === 0) return minutes;
  
  if (roundUp) {
    return minutes + (increment - remainder);
  } else {
    // Round to nearest
    return remainder >= increment / 2
      ? minutes + (increment - remainder)
      : minutes - remainder;
  }
}

/**
 * Extract date-only string from ISO datetime.
 * 
 * @param isoDateTime ISO 8601 datetime string
 * @returns Date string in YYYY-MM-DD format
 */
export function toDateOnly(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

/**
 * Check if two date strings represent the same day.
 * 
 * @param date1 First date (ISO format)
 * @param date2 Second date (ISO format)
 * @returns True if same day
 */
export function isSameDay(date1: string, date2: string): boolean {
  return toDateOnly(date1) === toDateOnly(date2);
}

/**
 * Group items by a key function.
 * 
 * @param items Array of items
 * @param keyFn Function to extract key from item
 * @returns Map of key to array of items
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  
  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key);
    
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  
  return groups;
}

/**
 * Safe JSON parse with fallback.
 * 
 * @param text JSON string to parse
 * @param fallback Fallback value if parse fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Deduplicate an array by a key function.
 * 
 * @param items Array of items
 * @param keyFn Function to extract unique key from item
 * @returns Deduplicated array
 */
export function uniqueBy<T, K>(items: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  
  return result;
}

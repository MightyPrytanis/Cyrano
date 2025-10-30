/**
 * Chronometric Module - Constants
 * 
 * Named constants for the Forensic Time Capture (Chronometric) module.
 * Addresses code review feedback about magic numbers.
 */

// Time constants
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const MINUTES_PER_HOUR = 60;
export const MILLISECONDS_PER_MINUTE = 60 * 1000;

// Billing constants
export const MINIMAL_EMAIL_MINUTES = 6; // Minimum quantum for email read/compose
export const DEFAULT_BILLING_INCREMENT_MINUTES = 6; // Standard 0.1 hour increment
export const DEFAULT_ROUNDING_INCREMENT_MINUTES = 6;

// Time entry defaults
export const MIN_ENTRY_MINUTES = 6;
export const DEFAULT_COMPLEXITY = 'medium' as const;
export const DEFAULT_CONFIDENCE = 0.8;

// ID generation
export const ID_PREFIX_SEPARATOR = ':';

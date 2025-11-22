/**
 * Chronometric Module - Tool Interfaces
 * 
 * Interface definitions for atomic data source tools.
 */

import { SourceEvent, TimeWindow } from './core-types.js';

/**
 * Base interface for all Chronometric data source tools
 */
export interface IChronometricTool {
  /**
   * Fetch events from the data source within the specified time window
   */
  fetchEvents(window: TimeWindow): Promise<SourceEvent[]>;
  
  /**
   * Validate tool configuration
   */
  isConfigured(): boolean;
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata;
}

export interface ToolMetadata {
  name: string;
  description: string;
  sourceKind: string;
  version: string;
  requiresAuth: boolean;
}

/**
 * Email tool configuration (IMAP)
 */
export interface EmailToolConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  mailbox?: string;
}

/**
 * Local file activity tool configuration
 */
export interface LocalActivityToolConfig {
  paths: string[];
  extensions?: string[];
  excludePatterns?: string[];
}

/**
 * Westlaw import tool configuration
 */
export interface WestlawToolConfig {
  csvPaths: string[];
}

/**
 * Clio integration tool configuration
 */
export interface ClioToolConfig {
  apiKey: string;
  baseUrl?: string;
  query?: Record<string, any>;
}

/**
 * Calendar tool configuration (future extensibility)
 */
export interface CalendarToolConfig {
  provider: 'outlook' | 'google' | 'ical';
  credentials: Record<string, any>;
}

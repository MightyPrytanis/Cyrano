/**
 * Chronometric Module - Core Types
 * 
 * Foundational type definitions for the Forensic Time Capture module.
 */

export type ISODateString = string; // YYYY-MM-DDTHH:mm:ss.sssZ
export type ISODateOnly = string; // YYYY-MM-DD

export interface TimeWindow {
  start: ISODateString;
  end: ISODateString;
}

export interface MatterRef {
  matterId?: string;
  clientId?: string;
  clientName?: string;
  matterName?: string;
}

export type SourceKind =
  | 'email'
  | 'document'
  | 'research'
  | 'calendar'
  | 'clio_activity'
  | 'local_activity'
  | 'westlaw_research';

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'novel';
export type ProposedBasis = 'normative' | 'actual' | 'hybrid';
export type BillingMode = 'value' | 'actual' | 'blended';

/**
 * Evidence supporting a time entry recommendation.
 * Distinguishes between direct and circumstantial evidence.
 */
export interface Evidence {
  type: 'direct' | 'circumstantial';
  sourceKind: SourceKind;
  uri?: string;
  description: string;
  timestamp?: ISODateString;
  metadata?: Record<string, any>;
}

/**
 * Raw event from a data source (email, file, calendar, etc.)
 */
export interface SourceEvent {
  id: string;
  kind: SourceKind;
  timestamp: ISODateString;
  endTimestamp?: ISODateString;
  durationMinutes?: number;
  matter?: MatterRef;
  subject?: string;
  description?: string;
  path?: string;
  evidence?: Evidence[];
  metadata?: Record<string, any>;
}

/**
 * Normative catalog item - professional standard for a task
 */
export interface NormativeCatalogItem {
  code: string;
  label: string;
  baseMinutes: number;
  activityCategory?: string;
  modifiers?: { key: string; factor: number }[];
  appliesTo?: {
    practiceArea?: string;
    court?: string;
    matterType?: string;
  };
}

export interface NormativeCatalog {
  [code: string]: NormativeCatalogItem;
}

/**
 * A proposed/recommended time entry with full provenance
 */
export interface ProposedEntry {
  id: string;
  matter: MatterRef;
  date: ISODateOnly;
  taskCode: string;
  taskLabel: string;
  actualMinutes?: number;
  normativeMinutes: number;
  recommendedMinutes: number;
  basis: ProposedBasis;
  description: string;
  activityCategory?: string;
  sourceEventIds: string[];
  evidence: Evidence[];
  complexity: ComplexityLevel;
  confidence: number;
  userApproved?: boolean;
  userModified?: boolean;
  notes?: string;
}

/**
 * Configuration for the billing engine
 */
export interface BillingPolicy {
  mode: BillingMode;
  blendRatio?: number; // 0-1, weight of value billing in blended mode
  normativeRules?: NormativeCatalogItem[];
  aiNormative?: boolean; // Allow AI to infer normative times
  minIncrementMinutes?: number;
  roundUp?: boolean;
  capMultiplier?: number; // Optional cap: value <= cap * actual
}

/**
 * Engine configuration flags
 */
export interface EngineFlags {
  allowValueBilling?: boolean;
  normativeStrategy?: 'conservative' | 'standard' | 'aggressive';
  minEntryMinutes?: number;
  roundingIncrement?: number;
  useLLM?: boolean;
  enableDupeCheck?: boolean;
}

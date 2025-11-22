export type ISODateString = string; // YYYY-MM-DDTHH:mm:ss.sssZ

export interface TimeWindow {
  start: ISODateString;
  end: ISODateString;
}

export interface MatterRef {
  matterId?: string;
  clientName?: string;
  matterName?: string;
}

export type SourceKind =
  | 'email'
  | 'document'
  | 'research'
  | 'calendar'
  | 'clio_activity'
  | 'local_activity';

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
  metadata?: Record<string, any>;
}

export interface NormativeCatalogItem {
  code: string; // e.g., 'draft_notice_of_hearing'
  label: string;
  baseMinutes: number; // standard expected minutes under normal circumstances
  activityCategory?: string; // e.g., 'Drafting', 'Research', etc.
}

export interface NormativeCatalog {
  [code: string]: NormativeCatalogItem;
}

export type ProposedBasis = 'normative' | 'actual' | 'hybrid';

export interface ProposedEntry {
  matter: MatterRef;
  date: ISODateString; // entry date
  taskCode: string; // from catalog
  taskLabel: string;
  actualMinutes?: number;
  normativeMinutes: number;
  recommendedMinutes: number;
  basis: ProposedBasis;
  description: string;
  activityCategory?: string;
  sourceEventIds: string[];
  complexity?: 'low' | 'medium' | 'high' | 'novel';
  confidence?: number; // 0..1
}

export interface EngineFlags {
  allowValueBilling?: boolean; // apply normative even if actual differs
  normativeStrategy?: 'conservative' | 'standard' | 'aggressive';
  minEntryMinutes?: number; // floor
  roundingIncrement?: number; // 6, 12, 15
  useLLM?: boolean;
}

export interface AnalysisInput {
  window: TimeWindow;
  events: SourceEvent[];
  flags?: EngineFlags;
}

export interface AnalysisOutput {
  proposals: ProposedEntry[];
  unassignedMinutes: number;
  stats: Record<string, any>;
}

export interface TimeEntryPayload {
  matterId?: string; // for provider push
  date: ISODateString;
  minutes: number;
  description: string;
  activityCategory?: string;
  metadata?: Record<string, any>;
}

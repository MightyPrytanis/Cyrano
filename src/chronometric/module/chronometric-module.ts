/**
 * Chronometric Module - Main Orchestrator
 * 
 * The Chronometric module for Forensic Time Capture.
 * Orchestrates data source tools and the work value appraiser to assist attorneys
 * in retrospectively reconstructing lost or unentered billable time.
 * 
 * Architecture: Module layer (composed of Tools, used by Engines/Apps)
 */

import {
  IChronometricTool,
  TimeWindow,
  SourceEvent,
  ProposedEntry,
  BillingPolicy,
  EngineFlags,
} from '../types/index.js';
import {
  EmailTool,
  LocalActivityTool,
  WestlawTool,
  ClioTool,
} from '../tools/index.js';
import {
  WorkValueAppraiser,
  AppraisalResult,
} from './work-value-appraiser.js';

export interface ChronometricConfig {
  tools: IChronometricTool[];
  billingPolicy?: BillingPolicy;
  appraiserFlags?: EngineFlags;
}

export interface ChronometricResult extends AppraisalResult {
  window: TimeWindow;
  toolsUsed: string[];
}

/**
 * Chronometric Module
 * 
 * Main module for forensic time capture. Coordinates multiple data source tools
 * and applies work value appraisal to generate time entry recommendations.
 * 
 * Key Features:
 * - Gap identification: Locates periods with missing time entries
 * - Artifact collection: Gathers evidence from multiple sources
 * - Work value appraisal: Applies normative standards and user policies
 * - Duplicate detection: Prevents client overbilling
 * - Transparency: Provides full provenance for all recommendations
 * - User control: All entries require explicit approval
 */
export class ChronometricModule {
  private tools: IChronometricTool[];
  private appraiser: WorkValueAppraiser;
  private defaultPolicy: BillingPolicy;
  private defaultFlags: EngineFlags;

  constructor(config: ChronometricConfig) {
    this.tools = config.tools;
    this.appraiser = new WorkValueAppraiser();
    this.defaultPolicy = config.billingPolicy || {
      mode: 'value',
      aiNormative: true,
      minIncrementMinutes: 6,
      roundUp: true,
    };
    this.defaultFlags = config.appraiserFlags || {
      allowValueBilling: true,
      normativeStrategy: 'standard',
      minEntryMinutes: 6,
      roundingIncrement: 6,
      useLLM: true,
      enableDupeCheck: true,
    };
  }

  /**
   * Analyze a time window and generate billing recommendations.
   * 
   * Workflow:
   * 1. Fetch events from all configured tools
   * 2. Aggregate and deduplicate events
   * 3. Apply work value appraiser
   * 4. Detect duplicates
   * 5. Return recommendations with full provenance
   * 
   * @param window Time window to analyze
   * @param policy Optional billing policy override
   * @param flags Optional appraiser flags override
   * @returns Chronometric result with recommendations
   */
  async analyze(
    window: TimeWindow,
    policy?: BillingPolicy,
    flags?: EngineFlags
  ): Promise<ChronometricResult> {
    // Step 1: Fetch events from all tools
    const allEvents: SourceEvent[] = [];
    const toolsUsed: string[] = [];

    for (const tool of this.tools) {
      if (!tool.isConfigured()) {
        console.warn(`Tool ${tool.getMetadata().name} is not configured, skipping`);
        continue;
      }

      try {
        const events = await tool.fetchEvents(window);
        allEvents.push(...events);
        toolsUsed.push(tool.getMetadata().name);
      } catch (error) {
        console.error(`Error fetching events from ${tool.getMetadata().name}:`, error);
        // Continue with other tools
      }
    }

    // Step 2: Appraise work value and generate recommendations
    const finalPolicy = policy || this.defaultPolicy;
    const finalFlags = flags || this.defaultFlags;

    const result = await this.appraiser.generateRecommendations(
      allEvents,
      finalPolicy,
      finalFlags
    );

    // Step 3: Return comprehensive result
    return {
      ...result,
      window,
      toolsUsed,
    };
  }

  /**
   * Identify gaps in time entries by comparing to existing Clio entries.
   * 
   * @param window Time window to check
   * @param clioTool Configured Clio tool
   * @returns Array of dates with potential gaps
   */
  async identifyGaps(
    window: TimeWindow,
    clioTool: ClioTool
  ): Promise<string[]> {
    if (!clioTool.isConfigured()) {
      throw new Error('Clio tool must be configured for gap identification');
    }

    // Get existing Clio entries
    const clioEvents = await clioTool.fetchEvents(window);

    // Group by date
    const dateMap = new Map<string, number>();
    for (const event of clioEvents) {
      const date = event.timestamp.slice(0, 10);
      const minutes = event.durationMinutes || 0;
      dateMap.set(date, (dateMap.get(date) || 0) + minutes);
    }

    // Identify dates with low or no entries
    const gaps: string[] = [];
    const currentDate = new Date(window.start);
    const endDate = new Date(window.end);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      const minutes = dateMap.get(dateStr) || 0;

      // Flag as gap if less than 2 hours of work recorded
      if (minutes < 120) {
        gaps.push(dateStr);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return gaps;
  }

  /**
   * Get metadata about configured tools.
   * 
   * @returns Array of tool metadata
   */
  getToolsMetadata() {
    return this.tools.map((tool) => tool.getMetadata());
  }

  /**
   * Validate that minimum required tools are configured.
   * 
   * @returns True if module is ready to use
   */
  isReady(): boolean {
    return this.tools.some((tool) => tool.isConfigured());
  }
}

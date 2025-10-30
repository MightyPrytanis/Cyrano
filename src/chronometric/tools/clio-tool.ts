/**
 * Chronometric Module - Clio Tool
 * 
 * Atomic tool for fetching time entries from Clio practice management system.
 * Part of the Tool layer in the Cyrano modular architecture.
 */

import {
  IChronometricTool,
  ClioToolConfig,
  SourceEvent,
  TimeWindow,
  ToolMetadata,
  Evidence,
} from '../types/index.js';
import { generateId } from '../utils.js';

export class ClioTool implements IChronometricTool {
  private config: ClioToolConfig;
  private baseUrl: string;

  constructor(config: ClioToolConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://app.clio.com/api/v4';
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'ClioTool',
      description: 'Fetches time entries from Clio',
      sourceKind: 'clio_activity',
      version: '1.0.0',
      requiresAuth: true,
    };
  }

  /**
   * Get base URL for Clio API.
   * Addresses review concern: Use getter method instead of public property.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get API key (read-only access).
   * Addresses review concern: Use getter method for encapsulation.
   */
  getApiKey(): string {
    return this.config.apiKey;
  }

  async fetchEvents(window: TimeWindow): Promise<SourceEvent[]> {
    if (!this.isConfigured()) {
      throw new Error('ClioTool is not properly configured');
    }

    const events: SourceEvent[] = [];

    try {
      // Fetch activities from Clio
      const query = this.config.query || {};
      const activities = await this.fetchActivities(query);

      const startMs = new Date(window.start).getTime();
      const endMs = new Date(window.end).getTime();

      for (const activity of activities) {
        const activityDate = activity.date || activity.created_at || activity.updated_at;
        
        if (!activityDate) continue;

        const activityMs = new Date(activityDate).getTime();
        
        // Filter by time window
        if (activityMs >= startMs && activityMs <= endMs) {
          const qtyHrs = Number(activity.quantity || 0);
          const minutes = Math.round(qtyHrs * 60);

          const evidence: Evidence[] = [
            {
              type: 'direct',
              sourceKind: 'clio_activity',
              description: `Clio time entry: ${activity.description || 'Activity'}`,
              timestamp: new Date(activityDate).toISOString(),
              metadata: {
                activityId: activity.id,
                rate: activity.rate,
              },
            },
          ];

          events.push({
            id: generateId('clio'),
            kind: 'clio_activity',
            timestamp: new Date(activityDate).toISOString(),
            durationMinutes: isFinite(minutes) ? minutes : 0,
            description: activity.description || 'Clio activity',
            matter: {
              matterId: activity.matter_id ? String(activity.matter_id) : undefined,
              clientId: activity.client_id ? String(activity.client_id) : undefined,
            },
            evidence,
            metadata: {
              activityId: activity.id,
              userId: activity.user_id,
              rate: activity.rate,
            },
          });
        }
      }

      return events;
    } catch (error) {
      throw new Error(`Failed to fetch Clio events: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fetchActivities(query: Record<string, any>): Promise<any[]> {
    const url = `${this.baseUrl}/activities`;
    
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      params.append(key, String(value));
    }

    const fullUrl = `${url}?${params.toString()}`;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Clio API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Clio typically returns { data: [...] }
    return Array.isArray(data.data) ? data.data : [];
  }
}

/**
 * Chronometric Module - Westlaw Tool
 * 
 * Atomic tool for importing Westlaw CSV time records.
 * Part of the Tool layer in the Cyrano modular architecture.
 * 
 * Addresses review concern: Uses UUID for ID generation instead of Math.random()
 */

import { createReadStream } from 'node:fs';
import { parse } from 'csv-parse';
import {
  IChronometricTool,
  WestlawToolConfig,
  SourceEvent,
  TimeWindow,
  ToolMetadata,
  Evidence,
} from '../types/index.js';
import { generateId } from '../utils.js';

export class WestlawTool implements IChronometricTool {
  private config: WestlawToolConfig;

  constructor(config: WestlawToolConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return this.config.csvPaths && this.config.csvPaths.length > 0;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'WestlawTool',
      description: 'Imports Westlaw CSV time records',
      sourceKind: 'westlaw_research',
      version: '1.0.0',
      requiresAuth: false,
    };
  }

  async fetchEvents(window: TimeWindow): Promise<SourceEvent[]> {
    if (!this.isConfigured()) {
      throw new Error('WestlawTool is not properly configured');
    }

    const events: SourceEvent[] = [];
    const startMs = new Date(window.start).getTime();
    const endMs = new Date(window.end).getTime();

    for (const csvPath of this.config.csvPaths) {
      const fileEvents = await this.parseCSV(csvPath);
      
      // Filter events by time window
      for (const event of fileEvents) {
        const eventMs = new Date(event.timestamp).getTime();
        if (eventMs >= startMs && eventMs <= endMs) {
          events.push(event);
        }
      }
    }

    return events;
  }

  private async parseCSV(csvPath: string): Promise<SourceEvent[]> {
    const events: SourceEvent[] = [];

    return new Promise<SourceEvent[]>((resolve, reject) => {
      const parser = createReadStream(csvPath)
        .pipe(
          parse({
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true,
          })
        )
        .on('data', (row: any) => {
          try {
            // Try common column names; leave flexible for different Westlaw export formats
            const startTime = row['Start Time'] || row['Start'] || row['Date'] || row['start'] || row['date'];
            const endTime = row['End Time'] || row['End'] || row['end'];
            const minutes = Number(row['Minutes'] || row['Duration'] || row['duration'] || 0);
            const matter = row['Matter'] || row['Client/Matter'] || row['Matter Name'];
            const client = row['Client'] || row['Client Name'];
            const query = row['Search Terms'] || row['Query'] || row['Topic'] || '';

            if (!startTime) {
              // Skip rows without a timestamp
              return;
            }

            const timestamp = new Date(startTime).toISOString();
            const endTimestamp = endTime ? new Date(endTime).toISOString() : undefined;

            const evidence: Evidence[] = [
              {
                type: 'direct',
                sourceKind: 'westlaw_research',
                description: `Westlaw research: ${query || 'Research session'}`,
                timestamp,
                uri: `file://${csvPath}`,
                metadata: {
                  csvFile: csvPath,
                  searchTerms: query,
                },
              },
            ];

            events.push({
              id: generateId('westlaw'),
              kind: 'westlaw_research',
              timestamp,
              endTimestamp,
              durationMinutes: minutes || undefined,
              subject: query,
              description: `Westlaw research${query ? ': ' + query : ''}`,
              matter: matter ? {
                matterName: matter,
                clientName: client,
              } : undefined,
              evidence,
              metadata: row,
            });
          } catch (error) {
            console.warn(`Error parsing Westlaw CSV row:`, error, row);
          }
        })
        .on('error', (error) => {
          reject(new Error(`Failed to parse Westlaw CSV ${csvPath}: ${error.message}`));
        })
        .on('end', () => {
          resolve(events);
        });
    });
  }
}

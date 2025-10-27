import { createReadStream } from 'node:fs';
import { parse } from 'csv-parse';
import { SourceEvent } from '../types.js';

export interface WestlawCSVImportConfig {
  csvPaths: string[]; // exported usage logs
}

export class WestlawCSVImport {
  private config: WestlawCSVImportConfig;

  constructor(config: WestlawCSVImportConfig) {
    this.config = config;
  }

  async import(): Promise<SourceEvent[]> {
    const events: SourceEvent[] = [];

    for (const file of this.config.csvPaths) {
      await new Promise<void>((resolve, reject) => {
        const parser = createReadStream(file)
          .pipe(
            parse({
              columns: true,
              skip_empty_lines: true,
              relax_column_count: true,
              trim: true,
            })
          )
          .on('data', (row: any) => {
            // Try common column names; leave flexible
            const start = row['Start Time'] || row['Start'] || row['Date'] || row['start'] || row['date'];
            const end = row['End Time'] || row['End'] || row['end'];
            const minutes = Number(row['Minutes'] || row['Duration'] || row['duration'] || 0);
            const matter = row['Matter'] || row['Client/Matter'] || row['Matter Name'];
            const client = row['Client'] || row['Client Name'];
            const query = row['Search Terms'] || row['Query'] || row['Topic'] || '';

            const id = `${file}:${parser.info?.records || Math.random()}`;
            events.push({
              id,
              kind: 'research',
              timestamp: new Date(start).toISOString(),
              endTimestamp: end ? new Date(end).toISOString() : undefined,
              durationMinutes: minutes || undefined,
              subject: query,
              description: `Westlaw research: ${query}`,
              matter: matter ? { matterName: matter, clientName: client } : undefined,
              metadata: row,
            });
          })
          .on('error', reject)
          .on('end', () => resolve());
      });
    }

    return events;
  }
}

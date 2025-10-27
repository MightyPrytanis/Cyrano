import fg from 'fast-glob';
import { stat } from 'node:fs/promises';
import { SourceEvent, TimeWindow } from '../types.js';
import path from 'node:path';

export interface LocalActivityConfig {
  roots: string[]; // directories to scan
  includeGlobs?: string[]; // e.g., ['**/*.docx','**/*.pdf','**/*.md']
  excludeGlobs?: string[];
}

export class LocalActivityScanner {
  private config: LocalActivityConfig;

  constructor(config: LocalActivityConfig) {
    this.config = config;
  }

  async scan(window: TimeWindow): Promise<SourceEvent[]> {
    const patterns = this.config.includeGlobs?.length ? this.config.includeGlobs : ['**/*'];
    const options = {
      cwd: undefined as string | undefined,
      ignore: this.config.excludeGlobs || ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      absolute: true,
      onlyFiles: true,
      dot: false,
    } as const;

    const paths = new Set<string>();
    for (const root of this.config.roots) {
      const matches = await fg(patterns, { ...options, cwd: root });
      matches.forEach((m) => paths.add(path.resolve(root, path.relative(root, m))));
    }

    const start = new Date(window.start).getTime();
    const end = new Date(window.end).getTime();

    const events: SourceEvent[] = [];
    for (const p of paths) {
      try {
        const s = await stat(p);
        const mtime = s.mtime.getTime();
        if (mtime >= start && mtime <= end) {
          events.push({
            id: p,
            kind: 'document',
            timestamp: s.mtime.toISOString(),
            description: `Modified ${path.basename(p)}`,
            path: p,
            metadata: { size: s.size },
          });
        }
      } catch {
        // skip
      }
    }

    return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}

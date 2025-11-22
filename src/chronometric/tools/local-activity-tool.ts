/**
 * Chronometric Module - Local Activity Tool
 * 
 * Atomic tool for tracking local file modifications.
 * Part of the Tool layer in the Cyrano modular architecture.
 */

import { stat } from 'node:fs/promises';
import path from 'node:path';
import {
  IChronometricTool,
  LocalActivityToolConfig,
  SourceEvent,
  TimeWindow,
  ToolMetadata,
  Evidence,
} from '../types/index.js';
import { generateId } from '../utils.js';

export class LocalActivityTool implements IChronometricTool {
  private config: LocalActivityToolConfig;

  constructor(config: LocalActivityToolConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return this.config.paths && this.config.paths.length > 0;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'LocalActivityTool',
      description: 'Tracks local file modification events',
      sourceKind: 'local_activity',
      version: '1.0.0',
      requiresAuth: false,
    };
  }

  async fetchEvents(window: TimeWindow): Promise<SourceEvent[]> {
    if (!this.isConfigured()) {
      throw new Error('LocalActivityTool is not properly configured');
    }

    const events: SourceEvent[] = [];
    const startMs = new Date(window.start).getTime();
    const endMs = new Date(window.end).getTime();

    // Use dynamic import for fast-glob (ESM module)
    const fg = await import('fast-glob');
    const fastGlob = fg.default || fg;

    const extensions = this.config.extensions || ['*'];
    const excludePatterns = this.config.excludePatterns || [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
    ];

    for (const basePath of this.config.paths) {
      const patterns = extensions.map((ext) => {
        if (ext === '*') {
          return `${basePath}/**/*`;
        }
        const normalizedExt = ext.startsWith('.') ? ext.slice(1) : ext;
        return `${basePath}/**/*.${normalizedExt}`;
      });
      
      const files = await fastGlob(patterns, {
        ignore: excludePatterns,
        absolute: true,
        onlyFiles: true,
      });

      for (const filePath of files) {
        try {
          const stats = await stat(filePath);
          const mtimeMs = stats.mtime.getTime();

          // Filter by time window
          if (mtimeMs >= startMs && mtimeMs <= endMs) {
            const fileName = path.basename(filePath);
            const relativePath = path.relative(basePath, filePath);

            const evidence: Evidence[] = [
              {
                type: 'circumstantial',
                sourceKind: 'local_activity',
                description: `File modified: ${relativePath}`,
                timestamp: stats.mtime.toISOString(),
                uri: `file://${filePath}`,
                metadata: {
                  size: stats.size,
                  ctime: stats.ctime.toISOString(),
                },
              },
            ];

            events.push({
              id: generateId('local'),
              kind: 'local_activity',
              timestamp: stats.mtime.toISOString(),
              subject: fileName,
              description: `Edited ${relativePath}`,
              path: filePath,
              evidence,
              metadata: {
                size: stats.size,
                extension: path.extname(filePath),
                relativePath,
              },
            });
          }
        } catch (error) {
          // Skip files that can't be read
          console.warn(`Could not read file stats for ${filePath}:`, error);
        }
      }
    }

    return events;
  }
}

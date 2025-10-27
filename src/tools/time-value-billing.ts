import { BaseTool } from './base-tool.js';
import { z } from 'zod';
import { LocalActivityScanner } from '../services/tvb/sources/local-activity.js';
import { IMAPEmailConnector } from '../services/tvb/sources/imap-email.js';
import { WestlawCSVImport } from '../services/tvb/sources/westlaw.js';
import { ClioClient } from '../services/tvb/sources/clio-client.js';
import { ValueBillingEngine } from '../services/tvb/value-billing-engine.js';
import { AnalysisInput, SourceEvent, TimeEntryPayload } from '../services/tvb/types.js';

const PeriodSchema = z.object({ start: z.string(), end: z.string() });

const IMAPSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  user: z.string(),
  password: z.string(),
  mailbox: z.string().optional(),
});

const SourcesSchema = z.object({
  local: z.object({ roots: z.array(z.string()), includeGlobs: z.array(z.string()).optional(), excludeGlobs: z.array(z.string()).optional() }).optional(),
  imap: IMAPSchema.optional(),
  westlawCsv: z.object({ csvPaths: z.array(z.string()) }).optional(),
  clio: z.object({ token: z.string().optional() }).optional(),
});

const FlagsSchema = z.object({
  allowValueBilling: z.boolean().optional().default(true),
  normativeStrategy: z.enum(['conservative', 'standard', 'aggressive']).optional().default('standard'),
  minEntryMinutes: z.number().optional().default(6),
  roundingIncrement: z.number().optional().default(6),
  useLLM: z.boolean().optional().default(false),
});

const ActionSchema = z.object({
  action: z.enum(['ingest', 'analyze', 'propose', 'push']),
  period: PeriodSchema,
  sources: SourcesSchema,
  matterFilter: z.object({ matterId: z.string().optional(), clientName: z.string().optional(), matterName: z.string().optional() }).optional(),
  flags: FlagsSchema.optional(),
  push: z.object({ provider: z.enum(['clio']), dryRun: z.boolean().optional().default(true) }).optional(),
});

export const timeValueBilling = new (class extends BaseTool {
  getToolDefinition() {
    return {
      name: 'time_value_billing',
      description:
        'Aggregate attorney activity across sources and compute value-billing time entries using normative and actual signals.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['ingest', 'analyze', 'propose', 'push'] },
          period: { type: 'object' },
          sources: { type: 'object' },
          matterFilter: { type: 'object' },
          flags: { type: 'object' },
          push: { type: 'object' },
        },
        required: ['action', 'period', 'sources'],
      },
    };
  }

  async execute(args: any) {
    try {
      const { action, period, sources, matterFilter, flags, push } = ActionSchema.parse(args);
      const events: SourceEvent[] = [];

      // Gather events from requested sources
      if (sources.local) {
        const scanner = new LocalActivityScanner({
          roots: sources.local.roots,
          includeGlobs: sources.local.includeGlobs,
          excludeGlobs: sources.local.excludeGlobs,
        });
        const localEvents = await scanner.scan(period);
        events.push(...localEvents);
      }

      if (sources.imap) {
        const connector = new IMAPEmailConnector(sources.imap);
        const mailEvents = await connector.fetchEvents(period);
        events.push(...mailEvents);
      }

      if (sources.westlawCsv) {
        const importer = new WestlawCSVImport({ csvPaths: sources.westlawCsv.csvPaths });
        const wlEvents = await importer.import();
        // filter to period
        const start = new Date(period.start).getTime();
        const end = new Date(period.end).getTime();
        events.push(
          ...wlEvents.filter((e) => {
            const t = new Date(e.timestamp).getTime();
            return t >= start && t <= end;
          })
        );
      }

      if (sources.clio) {
        const clio = new ClioClient({ token: sources.clio.token });
        const data = await clio.getActivities({
          // Clio query params
          // Use date range if supported; otherwise fetch and filter client-side
          fields: 'id,description,start_time,end_time,duration,matter,created_at',
          page: 1,
          per_page: 200,
        });
        const clioEvents = clio.mapActivitiesToEvents(data).filter((e) => {
          const t = new Date(e.timestamp).getTime();
          const s = new Date(period.start).getTime();
          const en = new Date(period.end).getTime();
          return t >= s && t <= en;
        });
        events.push(...clioEvents);
      }

      // Optional matter filter
      const filtered = matterFilter
        ? events.filter((e) => {
            if (!e.matter) return false;
            if (matterFilter.matterId && e.matter.matterId !== matterFilter.matterId) return false;
            if (matterFilter.clientName && e.matter.clientName !== matterFilter.clientName) return false;
            if (matterFilter.matterName && e.matter.matterName !== matterFilter.matterName) return false;
            return true;
          })
        : events;

      if (action === 'ingest') {
        return this.createSuccessResult(JSON.stringify({ count: filtered.length, events: filtered }, null, 2));
      }

      const engine = new ValueBillingEngine();
      const analysisInput: AnalysisInput = { window: period, events: filtered, flags };
      const output = await engine.analyze(analysisInput);

      if (action === 'analyze') {
        return this.createSuccessResult(JSON.stringify(output, null, 2));
      }

      if (action === 'propose') {
        const entries: TimeEntryPayload[] = output.proposals.map((p) => ({
          matterId: p.matter?.matterId,
          date: p.date,
          minutes: p.recommendedMinutes,
          description: `${p.taskLabel} — basis: ${p.basis}; normative: ${p.normativeMinutes}m; actual: ${p.actualMinutes ?? 'n/a'}m;`.
            concat(p.complexity ? ` complexity: ${p.complexity};` : ''),
          activityCategory: p.activityCategory,
          metadata: { taskCode: p.taskCode, sourceEventIds: p.sourceEventIds, confidence: p.confidence },
        }));
        return this.createSuccessResult(JSON.stringify({ entries, stats: output.stats }, null, 2));
      }

      if (action === 'push') {
        if (!push || push.provider !== 'clio') {
          return this.createErrorResult('Only Clio push is currently supported.');
        }
        const entries: TimeEntryPayload[] = output.proposals.map((p) => ({
          matterId: p.matter?.matterId,
          date: p.date,
          minutes: p.recommendedMinutes,
          description: `${p.taskLabel} — basis: ${p.basis}; normative: ${p.normativeMinutes}m; actual: ${p.actualMinutes ?? 'n/a'}m;`.
            concat(p.complexity ? ` complexity: ${p.complexity};` : ''),
          activityCategory: p.activityCategory,
          metadata: { taskCode: p.taskCode, sourceEventIds: p.sourceEventIds, confidence: p.confidence },
        }));

        if (push.dryRun) {
          return this.createSuccessResult(JSON.stringify({ push: 'dry_run', provider: 'clio', entries }, null, 2));
        }

        const clio = new ClioClient({ token: sources.clio?.token });
        const results: any[] = [];
        for (const entry of entries) {
          if (!entry.matterId) {
            results.push({ error: 'Missing matterId', entry });
            continue;
          }
          const payload = {
            type: 'TimeEntry',
            description: entry.description,
            date: entry.date.split('T')[0],
            matter_id: entry.matterId,
            quantity: Math.round((entry.minutes / 60) * 100) / 100, // hours with 2 decimals
            activity_category: entry.activityCategory,
            // Attach metadata via note or custom field if supported
          } as any;
          try {
            const res = await clio.createActivity(payload);
            results.push({ ok: true, id: res?.data?.id || res?.id, payload });
          } catch (err: any) {
            results.push({ ok: false, error: err.message, payload });
          }
        }
        return this.createSuccessResult(JSON.stringify({ push: 'executed', provider: 'clio', results }, null, 2));
      }

      return this.createErrorResult('Unknown action');
    } catch (error) {
      return this.createErrorResult(
        `time_value_billing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
})();

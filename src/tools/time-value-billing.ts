import { BaseTool } from './base-tool.js';
import { z } from 'zod';
import {
  ChronometricModule,
  EmailTool,
  LocalActivityTool,
  WestlawTool,
  ClioTool,
  BillingPolicy,
  EngineFlags,
  IChronometricTool,
} from '../chronometric/index.js';
import { ClioClient } from '../services/clio-client.js';

const AnalyzeSchema = z.object({
  action: z.literal('analyze_period'),
  start: z.string().describe('Start ISO datetime'),
  end: z.string().describe('End ISO datetime'),
  sources: z.object({
    local_paths: z.array(z.string()).optional(),
    imap: z.object({
      host: z.string(),
      port: z.number(),
      secure: z.boolean(),
      user: z.string(),
      pass: z.string(),
      mailbox: z.string().optional(),
    }).optional(),
    westlaw_csv: z.array(z.string()).optional(),
    clio: z.object({
      api_key: z.string(),
      base_url: z.string().optional(),
      query: z.record(z.any()).optional(),
    }).optional(),
  }).default({}),
  policy: z.object({
    mode: z.enum(['value','actual','blended']).default('value'),
    blendRatio: z.number().optional(),
    normativeRules: z.array(z.object({
      task: z.string(),
      baselineMinutes: z.number(),
    })).optional(),
    aiNormative: z.boolean().optional(),
    minIncrementMinutes: z.number().optional(),
    roundUp: z.boolean().optional(),
    capMultiplier: z.number().optional(),
  }).optional(),
}).strict();

const PushSchema = z.object({
  action: z.literal('push_entries'),
  entries: z.array(z.object({
    matterId: z.string(),
    date: z.string(),
    minutes: z.number(),
    description: z.string(),
  })),
  clio: z.object({ api_key: z.string(), base_url: z.string().optional() }),
  rate: z.number().optional(),
  user_id: z.union([z.string(), z.number()]).optional(),
}).strict();

const ConfigSchema = z.object({
  action: z.literal('get_config')
}).strict();

const InputSchema = z.discriminatedUnion('action', [AnalyzeSchema, PushSchema, ConfigSchema]);

export const timeValueBilling = new (class extends BaseTool {
  getToolDefinition() {
    return {
      name: 'time_value_billing',
      description: 'Aggregate attorney work across sources and compute value-billing recommendations; optionally push to Clio.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['analyze_period','push_entries','get_config'] },
        },
        required: ['action'],
      },
    };
  }

  async execute(args: any) {
    try {
      const parsed = InputSchema.parse(args);
      switch (parsed.action) {
        case 'analyze_period':
          return await this.handleAnalyze(parsed);
        case 'push_entries':
          return await this.handlePush(parsed);
        case 'get_config':
          return this.createSuccessResult(JSON.stringify({ status: 'ok' }));
        default:
          return this.createErrorResult('Unsupported action');
      }
    } catch (err) {
      return this.createErrorResult(err instanceof Error ? err.message : String(err));
    }
  }

  private async handleAnalyze(input: z.infer<typeof AnalyzeSchema>) {
    // Build tools based on source configuration
    const tools: IChronometricTool[] = [];

    // Local files
    if (input.sources.local_paths && input.sources.local_paths.length) {
      tools.push(new LocalActivityTool({
        paths: input.sources.local_paths,
      }));
    }

    // IMAP
    if (input.sources.imap) {
      tools.push(new EmailTool({
        host: input.sources.imap.host,
        port: input.sources.imap.port,
        secure: input.sources.imap.secure,
        auth: {
          user: input.sources.imap.user,
          pass: input.sources.imap.pass,
        },
        mailbox: input.sources.imap.mailbox,
      }));
    }

    // Westlaw CSV
    if (input.sources.westlaw_csv && input.sources.westlaw_csv.length) {
      tools.push(new WestlawTool({
        csvPaths: input.sources.westlaw_csv,
      }));
    }

    // Clio (optional for evidence)
    if (input.sources.clio) {
      tools.push(new ClioTool({
        apiKey: input.sources.clio.api_key,
        baseUrl: input.sources.clio.base_url,
        query: input.sources.clio.query,
      }));
    }

    // Build billing policy
    const policy: BillingPolicy = {
      mode: input.policy?.mode || 'value',
      blendRatio: input.policy?.blendRatio,
      aiNormative: input.policy?.aiNormative ?? true,
      minIncrementMinutes: input.policy?.minIncrementMinutes ?? 6,
      roundUp: input.policy?.roundUp ?? true,
      capMultiplier: input.policy?.capMultiplier,
    };

    // Build appraiser flags
    const flags: EngineFlags = {
      allowValueBilling: true,
      normativeStrategy: 'standard',
      useLLM: true,
      enableDupeCheck: true,
    };

    // Create and run Chronometric module
    const chronometric = new ChronometricModule({
      tools,
      billingPolicy: policy,
      appraiserFlags: flags,
    });

    const result = await chronometric.analyze(
      { start: input.start, end: input.end },
      policy,
      flags
    );

    // Format response
    return this.createSuccessResult(JSON.stringify({
      period: result.window,
      toolsUsed: result.toolsUsed,
      counts: {
        events: result.stats.totalEvents,
        proposals: result.stats.totalProposals,
        duplicates: result.duplicates.length,
      },
      stats: result.stats,
      proposals: result.proposals.map(p => ({
        id: p.id,
        matter: p.matter,
        date: p.date,
        taskCode: p.taskCode,
        taskLabel: p.taskLabel,
        actualMinutes: p.actualMinutes,
        normativeMinutes: p.normativeMinutes,
        recommendedMinutes: p.recommendedMinutes,
        basis: p.basis,
        description: p.description,
        activityCategory: p.activityCategory,
        complexity: p.complexity,
        confidence: p.confidence,
        evidenceCount: p.evidence.length,
      })),
      duplicates: result.duplicates.map(d => ({
        entry1Id: d.entry1.id,
        entry2Id: d.entry2.id,
        similarity: d.similarity,
        reasons: d.reasons,
      })),
    }, null, 2));
  }

  private async handlePush(input: z.infer<typeof PushSchema>) {
    const clio = new ClioClient({ apiKey: input.clio.api_key, baseUrl: input.clio.base_url });
    const pushed: any[] = [];
    for (const e of input.entries) {
      const hours = e.minutes / 60;
      const body = {
        matter_id: e.matterId,
        date: e.date,
        quantity: Number(hours.toFixed(2)),
        description: e.description,
        rate: input.rate,
        user_id: input.user_id,
      };
      const resp = await clio.createTimeEntry(body as any);
      pushed.push({ id: resp?.data?.id || null, matter_id: e.matterId, status: 'ok' });
    }
    return this.createSuccessResult(JSON.stringify({ pushed }, null, 2));
  }
})();

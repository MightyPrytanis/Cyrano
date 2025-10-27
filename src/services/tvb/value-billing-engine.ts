import { LLMService } from '../llm-service.js';
import {
  AnalysisInput,
  AnalysisOutput,
  EngineFlags,
  NormativeCatalog,
  ProposedEntry,
  SourceEvent,
} from './types.js';

function minutesBetween(startISO: string, endISO?: string): number | undefined {
  if (!endISO) return undefined;
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return Math.max(0, Math.round((e - s) / 60000));
}

function roundToIncrement(minutes: number, inc: number): number {
  return Math.ceil(minutes / inc) * inc;
}

export class ValueBillingEngine {
  private llm: LLMService;
  private catalog: NormativeCatalog;

  constructor(catalog?: NormativeCatalog) {
    this.llm = new LLMService();
    this.catalog = catalog || ValueBillingEngine.defaultCatalog();
  }

  static defaultCatalog(): NormativeCatalog {
    return {
      draft_notice_of_hearing: {
        code: 'draft_notice_of_hearing',
        label: 'Draft Notice of Hearing',
        baseMinutes: 15,
        activityCategory: 'Drafting',
      },
      proof_of_service: {
        code: 'proof_of_service',
        label: 'Prepare Proof of Service',
        baseMinutes: 15,
        activityCategory: 'Drafting',
      },
      research_issue: {
        code: 'research_issue',
        label: 'Research Legal Issue',
        baseMinutes: 90,
        activityCategory: 'Research',
      },
      brief_outlining: {
        code: 'brief_outlining',
        label: 'Outline Brief',
        baseMinutes: 45,
        activityCategory: 'Drafting',
      },
      brief_first_draft: {
        code: 'brief_first_draft',
        label: 'Draft Brief (First Pass)',
        baseMinutes: 120,
        activityCategory: 'Drafting',
      },
      brief_revision: {
        code: 'brief_revision',
        label: 'Revise Brief',
        baseMinutes: 60,
        activityCategory: 'Drafting',
      },
      filing_and_service: {
        code: 'filing_and_service',
        label: 'Filing and Service',
        baseMinutes: 30,
        activityCategory: 'Filing',
      },
      client_update_email: {
        code: 'client_update_email',
        label: 'Client Update Email',
        baseMinutes: 6,
        activityCategory: 'Communication',
      },
      hearing_prep: {
        code: 'hearing_prep',
        label: 'Hearing Preparation',
        baseMinutes: 60,
        activityCategory: 'Preparation',
      },
      professional_development: {
        code: 'professional_development',
        label: 'Professional Development',
        baseMinutes: 30,
        activityCategory: 'Internal',
      },
      admin_tech: {
        code: 'admin_tech',
        label: 'Admin/Tech Issue Resolution',
        baseMinutes: 15,
        activityCategory: 'Internal',
      },
    };
  }

  async analyze(input: AnalysisInput): Promise<AnalysisOutput> {
    const flags: EngineFlags = {
      allowValueBilling: true,
      normativeStrategy: 'standard',
      minEntryMinutes: 6,
      roundingIncrement: 6,
      useLLM: false,
      ...(input.flags || {}),
    };

    const events = [...input.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Attach derived durations where possible
    for (const ev of events) {
      if (ev.durationMinutes == null) {
        ev.durationMinutes = minutesBetween(ev.timestamp, ev.endTimestamp);
      }
    }

    // Group by matter (or undefined -> internal time)
    const matterKey = (e: SourceEvent) =>
      e.matter?.matterId || `${e.matter?.clientName || 'Internal'}::${e.matter?.matterName || 'Unassigned'}`;

    const groups = new Map<string, SourceEvent[]>();
    for (const ev of events) {
      const key = matterKey(ev);
      const arr = groups.get(key) || [];
      arr.push(ev);
      groups.set(key, arr);
    }

    const proposals: ProposedEntry[] = [];

    for (const [key, group] of groups.entries()) {
      const matter = group[0]?.matter || undefined;

      // Sessionize: cluster events into 30-min gaps
      const sessions: SourceEvent[][] = [];
      let current: SourceEvent[] = [];
      let lastTime: number | undefined;
      for (const ev of group) {
        const t = new Date(ev.timestamp).getTime();
        if (lastTime != null && t - lastTime > 30 * 60000) {
          if (current.length) sessions.push(current);
          current = [];
        }
        current.push(ev);
        lastTime = t;
      }
      if (current.length) sessions.push(current);

      for (const session of sessions) {
        const analysis = await this.classifySession(session, flags);
        proposals.push(...analysis);
      }
    }

    // Compute unassigned minutes (time with no events). We approximate by window length minus sum of recommended.
    const totalWindowMinutes = Math.max(
      0,
      Math.round((new Date(input.window.end).getTime() - new Date(input.window.start).getTime()) / 60000)
    );
    const totalRecommended = proposals.reduce((sum, p) => sum + p.recommendedMinutes, 0);
    const unassignedMinutes = Math.max(0, totalWindowMinutes - totalRecommended);

    return {
      proposals: this.compactAndRound(proposals, flags),
      unassignedMinutes,
      stats: {
        totalWindowMinutes,
        totalRecommended,
        matters: groups.size,
      },
    };
  }

  private async classifySession(session: SourceEvent[], flags: EngineFlags): Promise<ProposedEntry[]> {
    // Heuristics
    const matter = session[0]?.matter || {};
    const date = new Date(session[0].timestamp).toISOString();

    const text = session
      .map((e) => `${e.kind} ${e.subject || e.description || e.path || ''}`)
      .join('\n');

    let llmHints: { items?: Array<{ code: string; complexity?: string; minutes?: number; description?: string }>; } = {};

    if (flags.useLLM) {
      try {
        if (!this.llm.hasAnyProvider()) throw new Error('No AI providers configured');
        const response = await this.llm.complete({
          systemPrompt:
            'You are a legal time/value-billing analyst. Given a list of work artifacts (emails, docs, research logs), infer task categories and value-billing minutes. Return strict JSON with items:[{code,complexity,minutes,description}]. Codes must be one of: draft_notice_of_hearing, proof_of_service, research_issue, brief_outlining, brief_first_draft, brief_revision, filing_and_service, client_update_email, hearing_prep, professional_development, admin_tech.',
          userPrompt: `Artifacts for a single work session:\n${text}`,
          maxTokens: 600,
          temperature: 0.2,
        });
        const jsonStart = response.indexOf('{');
        const jsonStr = jsonStart >= 0 ? response.slice(jsonStart) : response;
        llmHints = JSON.parse(jsonStr);
      } catch {
        // ignore LLM errors and fallback to heuristics
      }
    }

    const items: ProposedEntry[] = [];

    if (llmHints.items && Array.isArray(llmHints.items) && llmHints.items.length > 0) {
      for (const it of llmHints.items) {
        const cat = this.catalog[it.code];
        if (!cat) continue;
        const normative = this.adjustNormative(cat.baseMinutes, it.complexity, flags);
        const minutes = flags.allowValueBilling ? normative : Math.max(normative, it.minutes || normative);
        items.push({
          matter,
          date,
          taskCode: cat.code,
          taskLabel: cat.label,
          normativeMinutes: normative,
          actualMinutes: it.minutes,
          recommendedMinutes: minutes,
          basis: flags.allowValueBilling ? 'normative' : 'hybrid',
          description: it.description || cat.label,
          activityCategory: cat.activityCategory,
          sourceEventIds: session.map((e) => e.id),
          complexity: (it.complexity as any) || 'medium',
          confidence: 0.8,
        });
      }
      return items;
    }

    // Heuristic rules
    const hasProofOfService = session.some((e) => /proof of service/i.test(e.subject || e.description || ''));
    const hasNoticeOfHearing = session.some((e) => /notice of hearing/i.test(e.subject || e.description || ''));
    const hasBrief = session.some((e) => /brief/i.test(e.subject || e.description || ''));
    const hasResearch = session.some((e) => e.kind === 'research' || /westlaw|lexis|research/i.test(e.description || ''));
    const hasFiling = session.some((e) => /efile|filing|serve/i.test(e.description || ''));
    const hasClientEmail = session.some((e) => e.kind === 'email' && /client|status|update/i.test(e.subject || ''));

    if (hasNoticeOfHearing) items.push(this.makeProposal('draft_notice_of_hearing', session, matter, date, flags));
    if (hasProofOfService) items.push(this.makeProposal('proof_of_service', session, matter, date, flags));

    if (hasBrief) {
      items.push(this.makeProposal('brief_outlining', session, matter, date, flags));
      items.push(this.makeProposal('brief_first_draft', session, matter, date, flags));
      items.push(this.makeProposal('brief_revision', session, matter, date, flags));
    }

    if (hasResearch) items.push(this.makeProposal('research_issue', session, matter, date, flags));
    if (hasFiling) items.push(this.makeProposal('filing_and_service', session, matter, date, flags));
    if (hasClientEmail) items.push(this.makeProposal('client_update_email', session, matter, date, flags));

    if (items.length === 0) {
      // Default internal time when no classification fits
      items.push(this.makeProposal('admin_tech', session, matter, date, flags));
    }

    return items;
  }

  private makeProposal(
    code: keyof ReturnType<typeof ValueBillingEngine.defaultCatalog>,
    session: SourceEvent[],
    matter: any,
    date: string,
    flags: EngineFlags
  ): ProposedEntry {
    const cat = this.catalog[code];
    const normative = this.adjustNormative(cat.baseMinutes, 'medium', flags);

    const actual = session
      .map((e) => e.durationMinutes || minutesBetween(e.timestamp, e.endTimestamp) || 0)
      .reduce((a, b) => a + b, 0);

    const recommended = flags.allowValueBilling
      ? normative
      : Math.max(normative, actual || normative);

    return {
      matter,
      date,
      taskCode: cat.code,
      taskLabel: cat.label,
      normativeMinutes: normative,
      actualMinutes: actual || undefined,
      recommendedMinutes: recommended,
      basis: flags.allowValueBilling ? 'normative' : 'hybrid',
      description: cat.label,
      activityCategory: cat.activityCategory,
      sourceEventIds: session.map((e) => e.id),
      complexity: 'medium',
      confidence: 0.6,
    };
  }

  private adjustNormative(base: number, complexity: any, flags: EngineFlags): number {
    let factor = 1;
    const strat = flags.normativeStrategy || 'standard';
    if (strat === 'conservative') factor *= 0.9;
    if (strat === 'aggressive') factor *= 1.2;

    if (complexity === 'high') factor *= 1.5;
    if (complexity === 'novel') factor *= 1.8;

    return Math.round(base * factor);
  }

  private compactAndRound(items: ProposedEntry[], flags: EngineFlags): ProposedEntry[] {
    // Round and enforce minimum
    const inc = flags.roundingIncrement || 6;
    const min = flags.minEntryMinutes || 6;

    return items.map((p) => {
      let minutes = roundToIncrement(p.recommendedMinutes, inc);
      if (minutes < min) minutes = min;
      return { ...p, recommendedMinutes: minutes };
    });
  }
}

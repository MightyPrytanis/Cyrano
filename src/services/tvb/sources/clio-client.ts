import { URLSearchParams } from 'node:url';
import { SourceEvent, TimeWindow, MatterRef } from '../types.js';

export interface ClioClientConfig {
  token?: string; // Bearer token (OAuth or API)
  baseUrl?: string; // default v4
}

export class ClioClient {
  private token: string | undefined;
  private baseUrl: string;

  constructor(config: ClioClientConfig = {}) {
    this.token = config.token || process.env.CLIO_API_KEY;
    this.baseUrl = config.baseUrl || 'https://app.clio.com/api/v4';
  }

  private get headers() {
    if (!this.token) throw new Error('CLIO_API_KEY is required to call Clio API');
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    } as Record<string, string>;
  }

  async getMatters(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    const resp = await fetch(`${this.baseUrl}/matters${query ? `?${query}` : ''}`, {
      headers: this.headers,
    });
    if (!resp.ok) throw new Error(`Clio getMatters failed: ${resp.status} ${resp.statusText}`);
    return await resp.json();
  }

  async getActivities(params: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    const resp = await fetch(`${this.baseUrl}/activities${query ? `?${query}` : ''}`, {
      headers: this.headers,
    });
    if (!resp.ok) throw new Error(`Clio getActivities failed: ${resp.status} ${resp.statusText}`);
    return await resp.json();
  }

  async createActivity(payload: any): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/activities`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Clio createActivity failed: ${resp.status} ${resp.statusText} - ${text}`);
    }
    return await resp.json();
  }

  mapActivitiesToEvents(data: any): SourceEvent[] {
    const rows = Array.isArray(data?.data) ? data.data : data?.activities || [];
    return rows.map((row: any): SourceEvent => ({
      id: String(row.id),
      kind: 'clio_activity',
      timestamp: row.start_time || row.date || row.created_at,
      endTimestamp: row.end_time || undefined,
      durationMinutes: row.duration || row.quantity || undefined,
      matter: this.extractMatter(row),
      subject: row.description || row.note || row.activity_description,
      description: row.description || row.note || '',
      metadata: row,
    }));
  }

  private extractMatter(row: any): MatterRef | undefined {
    const matter = row.matter || row.matter_id || row?.relationships?.matter;
    if (!matter) return undefined;
    if (typeof matter === 'string' || typeof matter === 'number') {
      return { matterId: String(matter) };
    }
    return {
      matterId: String(matter.id || matter.matter_id),
      matterName: matter.display_name || matter.name,
      clientName: matter.client?.name,
    };
  }
}

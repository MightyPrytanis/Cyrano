/**
 * Chronometric Module - Email Tool (IMAP)
 * 
 * Atomic tool for fetching email events via IMAP.
 * Part of the Tool layer in the Cyrano modular architecture.
 */

import { ImapFlow, type FetchMessageObject } from 'imapflow';
import {
  IChronometricTool,
  EmailToolConfig,
  SourceEvent,
  TimeWindow,
  ToolMetadata,
  Evidence,
} from '../types/index.js';
import { generateId, toDateOnly } from '../utils.js';
import { MILLISECONDS_PER_DAY, MINIMAL_EMAIL_MINUTES } from '../constants.js';

export class EmailTool implements IChronometricTool {
  private config: EmailToolConfig;

  constructor(config: EmailToolConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(
      this.config.host &&
      this.config.auth?.user &&
      this.config.auth?.pass
    );
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'EmailTool',
      description: 'Fetches email events from IMAP server',
      sourceKind: 'email',
      version: '1.0.0',
      requiresAuth: true,
    };
  }

  async fetchEvents(window: TimeWindow): Promise<SourceEvent[]> {
    if (!this.isConfigured()) {
      throw new Error('EmailTool is not properly configured');
    }

    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      logger: false,
    });

    try {
      await client.connect();
      
      const mailbox = this.config.mailbox || 'INBOX';
      await client.mailboxOpen(mailbox);

      const startDate = new Date(window.start);
      const endDate = new Date(window.end);

      // IMAP SEARCH with date range
      // Note: IMAP before/since work at day granularity
      const query = {
        since: startDate,
        // Add one day to end date for exclusive upper bound
        before: new Date(endDate.getTime() + MILLISECONDS_PER_DAY),
      } as any;

      const events: SourceEvent[] = [];
      const uids = (await client.search(query)) || [];

      for await (const message of client.fetch(uids, {
        envelope: true,
        size: true,
      })) {
        const msg = message as FetchMessageObject;
        const env = msg.envelope;
        
        if (!env) continue;

        const subject = env.subject || '(no subject)';
        const from = env.from?.map((a) => a.address || '').filter(Boolean).join(', ') || '';
        const to = env.to?.map((a) => a.address || '').filter(Boolean).join(', ') || '';
        const date = env.date ? new Date(env.date).toISOString() : new Date().toISOString();

        const evidence: Evidence[] = [
          {
            type: 'direct',
            sourceKind: 'email',
            description: `Email: "${subject}" from ${from}`,
            timestamp: date,
            metadata: {
              messageId: env.messageId,
              inReplyTo: env.inReplyTo,
              size: msg.size,
            },
          },
        ];

        events.push({
          id: generateId('email'),
          kind: 'email',
          timestamp: date,
          durationMinutes: MINIMAL_EMAIL_MINUTES,
          subject,
          description: `Email: ${subject}`,
          evidence,
          metadata: {
            from,
            to,
            messageId: env.messageId,
            size: msg.size,
          },
        });
      }

      return events;
    } finally {
      await client.logout();
    }
  }
}

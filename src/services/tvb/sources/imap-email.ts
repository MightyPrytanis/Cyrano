import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { SourceEvent, TimeWindow } from '../types.js';

export interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailbox?: string; // default INBOX
}

export class IMAPEmailConnector {
  private config: IMAPConfig;

  constructor(config: IMAPConfig) {
    this.config = config;
  }

  async fetchEvents(window: TimeWindow, searchQuery?: string): Promise<SourceEvent[]> {
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: { user: this.config.user, pass: this.config.password },
    });

    const mailbox = this.config.mailbox || 'INBOX';
    const events: SourceEvent[] = [];

    await client.connect();
    try {
      await client.mailboxOpen(mailbox);

      const since = new Date(window.start);
      const before = new Date(window.end);

      for await (const msg of client.fetch({ since, before }, { envelope: true, source: true, internalDate: true })) {
        const parsed = await simpleParser(msg.source as Buffer);
        if (searchQuery && !(parsed.subject || '').toLowerCase().includes(searchQuery.toLowerCase())) continue;

        events.push({
          id: String(msg.uid),
          kind: 'email',
          timestamp: (msg.internalDate || new Date()).toISOString(),
          subject: parsed.subject || '',
          description: parsed.text?.slice(0, 500) || '',
          metadata: {
            from: parsed.from?.text,
            to: parsed.to?.text,
            cc: parsed.cc?.text,
            bcc: parsed.bcc?.text,
            messageId: parsed.messageId,
          },
        });
      }
    } finally {
      await client.logout();
    }

    return events;
  }
}

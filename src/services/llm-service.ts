import { apiValidator } from '../utils/api-validator.js';
import { PerplexityService } from './perplexity.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export class LLMService {
  private perplexity?: PerplexityService;
  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor() {
    const providers = apiValidator.getAvailableProviders();

    if (providers.includes('perplexity') && process.env.PERPLEXITY_API_KEY) {
      this.perplexity = new PerplexityService({
        apiKey: process.env.PERPLEXITY_API_KEY,
      });
    }

    if (providers.includes('openai') && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    if (providers.includes('anthropic') && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  hasAnyProvider(): boolean {
    return Boolean(this.perplexity || this.openai || this.anthropic);
  }

  async complete(req: LLMRequest): Promise<string> {
    if (this.perplexity) {
      const response = await this.perplexity.makeRequest({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
        max_tokens: req.maxTokens ?? 3000,
        temperature: req.temperature ?? 0.3,
      });
      return response.choices[0].message.content;
    }

    if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
        max_tokens: req.maxTokens ?? 3000,
        temperature: req.temperature ?? 0.3,
      });
      return response.choices[0]?.message?.content || '';
    }

    if (this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: req.maxTokens ?? 3000,
        temperature: req.temperature ?? 0.3,
        messages: [
          { role: 'user', content: `${req.systemPrompt}\n\n${req.userPrompt}` },
        ],
      });
      const text = response.content
        .map((c) => (c.type === 'text' ? c.text : ''))
        .join('\n');
      return text;
    }

    throw new Error(
      'No AI providers configured. Set PERPLEXITY_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.'
    );
  }
}

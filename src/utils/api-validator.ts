import { z } from 'zod';

/**
 * API Configuration and Validation
 * 
 * Validates that required API keys are present and properly formatted
 */

export interface APIConfig {
  openai?: string;
  anthropic?: string;
  google?: string;
  perplexity?: string;
}

export class APIValidator {
  private static instance: APIValidator;
  private config: APIConfig = {};
  private validated: boolean = false;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): APIValidator {
    if (!APIValidator.instance) {
      APIValidator.instance = new APIValidator();
    }
    return APIValidator.instance;
  }

  private loadConfig(): void {
    this.config = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      google: process.env.GEMINI_API_KEY,
      perplexity: process.env.PERPLEXITY_API_KEY
    };
  }

  public validateProvider(provider: string): { valid: boolean; error?: string } {
    switch (provider.toLowerCase()) {
      case 'openai':
      case 'gpt-4':
      case 'gpt-3.5':
        if (!this.config.openai) {
          return { valid: false, error: 'OPENAI_API_KEY environment variable is required for OpenAI integration' };
        }
        if (!this.config.openai.startsWith('sk-')) {
          return { valid: false, error: 'Invalid OpenAI API key format (must start with sk-)' };
        }
        return { valid: true };

      case 'anthropic':
      case 'claude':
        if (!this.config.anthropic) {
          return { valid: false, error: 'ANTHROPIC_API_KEY environment variable is required for Claude integration' };
        }
        if (!this.config.anthropic.startsWith('sk-ant-')) {
          return { valid: false, error: 'Invalid Anthropic API key format (must start with sk-ant-)' };
        }
        return { valid: true };

      case 'google':
      case 'gemini':
        if (!this.config.google) {
          return { valid: false, error: 'GEMINI_API_KEY environment variable is required for Google AI integration' };
        }
        return { valid: true };

      case 'perplexity':
        if (!this.config.perplexity) {
          return { valid: false, error: 'PERPLEXITY_API_KEY environment variable is required for Perplexity integration' };
        }
        if (!this.config.perplexity.startsWith('pplx-')) {
          return { valid: false, error: 'Invalid Perplexity API key format (must start with pplx-)' };
        }
        return { valid: true };

      default:
        return { valid: false, error: `Unknown AI provider: ${provider}. Supported providers: openai, anthropic, google, perplexity` };
    }
  }

  public validateAllProviders(providers: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const provider of providers) {
      const result = this.validateProvider(provider);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getAvailableProviders(): string[] {
    const available: string[] = [];
    
    if (this.config.openai) available.push('openai');
    if (this.config.anthropic) available.push('anthropic');  
    if (this.config.google) available.push('google');
    if (this.config.perplexity) available.push('perplexity');
    
    return available;
  }

  public hasAnyValidProviders(): boolean {
    return this.getAvailableProviders().length > 0;
  }

  public getConfigSummary(): { configured: string[]; missing: string[]; total: number } {
    const allProviders = ['openai', 'anthropic', 'google', 'perplexity'];
    const configured = this.getAvailableProviders();
    const missing = allProviders.filter(p => !configured.includes(p));
    
    return {
      configured,
      missing,
      total: allProviders.length
    };
  }
}

export const apiValidator = APIValidator.getInstance();
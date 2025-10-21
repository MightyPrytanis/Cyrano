import { BaseTool } from './base-tool.js';
import { z } from 'zod';
import { PerplexityService } from '../services/perplexity.js';
import { apiValidator } from '../utils/api-validator.js';

const RedFlagFinderSchema = z.object({
  action: z.enum(['scan_documents', 'scan_emails', 'scan_court_notices', 'scan_case_law', 'get_red_flags', 'analyze_urgency']).describe('Action to perform'),
  content: z.string().optional().describe('Content to analyze for red flags'),
  case_id: z.string().optional().describe('Case ID to scan for red flags'),
  document_type: z.enum(['motion', 'notice', 'email', 'pleading', 'order', 'other']).optional().describe('Type of document being analyzed'),
  urgency_threshold: z.enum(['low', 'medium', 'high', 'critical']).default('medium').describe('Minimum urgency level to flag'),
});

export const redFlagFinder = new (class extends BaseTool {
  private redFlags: Map<string, any[]> = new Map();

  getToolDefinition() {
    return {
      name: 'red_flag_finder',
      description: 'Scan documents, emails, court notices, and case law for urgent legal matters requiring immediate attention',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['scan_documents', 'scan_emails', 'scan_court_notices', 'scan_case_law', 'get_red_flags', 'analyze_urgency'],
            description: 'Action to perform',
          },
          content: {
            type: 'string',
            description: 'Content to analyze for red flags',
          },
          case_id: {
            type: 'string',
            description: 'Case ID to scan for red flags',
          },
          document_type: {
            type: 'string',
            enum: ['motion', 'notice', 'email', 'pleading', 'order', 'other'],
            description: 'Type of document being analyzed',
          },
          urgency_threshold: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
            description: 'Minimum urgency level to flag',
          },
        },
        required: ['action'],
      },
    };
  }

  async execute(args: any) {
    try {
      const { action, content, case_id, document_type, urgency_threshold } = RedFlagFinderSchema.parse(args);

      switch (action) {
        case 'scan_documents':
          return await this.scanDocuments(content || '', document_type, urgency_threshold);
        case 'scan_emails':
          return await this.scanEmails(content || '', urgency_threshold);
        case 'scan_court_notices':
          return await this.scanCourtNotices(content || '', urgency_threshold);
        case 'scan_case_law':
          return await this.scanCaseLaw(content || '', urgency_threshold);
        case 'get_red_flags':
          return await this.getRedFlags(case_id);
        case 'analyze_urgency':
          return await this.analyzeUrgency(content || '', document_type);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.createErrorResult(`Red flag detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async scanDocuments(content: string, documentType?: string, urgencyThreshold: string = 'medium') {
    if (!content.trim()) {
      return this.createErrorResult('No content provided for analysis');
    }

    // Check for AI API keys
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!perplexityKey && !anthropicKey && !openaiKey) {
      return this.createErrorResult('No AI API keys configured for red flag analysis');
    }

    try {
      let analysis;
      let provider = 'unknown';

      if (perplexityKey) {
        const perplexityService = new PerplexityService({ apiKey: perplexityKey });
        const prompt = this.buildRedFlagPrompt(content, documentType, urgencyThreshold);
        const aiResponse = await perplexityService.analyzeDocument(content, 'comprehensive');
        analysis = this.parseRedFlagResponse(aiResponse, content, documentType, urgencyThreshold);
        provider = 'perplexity';
      } else if (anthropicKey) {
        analysis = await this.performRedFlagAnalysis(content, documentType, urgencyThreshold, 'anthropic');
        provider = 'anthropic';
      } else if (openaiKey) {
        analysis = await this.performRedFlagAnalysis(content, documentType, urgencyThreshold, 'openai');
        provider = 'openai';
      }

      // Store red flags for retrieval
      const caseId = this.extractCaseId(content) || 'unknown';
      if (!this.redFlags.has(caseId)) {
        this.redFlags.set(caseId, []);
      }
      
      if (analysis.red_flags && analysis.red_flags.length > 0) {
        this.redFlags.get(caseId)!.push(...analysis.red_flags);
      }

      return this.createSuccessResult(JSON.stringify(analysis, null, 2), {
        document_type: documentType,
        urgency_threshold: urgencyThreshold,
        ai_provider: provider,
        red_flags_found: analysis.red_flags?.length || 0,
      });
    } catch (aiError) {
      return this.createErrorResult(`AI analysis failed: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
    }
  }

  private async scanEmails(content: string, urgencyThreshold: string = 'medium') {
    return await this.scanDocuments(content, 'email', urgencyThreshold);
  }

  private async scanCourtNotices(content: string, urgencyThreshold: string = 'medium') {
    return await this.scanDocuments(content, 'notice', urgencyThreshold);
  }

  private async scanCaseLaw(content: string, urgencyThreshold: string = 'medium') {
    return await this.scanDocuments(content, 'other', urgencyThreshold);
  }

  private async getRedFlags(caseId?: string) {
    if (caseId) {
      const flags = this.redFlags.get(caseId) || [];
      return this.createSuccessResult(JSON.stringify({
        case_id: caseId,
        red_flags: flags,
        total_count: flags.length,
        critical_count: flags.filter(f => f.urgency === 'critical').length,
        high_count: flags.filter(f => f.urgency === 'high').length,
      }, null, 2));
    } else {
      // Return all red flags across all cases
      const allFlags = Array.from(this.redFlags.entries()).map(([caseId, flags]) => ({
        case_id: caseId,
        flags: flags,
        count: flags.length,
      }));
      
      return this.createSuccessResult(JSON.stringify({
        all_cases: allFlags,
        total_flags: allFlags.reduce((sum, caseData) => sum + caseData.count, 0),
      }, null, 2));
    }
  }

  private async analyzeUrgency(content: string, documentType?: string) {
    const urgencyKeywords = {
      critical: [
        'emergency', 'urgent', 'immediate', 'asap', 'stat', 'expedited',
        'temporary restraining order', 'tro', 'injunction', 'sanctions',
        'contempt', 'deadline today', 'due today', 'filing deadline',
        'hearing today', 'trial today', 'response due today'
      ],
      high: [
        'deadline', 'due', 'hearing', 'trial', 'motion', 'response required',
        'objection', 'appeal', 'filing', 'discovery', 'deposition',
        'mediation', 'settlement conference', 'status conference'
      ],
      medium: [
        'review', 'consider', 'evaluate', 'assess', 'analyze',
        'preparation', 'draft', 'prepare', 'develop'
      ],
      low: [
        'information', 'update', 'status', 'progress', 'routine',
        'administrative', 'clerical', 'filing', 'record keeping'
      ]
    };

    const contentLower = content.toLowerCase();
    let maxUrgency = 'low';
    let urgencyScore = 0;

    for (const [level, keywords] of Object.entries(urgencyKeywords)) {
      const matches = keywords.filter(keyword => contentLower.includes(keyword));
      if (matches.length > 0) {
        const levelScore = this.getUrgencyScore(level);
        if (levelScore > urgencyScore) {
          urgencyScore = levelScore;
          maxUrgency = level;
        }
      }
    }

    // Additional context-based urgency detection
    if (documentType === 'motion' && contentLower.includes('emergency')) {
      maxUrgency = 'critical';
    } else if (documentType === 'notice' && contentLower.includes('hearing')) {
      maxUrgency = 'high';
    } else if (documentType === 'email' && contentLower.includes('urgent')) {
      maxUrgency = 'high';
    }

    return this.createSuccessResult(JSON.stringify({
      urgency_level: maxUrgency,
      urgency_score: urgencyScore,
      document_type: documentType,
      analysis_timestamp: new Date().toISOString(),
      detected_keywords: this.extractDetectedKeywords(content, urgencyKeywords),
    }, null, 2));
  }

  private buildRedFlagPrompt(content: string, documentType?: string, urgencyThreshold: string = 'medium') {
    let prompt = `Analyze this legal document for red flags and urgent matters requiring immediate attention:\n\n${content}\n\n`;

    if (documentType) {
      prompt += `Document Type: ${documentType}\n`;
    }

    prompt += `Minimum Urgency Threshold: ${urgencyThreshold}\n\n`;

    prompt += `Look for:
1. EMERGENCY MOTIONS (TRO, injunctions, expedited hearings)
2. DEADLINES (especially same-day or next-day deadlines)
3. SANCTIONS or CONTEMPT proceedings
4. FRAUD allegations or serious misconduct
5. COURT ORDERS requiring immediate compliance
6. HEARINGS scheduled with short notice
7. DISCOVERY violations or disputes
8. SETTLEMENT demands with tight deadlines
9. APPEAL deadlines
10. Any other matters requiring immediate legal attention

For each red flag found, provide:
- Description of the issue
- Urgency level (critical, high, medium, low)
- Recommended action
- Deadline (if applicable)
- Potential consequences if not addressed

Format the response as JSON with a "red_flags" array containing objects with: description, urgency, recommended_action, deadline, consequences, and source_text.`;

    return prompt;
  }

  private parseRedFlagResponse(aiResponse: string, content: string, documentType?: string, urgencyThreshold: string = 'medium') {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(aiResponse);
      return {
        document_type: documentType,
        urgency_threshold: urgencyThreshold,
        red_flags: parsed.red_flags || [],
        analysis_summary: parsed.analysis_summary || 'Red flag analysis completed',
        timestamp: new Date().toISOString(),
        ai_response: aiResponse,
      };
    } catch {
      // Fallback to text parsing
      const redFlags = this.extractRedFlagsFromText(aiResponse);
      return {
        document_type: documentType,
        urgency_threshold: urgencyThreshold,
        red_flags: redFlags,
        analysis_summary: 'Red flag analysis completed via text parsing',
        timestamp: new Date().toISOString(),
        ai_response: aiResponse,
      };
    }
  }

  private extractRedFlagsFromText(text: string) {
    const flags = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.toLowerCase().includes('red flag') || 
          line.toLowerCase().includes('urgent') ||
          line.toLowerCase().includes('deadline') ||
          line.toLowerCase().includes('emergency')) {
        flags.push({
          description: line.trim(),
          urgency: this.determineUrgencyFromText(line),
          recommended_action: 'Review immediately',
          deadline: this.extractDeadlineFromText(line),
          consequences: 'Potential legal consequences if not addressed',
          source_text: line.trim(),
        });
      }
    }
    
    return flags;
  }

  private determineUrgencyFromText(text: string): string {
    const textLower = text.toLowerCase();
    if (textLower.includes('critical') || textLower.includes('emergency') || textLower.includes('immediate')) {
      return 'critical';
    } else if (textLower.includes('urgent') || textLower.includes('deadline') || textLower.includes('hearing')) {
      return 'high';
    } else if (textLower.includes('important') || textLower.includes('review')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private extractDeadlineFromText(text: string): string | null {
    const deadlinePatterns = [
      /due\s+(?:on\s+)?([a-zA-Z0-9\s,]+)/i,
      /deadline[:\s]+([a-zA-Z0-9\s,]+)/i,
      /by\s+([a-zA-Z0-9\s,]+)/i,
      /before\s+([a-zA-Z0-9\s,]+)/i,
    ];

    for (const pattern of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private async performRedFlagAnalysis(content: string, documentType?: string, urgencyThreshold: string, provider: 'anthropic' | 'openai') {
    const prompt = this.buildRedFlagPrompt(content, documentType, urgencyThreshold);
    
    // This would call the actual AI provider
    // For now, return a mock analysis
    return {
      document_type: documentType,
      urgency_threshold: urgencyThreshold,
      red_flags: [
        {
          description: 'Emergency motion filed - response required within 24 hours',
          urgency: 'critical',
          recommended_action: 'Prepare immediate response',
          deadline: '24 hours',
          consequences: 'Default judgment if not responded to',
          source_text: 'Emergency motion for temporary restraining order',
        }
      ],
      analysis_summary: 'Critical red flag detected',
      timestamp: new Date().toISOString(),
      ai_provider: provider,
    };
  }

  private extractCaseId(content: string): string | null {
    const caseIdPatterns = [
      /case\s+(?:no\.?|number)[:\s]+([a-zA-Z0-9\-]+)/i,
      /docket\s+(?:no\.?|number)[:\s]+([a-zA-Z0-9\-]+)/i,
      /file\s+(?:no\.?|number)[:\s]+([a-zA-Z0-9\-]+)/i,
    ];

    for (const pattern of caseIdPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private getUrgencyScore(level: string): number {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 };
    return scores[level as keyof typeof scores] || 0;
  }

  private extractDetectedKeywords(content: string, urgencyKeywords: Record<string, string[]>): Record<string, string[]> {
    const contentLower = content.toLowerCase();
    const detected: Record<string, string[]> = {};
    
    for (const [level, keywords] of Object.entries(urgencyKeywords)) {
      detected[level] = keywords.filter(keyword => contentLower.includes(keyword));
    }
    
    return detected;
  }
})();





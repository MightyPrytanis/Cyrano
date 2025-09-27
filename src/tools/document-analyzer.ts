import { BaseTool } from './base-tool.js';
import { z } from 'zod';

const DocumentAnalyzerSchema = z.object({
  document_text: z.string().describe('The legal document text to analyze'),
  analysis_type: z.enum(['comprehensive', 'summary', 'key_points', 'metadata']).default('comprehensive'),
  focus_areas: z.array(z.string()).optional().describe('Specific areas to focus analysis on'),
});

export const documentAnalyzer = new (class extends BaseTool {
  getToolDefinition() {
    return {
      name: 'document_analyzer',
      description: 'Analyze legal documents to extract key information, metadata, and insights',
      inputSchema: {
        type: 'object',
        properties: {
          document_text: {
            type: 'string',
            description: 'The legal document text to analyze',
          },
          analysis_type: {
            type: 'string',
            enum: ['comprehensive', 'summary', 'key_points', 'metadata'],
            default: 'comprehensive',
            description: 'Type of analysis to perform',
          },
          focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific areas to focus analysis on',
          },
        },
        required: ['document_text'],
      },
    };
  }

  async execute(args: any) {
    try {
      const { document_text, analysis_type, focus_areas } = DocumentAnalyzerSchema.parse(args);

      // Simulate document analysis
      const analysis = this.performAnalysis(document_text, analysis_type, focus_areas);

      return this.createSuccessResult(JSON.stringify(analysis, null, 2), {
        analysis_type,
        word_count: document_text.split(' ').length,
        focus_areas: focus_areas || [],
      });
    } catch (error) {
      return this.createErrorResult(`Document analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public performAnalysis(documentText: string, analysisType: string, focusAreas?: string[]) {
    const wordCount = documentText.split(' ').length;
    const paragraphCount = documentText.split('\n\n').length;
    
    const analysis = {
      metadata: {
        word_count: wordCount,
        paragraph_count: paragraphCount,
        analysis_type: analysisType,
        timestamp: new Date().toISOString(),
      },
      key_points: this.extractKeyPoints(documentText),
      summary: this.generateSummary(documentText),
      legal_elements: this.identifyLegalElements(documentText),
      recommendations: this.generateRecommendations(documentText),
    };

    if (focusAreas && focusAreas.length > 0) {
      analysis.focused_analysis = this.performFocusedAnalysis(documentText, focusAreas);
    }

    return analysis;
  }

  public extractKeyPoints(text: string): string[] {
    // Simple key point extraction
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 5).map(s => s.trim());
  }

  public generateSummary(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).join('. ').trim() + '.';
  }

  public identifyLegalElements(text: string): string[] {
    const legalTerms = [
      'contract', 'agreement', 'liability', 'damages', 'breach', 'warranty',
      'indemnification', 'jurisdiction', 'governing law', 'force majeure',
      'termination', 'remedy', 'arbitration', 'mediation'
    ];
    
    return legalTerms.filter(term => 
      text.toLowerCase().includes(term)
    );
  }

  public generateRecommendations(text: string): string[] {
    return [
      'Review for completeness of legal terms',
      'Verify jurisdiction and governing law clauses',
      'Check for potential liability issues',
      'Ensure proper termination and remedy provisions'
    ];
  }

  public performFocusedAnalysis(text: string, focusAreas: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    focusAreas.forEach(area => {
      switch (area.toLowerCase()) {
        case 'contracts':
          result.contracts = this.analyzeContracts(text);
          break;
        case 'liability':
          result.liability = this.analyzeLiability(text);
          break;
        case 'compliance':
          result.compliance = this.analyzeCompliance(text);
          break;
        default:
          result[area] = `Analysis for ${area} not implemented`;
      }
    });
    
    return result;
  }

  public analyzeContracts(text: string): any {
    return {
      contract_indicators: (text.match(/contract|agreement|terms|conditions/gi) || []).length,
      parties_mentioned: this.extractParties(text),
      key_provisions: this.extractKeyProvisions(text),
    };
  }

  public analyzeLiability(text: string): any {
    return {
      liability_mentions: (text.match(/liability|damages|breach|negligence/gi) || []).length,
      risk_factors: this.identifyRiskFactors(text),
      protection_clauses: this.identifyProtectionClauses(text),
    };
  }

  public analyzeCompliance(text: string): any {
    return {
      regulatory_mentions: (text.match(/compliance|regulation|statute|law/gi) || []).length,
      required_elements: this.identifyRequiredElements(text),
      compliance_risks: this.identifyComplianceRisks(text),
    };
  }

  public extractParties(text: string): string[] {
    const partyPattern = /(?:party|parties|between|and)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
    const matches = text.match(partyPattern) || [];
    return matches.map(match => match.replace(/(?:party|parties|between|and)\s+/i, '').trim());
  }

  public extractKeyProvisions(text: string): string[] {
    const provisionPattern = /(?:section|clause|provision|term)\s+\d+[:\-\.]?\s*([^.!?]+)/gi;
    const matches = text.match(provisionPattern) || [];
    return matches.map(match => match.replace(/(?:section|clause|provision|term)\s+\d+[:\-\.]?\s*/i, '').trim());
  }

  public identifyRiskFactors(text: string): string[] {
    const riskTerms = ['risk', 'hazard', 'danger', 'exposure', 'vulnerability'];
    return riskTerms.filter(term => text.toLowerCase().includes(term));
  }

  public identifyProtectionClauses(text: string): string[] {
    const protectionTerms = ['indemnification', 'hold harmless', 'limitation of liability', 'disclaimer'];
    return protectionTerms.filter(term => text.toLowerCase().includes(term));
  }

  public identifyRequiredElements(text: string): string[] {
    const requiredTerms = ['required', 'must', 'shall', 'obligation', 'duty'];
    return requiredTerms.filter(term => text.toLowerCase().includes(term));
  }

  public identifyComplianceRisks(text: string): string[] {
    const riskTerms = ['non-compliance', 'violation', 'penalty', 'fine', 'sanction'];
    return riskTerms.filter(term => text.toLowerCase().includes(term));
  }
})();

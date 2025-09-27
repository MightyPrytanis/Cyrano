import { BaseTool } from './base-tool.js';
import { z } from 'zod';

const ComplianceCheckerSchema = z.object({
  document_text: z.string().describe('The document to check for compliance'),
  regulations: z.array(z.string()).optional().describe('Specific regulations to check against'),
  jurisdiction: z.string().optional().describe('Jurisdiction for compliance'),
  industry: z.string().optional().describe('Industry-specific compliance requirements'),
});

export const complianceChecker = new (class extends BaseTool {
  getToolDefinition() {
    return {
      name: 'compliance_checker',
      description: 'Check documents for regulatory compliance and identify violations',
      inputSchema: {
        type: 'object',
        properties: {
          document_text: {
            type: 'string',
            description: 'The document to check for compliance',
          },
          regulations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific regulations to check against',
          },
          jurisdiction: {
            type: 'string',
            description: 'Jurisdiction for compliance',
          },
          industry: {
            type: 'string',
            description: 'Industry-specific compliance requirements',
          },
        },
        required: ['document_text'],
      },
    };
  }

  async execute(args: any) {
    try {
      const { document_text, regulations, jurisdiction, industry } = ComplianceCheckerSchema.parse(args);
      const compliance = this.checkCompliance(document_text, regulations, jurisdiction, industry);
      return this.createSuccessResult(JSON.stringify(compliance, null, 2));
    } catch (error) {
      return this.createErrorResult(`Compliance check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public checkCompliance(document: string, regulations?: string[], jurisdiction?: string, industry?: string) {
    return {
      metadata: {
        timestamp: new Date().toISOString(),
        jurisdiction: jurisdiction || 'not specified',
        industry: industry || 'not specified',
        regulations_checked: regulations?.length || 0,
      },
      compliance_score: this.calculateComplianceScore(document),
      violations: this.identifyViolations(document, regulations),
      recommendations: this.generateComplianceRecommendations(document),
      risk_level: this.assessRiskLevel(document),
    };
  }

  public calculateComplianceScore(document: string): number {
    const violations = this.identifyViolations(document);
    return Math.max(0, 1 - (violations.length * 0.1));
  }

  public identifyViolations(document: string, regulations?: string[]): string[] {
    const violations: string[] = [];
    
    if (this.hasDiscriminatoryLanguage(document)) {
      violations.push('Potential discriminatory language detected');
    }
    
    if (this.hasPrivacyViolations(document)) {
      violations.push('Privacy policy violations detected');
    }
    
    if (this.hasAccessibilityIssues(document)) {
      violations.push('Accessibility compliance issues detected');
    }
    
    return violations;
  }

  public generateComplianceRecommendations(document: string): string[] {
    const recommendations: string[] = [];
    
    if (this.hasDiscriminatoryLanguage(document)) {
      recommendations.push('Review and remove discriminatory language');
    }
    
    if (this.hasPrivacyViolations(document)) {
      recommendations.push('Add comprehensive privacy policy');
    }
    
    return recommendations;
  }

  public assessRiskLevel(document: string): string {
    const violations = this.identifyViolations(document);
    if (violations.length === 0) return 'LOW';
    if (violations.length <= 2) return 'MEDIUM';
    return 'HIGH';
  }

  public hasDiscriminatoryLanguage(document: string): boolean {
    const discriminatoryTerms = ['discriminate', 'exclude', 'prefer', 'bias'];
    return discriminatoryTerms.some(term => document.toLowerCase().includes(term));
  }

  public hasPrivacyViolations(document: string): boolean {
    const privacyTerms = ['personal data', 'privacy', 'confidential'];
    return privacyTerms.some(term => document.toLowerCase().includes(term));
  }

  public hasAccessibilityIssues(document: string): boolean {
    return !document.toLowerCase().includes('accessibility') && 
           !document.toLowerCase().includes('ada');
  }
})();


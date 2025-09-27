import { BaseTool } from './base-tool.js';
import { z } from 'zod';

const LegalReviewerSchema = z.object({
  document_text: z.string().describe('The legal document to review'),
  review_type: z.enum(['compliance', 'accuracy', 'completeness', 'comprehensive']).default('comprehensive'),
  jurisdiction: z.string().optional().describe('Jurisdiction for legal compliance'),
  practice_area: z.string().optional().describe('Legal practice area'),
});

export const legalReviewer = new (class extends BaseTool {
  getToolDefinition() {
    return {
      name: 'legal_reviewer',
      description: 'Review legal documents for compliance, accuracy, and completeness',
      inputSchema: {
        type: 'object',
        properties: {
          document_text: {
            type: 'string',
            description: 'The legal document to review',
          },
          review_type: {
            type: 'string',
            enum: ['compliance', 'accuracy', 'completeness', 'comprehensive'],
            default: 'comprehensive',
            description: 'Type of review to perform',
          },
          jurisdiction: {
            type: 'string',
            description: 'Jurisdiction for legal compliance',
          },
          practice_area: {
            type: 'string',
            description: 'Legal practice area',
          },
        },
        required: ['document_text'],
      },
    };
  }

  async execute(args: any) {
    try {
      const { document_text, review_type, jurisdiction, practice_area } = LegalReviewerSchema.parse(args);

      const review = this.performLegalReview(document_text, review_type, jurisdiction, practice_area);

      return this.createSuccessResult(JSON.stringify(review, null, 2), {
        review_type,
        jurisdiction: jurisdiction || 'not specified',
        practice_area: practice_area || 'not specified',
      });
    } catch (error) {
      return this.createErrorResult(`Legal review failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public performLegalReview(document: string, reviewType: string, jurisdiction?: string, practiceArea?: string) {
    const review = {
      metadata: {
        review_type: reviewType,
        jurisdiction: jurisdiction || 'not specified',
        practice_area: practiceArea || 'not specified',
        timestamp: new Date().toISOString(),
        document_length: document.length,
      },
      compliance_check: this.checkCompliance(document, jurisdiction),
      accuracy_assessment: this.assessAccuracy(document),
      completeness_review: this.reviewCompleteness(document),
      risk_assessment: this.assessRisks(document),
      recommendations: this.generateRecommendations(document, reviewType),
      practice_area_specific: undefined as any,
    };

    if (practiceArea) {
      review.practice_area_specific = this.performPracticeAreaReview(document, practiceArea);
    }

    return review;
  }

  public checkCompliance(document: string, jurisdiction?: string): any {
    return {
      legal_requirements: this.identifyLegalRequirements(document),
      compliance_score: this.calculateComplianceScore(document),
      missing_elements: this.identifyMissingElements(document),
      jurisdiction_specific: jurisdiction ? this.checkJurisdictionCompliance(document, jurisdiction) : null,
    };
  }

  public assessAccuracy(document: string): any {
    return {
      factual_accuracy: this.checkFactualAccuracy(document),
      legal_accuracy: this.checkLegalAccuracy(document),
      citation_accuracy: this.checkCitationAccuracy(document),
      accuracy_score: this.calculateAccuracyScore(document),
    };
  }

  public reviewCompleteness(document: string): any {
    return {
      required_sections: this.checkRequiredSections(document),
      completeness_score: this.calculateCompletenessScore(document),
      missing_sections: this.identifyMissingSections(document),
      structural_issues: this.identifyStructuralIssues(document),
    };
  }

  public assessRisks(document: string): any {
    return {
      liability_risks: this.identifyLiabilityRisks(document),
      compliance_risks: this.identifyComplianceRisks(document),
      enforcement_risks: this.identifyEnforcementRisks(document),
      overall_risk_level: this.calculateOverallRiskLevel(document),
    };
  }

  public generateRecommendations(document: string, reviewType: string): string[] {
    const recommendations: string[] = [];
    
    const complianceScore = this.calculateComplianceScore(document);
    if (complianceScore < 0.7) {
      recommendations.push('Improve compliance with legal requirements');
    }
    
    const accuracyScore = this.calculateAccuracyScore(document);
    if (accuracyScore < 0.8) {
      recommendations.push('Verify factual and legal accuracy');
    }
    
    const completenessScore = this.calculateCompletenessScore(document);
    if (completenessScore < 0.8) {
      recommendations.push('Add missing required sections');
    }
    
    const riskLevel = this.calculateOverallRiskLevel(document);
    if (riskLevel > 0.7) {
      recommendations.push('Address identified risks before execution');
    }
    
    return recommendations;
  }

  public identifyLegalRequirements(document: string): string[] {
    const requirements = [
      'parties identification',
      'consideration',
      'mutual assent',
      'legal purpose',
      'capacity',
      'offer and acceptance',
      'consideration',
      'intent to be bound'
    ];
    
    return requirements.filter(req => 
      document.toLowerCase().includes(req.replace(' ', '')) || 
      document.toLowerCase().includes(req.replace(' ', ' '))
    );
  }

  public calculateComplianceScore(document: string): number {
    const requirements = this.identifyLegalRequirements(document);
    const totalRequirements = 8; // Total number of basic legal requirements
    return requirements.length / totalRequirements;
  }

  public identifyMissingElements(document: string): string[] {
    const allRequirements = [
      'parties identification',
      'consideration',
      'mutual assent',
      'legal purpose',
      'capacity',
      'offer and acceptance',
      'intent to be bound'
    ];
    
    const presentRequirements = this.identifyLegalRequirements(document);
    return allRequirements.filter(req => !presentRequirements.includes(req));
  }

  public checkJurisdictionCompliance(document: string, jurisdiction: string): any {
    // Simplified jurisdiction-specific compliance check
    return {
      jurisdiction: jurisdiction,
      specific_requirements: this.getJurisdictionRequirements(jurisdiction),
      compliance_status: 'needs_verification',
      notes: 'Jurisdiction-specific compliance requires legal expertise'
    };
  }

  public getJurisdictionRequirements(jurisdiction: string): string[] {
    // Simplified - in practice, this would be a comprehensive database
    const requirements: Record<string, string[]> = {
      'california': ['CCPA compliance', 'California Civil Code'],
      'new_york': ['New York General Business Law', 'NYC regulations'],
      'texas': ['Texas Business Organizations Code'],
      'federal': ['Federal regulations', 'Constitutional requirements']
    };
    
    return requirements[jurisdiction.toLowerCase()] || ['General legal requirements'];
  }

  public checkFactualAccuracy(document: string): any {
    return {
      numerical_claims: this.extractNumericalClaims(document),
      factual_statements: this.extractFactualStatements(document),
      verification_needed: this.identifyStatementsNeedingVerification(document),
    };
  }

  public checkLegalAccuracy(document: string): any {
    return {
      legal_citations: this.extractLegalCitations(document),
      legal_terminology: this.checkLegalTerminology(document),
      precedent_references: this.extractPrecedentReferences(document),
    };
  }

  public checkCitationAccuracy(document: string): any {
    return {
      citations_found: this.extractCitations(document),
      citation_format: this.checkCitationFormat(document),
      citation_accuracy: this.assessCitationAccuracy(document),
    };
  }

  public calculateAccuracyScore(document: string): number {
    let score = 0.5; // Base score
    
    const factualAccuracy = this.checkFactualAccuracy(document);
    const legalAccuracy = this.checkLegalAccuracy(document);
    
    if (factualAccuracy.verification_needed.length === 0) score += 0.2;
    if (legalAccuracy.legal_citations.length > 0) score += 0.2;
    if (legalAccuracy.legal_terminology.is_correct) score += 0.1;
    
    return Math.min(score, 1);
  }

  public checkRequiredSections(document: string): any {
    const requiredSections = [
      'title',
      'parties',
      'recitals',
      'terms',
      'conditions',
      'signatures',
      'date'
    ];
    
    const presentSections = requiredSections.filter(section => 
      document.toLowerCase().includes(section)
    );
    
    return {
      required: requiredSections,
      present: presentSections,
      missing: requiredSections.filter(section => !presentSections.includes(section))
    };
  }

  public calculateCompletenessScore(document: string): number {
    const sections = this.checkRequiredSections(document);
    return sections.present.length / sections.required.length;
  }

  public identifyMissingSections(document: string): string[] {
    const sections = this.checkRequiredSections(document);
    return sections.missing;
  }

  public identifyStructuralIssues(document: string): string[] {
    const issues: string[] = [];
    
    if (!document.includes('WHEREAS') && document.includes('agreement')) {
      issues.push('Missing recitals section');
    }
    
    if (!document.includes('SIGNATURE') && !document.includes('signature')) {
      issues.push('Missing signature section');
    }
    
    if (!document.includes('DATE') && !document.includes('date')) {
      issues.push('Missing date section');
    }
    
    return issues;
  }

  public identifyLiabilityRisks(document: string): string[] {
    const riskIndicators = [
      'unlimited liability',
      'no limitation',
      'indemnification without limits',
      'consequential damages',
      'punitive damages'
    ];
    
    return riskIndicators.filter(indicator => 
      document.toLowerCase().includes(indicator)
    );
  }

  public identifyComplianceRisks(document: string): string[] {
    const complianceRisks = [
      'non-compliance',
      'violation',
      'penalty',
      'fine',
      'sanction',
      'regulatory action'
    ];
    
    return complianceRisks.filter(risk => 
      document.toLowerCase().includes(risk)
    );
  }

  public identifyEnforcementRisks(document: string): string[] {
    const enforcementRisks = [
      'unenforceable',
      'void',
      'invalid',
      'illegal',
      'prohibited'
    ];
    
    return enforcementRisks.filter(risk => 
      document.toLowerCase().includes(risk)
    );
  }

  public calculateOverallRiskLevel(document: string): number {
    const liabilityRisks = this.identifyLiabilityRisks(document).length;
    const complianceRisks = this.identifyComplianceRisks(document).length;
    const enforcementRisks = this.identifyEnforcementRisks(document).length;
    
    const totalRisks = liabilityRisks + complianceRisks + enforcementRisks;
    return Math.min(totalRisks / 10, 1); // Normalize to 0-1 scale
  }

  public performPracticeAreaReview(document: string, practiceArea: string): any {
    const areaSpecificChecks: Record<string, any> = {
      'contract_law': this.checkContractLaw(document),
      'family_law': this.checkFamilyLaw(document),
      'corporate_law': this.checkCorporateLaw(document),
      'real_estate': this.checkRealEstate(document),
      'employment_law': this.checkEmploymentLaw(document),
    };
    
    return areaSpecificChecks[practiceArea.toLowerCase()] || {
      message: `Practice area specific review for ${practiceArea} not implemented`
    };
  }

  public checkContractLaw(document: string): any {
    return {
      offer_acceptance: this.checkOfferAcceptance(document),
      consideration: this.checkConsideration(document),
      capacity: this.checkCapacity(document),
      legality: this.checkLegality(document),
    };
  }

  public checkFamilyLaw(document: string): any {
    return {
      child_custody: this.checkChildCustody(document),
      support_obligations: this.checkSupportObligations(document),
      property_division: this.checkPropertyDivision(document),
      jurisdiction: this.checkFamilyLawJurisdiction(document),
    };
  }

  public checkCorporateLaw(document: string): any {
    return {
      corporate_formalities: this.checkCorporateFormalities(document),
      fiduciary_duties: this.checkFiduciaryDuties(document),
      shareholder_rights: this.checkShareholderRights(document),
      regulatory_compliance: this.checkRegulatoryCompliance(document),
    };
  }

  public checkRealEstate(document: string): any {
    return {
      property_description: this.checkPropertyDescription(document),
      title_issues: this.checkTitleIssues(document),
      financing_terms: this.checkFinancingTerms(document),
      closing_requirements: this.checkClosingRequirements(document),
    };
  }

  public checkEmploymentLaw(document: string): any {
    return {
      wage_hour_compliance: this.checkWageHourCompliance(document),
      discrimination_protections: this.checkDiscriminationProtections(document),
      termination_rights: this.checkTerminationRights(document),
      workplace_safety: this.checkWorkplaceSafety(document),
    };
  }

  // Helper methods for specific checks
  public extractNumericalClaims(document: string): string[] {
    const numberPattern = /\b\d+(?:\.\d+)?\s*(?:percent|%|dollars?|\$|years?|months?|days?)\b/gi;
    return document.match(numberPattern) || [];
  }

  public extractFactualStatements(document: string): string[] {
    const factualPattern = /\b(?:is|are|was|were|has|have|had)\s+[^.!?]+/gi;
    return document.match(factualPattern) || [];
  }

  public identifyStatementsNeedingVerification(document: string): string[] {
    const verificationPattern = /\b(?:according to|based on|research shows|studies indicate)\s+[^.!?]+/gi;
    return document.match(verificationPattern) || [];
  }

  public extractLegalCitations(document: string): string[] {
    const citationPattern = /\b(?:U\.S\.C\.|C\.F\.R\.|\d+\s+U\.S\.C\.|\d+\s+C\.F\.R\.)/gi;
    return document.match(citationPattern) || [];
  }

  public checkLegalTerminology(document: string): any {
    const legalTerms = [
      'consideration', 'offer', 'acceptance', 'capacity', 'mutual assent',
      'breach', 'damages', 'remedy', 'liability', 'indemnification'
    ];
    
    const foundTerms = legalTerms.filter(term => 
      document.toLowerCase().includes(term)
    );
    
    return {
      terms_found: foundTerms,
      is_correct: foundTerms.length > 0,
      accuracy_score: foundTerms.length / legalTerms.length
    };
  }

  public extractPrecedentReferences(document: string): string[] {
    const precedentPattern = /\b(?:v\.|vs\.|versus)\s+[A-Z][a-z]+/gi;
    return document.match(precedentPattern) || [];
  }

  public extractCitations(document: string): string[] {
    const citationPattern = /\[[^\]]+\]|\(\d{4}\)|\(\d{4}[a-z]\)/gi;
    return document.match(citationPattern) || [];
  }

  public checkCitationFormat(document: string): any {
    const citations = this.extractCitations(document);
    return {
      citations_found: citations.length,
      format_consistency: this.assessFormatConsistency(citations),
      standard_compliance: this.checkStandardCompliance(citations),
    };
  }

  public assessCitationAccuracy(document: string): any {
    // Simplified accuracy assessment
    return {
      accuracy_score: 0.8, // Placeholder
      needs_verification: this.extractCitations(document).length > 0,
    };
  }

  public assessFormatConsistency(citations: string[]): boolean {
    if (citations.length === 0) return true;
    
    const formats = citations.map(citation => {
      if (citation.startsWith('[')) return 'bracket';
      if (citation.includes('(')) return 'parenthesis';
      return 'other';
    });
    
    const uniqueFormats = new Set(formats);
    return uniqueFormats.size === 1;
  }

  public checkStandardCompliance(citations: string[]): boolean {
    // Simplified compliance check
    return citations.every(citation => 
      citation.includes('(') || citation.includes('[')
    );
  }

  // Practice area specific check methods
  public checkOfferAcceptance(document: string): boolean {
    return document.toLowerCase().includes('offer') && 
           document.toLowerCase().includes('acceptance');
  }

  public checkConsideration(document: string): boolean {
    return document.toLowerCase().includes('consideration') ||
           document.toLowerCase().includes('payment') ||
           document.toLowerCase().includes('compensation');
  }

  public checkCapacity(document: string): boolean {
    return document.toLowerCase().includes('capacity') ||
           document.toLowerCase().includes('competent') ||
           document.toLowerCase().includes('legal age');
  }

  public checkLegality(document: string): boolean {
    return !document.toLowerCase().includes('illegal') &&
           !document.toLowerCase().includes('prohibited');
  }

  public checkChildCustody(document: string): boolean {
    return document.toLowerCase().includes('custody') ||
           document.toLowerCase().includes('visitation') ||
           document.toLowerCase().includes('parenting time');
  }

  public checkSupportObligations(document: string): boolean {
    return document.toLowerCase().includes('support') ||
           document.toLowerCase().includes('alimony') ||
           document.toLowerCase().includes('child support');
  }

  public checkPropertyDivision(document: string): boolean {
    return document.toLowerCase().includes('property') ||
           document.toLowerCase().includes('assets') ||
           document.toLowerCase().includes('division');
  }

  public checkFamilyLawJurisdiction(document: string): boolean {
    return document.toLowerCase().includes('jurisdiction') ||
           document.toLowerCase().includes('venue') ||
           document.toLowerCase().includes('court');
  }

  public checkCorporateFormalities(document: string): boolean {
    return document.toLowerCase().includes('board') ||
           document.toLowerCase().includes('shareholder') ||
           document.toLowerCase().includes('meeting');
  }

  public checkFiduciaryDuties(document: string): boolean {
    return document.toLowerCase().includes('fiduciary') ||
           document.toLowerCase().includes('duty of care') ||
           document.toLowerCase().includes('duty of loyalty');
  }

  public checkShareholderRights(document: string): boolean {
    return document.toLowerCase().includes('shareholder') ||
           document.toLowerCase().includes('voting') ||
           document.toLowerCase().includes('dividend');
  }

  public checkRegulatoryCompliance(document: string): boolean {
    return document.toLowerCase().includes('sec') ||
           document.toLowerCase().includes('securities') ||
           document.toLowerCase().includes('regulation');
  }

  public checkPropertyDescription(document: string): boolean {
    return document.toLowerCase().includes('property') ||
           document.toLowerCase().includes('premises') ||
           document.toLowerCase().includes('real estate');
  }

  public checkTitleIssues(document: string): boolean {
    return document.toLowerCase().includes('title') ||
           document.toLowerCase().includes('deed') ||
           document.toLowerCase().includes('ownership');
  }

  public checkFinancingTerms(document: string): boolean {
    return document.toLowerCase().includes('financing') ||
           document.toLowerCase().includes('mortgage') ||
           document.toLowerCase().includes('loan');
  }

  public checkClosingRequirements(document: string): boolean {
    return document.toLowerCase().includes('closing') ||
           document.toLowerCase().includes('settlement') ||
           document.toLowerCase().includes('escrow');
  }

  public checkWageHourCompliance(document: string): boolean {
    return document.toLowerCase().includes('wage') ||
           document.toLowerCase().includes('hour') ||
           document.toLowerCase().includes('overtime');
  }

  public checkDiscriminationProtections(document: string): boolean {
    return document.toLowerCase().includes('discrimination') ||
           document.toLowerCase().includes('equal opportunity') ||
           document.toLowerCase().includes('harassment');
  }

  public checkTerminationRights(document: string): boolean {
    return document.toLowerCase().includes('termination') ||
           document.toLowerCase().includes('employment') ||
           document.toLowerCase().includes('at-will');
  }

  public checkWorkplaceSafety(document: string): boolean {
    return document.toLowerCase().includes('safety') ||
           document.toLowerCase().includes('osha') ||
           document.toLowerCase().includes('workplace');
  }
})();


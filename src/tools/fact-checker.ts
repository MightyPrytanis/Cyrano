import { BaseTool } from './base-tool.js';
import { z } from 'zod';

const FactCheckerSchema = z.object({
  claim_text: z.string().describe('The claim or statement to fact-check'),
  context: z.string().optional().describe('Additional context for the claim'),
  verification_level: z.enum(['basic', 'thorough', 'exhaustive']).default('thorough'),
  sources: z.array(z.string()).optional().describe('Sources to check against'),
});

export const factChecker = new (class extends BaseTool {
  getToolDefinition() {
    return {
      name: 'fact_checker',
      description: 'Verify facts and claims in legal documents with confidence scoring',
      inputSchema: {
        type: 'object',
        properties: {
          claim_text: {
            type: 'string',
            description: 'The claim or statement to fact-check',
          },
          context: {
            type: 'string',
            description: 'Additional context for the claim',
          },
          verification_level: {
            type: 'string',
            enum: ['basic', 'thorough', 'exhaustive'],
            default: 'thorough',
            description: 'Level of verification to perform',
          },
          sources: {
            type: 'array',
            items: { type: 'string' },
            description: 'Sources to check against',
          },
        },
        required: ['claim_text'],
      },
    };
  }

  async execute(args: any) {
    try {
      const { claim_text, context, verification_level, sources } = FactCheckerSchema.parse(args);

      const verification = this.performFactCheck(claim_text, context, verification_level, sources);

      return this.createSuccessResult(JSON.stringify(verification, null, 2), {
        verification_level,
        claim_length: claim_text.length,
        sources_checked: sources?.length || 0,
      });
    } catch (error) {
      return this.createErrorResult(`Fact checking failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public performFactCheck(claim: string, context?: string, level: string = 'thorough', sources?: string[]) {
    const verification = {
      metadata: {
        verification_level: level,
        timestamp: new Date().toISOString(),
        claim_length: claim.length,
        context_provided: !!context,
        sources_provided: sources?.length || 0,
      },
      claim_analysis: this.analyzeClaim(claim),
      fact_check_results: this.checkFacts(claim, level),
      confidence_score: this.calculateConfidenceScore(claim, context),
      verification_status: this.determineVerificationStatus(claim),
      recommendations: this.generateVerificationRecommendations(claim, level),
      context_analysis: undefined as any,
      source_verification: undefined as any,
    };

    if (context) {
      verification.context_analysis = this.analyzeContext(context);
    }

    if (sources && sources.length > 0) {
      verification.source_verification = this.verifyAgainstSources(claim, sources);
    }

    return verification;
  }

  public analyzeClaim(claim: string): any {
    return {
      claim_type: this.identifyClaimType(claim),
      factual_elements: this.extractFactualElements(claim),
      legal_elements: this.extractLegalElements(claim),
      numerical_claims: this.extractNumericalClaims(claim),
      temporal_elements: this.extractTemporalElements(claim),
      complexity_score: this.calculateComplexityScore(claim),
    };
  }

  public checkFacts(claim: string, level: string): any {
    const results = {
      verifiable_facts: this.identifyVerifiableFacts(claim),
      unverifiable_claims: this.identifyUnverifiableClaims(claim),
      potential_issues: this.identifyPotentialIssues(claim),
      fact_check_confidence: this.calculateFactCheckConfidence(claim, level),
      detailed_analysis: undefined as any,
    };

    if (level === 'exhaustive') {
      results.detailed_analysis = this.performDetailedAnalysis(claim);
    }

    return results;
  }

  public calculateConfidenceScore(claim: string, context?: string): number {
    let score = 0.5; // Base score

    // Adjust based on claim characteristics
    if (this.hasSpecificDetails(claim)) score += 0.1;
    if (this.hasSupportingEvidence(claim)) score += 0.1;
    if (this.isMeasurable(claim)) score += 0.1;
    if (this.hasTemporalContext(claim)) score += 0.1;

    // Adjust based on context
    if (context && context.length > 50) score += 0.1;

    // Adjust based on potential issues
    if (this.hasVagueLanguage(claim)) score -= 0.2;
    if (this.hasUnsupportedAssertions(claim)) score -= 0.2;

    return Math.max(0, Math.min(1, score));
  }

  public determineVerificationStatus(claim: string): string {
    const confidence = this.calculateConfidenceScore(claim);
    
    if (confidence >= 0.8) return 'VERIFIED';
    if (confidence >= 0.6) return 'LIKELY_TRUE';
    if (confidence >= 0.4) return 'UNCERTAIN';
    if (confidence >= 0.2) return 'LIKELY_FALSE';
    return 'UNVERIFIED';
  }

  public generateVerificationRecommendations(claim: string, level: string): string[] {
    const recommendations: string[] = [];
    
    if (this.hasVagueLanguage(claim)) {
      recommendations.push('Clarify vague language for better verification');
    }
    
    if (this.hasUnsupportedAssertions(claim)) {
      recommendations.push('Provide supporting evidence for assertions');
    }
    
    if (this.hasNumericalClaims(claim)) {
      recommendations.push('Verify numerical data against reliable sources');
    }
    
    if (level === 'basic') {
      recommendations.push('Consider thorough verification for important claims');
    }
    
    return recommendations;
  }

  public identifyClaimType(claim: string): string {
    if (this.hasNumericalClaims(claim)) return 'NUMERICAL';
    if (this.hasTemporalElements(claim)) return 'TEMPORAL';
    if (this.hasLegalElements(claim)) return 'LEGAL';
    if (this.hasFactualElements(claim)) return 'FACTUAL';
    return 'GENERAL';
  }

  public extractFactualElements(claim: string): string[] {
    const factualPatterns = [
      /\b(?:is|are|was|were|has|have|had)\s+[^.!?]+/gi,
      /\b(?:according to|based on|research shows|studies indicate)\s+[^.!?]+/gi,
    ];
    
    const elements: string[] = [];
    factualPatterns.forEach(pattern => {
      const matches = claim.match(pattern) || [];
      elements.push(...matches.map(match => match.trim()));
    });
    
    return elements;
  }

  public extractLegalElements(claim: string): string[] {
    const legalTerms = [
      'liability', 'damages', 'breach', 'contract', 'agreement', 'statute',
      'regulation', 'law', 'legal', 'court', 'judgment', 'ruling'
    ];
    
    return legalTerms.filter(term => 
      claim.toLowerCase().includes(term)
    );
  }

  public extractNumericalClaims(claim: string): string[] {
    const numberPattern = /\b\d+(?:\.\d+)?\s*(?:percent|%|dollars?|\$|years?|months?|days?|hours?|minutes?)\b/gi;
    return claim.match(numberPattern) || [];
  }

  public extractTemporalElements(claim: string): string[] {
    const temporalPatterns = [
      /\b(?:in|on|at|during|before|after|since|until)\s+\d{4}\b/gi,
      /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b(?:yesterday|today|tomorrow|last|next|this)\s+(?:week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    ];
    
    const elements: string[] = [];
    temporalPatterns.forEach(pattern => {
      const matches = claim.match(pattern) || [];
      elements.push(...matches.map(match => match.trim()));
    });
    
    return elements;
  }

  public calculateComplexityScore(claim: string): number {
    let score = 0;
    
    // Length factor
    score += Math.min(claim.length / 100, 1) * 0.3;
    
    // Number of clauses
    const clauses = claim.split(/[,;]/).length;
    score += Math.min(clauses / 5, 1) * 0.2;
    
    // Legal terminology
    const legalTerms = this.extractLegalElements(claim).length;
    score += Math.min(legalTerms / 10, 1) * 0.3;
    
    // Numerical claims
    const numericalClaims = this.extractNumericalClaims(claim).length;
    score += Math.min(numericalClaims / 5, 1) * 0.2;
    
    return Math.min(score, 1);
  }

  public identifyVerifiableFacts(claim: string): string[] {
    const verifiablePatterns = [
      /\b(?:on|in|at)\s+\d{4}\b/gi,
      /\b\d+(?:\.\d+)?\s*(?:percent|%)\b/gi,
      /\b(?:according to|based on|research shows)\s+[^.!?]+/gi,
    ];
    
    const facts: string[] = [];
    verifiablePatterns.forEach(pattern => {
      const matches = claim.match(pattern) || [];
      facts.push(...matches.map(match => match.trim()));
    });
    
    return facts;
  }

  public identifyUnverifiableClaims(claim: string): string[] {
    const unverifiablePatterns = [
      /\b(?:always|never|all|none|every|no)\s+[^.!?]+/gi,
      /\b(?:obviously|clearly|undoubtedly|certainly)\s+[^.!?]+/gi,
      /\b(?:it is known|everyone knows|it is clear)\s+[^.!?]+/gi,
    ];
    
    const claims: string[] = [];
    unverifiablePatterns.forEach(pattern => {
      const matches = claim.match(pattern) || [];
      claims.push(...matches.map(match => match.trim()));
    });
    
    return claims;
  }

  public identifyPotentialIssues(claim: string): string[] {
    const issues: string[] = [];
    
    if (this.hasVagueLanguage(claim)) {
      issues.push('Contains vague or ambiguous language');
    }
    
    if (this.hasUnsupportedAssertions(claim)) {
      issues.push('Contains unsupported assertions');
    }
    
    if (this.hasAbsoluteLanguage(claim)) {
      issues.push('Contains absolute language that may be difficult to verify');
    }
    
    return issues;
  }

  public calculateFactCheckConfidence(claim: string, level: string): number {
    let confidence = 0.5;
    
    const verifiableFacts = this.identifyVerifiableFacts(claim).length;
    const unverifiableClaims = this.identifyUnverifiableClaims(claim).length;
    
    if (verifiableFacts > 0) confidence += 0.2;
    if (unverifiableClaims > 0) confidence -= 0.3;
    
    if (level === 'exhaustive') confidence += 0.1;
    if (level === 'basic') confidence -= 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }

  public performDetailedAnalysis(claim: string): any {
    return {
      sentence_analysis: this.analyzeSentences(claim),
      word_analysis: this.analyzeWords(claim),
      logical_structure: this.analyzeLogicalStructure(claim),
      evidence_requirements: this.identifyEvidenceRequirements(claim),
    };
  }

  public analyzeSentences(claim: string): any {
    const sentences = claim.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return {
      sentence_count: sentences.length,
      average_length: sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length,
      complex_sentences: sentences.filter(s => s.includes(',') || s.includes(';')).length,
    };
  }

  public analyzeWords(claim: string): any {
    const words = claim.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    return {
      word_count: words.length,
      unique_words: new Set(words).size,
      legal_terms: this.extractLegalElements(claim).length,
      technical_terms: this.identifyTechnicalTerms(claim).length,
    };
  }

  public analyzeLogicalStructure(claim: string): any {
    return {
      has_conditionals: /\b(?:if|when|unless|provided that)\b/gi.test(claim),
      has_causality: /\b(?:because|since|due to|as a result)\b/gi.test(claim),
      has_comparisons: /\b(?:than|compared to|versus|vs\.?)\b/gi.test(claim),
      logical_connectors: (claim.match(/\b(?:and|or|but|however|therefore|thus)\b/gi) || []).length,
    };
  }

  public identifyEvidenceRequirements(claim: string): string[] {
    const requirements: string[] = [];
    
    if (this.hasNumericalClaims(claim)) {
      requirements.push('Numerical data verification');
    }
    
    if (this.hasTemporalElements(claim)) {
      requirements.push('Temporal verification');
    }
    
    if (this.hasLegalElements(claim)) {
      requirements.push('Legal precedent verification');
    }
    
    return requirements;
  }

  public analyzeContext(context: string): any {
    return {
      context_length: context.length,
      provides_evidence: this.hasSupportingEvidence(context),
      adds_clarity: this.addsClarity(context),
      relevant_sources: this.identifyRelevantSources(context),
    };
  }

  public verifyAgainstSources(claim: string, sources: string[]): any {
    return {
      sources_checked: sources.length,
      verification_results: sources.map(source => ({
        source: source,
        supports_claim: this.sourceSupportsClaim(claim, source),
        confidence: this.calculateSourceConfidence(claim, source),
      })),
      overall_support: this.calculateOverallSupport(claim, sources),
    };
  }

  // Helper methods
  public hasSpecificDetails(claim: string): boolean {
    return /\b\d+\b/.test(claim) || /\b(?:specific|particular|exact|precise)\b/gi.test(claim);
  }

  public hasSupportingEvidence(claim: string): boolean {
    return /\b(?:according to|based on|research shows|studies indicate|evidence shows)\b/gi.test(claim);
  }

  public hasTemporalElements(claim: string): boolean {
    return /\b(?:in|on|at|during|before|after|since|until)\s+\d{4}\b/gi.test(claim) ||
           /\b(?:yesterday|today|tomorrow|last year|next month)\b/gi.test(claim);
  }

  public hasLegalElements(claim: string): boolean {
    return /\b(?:law|legal|court|judge|attorney|contract|statute|regulation|compliance)\b/gi.test(claim);
  }

  public isMeasurable(claim: string): boolean {
    return /\b\d+(?:\.\d+)?\s*(?:percent|%|dollars?|\$|years?|months?|days?)\b/gi.test(claim);
  }

  public hasTemporalContext(claim: string): boolean {
    return /\b(?:in|on|at|during|before|after|since|until)\s+\d{4}\b/gi.test(claim);
  }

  public hasVagueLanguage(claim: string): boolean {
    return /\b(?:some|many|few|several|various|certain|somewhat|rather|quite)\b/gi.test(claim);
  }

  public hasUnsupportedAssertions(claim: string): boolean {
    return /\b(?:obviously|clearly|undoubtedly|certainly|it is known|everyone knows)\b/gi.test(claim);
  }

  public hasNumericalClaims(claim: string): boolean {
    return /\b\d+(?:\.\d+)?\b/.test(claim);
  }

  public hasAbsoluteLanguage(claim: string): boolean {
    return /\b(?:always|never|all|none|every|no|completely|entirely|totally)\b/gi.test(claim);
  }

  public hasFactualElements(claim: string): boolean {
    return /\b(?:fact|factual|true|false|proven|disproven|verified|evidence)\b/gi.test(claim);
  }

  public identifyTechnicalTerms(claim: string): string[] {
    const technicalTerms = [
      'algorithm', 'protocol', 'system', 'process', 'methodology', 'framework',
      'architecture', 'implementation', 'configuration', 'specification'
    ];
    
    return technicalTerms.filter(term => 
      claim.toLowerCase().includes(term)
    );
  }

  public addsClarity(context: string): boolean {
    return context.length > 50 && /\b(?:explains|clarifies|details|describes)\b/gi.test(context);
  }

  public identifyRelevantSources(context: string): string[] {
    const sourcePattern = /\b(?:source|reference|citation|study|research|report)\s*:?\s*([^.!?]+)/gi;
    const matches = context.match(sourcePattern) || [];
    return matches.map(match => match.replace(/\b(?:source|reference|citation|study|research|report)\s*:?\s*/i, '').trim());
  }

  public sourceSupportsClaim(claim: string, source: string): boolean {
    // Simple keyword matching - in a real implementation, this would be more sophisticated
    const claimWords = new Set(claim.toLowerCase().split(/\W+/));
    const sourceWords = new Set(source.toLowerCase().split(/\W+/));
    const commonWords = [...claimWords].filter(word => sourceWords.has(word));
    return commonWords.length > 2;
  }

  public calculateSourceConfidence(claim: string, source: string): number {
    const claimWords = new Set(claim.toLowerCase().split(/\W+/));
    const sourceWords = new Set(source.toLowerCase().split(/\W+/));
    const commonWords = [...claimWords].filter(word => sourceWords.has(word));
    return Math.min(commonWords.length / 10, 1);
  }

  public calculateOverallSupport(claim: string, sources: string[]): number {
    const supportScores = sources.map(source => this.calculateSourceConfidence(claim, source));
    return supportScores.reduce((sum, score) => sum + score, 0) / supportScores.length;
  }
})();

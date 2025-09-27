import { BaseTool } from './base-tool.js';
import { z } from 'zod';

const LegalComparatorSchema = z.object({
  document1_text: z.string().describe('First legal document to compare'),
  document2_text: z.string().describe('Second legal document to compare'),
  comparison_type: z.enum(['comprehensive', 'clauses', 'terms', 'structure']).default('comprehensive'),
  focus_areas: z.array(z.string()).optional().describe('Specific areas to focus comparison on'),
});

export const legalComparator = new (class extends BaseTool {
  getToolDefinition() {
    return {
      name: 'legal_comparator',
      description: 'Compare two legal documents to identify differences, similarities, and key variations',
      inputSchema: {
        type: 'object',
        properties: {
          document1_text: {
            type: 'string',
            description: 'First legal document to compare',
          },
          document2_text: {
            type: 'string',
            description: 'Second legal document to compare',
          },
          comparison_type: {
            type: 'string',
            enum: ['comprehensive', 'clauses', 'terms', 'structure'],
            default: 'comprehensive',
            description: 'Type of comparison to perform',
          },
          focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific areas to focus comparison on',
          },
        },
        required: ['document1_text', 'document2_text'],
      },
    };
  }

  async execute(args: any) {
    try {
      const { document1_text, document2_text, comparison_type, focus_areas } = LegalComparatorSchema.parse(args);

      const comparison = this.performComparison(document1_text, document2_text, comparison_type, focus_areas);

      return this.createSuccessResult(JSON.stringify(comparison, null, 2), {
        comparison_type,
        document1_word_count: document1_text.split(' ').length,
        document2_word_count: document2_text.split(' ').length,
        focus_areas: focus_areas || [],
      });
    } catch (error) {
      return this.createErrorResult(`Legal comparison failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public performComparison(doc1: string, doc2: string, comparisonType: string, focusAreas?: string[]) {
    const comparison = {
      metadata: {
        comparison_type: comparisonType,
        timestamp: new Date().toISOString(),
        document1_length: doc1.length,
        document2_length: doc2.length,
      },
      structural_differences: this.compareStructure(doc1, doc2),
      content_differences: this.compareContent(doc1, doc2),
      similarity_score: this.calculateSimilarity(doc1, doc2),
      key_differences: this.identifyKeyDifferences(doc1, doc2),
      recommendations: this.generateComparisonRecommendations(doc1, doc2),
      focused_comparison: undefined as any,
    };

    if (focusAreas && focusAreas.length > 0) {
      comparison.focused_comparison = this.performFocusedComparison(doc1, doc2, focusAreas);
    }

    return comparison;
  }

  public compareStructure(doc1: string, doc2: string): any {
    const sections1 = this.extractSections(doc1);
    const sections2 = this.extractSections(doc2);
    
    return {
      doc1_sections: sections1.length,
      doc2_sections: sections2.length,
      section_differences: this.findSectionDifferences(sections1, sections2),
      structural_similarity: this.calculateStructuralSimilarity(sections1, sections2),
    };
  }

  public compareContent(doc1: string, doc2: string): any {
    const terms1 = this.extractLegalTerms(doc1);
    const terms2 = this.extractLegalTerms(doc2);
    
    return {
      common_terms: this.findCommonTerms(terms1, terms2),
      unique_to_doc1: this.findUniqueTerms(terms1, terms2),
      unique_to_doc2: this.findUniqueTerms(terms2, terms1),
      term_frequency_differences: this.compareTermFrequencies(terms1, terms2),
    };
  }

  public calculateSimilarity(doc1: string, doc2: string): number {
    const words1 = new Set(doc1.toLowerCase().split(/\W+/));
    const words2 = new Set(doc2.toLowerCase().split(/\W+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  public identifyKeyDifferences(doc1: string, doc2: string): string[] {
    const differences: string[] = [];
    
    // Check for different legal terms
    const terms1 = this.extractLegalTerms(doc1);
    const terms2 = this.extractLegalTerms(doc2);
    const uniqueTerms1 = this.findUniqueTerms(terms1, terms2);
    const uniqueTerms2 = this.findUniqueTerms(terms2, terms1);
    
    if (uniqueTerms1.length > 0) {
      differences.push(`Document 1 contains unique terms: ${uniqueTerms1.join(', ')}`);
    }
    if (uniqueTerms2.length > 0) {
      differences.push(`Document 2 contains unique terms: ${uniqueTerms2.join(', ')}`);
    }
    
    // Check for different numerical values
    const numbers1 = this.extractNumbers(doc1);
    const numbers2 = this.extractNumbers(doc2);
    const differentNumbers = this.findDifferentNumbers(numbers1, numbers2);
    
    if (differentNumbers.length > 0) {
      differences.push(`Different numerical values found: ${differentNumbers.join(', ')}`);
    }
    
    return differences;
  }

  public generateComparisonRecommendations(doc1: string, doc2: string): string[] {
    const recommendations: string[] = [];
    
    const similarity = this.calculateSimilarity(doc1, doc2);
    
    if (similarity < 0.3) {
      recommendations.push('Documents are significantly different - review for compatibility');
    } else if (similarity > 0.8) {
      recommendations.push('Documents are very similar - check for subtle differences');
    }
    
    const terms1 = this.extractLegalTerms(doc1);
    const terms2 = this.extractLegalTerms(doc2);
    const commonTerms = this.findCommonTerms(terms1, terms2);
    
    if (commonTerms.length < 5) {
      recommendations.push('Limited common legal terminology - verify document types match');
    }
    
    return recommendations;
  }

  public extractSections(text: string): string[] {
    const sectionPattern = /(?:section|clause|article|paragraph)\s+\d+[:\-\.]?\s*([^.!?]+)/gi;
    const matches = text.match(sectionPattern) || [];
    return matches.map(match => match.trim());
  }

  public extractLegalTerms(text: string): string[] {
    const legalTerms = [
      'contract', 'agreement', 'liability', 'damages', 'breach', 'warranty',
      'indemnification', 'jurisdiction', 'governing law', 'force majeure',
      'termination', 'remedy', 'arbitration', 'mediation', 'party', 'parties',
      'obligation', 'duty', 'right', 'entitlement', 'provision', 'clause'
    ];
    
    return legalTerms.filter(term => 
      text.toLowerCase().includes(term)
    );
  }

  public findCommonTerms(terms1: string[], terms2: string[]): string[] {
    const set1 = new Set(terms1);
    const set2 = new Set(terms2);
    return [...set1].filter(term => set2.has(term));
  }

  public findUniqueTerms(terms1: string[], terms2: string[]): string[] {
    const set2 = new Set(terms2);
    return terms1.filter(term => !set2.has(term));
  }

  public compareTermFrequencies(terms1: string[], terms2: string[]): Record<string, { doc1: number; doc2: number }> {
    const freq1 = this.getTermFrequencies(terms1);
    const freq2 = this.getTermFrequencies(terms2);
    const allTerms = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
    
    const result: Record<string, { doc1: number; doc2: number }> = {};
    allTerms.forEach(term => {
      result[term] = {
        doc1: freq1[term] || 0,
        doc2: freq2[term] || 0,
      };
    });
    
    return result;
  }

  public getTermFrequencies(terms: string[]): Record<string, number> {
    const frequencies: Record<string, number> = {};
    terms.forEach(term => {
      frequencies[term] = (frequencies[term] || 0) + 1;
    });
    return frequencies;
  }

  public findSectionDifferences(sections1: string[], sections2: string[]): any {
    return {
      doc1_unique_sections: sections1.filter(s => !sections2.includes(s)),
      doc2_unique_sections: sections2.filter(s => !sections1.includes(s)),
      common_sections: sections1.filter(s => sections2.includes(s)),
    };
  }

  public calculateStructuralSimilarity(sections1: string[], sections2: string[]): number {
    const set1 = new Set(sections1);
    const set2 = new Set(sections2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  public extractNumbers(text: string): number[] {
    const numberPattern = /\b\d+(?:\.\d+)?\b/g;
    const matches = text.match(numberPattern) || [];
    return matches.map(match => parseFloat(match));
  }

  public findDifferentNumbers(numbers1: number[], numbers2: number[]): string[] {
    const set1 = new Set(numbers1);
    const set2 = new Set(numbers2);
    const different1 = numbers1.filter(n => !set2.has(n));
    const different2 = numbers2.filter(n => !set1.has(n));
    
    return [
      ...different1.map(n => `Doc1: ${n}`),
      ...different2.map(n => `Doc2: ${n}`),
    ];
  }

  public performFocusedComparison(doc1: string, doc2: string, focusAreas: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    focusAreas.forEach(area => {
      switch (area.toLowerCase()) {
        case 'contracts':
          result.contracts = this.compareContractElements(doc1, doc2);
          break;
        case 'liability':
          result.liability = this.compareLiabilityClauses(doc1, doc2);
          break;
        case 'compliance':
          result.compliance = this.compareComplianceElements(doc1, doc2);
          break;
        default:
          result[area] = `Focused comparison for ${area} not implemented`;
      }
    });
    
    return result;
  }

  public compareContractElements(doc1: string, doc2: string): any {
    return {
      doc1_contract_indicators: (doc1.match(/contract|agreement/gi) || []).length,
      doc2_contract_indicators: (doc2.match(/contract|agreement/gi) || []).length,
      parties_doc1: this.extractParties(doc1),
      parties_doc2: this.extractParties(doc2),
    };
  }

  public compareLiabilityClauses(doc1: string, doc2: string): any {
    return {
      doc1_liability_mentions: (doc1.match(/liability|damages/gi) || []).length,
      doc2_liability_mentions: (doc2.match(/liability|damages/gi) || []).length,
      liability_differences: this.findLiabilityDifferences(doc1, doc2),
    };
  }

  public compareComplianceElements(doc1: string, doc2: string): any {
    return {
      doc1_compliance_mentions: (doc1.match(/compliance|regulation/gi) || []).length,
      doc2_compliance_mentions: (doc2.match(/compliance|regulation/gi) || []).length,
      compliance_differences: this.findComplianceDifferences(doc1, doc2),
    };
  }

  public extractParties(text: string): string[] {
    const partyPattern = /(?:party|parties|between|and)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
    const matches = text.match(partyPattern) || [];
    return matches.map(match => match.replace(/(?:party|parties|between|and)\s+/i, '').trim());
  }

  public findLiabilityDifferences(doc1: string, doc2: string): string[] {
    const liabilityTerms = ['liability', 'damages', 'breach', 'negligence'];
    const differences: string[] = [];
    
    liabilityTerms.forEach(term => {
      const count1 = (doc1.match(new RegExp(term, 'gi')) || []).length;
      const count2 = (doc2.match(new RegExp(term, 'gi')) || []).length;
      
      if (count1 !== count2) {
        differences.push(`${term}: Doc1 has ${count1}, Doc2 has ${count2}`);
      }
    });
    
    return differences;
  }

  public findComplianceDifferences(doc1: string, doc2: string): string[] {
    const complianceTerms = ['compliance', 'regulation', 'statute', 'law'];
    const differences: string[] = [];
    
    complianceTerms.forEach(term => {
      const count1 = (doc1.match(new RegExp(term, 'gi')) || []).length;
      const count2 = (doc2.match(new RegExp(term, 'gi')) || []).length;
      
      if (count1 !== count2) {
        differences.push(`${term}: Doc1 has ${count1}, Doc2 has ${count2}`);
      }
    });
    
    return differences;
  }
})();

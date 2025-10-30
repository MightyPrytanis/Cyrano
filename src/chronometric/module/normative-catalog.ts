/**
 * Chronometric Module - Normative Catalog
 * 
 * Default normative (professional standard) time estimates for common legal tasks.
 * Based on industry standards and professional experience.
 */

import { NormativeCatalog } from '../types/index.js';

/**
 * Get the default normative catalog for legal billing.
 * 
 * These are baseline estimates for standard complexity.
 * The billing engine may adjust these based on:
 * - Complexity modifiers (low/medium/high/novel)
 * - Practice area specifics
 * - Court requirements
 * - Matter type
 */
export function getDefaultNormativeCatalog(): NormativeCatalog {
  return {
    draft_notice_of_hearing: {
      code: 'draft_notice_of_hearing',
      label: 'Draft Notice of Hearing',
      baseMinutes: 15,
      activityCategory: 'Drafting',
    },
    proof_of_service: {
      code: 'proof_of_service',
      label: 'Prepare Proof of Service',
      baseMinutes: 15,
      activityCategory: 'Drafting',
    },
    research_issue: {
      code: 'research_issue',
      label: 'Research Legal Issue',
      baseMinutes: 90,
      activityCategory: 'Research',
    },
    research_caselaw: {
      code: 'research_caselaw',
      label: 'Research Case Law',
      baseMinutes: 60,
      activityCategory: 'Research',
    },
    research_statute: {
      code: 'research_statute',
      label: 'Research Statute/Regulation',
      baseMinutes: 45,
      activityCategory: 'Research',
    },
    brief_outlining: {
      code: 'brief_outlining',
      label: 'Outline Brief',
      baseMinutes: 45,
      activityCategory: 'Drafting',
    },
    brief_first_draft: {
      code: 'brief_first_draft',
      label: 'Draft Brief (First Pass)',
      baseMinutes: 120,
      activityCategory: 'Drafting',
    },
    brief_revision: {
      code: 'brief_revision',
      label: 'Revise Brief',
      baseMinutes: 60,
      activityCategory: 'Drafting',
    },
    motion_draft: {
      code: 'motion_draft',
      label: 'Draft Motion',
      baseMinutes: 90,
      activityCategory: 'Drafting',
    },
    motion_opposition: {
      code: 'motion_opposition',
      label: 'Draft Opposition to Motion',
      baseMinutes: 120,
      activityCategory: 'Drafting',
    },
    filing_and_service: {
      code: 'filing_and_service',
      label: 'Filing and Service',
      baseMinutes: 30,
      activityCategory: 'Filing',
    },
    client_communication_email: {
      code: 'client_communication_email',
      label: 'Client Communication (Email)',
      baseMinutes: 12,
      activityCategory: 'Communication',
    },
    client_communication_phone: {
      code: 'client_communication_phone',
      label: 'Client Communication (Phone)',
      baseMinutes: 15,
      activityCategory: 'Communication',
    },
    client_meeting: {
      code: 'client_meeting',
      label: 'Client Meeting',
      baseMinutes: 60,
      activityCategory: 'Communication',
    },
    opposing_counsel_communication: {
      code: 'opposing_counsel_communication',
      label: 'Communication with Opposing Counsel',
      baseMinutes: 15,
      activityCategory: 'Communication',
    },
    court_staff_communication: {
      code: 'court_staff_communication',
      label: 'Communication with Court Staff',
      baseMinutes: 12,
      activityCategory: 'Communication',
    },
    hearing_prep: {
      code: 'hearing_prep',
      label: 'Hearing Preparation',
      baseMinutes: 60,
      activityCategory: 'Preparation',
    },
    trial_prep: {
      code: 'trial_prep',
      label: 'Trial Preparation',
      baseMinutes: 120,
      activityCategory: 'Preparation',
    },
    document_review: {
      code: 'document_review',
      label: 'Document Review',
      baseMinutes: 30,
      activityCategory: 'Review',
    },
    contract_review: {
      code: 'contract_review',
      label: 'Contract Review',
      baseMinutes: 60,
      activityCategory: 'Review',
    },
    discovery_review: {
      code: 'discovery_review',
      label: 'Discovery Document Review',
      baseMinutes: 45,
      activityCategory: 'Discovery',
    },
    discovery_response: {
      code: 'discovery_response',
      label: 'Prepare Discovery Response',
      baseMinutes: 90,
      activityCategory: 'Discovery',
    },
    deposition_prep: {
      code: 'deposition_prep',
      label: 'Deposition Preparation',
      baseMinutes: 90,
      activityCategory: 'Preparation',
    },
    email_correspondence: {
      code: 'email_correspondence',
      label: 'Email Correspondence',
      baseMinutes: 6,
      activityCategory: 'Communication',
    },
    scheduling: {
      code: 'scheduling',
      label: 'Scheduling/Calendar Management',
      baseMinutes: 6,
      activityCategory: 'Administrative',
    },
    case_management: {
      code: 'case_management',
      label: 'Case Management',
      baseMinutes: 15,
      activityCategory: 'Administrative',
    },
    professional_development: {
      code: 'professional_development',
      label: 'Professional Development',
      baseMinutes: 30,
      activityCategory: 'Internal',
    },
    admin_tech: {
      code: 'admin_tech',
      label: 'Admin/Tech Issue Resolution',
      baseMinutes: 15,
      activityCategory: 'Internal',
    },
  };
}

/**
 * Complexity multipliers for normative time adjustments.
 */
export const COMPLEXITY_MULTIPLIERS = {
  low: 0.7,
  medium: 1.0,
  high: 1.5,
  novel: 2.0,
} as const;

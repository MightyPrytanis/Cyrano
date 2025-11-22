/**
 * Chronometric Module - Duplicate Detection
 * 
 * DupeCheck functionality to identify potential duplicate time entries
 * and prevent client overbilling.
 */

import {
  ProposedEntry,
  SourceEvent,
} from '../types/index.js';
import { isSameDay, toDateOnly } from '../utils.js';

export interface DuplicateMatch {
  entry1: ProposedEntry;
  entry2: ProposedEntry;
  similarity: number;
  reasons: string[];
}

/**
 * Check for potential duplicate entries.
 * 
 * @param entries Array of proposed time entries
 * @returns Array of potential duplicate matches
 */
export function detectDuplicates(entries: ProposedEntry[]): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const match = checkDuplicatePair(entries[i], entries[j]);
      if (match) {
        duplicates.push(match);
      }
    }
  }

  return duplicates;
}

/**
 * Check if two entries are potential duplicates.
 * 
 * @param entry1 First entry
 * @param entry2 Second entry
 * @returns DuplicateMatch if potential duplicate, null otherwise
 */
function checkDuplicatePair(
  entry1: ProposedEntry,
  entry2: ProposedEntry
): DuplicateMatch | null {
  const reasons: string[] = [];
  let similarity = 0;

  // Same date
  if (entry1.date === entry2.date) {
    similarity += 30;
    reasons.push('Same date');
  }

  // Same matter
  if (entry1.matter.matterId && entry1.matter.matterId === entry2.matter.matterId) {
    similarity += 20;
    reasons.push('Same matter');
  }

  // Same task code
  if (entry1.taskCode === entry2.taskCode) {
    similarity += 25;
    reasons.push('Same task type');
  }

  // Similar description
  const descSimilarity = calculateStringSimilarity(
    entry1.description,
    entry2.description
  );
  if (descSimilarity > 0.8) {
    similarity += 20;
    reasons.push('Similar description');
  } else if (descSimilarity > 0.5) {
    similarity += 10;
    reasons.push('Somewhat similar description');
  }

  // Shared source events
  const sharedSources = entry1.sourceEventIds.filter(id =>
    entry2.sourceEventIds.includes(id)
  );
  if (sharedSources.length > 0) {
    similarity += 30;
    reasons.push(`${sharedSources.length} shared source event(s)`);
  }

  // Similar minutes
  const minutesDiff = Math.abs(entry1.recommendedMinutes - entry2.recommendedMinutes);
  const avgMinutes = (entry1.recommendedMinutes + entry2.recommendedMinutes) / 2;
  if (minutesDiff / avgMinutes < 0.1) {
    similarity += 10;
    reasons.push('Similar duration');
  }

  // Threshold for flagging as potential duplicate
  const DUPLICATE_THRESHOLD = 50;

  if (similarity >= DUPLICATE_THRESHOLD) {
    return {
      entry1,
      entry2,
      similarity,
      reasons,
    };
  }

  return null;
}

/**
 * Calculate string similarity (0-1) using simple token overlap.
 * 
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score (0-1)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const tokens1 = tokenize(str1.toLowerCase());
  const tokens2 = tokenize(str2.toLowerCase());

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Tokenize a string into words.
 * 
 * @param str String to tokenize
 * @returns Array of tokens
 */
function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Check if a task type is naturally repeatable (can occur multiple times per day).
 * 
 * Certain tasks like phone calls, emails, and research sessions may legitimately
 * occur multiple times in one day without being duplicates.
 * 
 * @param taskCode Task code to check
 * @returns True if task is naturally repeatable
 */
export function isRepeatableTask(taskCode: string): boolean {
  const repeatableTasks = [
    'email_correspondence',
    'client_communication_email',
    'client_communication_phone',
    'opposing_counsel_communication',
    'court_staff_communication',
    'scheduling',
    'document_review',
    'research_caselaw',
    'research_statute',
    'case_management',
  ];

  return repeatableTasks.includes(taskCode);
}

/**
 * Filter duplicate matches to reduce false positives for naturally repeatable tasks.
 * 
 * @param duplicates Array of duplicate matches
 * @returns Filtered array with repeatable tasks removed if appropriate
 */
export function filterRepeatableDuplicates(
  duplicates: DuplicateMatch[]
): DuplicateMatch[] {
  return duplicates.filter(dup => {
    // If both entries are repeatable tasks and on the same day,
    // only flag if similarity is very high
    if (
      isRepeatableTask(dup.entry1.taskCode) &&
      isRepeatableTask(dup.entry2.taskCode) &&
      dup.entry1.date === dup.entry2.date
    ) {
      return dup.similarity >= 80;
    }

    return true;
  });
}

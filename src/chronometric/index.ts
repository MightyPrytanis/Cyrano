/**
 * Chronometric Module - Main Index
 * 
 * Forensic Time Capture (Chronometric) Module for LexFiat
 * 
 * A modular, API-driven system for retrospectively reconstructing billable time
 * using evidence-based analysis and value billing principles.
 * 
 * Architecture:
 * - Tools: Atomic, single-purpose data fetchers (Email, Files, Westlaw, Clio)
 * - Module: Chronometric orchestrator coordinating tools and billing engine
 * - Engine: (Future) Higher-level engines like MAE can consume this module
 * - App: LexFiat and other apps can integrate via this module's API
 * 
 * Key Principles:
 * - User Sovereignty: Attorney reviews and approves all entries
 * - Transparency: Full provenance and evidence for every recommendation
 * - Privacy: Respects data residency and audit requirements
 * - Extensibility: Tools and module are composable and reusable
 */

export * from './types/index.js';
export * from './tools/index.js';
export * from './module/index.js';
export * from './constants.js';
export * from './utils.js';

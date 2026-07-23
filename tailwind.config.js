/**
 * Rule configuration — every organizational rule is DATA, not scattered code.
 * When IBS changes a rule (or Kristin answers the open question below),
 * exactly one value changes here.
 */

export interface RuleConfig {
  /** Deutschlandticket monthly price in EUR (Instruction §I). */
  deutschlandticketPriceEur: number;
  /** Reimbursement only if one-way distance exceeds this (Instruction §I). */
  minDistanceKm: number;
  /**
   * "Under 2 weeks per month" triggers the VMT Vergleichsrechnung
   * (Instruction §I). Interpreted as reimbursable days < 10 workdays.
   */
  comparisonThresholdDays: number;
  /**
   * ⚠ OPEN RULE QUESTION (annotated in wireframe 2a; decision: Kristin):
   * Do K days (sick, AU-covered) count as REIMBURSABLE attendance days?
   *  - Fahrkosten Instruction §III lists only "x, E = present".
   *  - Anwesenheitsberechnung counts E, K, X, (x) as presence days.
   * Default: false — conservative reading (no travel occurred on sick days).
   * Flip this single flag once decided; tests cover both paths.
   */
  sickDaysAreReimbursable: boolean;
  /** FR-09 two-mode signature. PAPER = today's reality; DIGITAL = pending DSB approval. */
  signatureMode: 'PAPER' | 'DIGITAL';
  /** Approval deputy activates after this many days of manager absence (P16). */
  deputyActivatesAfterDays: number;
}

export const defaultRules: RuleConfig = {
  deutschlandticketPriceEur: 49.0,
  minDistanceKm: 3,
  comparisonThresholdDays: 10,
  sickDaysAreReimbursable: false,
  signatureMode: 'PAPER',
  deputyActivatesAfterDays: 3,
};

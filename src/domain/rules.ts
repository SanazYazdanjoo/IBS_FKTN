/** Zentrale Regelkonfiguration. Organisatorische Regeln sind Daten, nicht Code. */

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
   * Legende der Anwesenheitsliste: E/K/X/(x) zählen als anwesend (K = Kulanztag).
   * true = Legende (Standard) · false = strikte Lesart (nur x/E) für Alt-Monate.
   */
  sickDaysAreReimbursable: boolean;
  /** Sozial-Deutschlandticket (Stadtwirtschaft Weimar): reduzierter Preis je Jahr. */
  sozialTicketPriceByYear: Record<number, number>;
  /** PKW-Satz je km (Abrechnungsformular): Tage × km × 2 (Hin+Rück) × Satz. */
  pkwRatePerKmEur: number;
  /** FR-09 two-mode signature. PAPER = today's reality; DIGITAL = pending DSB approval. */
  signatureMode: 'PAPER' | 'DIGITAL';
  /** Approval deputy activates after this many days of manager absence (P16). */
  deputyActivatesAfterDays: number;
}

export const defaultRules: RuleConfig = {
  deutschlandticketPriceEur: 49.0,
  minDistanceKm: 3,
  comparisonThresholdDays: 10,
  sickDaysAreReimbursable: true,
  sozialTicketPriceByYear: { 2025: 29.0, 2026: 34.0 },
  pkwRatePerKmEur: 0.2,
  signatureMode: 'PAPER',
  deputyActivatesAfterDays: 3,
};

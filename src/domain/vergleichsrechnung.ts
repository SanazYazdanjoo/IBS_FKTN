/**
 * Vergleichsrechnung-Arbeitsliste (P15, Instruction §I). Sammelt für einen
 * Monat alle TN, deren Erstattung eine Vergleichsrechnung auslöst
 * (`comparisonTriggered`), über denselben Berechnungspfad wie jede andere
 * Ansicht (NFR-03) — keine eigene Formel, nur Filterung + Sortierung.
 */
import { computeMonthView, type MonthView } from './compute';
import type { MonthRecord } from './types';
import type { RuleConfig } from './rules';

export interface ComparisonCase {
  participantId: string;
  participantName: string;
  record: MonthRecord;
  view: MonthView;
}

/**
 * Fälle mit fehlendem VMT-Einzelfahrpreis (Blocker) stehen zuerst — sie sind
 * unaufgelöst und dürfen im Dashboard nicht untergehen. Danach TN-ID.
 */
export function collectComparisonCases(
  records: MonthRecord[],
  rules: RuleConfig,
  vmtFaresEur: Record<string, number>,
): ComparisonCase[] {
  return records
    .map((record) => ({
      participantId: record.participantId,
      participantName: record.participantName,
      record,
      view: computeMonthView(record, rules, vmtFaresEur[record.participantId]),
    }))
    .filter((c) => c.view.result.comparisonTriggered)
    .sort((a, b) => {
      const aBlocked = a.view.result.blockers.length > 0;
      const bBlocked = b.view.result.blockers.length > 0;
      if (aBlocked !== bBlocked) return aBlocked ? -1 : 1;
      return a.participantId.localeCompare(b.participantId);
    });
}

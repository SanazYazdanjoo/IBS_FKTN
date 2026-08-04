/**
 * Single derivation for the Vergleichsrechnung screen (NFR-03, P15,
 * Instruction §I/§IV): reads `MonthView.result` — the trace, the standard
 * phrases, the chosen-because line, the blockers — and hands the screen
 * exactly what's already there. `formatEuro` is the domain's own formatter
 * (`domain/reimbursement.ts`), used everywhere else the amount is shown; no
 * value here is recomputed, re-rounded, or independently reformatted.
 */
import { formatEuro } from '../../domain/reimbursement';
import type { MonthView } from '../../domain/compute';

export interface ComparisonAmount {
  formula: string;
  amountEur: number;
  amountFormatted: string;
}

export interface ComparisonDisplay {
  amountEur: number;
  amountFormatted: string;
  proRata: ComparisonAmount | null;
  vmt: ComparisonAmount | null;
  /** Plain-language reason the engine picked A or B (trace.chosenBecause), verbatim. */
  chosenBecause: string | null;
  /** Standard phrases per Instruction §IV, rendered verbatim on the form elsewhere too. */
  phrases: string[];
  blockers: string[];
  /** True when the comparison chose VMT single fares over the pro-rata ticket price. */
  flipped: boolean;
}

function amountOf(trace?: { formula: string; amountEur: number }): ComparisonAmount | null {
  if (!trace) return null;
  return { formula: trace.formula, amountEur: trace.amountEur, amountFormatted: formatEuro(trace.amountEur) };
}

export function buildComparisonDisplay(view: MonthView): ComparisonDisplay {
  const { result } = view;
  return {
    amountEur: result.amountEur,
    amountFormatted: formatEuro(result.amountEur),
    proRata: amountOf(result.trace.proRata),
    vmt: amountOf(result.trace.vmt),
    chosenBecause: result.trace.chosenBecause ?? null,
    phrases: result.phrases,
    blockers: result.blockers,
    flipped: result.method === 'VMT_SINGLE_FARES',
  };
}

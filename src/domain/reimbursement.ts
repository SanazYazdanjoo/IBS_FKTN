/**
 * Erstattungs-Engine (Instruction §I, §IV, §VI). Pure Funktionen;
 * jedes Ergebnis trägt einen vollständigen Formel-Trace (NFR-03).
 */
import type { RuleConfig } from './rules';

export function roundEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

/** German display format: 44,33 € */
export function formatEuro(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

export interface EligibilityInput {
  distanceKm: number;
  /** §VI: <3 km is reimbursable only with a justification approved by die Leitung. */
  hasApprovedDistanceException: boolean;
}

export interface Eligibility {
  eligible: boolean;
  reason: 'DISTANCE_OK' | 'DISTANCE_EXCEPTION_APPROVED' | 'DISTANCE_TOO_SHORT';
}

export function checkEligibility(input: EligibilityInput, rules: RuleConfig): Eligibility {
  if (input.distanceKm > rules.minDistanceKm) {
    return { eligible: true, reason: 'DISTANCE_OK' };
  }
  if (input.hasApprovedDistanceException) {
    return { eligible: true, reason: 'DISTANCE_EXCEPTION_APPROVED' };
  }
  return { eligible: false, reason: 'DISTANCE_TOO_SHORT' };
}

export interface ReimbursementInput {
  /** When set, the PKW km-formula is used instead of the ticket pro-rata. */
  pkw?: { distanceKm: number };
  ticketPriceEur: number;
  workdaysInMonth: number;
  reimbursableDays: number;
  unexcusedDays: number;
  /** VMT single-fare price for the TN's relevant zone; undefined if not needed. */
  vmtSingleFareEur?: number;
  eligibility: EligibilityInput;
}

export interface ReimbursementResult {
  eligible: boolean;
  eligibilityReason: Eligibility['reason'];
  /** Chosen method after Vergleichsrechnung (if triggered). */
  method: 'PRO_RATA' | 'VMT_SINGLE_FARES' | 'PKW_KM' | 'NONE';
  amountEur: number;
  comparisonTriggered: boolean;
  trace: {
    proRata?: { formula: string; amountEur: number };
    vmt?: { formula: string; amountEur: number };
    pkw?: { formula: string; amountEur: number };
    perDayRateEur?: number;
    chosenBecause?: string;
  };
  /** Standard phrases per Instruction §IV — rendered verbatim on the form. */
  phrases: string[];
  /** Missing inputs that block calculation (e.g. VMT fare not maintained). */
  blockers: string[];
}

export function calculateReimbursement(
  input: ReimbursementInput,
  rules: RuleConfig,
): ReimbursementResult {
  const eligibility = checkEligibility(input.eligibility, rules);
  const phrases: string[] = [];
  const blockers: string[] = [];

  if (!eligibility.eligible) {
    return {
      eligible: false,
      eligibilityReason: eligibility.reason,
      method: 'NONE',
      amountEur: 0,
      comparisonTriggered: false,
      trace: {},
      phrases: [],
      blockers: ['Entfernung ≤ 3 km ohne genehmigte Ausnahme (§VI)'],
    };
  }

  // PKW: km-Formel laut Abrechnungsformular.
  if (input.pkw) {
    const rate = rules.pkwRatePerKmEur;
    const amount = roundEuro(input.reimbursableDays * input.pkw.distanceKm * 2 * rate);
    phrases.push(`Erstattungsbetrag: ${formatEuro(amount)}`);
    if (input.unexcusedDays === 0) phrases.push('Der/Die TN hat keine unentschuldigten Fehltage.');
    return {
      eligible: true,
      eligibilityReason: eligibility.reason,
      method: 'PKW_KM',
      amountEur: amount,
      comparisonTriggered: false,
      trace: {
        pkw: {
          formula: `${input.reimbursableDays} Tage × ${input.pkw.distanceKm} km × 2 × ${formatEuro(rate)}/km`,
          amountEur: amount,
        },
        chosenBecause: 'PKW: km-Formel laut Abrechnungsformular (Faktor 2 = Hin- und Rückfahrt)',
      },
      phrases,
      blockers,
    };
  }

  const perDayRateEur = input.ticketPriceEur / input.workdaysInMonth;
  const proRataAmount = roundEuro(perDayRateEur * input.reimbursableDays);
  const proRata = {
    formula: `${formatEuro(input.ticketPriceEur)} ÷ ${input.workdaysInMonth} × ${input.reimbursableDays}`,
    amountEur: proRataAmount,
  };

  const comparisonTriggered =
    input.reimbursableDays < rules.comparisonThresholdDays;

  let method: ReimbursementResult['method'] = 'PRO_RATA';
  let amountEur = proRataAmount;
  let vmt: ReimbursementResult['trace']['vmt'];
  let chosenBecause: string | undefined;

  if (comparisonTriggered) {
    if (input.reimbursableDays === 0) {
      // Ohne Anwesenheitstage sind A und B beide 0 € — der Vergleich kann das
      // Ergebnis nicht ändern. Ein fehlender Fahrpreis ist hier deshalb kein
      // Blocker: er würde eine Pflege verlangen, die nichts bewirkt.
      chosenBecause = 'Keine Anwesenheitstage — A und B ergeben beide 0,00 €; Vergleich entfällt.';
    } else if (input.vmtSingleFareEur === undefined) {
      blockers.push(
        'Vergleichsrechnung erforderlich (< 2 Wochen), aber kein VMT-Einzelfahrpreis hinterlegt',
      );
    } else {
      const vmtAmount = roundEuro(
        input.reimbursableDays * 2 * input.vmtSingleFareEur,
      );
      vmt = {
        formula: `${input.reimbursableDays} Tage × 2 × ${formatEuro(input.vmtSingleFareEur)}`,
        amountEur: vmtAmount,
      };
      if (vmtAmount < proRataAmount) {
        method = 'VMT_SINGLE_FARES';
        amountEur = vmtAmount;
        chosenBecause = `min(A, B): ${formatEuro(vmtAmount)} < ${formatEuro(proRataAmount)}`;
      } else {
        chosenBecause = `min(A, B): ${formatEuro(proRataAmount)} ≤ ${formatEuro(vmtAmount)}`;
      }
    }
  }

  // Standardsätze gemäß Instruction §IV.
  phrases.push(`Erstattungsbetrag: ${formatEuro(amountEur)}`);
  if (input.unexcusedDays === 0) {
    phrases.push('Der/Die TN hat keine unentschuldigten Fehltage.');
  }

  return {
    eligible: true,
    eligibilityReason: eligibility.reason,
    method,
    amountEur,
    comparisonTriggered,
    trace: { proRata, vmt, perDayRateEur: roundEuro(perDayRateEur * 10000) / 10000, chosenBecause },
    phrases,
    blockers,
  };
}

/**
 * Guards the Vergleichsrechnung screen's rendering contract (NFR-03, P15,
 * §I/§IV): the amount it would display must be the exact number the engine
 * computed (not re-rounded/recomputed), and every trace line the domain
 * produced — the pro-rata formula, the VMT formula, the plain-language
 * "why", and the §IV standard phrases — must appear verbatim in what the
 * screen renders from.
 */
import { describe, expect, it } from 'vitest';
import { buildComparisonDisplay } from '../comparisonDisplay';
import { computeMonthView } from '../../../domain/compute';
import { defaultRules } from '../../../domain/rules';
import type { MonthRecord } from '../../../domain/types';

function comparisonRecord(): MonthRecord {
  return {
    participantId: 'TN01',
    participantName: 'Test TN',
    month: '2026-07',
    ticketType: 'ABO',
    ticketPriceEur: 49,
    distanceKm: 10,
    hasPraktikum: false,
    workdaysInMonth: 20,
    documents: [],
    attendance: [],
    // < comparisonThresholdDays (10) — triggers the Vergleichsrechnung (§I).
    attendanceDaysOverride: 5,
    status: 'SUBMITTED',
    signature: { mode: 'PAPER' },
    exceptions: [],
  };
}

describe('buildComparisonDisplay: renders the engine trace verbatim', () => {
  it('A (pro-rata) wins: displayed amount matches result.amountEur exactly, no VMT flip', () => {
    const view = computeMonthView(comparisonRecord(), defaultRules, 10); // VMT expensive → A wins
    const display = buildComparisonDisplay(view);

    expect(view.result.comparisonTriggered).toBe(true);
    expect(view.result.method).toBe('PRO_RATA');
    expect(display.amountEur).toBe(view.result.amountEur);
    expect(display.flipped).toBe(false);

    // Every trace line the engine produced must appear verbatim.
    expect(display.proRata?.formula).toBe(view.result.trace.proRata!.formula);
    expect(display.proRata?.amountEur).toBe(view.result.trace.proRata!.amountEur);
    expect(display.vmt?.formula).toBe(view.result.trace.vmt!.formula);
    expect(display.vmt?.amountEur).toBe(view.result.trace.vmt!.amountEur);
    expect(display.chosenBecause).toBe(view.result.trace.chosenBecause);
    for (const phrase of view.result.phrases) {
      expect(display.phrases).toContain(phrase);
    }
  });

  it('B (VMT) wins — the flipped case: displayed amount matches result.amountEur exactly', () => {
    const view = computeMonthView(comparisonRecord(), defaultRules, 1); // VMT cheap → B wins
    const display = buildComparisonDisplay(view);

    expect(view.result.method).toBe('VMT_SINGLE_FARES');
    expect(display.amountEur).toBe(view.result.amountEur);
    expect(display.flipped).toBe(true);
    expect(display.vmt?.amountEur).toBe(view.result.amountEur);

    expect(display.proRata?.formula).toBe(view.result.trace.proRata!.formula);
    expect(display.vmt?.formula).toBe(view.result.trace.vmt!.formula);
    expect(display.chosenBecause).toBe(view.result.trace.chosenBecause);
    for (const phrase of view.result.phrases) {
      expect(display.phrases).toContain(phrase);
    }
  });

  it('blocked case (no VMT fare maintained): blocker text passes through verbatim, no vmt trace fabricated', () => {
    const view = computeMonthView(comparisonRecord(), defaultRules, undefined);
    const display = buildComparisonDisplay(view);

    expect(view.result.blockers.length).toBeGreaterThan(0);
    expect(display.blockers).toEqual(view.result.blockers);
    expect(display.vmt).toBeNull();
    expect(display.amountEur).toBe(view.result.amountEur);
  });
});

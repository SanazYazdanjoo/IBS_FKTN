import { describe, expect, it } from 'vitest';
import { collectComparisonCases } from '../vergleichsrechnung';
import { defaultRules } from '../rules';
import type { MonthRecord } from '../types';

function record(overrides: Partial<MonthRecord>): MonthRecord {
  return {
    participantId: 'PK01',
    participantName: 'Test TN',
    month: '2026-06',
    ticketType: 'ABO',
    ticketPriceEur: 49,
    distanceKm: 7.4,
    hasPraktikum: false,
    workdaysInMonth: 22,
    documents: [],
    attendance: [],
    attendanceDaysOverride: 19,
    status: 'SUBMITTED',
    signature: { mode: 'PAPER' },
    exceptions: [],
    ...overrides,
  };
}

describe('collectComparisonCases', () => {
  it('returns an empty list when every TN has ≥ 10 Anwesenheitstage', () => {
    const records = [
      record({ participantId: 'PK01', attendanceDaysOverride: 19 }),
      record({ participantId: 'PK02', attendanceDaysOverride: 22 }),
    ];
    expect(collectComparisonCases(records, defaultRules, {})).toEqual([]);
  });

  it('picks B (VMT-Einzelfahrten) when it is cheaper', () => {
    const records = [
      record({ participantId: 'PK03', attendanceDaysOverride: 8 }), // wireframe Ahmad
    ];
    const cases = collectComparisonCases(records, defaultRules, { PK03: 1.1 });
    expect(cases).toHaveLength(1);
    expect(cases[0].view.result.method).toBe('VMT_SINGLE_FARES');
    expect(cases[0].view.result.amountEur).toBe(17.6);
    expect(cases[0].view.result.blockers).toHaveLength(0);
  });

  it('keeps A (anteiliges Abo) when it is cheaper or equal', () => {
    const records = [record({ participantId: 'PK04', attendanceDaysOverride: 9 })];
    const cases = collectComparisonCases(records, defaultRules, { PK04: 2.5 });
    expect(cases).toHaveLength(1);
    expect(cases[0].view.result.method).toBe('PRO_RATA');
    expect(cases[0].view.result.amountEur).toBe(20.05);
    expect(cases[0].view.result.blockers).toHaveLength(0);
  });

  it('surfaces a blocker when no VMT fare is maintained, and sorts it first', () => {
    const records = [
      // Alphabetically first but resolved — must not be sorted ahead of the blocker.
      record({ participantId: 'PK01', attendanceDaysOverride: 8 }),
      // Alphabetically later but unresolved (no fare) — must sort to the top.
      record({ participantId: 'PK99', attendanceDaysOverride: 5 }),
    ];
    const cases = collectComparisonCases(records, defaultRules, { PK01: 1.1 });
    expect(cases).toHaveLength(2);
    expect(cases[0].participantId).toBe('PK99');
    expect(cases[0].view.result.blockers.length).toBeGreaterThan(0);
    expect(cases[0].view.result.trace.vmt).toBeUndefined();
    expect(cases[1].participantId).toBe('PK01');
    expect(cases[1].view.result.blockers).toHaveLength(0);
  });

  it('never includes PKW cases, even below the threshold', () => {
    const records = [
      record({
        participantId: 'PK05',
        ticketType: 'PKW',
        distanceKm: 12,
        attendanceDaysOverride: 4,
      }),
    ];
    expect(collectComparisonCases(records, defaultRules, {})).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { calculateReimbursement, checkEligibility, formatEuro } from '../reimbursement';
import { defaultRules } from '../rules';

const eligible = { distanceKm: 7.4, hasApprovedDistanceException: false };

describe('pro-rata formula (Instruction §IV)', () => {
  it('reproduces the instruction example: 49 ÷ 21 × 19 = 44,33 €', () => {
    const r = calculateReimbursement(
      { ticketPriceEur: 49, workdaysInMonth: 21, reimbursableDays: 19, unexcusedDays: 0, eligibility: eligible },
      defaultRules,
    );
    expect(r.amountEur).toBe(44.33);
    expect(r.method).toBe('PRO_RATA');
    expect(r.phrases).toContain('Erstattungsbetrag: 44,33 €');
    expect(r.phrases).toContain('Der/Die TN hat keine unentschuldigten Fehltage.');
  });

  it('reproduces the wireframe case Yusuf: 49 ÷ 22 × 19 = 42,32 €', () => {
    const r = calculateReimbursement(
      { ticketPriceEur: 49, workdaysInMonth: 22, reimbursableDays: 19, unexcusedDays: 1, eligibility: eligible },
      defaultRules,
    );
    expect(r.amountEur).toBe(42.32);
    expect(r.comparisonTriggered).toBe(false); // 19 ≥ 10
    // With an unexcused day, the no-absence phrase must NOT appear.
    expect(r.phrases).not.toContain('Der/Die TN hat keine unentschuldigten Fehltage.');
  });
});

describe('VMT Vergleichsrechnung (< 2 weeks — P15 automation)', () => {
  it('wireframe case Ahmad: 8 days → VMT 17,60 € beats pro-rata 17,82 €', () => {
    const r = calculateReimbursement(
      {
        ticketPriceEur: 49,
        workdaysInMonth: 22,
        reimbursableDays: 8,
        unexcusedDays: 0,
        vmtSingleFareEur: 1.1,
        eligibility: eligible,
      },
      defaultRules,
    );
    expect(r.comparisonTriggered).toBe(true);
    expect(r.trace.proRata?.amountEur).toBe(17.82);
    expect(r.trace.vmt?.amountEur).toBe(17.6);
    expect(r.method).toBe('VMT_SINGLE_FARES');
    expect(r.amountEur).toBe(17.6);
    expect(r.phrases).toContain('Erstattungsbetrag: 17,60 €');
  });

  it('keeps pro-rata when it is cheaper or equal', () => {
    const r = calculateReimbursement(
      {
        ticketPriceEur: 49,
        workdaysInMonth: 22,
        reimbursableDays: 9,
        unexcusedDays: 0,
        vmtSingleFareEur: 2.5, // 9×2×2.50 = 45,00 > pro-rata 20,05
        eligibility: eligible,
      },
      defaultRules,
    );
    expect(r.method).toBe('PRO_RATA');
    expect(r.amountEur).toBe(20.05);
  });

  it('blocks (does not guess) when the VMT fare is not maintained', () => {
    const r = calculateReimbursement(
      { ticketPriceEur: 49, workdaysInMonth: 22, reimbursableDays: 5, unexcusedDays: 0, eligibility: eligible },
      defaultRules,
    );
    expect(r.comparisonTriggered).toBe(true);
    expect(r.blockers.length).toBeGreaterThan(0);
    expect(r.method).toBe('PRO_RATA'); // provisional, flagged via blockers
  });
});

describe('3-km rule (Instruction §I, §VI)', () => {
  it('distance ≤ 3 km without exception → not eligible, amount 0', () => {
    const r = calculateReimbursement(
      {
        ticketPriceEur: 49,
        workdaysInMonth: 22,
        reimbursableDays: 20,
        unexcusedDays: 0,
        eligibility: { distanceKm: 2.8, hasApprovedDistanceException: false },
      },
      defaultRules,
    );
    expect(r.eligible).toBe(false);
    expect(r.amountEur).toBe(0);
  });

  it('≤ 3 km WITH approved exception (Deniz case) → eligible', () => {
    const e = checkEligibility({ distanceKm: 2.8, hasApprovedDistanceException: true }, defaultRules);
    expect(e.eligible).toBe(true);
    expect(e.reason).toBe('DISTANCE_EXCEPTION_APPROVED');
  });
});

describe('E/K flag propagates end-to-end', () => {
  it('flipping sickDaysAreReimbursable changes the amount for the wireframe case', () => {
    // Yusuf: 19 strict reimbursable days, 21 if K counts (2 AU days).
    const strict = calculateReimbursement(
      { ticketPriceEur: 49, workdaysInMonth: 22, reimbursableDays: 19, unexcusedDays: 1, eligibility: eligible },
      defaultRules,
    );
    const kCounts = calculateReimbursement(
      { ticketPriceEur: 49, workdaysInMonth: 22, reimbursableDays: 21, unexcusedDays: 1, eligibility: eligible },
      { ...defaultRules, sickDaysAreReimbursable: true },
    );
    expect(strict.amountEur).toBe(42.32);
    expect(kCounts.amountEur).toBe(46.77); // matches Omar's row in wireframe 1d
  });
});

describe('German currency formatting', () => {
  it('renders comma decimals with € suffix', () => {
    expect(formatEuro(44.33)).toBe('44,33 €');
    expect(formatEuro(17.6)).toBe('17,60 €');
  });
});

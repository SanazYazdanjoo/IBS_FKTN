import { describe, expect, it } from 'vitest';
import { parseGermanDecimal, toFareLookup, type VmtFareTable } from '../vmtFares';

describe('toFareLookup', () => {
  it('flattens a fare table to a plain price lookup', () => {
    const table: VmtFareTable = {
      PK10: { participantId: 'PK10', priceEur: 2.4, updatedAt: '2026-01-15' },
      PK19: { participantId: 'PK19', priceEur: 1.1, updatedAt: '2026-02-01' },
    };
    expect(toFareLookup(table)).toEqual({ PK10: 2.4, PK19: 1.1 });
  });

  it('is empty for an empty table', () => {
    expect(toFareLookup({})).toEqual({});
  });
});

describe('parseGermanDecimal', () => {
  it('accepts a German-comma decimal', () => {
    expect(parseGermanDecimal('2,40')).toBe(2.4);
  });

  it('accepts a plain dot decimal', () => {
    expect(parseGermanDecimal('2.4')).toBe(2.4);
  });

  it('accepts an integer', () => {
    expect(parseGermanDecimal('3')).toBe(3);
  });

  it('rejects more than 2 decimal places', () => {
    expect(parseGermanDecimal('2,455')).toBeNull();
  });

  it('rejects zero and negative values', () => {
    expect(parseGermanDecimal('0')).toBeNull();
    expect(parseGermanDecimal('-1,50')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(parseGermanDecimal('abc')).toBeNull();
    expect(parseGermanDecimal('')).toBeNull();
  });
});

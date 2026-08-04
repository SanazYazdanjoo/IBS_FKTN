import { describe, expect, it } from 'vitest';
import { rejectClaim } from '../approval';
import type { MonthRecord } from '../types';

function makeRecord(overrides: Partial<MonthRecord> = {}): MonthRecord {
  return {
    participantId: 'PK01',
    participantName: 'Test TN',
    month: '2026-07',
    ticketType: 'ABO',
    ticketPriceEur: 49,
    distanceKm: 7.4,
    hasPraktikum: false,
    workdaysInMonth: 22,
    documents: [],
    attendance: [],
    status: 'READY_FOR_APPROVAL',
    signature: { mode: 'DIGITAL', signedAt: '2026-07-31T00:00:00.000Z' },
    exceptions: [],
    ...overrides,
  };
}

describe('rejectClaim ("Red Arrow" rejection)', () => {
  it('sets status to AWAITING_CORRECTION (direct back to the admin, no manual relay)', () => {
    const record = makeRecord();
    const next = rejectClaim(record, 'Ticketpreis stimmt nicht mit dem Beleg überein.', 'Thorsten');
    expect(next.status).toBe('AWAITING_CORRECTION');
  });

  it('retains the rejection reason in the history, most recent first', () => {
    const record = makeRecord();
    const next = rejectClaim(record, 'Anwesenheit unvollständig.', 'Thorsten');
    expect(next.rejectionHistory).toHaveLength(1);
    expect(next.rejectionHistory?.[0]).toMatchObject({
      reason: 'Anwesenheit unvollständig.',
      rejectedBy: 'Thorsten',
    });
    expect(next.rejectionHistory?.[0].rejectedAt).toEqual(expect.any(String));
  });

  it('appends to existing rejection history instead of replacing it', () => {
    const record = makeRecord({
      rejectionHistory: [
        { reason: 'Erste Ablehnung', rejectedBy: 'Thorsten', rejectedAt: '2026-07-01T00:00:00.000Z' },
      ],
    });
    const next = rejectClaim(record, 'Zweite Ablehnung', 'Thorsten');
    expect(next.rejectionHistory).toHaveLength(2);
    expect(next.rejectionHistory?.[0].reason).toBe('Zweite Ablehnung');
    expect(next.rejectionHistory?.[1].reason).toBe('Erste Ablehnung');
  });

  it('routes the claim away from the approval queue', () => {
    const record = makeRecord({ status: 'READY_FOR_APPROVAL' });
    const next = rejectClaim(record, 'Beleg fehlt.', 'Thorsten');
    // Queue.tsx only ever shows READY_FOR_APPROVAL / APPROVED records.
    expect(['READY_FOR_APPROVAL', 'APPROVED']).not.toContain(next.status);
  });

  it('rejects a non-empty reason requirement — throws on empty string', () => {
    const record = makeRecord();
    expect(() => rejectClaim(record, '', 'Thorsten')).toThrow();
  });

  it('rejects a whitespace-only reason', () => {
    const record = makeRecord();
    expect(() => rejectClaim(record, '   ', 'Thorsten')).toThrow();
  });

  it('trims the reason before storing it', () => {
    const record = makeRecord();
    const next = rejectClaim(record, '  Bitte Kontoauszug nachreichen.  ', 'Thorsten');
    expect(next.rejectionHistory?.[0].reason).toBe('Bitte Kontoauszug nachreichen.');
  });

  it('does not mutate the original record', () => {
    const record = makeRecord();
    rejectClaim(record, 'Grund', 'Thorsten');
    expect(record.status).toBe('READY_FOR_APPROVAL');
    expect(record.rejectionHistory).toBeUndefined();
  });
});

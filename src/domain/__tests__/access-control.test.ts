import { describe, expect, it } from 'vitest';
import { AccessDeniedError } from '../../adapters/types';
import { createMockAuth, createMockStorage } from '../../adapters/mock/mockAdapters';
import { MONTH } from '../../adapters/mock/seed';

describe('data isolation (NFR-01: privacy by design, not by CSS)', () => {
  it('a TN receives ONLY their own record from list queries', async () => {
    const auth = createMockAuth('u-lina');
    const storage = createMockStorage();
    const records = await storage.listMonthRecords(auth.currentUser(), MONTH);
    expect(records).toHaveLength(1);
    expect(records[0].participantId).toBe('PK01');
  });

  it("a TN requesting another TN's record gets AccessDeniedError", async () => {
    const auth = createMockAuth('u-lina');
    const storage = createMockStorage();
    await expect(
      storage.getMonthRecord(auth.currentUser(), 'PK19', MONTH),
    ).rejects.toThrow(AccessDeniedError);
  });

  it("a TN cannot write another TN's record", async () => {
    const auth = createMockAuth('u-kaan');
    const storage = createMockStorage();
    const foreign = await storage.getMonthRecord(
      { id: 'u-mira', name: 'Mira', role: 'ADMIN' },
      'PK01',
      MONTH,
    );
    await expect(
      storage.saveMonthRecord(auth.currentUser(), foreign),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('staff roles see all records', async () => {
    const auth = createMockAuth('u-mira');
    const storage = createMockStorage();
    const records = await storage.listMonthRecords(auth.currentUser(), MONTH);
    expect(records.length).toBeGreaterThanOrEqual(5);
  });

  it('only staff can record exceptions', async () => {
    const storage = createMockStorage();
    const tn = createMockAuth('u-lina').currentUser();
    await expect(
      storage.addException(tn, 'PK01', MONTH, {
        id: 'x',
        category: 'FRIST',
        reason: 'test',
        createdBy: tn.id,
        createdAt: '2026-07-20',
        visibility: 'TEAM',
        approvedByManager: false,
      }),
    ).rejects.toThrow(AccessDeniedError);
  });
});

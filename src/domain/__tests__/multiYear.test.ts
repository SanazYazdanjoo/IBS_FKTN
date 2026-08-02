import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMockStorage } from '../../adapters/mock/mockAdapters';
import { LocalYearWorkbook } from '../../adapters/attendance/localYearWorkbook';
import { demoUsers } from '../../adapters/mock/seed';

const admin = demoUsers.find((u) => u.role === 'ADMIN')!;

async function loaded() {
  const buf = readFileSync('public/demo/Testdaten_Anwesenheitsliste.xlsx');
  const wbk = await LocalYearWorkbook.fromBuffer(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    'demo.xlsx',
  );
  const byMonth = wbk.readAllYears();
  const storage = createMockStorage();
  storage.setAttendanceOverlay((ym) => {
    const r = byMonth.get(ym);
    return {
      marks: r?.marks ?? new Map(),
      notes: r?.notes ?? new Map(),
      participants: r?.participants,
    };
  });
  return storage;
}

describe('Jahresübersicht über mehrere Jahre', () => {
  it('zeigt 2025, obwohl die Demo-Saat nur 2026 kennt', async () => {
    const storage = await loaded();
    const rows = await storage.listMonthRecords(admin, '2025-03');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.attendance.length > 0)).toBe(true);
  });

  it('trägt Namen aus dem Jahresblatt ein, nicht nur die TN-ID', async () => {
    const storage = await loaded();
    const rows = await storage.listMonthRecords(admin, '2025-03');
    const pk01 = rows.find((r) => r.participantId === 'PK01')!;
    expect(pk01.participantName).toBe('Aesha Demir');
  });

  it('setzt Arbeitstage aus dem Feiertagskalender, nicht pauschal 22', async () => {
    const storage = await loaded();
    const rows = await storage.listMonthRecords(admin, '2025-02');
    expect(rows[0].workdaysInMonth).toBe(20); // Februar 2025
  });

  it('liefert 2027 als vorhandenen, aber unausgefüllten Monat', async () => {
    const storage = await loaded();
    const rows = await storage.listMonthRecords(admin, '2027-03');
    expect(rows.length).toBeGreaterThan(0);
    const marked = rows.flatMap((r) => r.attendance)
      .filter((d) => d.morning !== '' || d.afternoon !== '');
    expect(marked).toEqual([]);
  });

  it('lässt 2026 aus der Saat unverändert bestehen', async () => {
    const storage = await loaded();
    const rows = await storage.listMonthRecords(admin, '2026-02');
    expect(rows.length).toBeGreaterThan(0);
  });
});

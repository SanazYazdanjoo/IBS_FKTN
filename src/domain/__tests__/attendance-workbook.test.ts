import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { AttendanceWorkbook } from '../../adapters/excel/attendanceWorkbook';

/** Build a mini workbook mirroring the REAL layout (blocks found by content). */
async function buildAttendanceBuffer(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Kursplanung'); // non-month sheet must be ignored
  const ws = wb.addWorksheet('Januar');
  // some prelude rows (legend area) — parser must skip these
  ws.getCell('B4').value = 'X = anwesend';
  // Block 1 at arbitrary row 17
  ws.getRow(17).values = [undefined, 'TN', undefined, undefined, 'M 5.01', undefined, 'D 6.01'];
  ws.getRow(18).values = [undefined, undefined, undefined, undefined, 'V', 'N', 'V', 'N'];
  ws.getRow(19).values = [undefined, 'PK01', 'Al Helal', 'Safaa', 'E', 'E', 'X', 'X'];
  ws.getRow(20).values = [undefined, 'PK03', 'Alchadaida', 'Najwa', '(x)', 'U', 'A', 'A'];
  // Block 2
  ws.getRow(31).values = [undefined, 'TN', undefined, undefined, 'M 12.01', undefined, 'D 13.01'];
  ws.getRow(32).values = [undefined, undefined, undefined, undefined, 'V', 'N', 'V', 'N'];
  ws.getRow(33).values = [undefined, 'PK01', 'Al Helal', 'Safaa', 'K', '', 'X', 'X'];
  ws.getRow(34).values = [undefined, 'PK03', 'Alchadaida', 'Najwa', 'X', 'X', 'E', 'E'];
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

describe('AttendanceWorkbook (Anwesenheitsliste layout)', () => {
  it('reads day marks across weekly blocks, keyed by TN_ID', async () => {
    const awb = await AttendanceWorkbook.load(await buildAttendanceBuffer(), 2026);
    const marks = awb.readMonth(1);
    const pk01 = marks.get('PK01')!;
    expect(pk01).toHaveLength(4); // 2 days per block × 2 blocks
    expect(pk01[0]).toEqual({ date: '2026-01-05', morning: 'E', afternoon: 'E' });
    expect(pk01[2]).toEqual({ date: '2026-01-12', morning: 'K', afternoon: '' });
    const pk03 = marks.get('PK03')!;
    expect(pk03[1]).toEqual({ date: '2026-01-06', morning: 'A', afternoon: 'A' });
  });

  it('writes a single mark into the correct block/row/session cell', async () => {
    const awb = await AttendanceWorkbook.load(await buildAttendanceBuffer(), 2026);
    awb.setMark(1, 'PK03', '2026-01-12', 'afternoon', 'K');
    const reloaded = await AttendanceWorkbook.load(await awb.toBuffer(), 2026);
    const pk03 = reloaded.readMonth(1).get('PK03')!;
    expect(pk03.find((d) => d.date === '2026-01-12')).toEqual({
      date: '2026-01-12',
      morning: 'X',
      afternoon: 'K',
    });
  });

  it('refuses to write into a cell it cannot locate', async () => {
    const awb = await AttendanceWorkbook.load(await buildAttendanceBuffer(), 2026);
    expect(() => awb.setMark(1, 'PK99', '2026-01-05', 'morning', 'X')).toThrow(/nicht gefunden/);
    expect(() => awb.setMark(1, 'PK01', '2026-01-19', 'morning', 'X')).toThrow(/nicht gefunden/);
  });

  it('parses the REAL uploaded Anwesenheitsliste (structure probe)', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const path = '/mnt/user-data/uploads/Anwesenheitsliste_2026.xlsx';
    if (!existsSync(path)) return; // sandbox-only probe; skipped in the repo
    const buf = readFileSync(path);
    const awb = await AttendanceWorkbook.load(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      2026,
    );
    const marks = awb.readMonth(1);
    expect(marks.size).toBeGreaterThanOrEqual(12);
    const pk01 = marks.get('PK01')!;
    expect(pk01.length).toBeGreaterThanOrEqual(15);
    expect(pk01[0].date).toBe('2026-01-05');
    expect(pk01[0].morning).toBe('E');
  });
});

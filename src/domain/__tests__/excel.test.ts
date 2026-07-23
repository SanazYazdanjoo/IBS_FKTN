import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { classifySheet, resolveSchema, UEBERSICHT_COLUMNS } from '../../adapters/excel/schema';
import {
  parseAttendanceDays,
  parseGermanNumber,
  parseJaNein,
  parseMonat,
  parseTicketart,
  parseZustand,
  courseTypeFromId,
} from '../../adapters/excel/values';
import { ExcelWorkbookSource } from '../../adapters/excel/workbook';

// Mirrors the REAL file: broken TN_ID header ("0"), 2026 column set.
const HEADERS_2026 = [
  0, 'Nachname', 'Vorname', 'Monat', 'Jahr', '', 'Arbeitstage', 'last checked', 'Zustand',
  'Art', 'Ticketart', 'Sozial D Ticket', 'Bild', 'Rechnung', 'Kontoauszug',
  'Praktikumsvertrag', 'mehr als 3km?', 'Anwesenheitstage', 'Betrag', 'TN_Unterschrift', 'Bemerkung',
];

function buildWorkbook(headers: unknown[], rows: unknown[][]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('2026 Uebersicht');
  ws.addRow(headers);
  rows.forEach((r) => ws.addRow(r));
  return wb;
}

const ROW_PK01 = [
  'PK01', 'Al Helal', 'Safaa', '1. (Januar)', 2026, '', 21, '27,04,26', 'Fertig (bezahlt)',
  'ÖPNV', 'Abo_Karte', 'nein', 'verfügbar', 'verfügbar', 'verfügbar', 'verfügbar', 'ja',
  20, 60.0, 'verfügbar', '',
];
const ROW_BL07 = [
  'BL07', 'Al-Raheem', 'Wahhab', '1. (Januar)', 2026, '', 21, '2,2,26', 'Nicht_relevant',
  '', 'unbekannt ?', 'nein', 'fehlt', 'fehlt', 'fehlt', 'fehlt', '',
  'Muss_Berechnet_Werden', 'Muss_Berechnet_Werden', 'Fehlt', '',
];

describe('schema resolution — order independence (the core requirement)', () => {
  it('resolves the real 2026 header set incl. the broken TN_ID header via value pattern', () => {
    const schema = resolveSchema(UEBERSICHT_COLUMNS, HEADERS_2026, [ROW_PK01, ROW_BL07]);
    expect(schema.ok).toBe(true);
    expect(schema.columns.get('tnId')).toBe(0); // found by PK…/BL… pattern, not header
    expect(schema.columns.get('betrag')).toBe(18);
  });

  it('SHUFFLED columns still resolve — reordering cannot break the mapping', () => {
    // Move Betrag to the front, Zustand to the end, insert a stranger column.
    const shuffled = ['Betrag', ...HEADERS_2026.filter((h) => h !== 'Betrag' && h !== 'Zustand'), 'Neue Spalte XY', 'Zustand'];
    const shuffledRow = (src: unknown[]) => {
      const byHeader = new Map(HEADERS_2026.map((h, i) => [String(h), src[i]]));
      return shuffled.map((h) => (String(h) === '0' ? src[0] : byHeader.get(String(h)) ?? ''));
    };
    const schema = resolveSchema(UEBERSICHT_COLUMNS, shuffled, [shuffledRow(ROW_PK01)]);
    expect(schema.ok).toBe(true);
    expect(schema.columns.get('betrag')).toBe(0);
    expect(schema.columns.get('zustand')).toBe(shuffled.length - 1);
    expect(schema.unknownHeaders).toContain('neue spalte xy');
  });

  it('2025 aliases resolve too (last update, PKW oder ÖPNV)', () => {
    const h2025 = [0, 'Nachname', 'Vorname', 'Monat', 'Jahr', 'Arbeitstage', 'last update', 'Zustand', 'Preisstufe', 'PKW oder ÖPNV', 'Ticketart', 'Bild', 'Rechnung', 'Kontoauszug', 'Anwesenheitstage', 'Betrag', 'TN_Unterschrift'];
    const schema = resolveSchema(UEBERSICHT_COLUMNS, h2025, [ROW_PK01]);
    expect(schema.columns.has('lastChecked')).toBe(true);
    expect(schema.columns.has('art')).toBe(true);
  });

  it('REFUSES (ok=false) when a required column is truly gone', () => {
    const broken = HEADERS_2026.filter((h) => h !== 'Betrag');
    const schema = resolveSchema(UEBERSICHT_COLUMNS, broken, [ROW_PK01.slice(0, 18)]);
    expect(schema.ok).toBe(false);
    expect(schema.missingRequired).toContain('betrag');
  });

  it('classifies sheets by content, not name', () => {
    expect(classifySheet(HEADERS_2026)).toBe('UEBERSICHT');
    expect(classifySheet(['TN_ID', 'Nachname', 'Vorname', 'Email'])).toBe('MASTER');
    expect(classifySheet(['A', 'B'])).toBe('UNKNOWN');
  });
});

describe('tolerant value parsing (real-file vocabulary)', () => {
  it('numbers: both German comma and dot decimals', () => {
    expect(parseGermanNumber('29,14')).toBe(29.14);
    expect(parseGermanNumber('60.13')).toBe(60.13);
    expect(parseGermanNumber(21)).toBe(21);
    expect(parseGermanNumber('Muss_Berechnet_Werden')).toBeNull();
  });

  it("attendance: numbers, 'Muss_Berechnet_Werden', and the '10  + 10' oddity", () => {
    expect(parseAttendanceDays(18)).toEqual({ value: 18, needsCalculation: false });
    expect(parseAttendanceDays('Muss_Berechnet_Werden').needsCalculation).toBe(true);
    const odd = parseAttendanceDays('10  + 10');
    expect(odd.value).toBe(20);
    expect(odd.odd).toBe('10  + 10');
  });

  it('Zustand vocabulary maps to pipeline states', () => {
    expect(parseZustand('Fertig (bezahlt)').status).toBe('PAID');
    expect(parseZustand('Buchhaltung').status).toBe('SENT_TO_ACCOUNTING');
    expect(parseZustand('Fehlende_Nachweisen').status).toBe('AWAITING_CORRECTION');
    expect(parseZustand('Nicht_relevant').notRelevant).toBe(true);
    expect(parseZustand('Frage (von Tine/Kristin)').question).toBe(true);
  });

  it("Ticketart incl. 'unbekannt ?'; ja/nein incl. 'to check' → unknown", () => {
    expect(parseTicketart('Abo_Karte').type).toBe('ABO');
    expect(parseTicketart('unbekannt ?').type).toBeNull();
    expect(parseJaNein('JA')).toBe(true);
    expect(parseJaNein('to check')).toBeNull();
  });

  it("Monat '1. (Januar)' → 1; course from ID prefix", () => {
    expect(parseMonat('1. (Januar)')).toBe(1);
    expect(courseTypeFromId('BL07')).toBe('BL');
    expect(courseTypeFromId('PK24')).toBe('PK');
    expect(courseTypeFromId('tn-yusuf')).toBeNull();
  });
});

describe('workbook round-trip', () => {
  it('reads a month, writes app-owned cells back, preserves foreign cells', async () => {
    const wb = buildWorkbook(HEADERS_2026, [ROW_PK01, ROW_BL07]);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const source = await ExcelWorkbookSource.load(buffer);
    expect(source.report.ok).toBe(true);

    const { rows } = source.readMonth(1, 2026);
    expect(rows).toHaveLength(2);
    const pk01 = rows.find((r) => r.record.participantId === 'PK01')!;
    expect(pk01.record.status).toBe('PAID');
    expect(pk01.record.attendanceDaysOverride).toBe(20);
    expect(pk01.record.amountOverride).toBe(60);
    expect(pk01.notRelevant).toBe(false);
    const bl07 = rows.find((r) => r.record.participantId === 'BL07')!;
    expect(bl07.notRelevant).toBe(true);
    expect(bl07.needsCalculation).toBe(true);

    // Write back: change status + amount, then re-load and verify.
    source.writeRecord(pk01.rowNumber, {
      ...pk01.record,
      status: 'SENT_TO_ACCOUNTING',
      amountOverride: 58.33,
    });
    const buffer2 = await source.toBuffer();
    const reloaded = await ExcelWorkbookSource.load(buffer2);
    const again = reloaded.readMonth(1, 2026).rows.find((r) => r.record.participantId === 'PK01')!;
    expect(again.record.status).toBe('SENT_TO_ACCOUNTING');
    expect(again.record.amountOverride).toBe(58.33);
    // Foreign cell untouched: Nachname still there.
    expect(again.record.participantName).toContain('Al Helal');
  });

  it('refuses to write when structure validation failed', async () => {
    const wb = buildWorkbook(HEADERS_2026.filter((h) => h !== 'Betrag'), []);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const source = await ExcelWorkbookSource.load(buffer);
    expect(source.report.ok).toBe(false);
    expect(() => source.writeRecord(2, {} as any)).toThrow(/verweigert/);
  });
});

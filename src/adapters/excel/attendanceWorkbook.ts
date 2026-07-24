/**
 * Anwesenheitsliste-Zugriff. Ein Blatt je Monat; Wochenblöcke werden über
 * Inhalt gefunden (Kopfzeile 'TN' + Tagesspalten in V/N-Paaren). Es werden
 * nur Markierungszellen geschrieben; die Formeln der Liste bleiben erhalten.
 */
import ExcelJS from 'exceljs';
import type { AttendanceCode, DayMarks } from '../../domain/types';
import { TN_ID_PATTERN } from './schema';

export const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

const DAY_HEADER = /^[A-Za-zÄÖÜäöü]{1,2}\s?(\d{1,2})\.(\d{1,2})\.?$/;
const VALID_CODES = new Set(['x', 'X', '(x)', 'E', 'K', 'A', 'U']);

interface DayColumn {
  col: number; // V column (1-based); N = col + 1
  date: string; // ISO
}

interface Block {
  headerRow: number;
  days: DayColumn[];
  tnRows: Map<string, number>; // TN_ID → row number
  /** Spalte „Anmerkungen", direkt nach dem letzten Tagespaar. */
  noteCol: number;
}

function cellStr(ws: ExcelJS.Worksheet, row: number, col: number): string {
  const v = ws.getRow(row).getCell(col).value;
  if (v == null) return '';
  if (typeof v === 'object' && 'result' in (v as object)) return String((v as any).result ?? '');
  return String(v).trim();
}

export class AttendanceWorkbook {
  private constructor(
    public readonly workbook: ExcelJS.Workbook,
    public readonly year: number,
  ) {}

  static async load(buffer: ArrayBuffer, year: number): Promise<AttendanceWorkbook> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    return new AttendanceWorkbook(wb, year);
  }

  private sheetForMonth(month: number): ExcelJS.Worksheet | null {
    const name = GERMAN_MONTHS[month - 1];
    return this.workbook.worksheets.find((w) => w.name.trim() === name) ?? null;
  }

  private parseBlocks(ws: ExcelJS.Worksheet, month: number): Block[] {
    const blocks: Block[] = [];
    for (let r = 1; r <= ws.rowCount; r += 1) {
      if (cellStr(ws, r, 2) !== 'TN') continue;
      const days: DayColumn[] = [];
      let c = 5;
      for (; c <= ws.columnCount; c += 2) {
        const m = DAY_HEADER.exec(cellStr(ws, r, c));
        if (!m) break;
        const [, d, mo] = m;
        if (Number(mo) !== month) continue; // guard against stray headers
        days.push({
          col: c,
          date: `${this.year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        });
      }
      const noteCol = c;
      const tnRows = new Map<string, number>();
      for (let tr = r + 2; tr <= ws.rowCount; tr += 1) {
        const id = cellStr(ws, tr, 2);
        if (id === 'TN') break;
        if (TN_ID_PATTERN.test(id)) tnRows.set(id.toUpperCase(), tr);
        else if (id === '' && tnRows.size > 0) break;
      }
      if (days.length > 0 && tnRows.size > 0) blocks.push({ headerRow: r, days, tnRows, noteCol });
    }
    return blocks;
  }

  /** Tagesmarkierungen eines Monats, Schlüssel TN_ID. */
  readMonth(month: number): Map<string, DayMarks[]> {
    const result = new Map<string, DayMarks[]>();
    const ws = this.sheetForMonth(month);
    if (!ws) return result;

    for (const block of this.parseBlocks(ws, month)) {
      for (const [tnId, row] of block.tnRows) {
        const marks = result.get(tnId) ?? [];
        for (const day of block.days) {
          const read = (c: number): AttendanceCode => {
            const v = cellStr(ws, row, c);
            return (VALID_CODES.has(v) ? v : '') as AttendanceCode;
          };
          marks.push({ date: day.date, morning: read(day.col), afternoon: read(day.col + 1) });
        }
        result.set(tnId, marks);
      }
    }
    for (const marks of result.values()) marks.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }

  /** Einzelne Markierung schreiben; wirft, wenn Zelle nicht auffindbar. */
  setMark(month: number, tnId: string, dateIso: string, session: 'morning' | 'afternoon', code: AttendanceCode): void {
    const ws = this.sheetForMonth(month);
    if (!ws) throw new Error(`Kein Blatt für Monat ${month} (${GERMAN_MONTHS[month - 1]}) gefunden.`);
    for (const block of this.parseBlocks(ws, month)) {
      const day = block.days.find((d) => d.date === dateIso);
      const row = block.tnRows.get(tnId.toUpperCase());
      if (day && row) {
        const col = session === 'morning' ? day.col : day.col + 1;
        ws.getRow(row).getCell(col).value = code === '' ? null : code;
        ws.getRow(row).commit();
        return;
      }
    }
    throw new Error(`Zelle nicht gefunden: ${tnId} / ${dateIso}. Wurde die Woche in der Liste angelegt?`);
  }

  /**
   * Anmerkungen je Woche, Schlüssel TN_ID → { ersterTagDerWoche(ISO): Text }.
   * Der Schlüssel ist bewusst der erste Tag des Wochenblocks (nicht zwingend
   * ein Montag bei unvollständigen Wochen), damit er 1:1 zu setNote passt.
   */
  readNotes(month: number): Map<string, Record<string, string>> {
    const result = new Map<string, Record<string, string>>();
    const ws = this.sheetForMonth(month);
    if (!ws) return result;
    for (const block of this.parseBlocks(ws, month)) {
      if (block.days.length === 0) continue;
      const weekKey = block.days[0].date;
      for (const [tnId, row] of block.tnRows) {
        const text = cellStr(ws, row, block.noteCol);
        if (!text) continue;
        const notes = result.get(tnId) ?? {};
        notes[weekKey] = text;
        result.set(tnId, notes);
      }
    }
    return result;
  }

  /** Anmerkung einer Woche schreiben (leerer Text löscht die Zelle). */
  setNote(month: number, tnId: string, weekStartIso: string, text: string): void {
    const ws = this.sheetForMonth(month);
    if (!ws) throw new Error(`Kein Blatt für Monat ${month} (${GERMAN_MONTHS[month - 1]}) gefunden.`);
    for (const block of this.parseBlocks(ws, month)) {
      if (block.days[0]?.date !== weekStartIso) continue;
      const row = block.tnRows.get(tnId.toUpperCase());
      if (row) {
        ws.getRow(row).getCell(block.noteCol).value = text === '' ? null : text;
        ws.getRow(row).commit();
        return;
      }
    }
    throw new Error(`Anmerkungs-Zelle nicht gefunden: ${tnId} / Woche ${weekStartIso}.`);
  }

  async toBuffer(): Promise<ArrayBuffer> {
    return (await this.workbook.xlsx.writeBuffer()) as ArrayBuffer;
  }
}

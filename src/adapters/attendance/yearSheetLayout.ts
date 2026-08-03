/**
 * Parser für das Jahresblatt-Layout der Anwesenheitsliste
 * („Anwesenheitsliste_2026_New": ein Blatt je Jahr, Monat in Spalte A).
 *
 * Bewusst quellenunabhängig: Eingabe ist ein reines String-Raster. Damit
 * funktioniert derselbe Parser für ExcelJS-Zellen und für die Wertematrix
 * der Google-Sheets-API (values.get → string[][]).
 *
 * Abweichungen zum alten Monatsblatt-Layout (siehe attendanceWorkbook.ts):
 *   altes Layout            neues Layout
 *   ein Blatt je Monat      ein Blatt je Jahr, Monat in Spalte A
 *   TN-ID in Spalte B       TN-ID in Spalte C
 *   Tage ab Spalte E        Tage ab Spalte F
 *   Blockmarker B == 'TN'   Blockmarker: Datumskopf in Spalte F
 */
import type { AttendanceCode, DayMarks } from '../../domain/types';

/** Tageskopf der Liste, z. B. „M 5.01", „D 13.01". */
const DAY_HEADER = /^[A-Za-zÄÖÜäöü]{1,2}\s?(\d{1,2})\.(\d{1,2})\.?$/;

const VALID_CODES = new Set(['x', 'X', '(x)', 'E', 'K', 'A', 'U']);

/** Spaltenindizes (0-basiert) des Jahresblatts. */
const COL_MONTH = 0; // A
const COL_TN_ID = 2; // C
const COL_FIRST_DAY = 5; // F
const DAY_PAIR_WIDTH = 2; // V + N

/**
 * Die Wochenformel der Liste summiert ausschließlich die ersten fünf
 * Tagespaare (F:G … N:O). Samstag/Sonntag stehen zwar als Spalten in der
 * Liste, fließen aber nicht in „Anwesend (Pro Woche)" ein. Wir parsen
 * deshalb genau fünf Tage je Block — sonst würde eine versehentliche
 * Wochenendmarkierung eine Abweichung zur Liste erzeugen.
 */
const COUNTED_DAYS_PER_WEEK = 5;

export interface YearSheetBlock {
  /** 0-basierter Index der Kopfzeile im Raster. */
  headerRow: number;
  /** Monatsname aus Spalte A, falls in der Kopfzeile gesetzt. */
  month: string;
  days: { col: number; date: string }[];
  /** Spalte „Anmerkungen"; -1, wenn nicht gefunden. */
  noteCol: number;
  /** TN-ID (Großschreibung) → 0-basierte Zeile. */
  tnRows: Map<string, number>;
}

function cell(grid: string[][], row: number, col: number): string {
  return (grid[row]?.[col] ?? '').toString().trim();
}

/**
 * Erste Spalte mit Datumskopf, oder -1.
 *
 * Die Spalte ist NICHT immer F: Wochen, die eine Monatsgrenze überschreiten,
 * werden in der Liste auf zwei Blöcke aufgeteilt, und der zweite beginnt an
 * der Spalte des jeweiligen Wochentags (z. B. Mi 1.04 in Spalte J, F..I leer).
 * Ein fest auf F verdrahteter Parser übersieht diese Blöcke und läuft dann
 * beim Sammeln der TN-Zeilen in den Folgeblock hinein.
 */
function dayHeaderStart(grid: string[][], row: number): number {
  const width = grid[row]?.length ?? 0;
  for (let c = COL_FIRST_DAY; c < width; c += 1) {
    if (DAY_HEADER.test(cell(grid, row, c))) return c;
  }
  return -1;
}

function isDayHeaderRow(grid: string[][], row: number): boolean {
  return dayHeaderStart(grid, row) >= 0;
}

/**
 * Findet alle Wochenblöcke. Ein Block beginnt an einer Zeile mit Datumskopf
 * in Spalte F; darunter folgt die V/N-Zeile und danach die TN-Zeilen bis zum
 * nächsten Blockkopf. Blockhöhen variieren (TN kommen im Jahresverlauf dazu),
 * deshalb wird die Grenze inhaltlich bestimmt und nicht als feste Schrittweite.
 */
export interface MalformedRow {
  /** 1-basierte Zeilennummer, wie in der Tabelle angezeigt. */
  row: number;
  rawId: string;
  lastName: string;
  weekStart: string;
}

export function parseYearSheetBlocks(
  grid: string[][],
  year: number,
  warnings: MalformedRow[] = [],
): YearSheetBlock[] {
  const blocks: YearSheetBlock[] = [];
  let currentMonth = '';

  for (let r = 0; r < grid.length; r += 1) {
    const start = dayHeaderStart(grid, r);
    if (start < 0) continue;

    const monthCell = cell(grid, r, COL_MONTH);
    if (monthCell) currentMonth = monthCell;

    const days: YearSheetBlock['days'] = [];
    let c = start;
    for (; days.length < COUNTED_DAYS_PER_WEEK; c += DAY_PAIR_WIDTH) {
      const m = DAY_HEADER.exec(cell(grid, r, c));
      if (!m) break;
      const [, d, mo] = m;
      days.push({
        col: c,
        date: `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`,
      });
    }

    // „Anmerkungen" liegt hinter dem letzten Tagespaar; per Text suchen,
    // damit unvollständige Wochen die Spalte nicht verschieben.
    let noteCol = -1;
    for (let nc = COL_FIRST_DAY; nc < (grid[r]?.length ?? 0); nc += 1) {
      if (cell(grid, r, nc).toLowerCase().startsWith('anmerkung')) {
        noteCol = nc;
        break;
      }
    }

    const tnRows = new Map<string, number>();
    for (let tr = r + 2; tr < grid.length; tr += 1) {
      if (isDayHeaderRow(grid, tr)) break; // nächster Block
      const id = cell(grid, tr, COL_TN_ID).toUpperCase();
      if (/^(PK|BL)\d+$/.test(id)) {
        tnRows.set(id, tr);
        continue;
      }
      // Zeile hat einen Namen, aber keine gültige TN-ID → Datenfehler in der
      // Liste. Nicht stillschweigend überspringen: der TN verliert sonst
      // unbemerkt die Tage dieser Woche.
      const lastName = cell(grid, tr, 3);
      if (id !== '' && lastName !== '') {
        warnings.push({
          row: tr + 1,
          rawId: cell(grid, tr, COL_TN_ID),
          lastName,
          weekStart: days[0]?.date ?? '',
        });
      }
    }

    if (days.length > 0 && tnRows.size > 0) {
      blocks.push({ headerRow: r, month: currentMonth, days, noteCol, tnRows });
    }
  }

  return dedupePhantomBlocks(blocks, grid);
}

/**
 * Die Liste enthält am Jahresanfang einen leeren Dublettenblock: „KW1" und
 * „KW2" tragen beide die Tage 5.01–11.01, aber nur der zweite ist gefüllt.
 * Ohne Bereinigung würde jeder Tag doppelt in DayMarks landen und die
 * Monatssumme verfälschen. Bei gleichem Startdatum gewinnt der Block mit
 * Daten; sind beide gefüllt, gewinnt der erste (deterministisch).
 */
function dedupePhantomBlocks(blocks: YearSheetBlock[], grid: string[][]): YearSheetBlock[] {
  const byStart = new Map<string, YearSheetBlock>();
  for (const block of blocks) {
    const key = block.days[0].date;
    const existing = byStart.get(key);
    if (!existing) {
      byStart.set(key, block);
      continue;
    }
    if (!blockHasMarks(existing, grid) && blockHasMarks(block, grid)) {
      byStart.set(key, block);
    }
  }
  return [...byStart.values()].sort((a, b) => a.headerRow - b.headerRow);
}

function blockHasMarks(block: YearSheetBlock, grid: string[][]): boolean {
  for (const row of block.tnRows.values()) {
    for (const day of block.days) {
      if (VALID_CODES.has(cell(grid, row, day.col))) return true;
      if (VALID_CODES.has(cell(grid, row, day.col + 1))) return true;
    }
  }
  return false;
}

function readCode(grid: string[][], row: number, col: number): AttendanceCode {
  const v = cell(grid, row, col);
  return (VALID_CODES.has(v) ? v : '') as AttendanceCode;
}

/**
 * Tagesmarkierungen eines Monats aus dem Jahresblatt, Schlüssel TN-ID.
 * Gefiltert wird je Tag (nicht je Block), da Wochen Monatsgrenzen
 * überschreiten (z. B. „M 26.01 … S 1.02").
 */
export function readMonthFromYearSheet(
  grid: string[][],
  year: number,
  month: number,
): Map<string, DayMarks[]> {
  const result = new Map<string, DayMarks[]>();
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;

  for (const block of parseYearSheetBlocks(grid, year)) {
    for (const [tnId, row] of block.tnRows) {
      for (const day of block.days) {
        if (!day.date.startsWith(prefix)) continue;
        const marks = result.get(tnId) ?? [];
        marks.push({
          date: day.date,
          morning: readCode(grid, row, day.col),
          afternoon: readCode(grid, row, day.col + 1),
        });
        result.set(tnId, marks);
      }
    }
  }

  for (const marks of result.values()) marks.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/** Anmerkungen je Woche: TN-ID → { ersterTagDerWoche(ISO): Text }. */
export function readNotesFromYearSheet(
  grid: string[][],
  year: number,
  month: number,
): Map<string, Record<string, string>> {
  const result = new Map<string, Record<string, string>>();
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;

  for (const block of parseYearSheetBlocks(grid, year)) {
    if (block.noteCol < 0) continue;
    const weekKey = block.days.find((d) => d.date.startsWith(prefix))?.date;
    if (!weekKey) continue;
    for (const [tnId, row] of block.tnRows) {
      const text = cell(grid, row, block.noteCol);
      if (!text) continue;
      const notes = result.get(tnId) ?? {};
      notes[weekKey] = text;
      result.set(tnId, notes);
    }
  }
  return result;
}

/** Stammdaten (TN-ID → Name) aus dem Jahresblatt, für Abgleich mit Overall. */
export function readParticipantsFromYearSheet(
  grid: string[][],
  year: number,
): Map<string, { lastName: string; firstName: string }> {
  const out = new Map<string, { lastName: string; firstName: string }>();
  for (const block of parseYearSheetBlocks(grid, year)) {
    for (const [tnId, row] of block.tnRows) {
      if (out.has(tnId)) continue;
      out.set(tnId, { lastName: cell(grid, row, 3), firstName: cell(grid, row, 4) });
    }
  }
  return out;
}

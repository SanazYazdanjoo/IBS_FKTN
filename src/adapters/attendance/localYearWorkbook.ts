/**
 * Anwesenheitsliste aus einer .xlsx-Datei im Jahresblatt-Layout.
 *
 * Gleiche Semantik wie GoogleSheetsAttendanceSource, nur andere Herkunft:
 * beide erzeugen ein String-Raster und geben es an denselben Parser. Damit
 * verhält sich eine lokale Datei exakt wie das verbundene Google Sheet —
 * inklusive Jahreserkennung und Abgleich gegen das Overall-Blatt.
 *
 * Gedacht für zwei Fälle: die mitgelieferte Demodatei und eine vom Träger
 * gepflegte Datei aus dem Projektordner.
 */
import ExcelJS from 'exceljs';
import {
  readMonthFromYearSheet,
  readNotesFromYearSheet,
  readParticipantsFromYearSheet,
  parseYearSheetBlocks,
  type MalformedRow,
} from './yearSheetLayout';
import { readOverallMonth, crossCheckMonth, type CrossCheckRow } from './overallTab';
import { discoverYearTabs, findOverallTab, pickYearTab, type YearTab } from './yearTabs';
import { countMonthPresence } from '../../domain/attendance';
import type { DayMarks } from '../../domain/types';

export interface YearMonthRead {
  marks: Map<string, DayMarks[]>;
  notes: Map<string, Record<string, string>>;
  /** TN-ID → Name, aus dem Jahresblatt. Nötig, um Monate anzulegen, die
   *  in der Datenquelle noch gar nicht existieren. */
  participants: Map<string, { lastName: string; firstName: string }>;
  crossCheck: CrossCheckRow[];
  warnings: MalformedRow[];
}

/** Worksheet → rechteckiges String-Raster. */
function toGrid(ws: ExcelJS.Worksheet, maxCol = 40): string[][] {
  const grid: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, index) => {
    const cells: string[] = [];
    for (let c = 1; c <= maxCol; c += 1) {
      const value = row.getCell(c).value as unknown;
      let text = '';
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && value !== null && 'result' in value) {
          // Formelzelle: der berechnete Wert zählt, nicht die Formel.
          text = String((value as { result?: unknown }).result ?? '');
        } else if (typeof value === 'object' && value !== null && 'text' in value) {
          text = String((value as { text?: unknown }).text ?? '');
        } else {
          text = String(value);
        }
      }
      cells.push(text.trim());
    }
    grid[index - 1] = cells;
  });
  for (let i = 0; i < grid.length; i += 1) {
    if (!grid[i]) grid[i] = new Array(maxCol).fill('');
  }
  return grid;
}

export class LocalYearWorkbook {
  private constructor(
    private readonly wb: ExcelJS.Workbook,
    public readonly yearTabs: YearTab[],
    public readonly overallTabName: string | null,
    public readonly fileName: string,
  ) {}

  static async fromBuffer(buffer: ArrayBuffer, fileName: string): Promise<LocalYearWorkbook> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const names = wb.worksheets.map((w) => w.name);
    const tabs = discoverYearTabs(names);
    if (tabs.length === 0) {
      throw new Error(
        `In „${fileName}" wurde kein Jahresblatt gefunden. Erwartet wird mindestens ein ` +
          `Blatt, dessen Name ein Jahr enthält (z. B. „2026"). Gefunden: ${names.join(', ')}`,
      );
    }
    return new LocalYearWorkbook(wb, tabs, findOverallTab(names), fileName);
  }

  /** Verfügbare Jahre, aufsteigend. */
  get years(): number[] {
    return this.yearTabs.map((t) => t.year);
  }

  private gridFor(tabName: string): string[][] {
    const ws = this.wb.getWorksheet(tabName);
    if (!ws) throw new Error(`Blatt „${tabName}" fehlt.`);
    return toGrid(ws);
  }

  readMonth(year: number, month: number): YearMonthRead {
    const tab = pickYearTab(this.yearTabs, year);
    if (!tab) throw new Error('Kein Jahresblatt vorhanden.');

    const daily = this.gridFor(tab.name);
    const warnings: MalformedRow[] = [];
    // Das Jahr stammt aus dem Blattnamen, nicht aus einer Einstellung —
    // so können Blatt und Jahr nicht auseinanderlaufen.
    parseYearSheetBlocks(daily, tab.year, warnings);

    const marks = readMonthFromYearSheet(daily, tab.year, month);
    const notes = readNotesFromYearSheet(daily, tab.year, month);

    let crossCheck: CrossCheckRow[] = [];
    if (this.overallTabName) {
      const overallGrid = this.gridFor(this.overallTabName);
      const hasDailyData = (tnId: string) =>
        (marks.get(tnId) ?? []).some((d) => d.morning !== '' || d.afternoon !== '');
      const overall = readOverallMonth(overallGrid, tab.year, month, hasDailyData);
      const computed = new Map(
        [...marks].map(([tnId, days]) => [tnId, countMonthPresence([days])]),
      );
      crossCheck = crossCheckMonth(computed, overall);
    }

    return {
      marks,
      notes,
      participants: readParticipantsFromYearSheet(daily, tab.year),
      crossCheck,
      warnings,
    };
  }

  /** Alle Monate eines Jahres — für die Überlagerung der Datenquelle. */
  readYear(year: number): Map<string, YearMonthRead> {
    const out = new Map<string, YearMonthRead>();
    const tab = pickYearTab(this.yearTabs, year);
    if (!tab) return out;
    for (let m = 1; m <= 12; m += 1) {
      out.set(`${tab.year}-${String(m).padStart(2, '0')}`, this.readMonth(tab.year, m));
    }
    return out;
  }

  /**
   * Alle vorhandenen Jahre in einem Durchgang.
   *
   * Die Anwendung lädt bewusst nicht ein Jahr nach dem anderen: Jahres-
   * übersicht und Kalenderblatt lassen zwischen Jahren umschalten, und ein
   * Jahr ohne geladene Daten wäre dort von einem Jahr ohne Eintragungen
   * nicht zu unterscheiden. Legt der Träger ein Blatt „2027" an, ist es
   * nach dem nächsten Laden automatisch dabei.
   */
  readAllYears(): Map<string, YearMonthRead> {
    const out = new Map<string, YearMonthRead>();
    for (const tab of this.yearTabs) {
      for (let m = 1; m <= 12; m += 1) {
        out.set(`${tab.year}-${String(m).padStart(2, '0')}`, this.readMonth(tab.year, m));
      }
    }
    return out;
  }
}

/**
 * Read-only-Quelle: Anwesenheitsliste aus Google Sheets.
 *
 * Bewusst nur lesend. Ein API-Key erlaubt ausschließlich Lesezugriff auf
 * per Link freigegebene Dateien; Schreiben bräuchte OAuth oder ein Apps
 * Script. Die Schreibmethoden werfen deshalb einen typisierten Fehler,
 * damit die UI den Zustand anzeigen kann, statt Änderungen stillschweigend
 * zu verwerfen.
 *
 * Warum values.get statt /export?format=xlsx:
 *  - values.get liefert CORS-Header, der Export-Endpunkt nicht.
 *  - Die KW-Spalte der Liste nutzt REGEXEXTRACT/ISOWEEKNUM (Google-only).
 *    Im xlsx-Export sind das tote Formeln; die API liefert mit
 *    FORMATTED_VALUE die berechneten Werte.
 */
import {
  readMonthFromYearSheet,
  readNotesFromYearSheet,
  parseYearSheetBlocks,
  type MalformedRow,
} from './yearSheetLayout';
import { readOverallMonth, crossCheckMonth, type CrossCheckRow } from './overallTab';
import { countMonthPresence } from '../../domain/attendance';
import type { DayMarks } from '../../domain/types';

export class ReadOnlySourceError extends Error {
  constructor(action: string) {
    super(
      `Die Google-Sheets-Quelle ist schreibgeschützt (${action}). ` +
        `Änderungen bitte direkt in der Liste vornehmen oder auf die ` +
        `Excel-Quelle umschalten.`,
    );
    this.name = 'ReadOnlySourceError';
  }
}

export class SheetsFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SheetsFetchError';
  }
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  apiKey: string;
  /** Blattname mit den Tagesmarkierungen, i. d. R. das Jahr. */
  dailyTab: string;
  /** Blattname der Monatssummen. */
  overallTab?: string;
  year: number;
}

interface ValuesResponse {
  values?: string[][];
}

/** Rechteckiges Raster: die API kürzt Zeilen am letzten befüllten Feld. */
function normalize(values: string[][] | undefined): string[][] {
  if (!values || values.length === 0) return [];
  const width = values.reduce((w, r) => Math.max(w, r.length), 0);
  return values.map((r) => {
    const row = r.map((v) => (v ?? '').toString());
    while (row.length < width) row.push('');
    return row;
  });
}

export interface MonthReadResult {
  marks: Map<string, DayMarks[]>;
  notes: Map<string, Record<string, string>>;
  /** Vergleich berechnet ↔ Overall-Blatt; leer, wenn kein Overall-Blatt. */
  crossCheck: CrossCheckRow[];
  /** Zeilen mit defekter TN-ID, die sonst unbemerkt verloren gingen. */
  warnings: MalformedRow[];
}

export class GoogleSheetsAttendanceSource {
  private cache = new Map<string, string[][]>();

  constructor(private readonly config: GoogleSheetsConfig) {}

  private async fetchTab(tab: string): Promise<string[][]> {
    const cached = this.cache.get(tab);
    if (cached) return cached;

    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/` +
      `${encodeURIComponent(this.config.spreadsheetId)}/values/` +
      `${encodeURIComponent(tab)}` +
      `?valueRenderOption=FORMATTED_VALUE&key=${encodeURIComponent(this.config.apiKey)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const hint =
        res.status === 403
          ? ' Prüfen Sie die Referrer-Beschränkung des API-Keys und ob die Datei per Link freigegeben ist.'
          : res.status === 404
            ? ` Blatt „${tab}" nicht gefunden.`
            : '';
      throw new SheetsFetchError(
        `Google Sheets antwortete mit ${res.status}.${hint}`,
        res.status,
      );
    }
    const body = (await res.json()) as ValuesResponse;
    const grid = normalize(body.values);
    this.cache.set(tab, grid);
    return grid;
  }

  /** Verwirft den Cache, z. B. nach „Neu laden" in der UI. */
  invalidate(): void {
    this.cache.clear();
  }

  async readMonth(month: number): Promise<MonthReadResult> {
    const daily = await this.fetchTab(this.config.dailyTab);
    const warnings: MalformedRow[] = [];
    parseYearSheetBlocks(daily, this.config.year, warnings);

    const marks = readMonthFromYearSheet(daily, this.config.year, month);
    const notes = readNotesFromYearSheet(daily, this.config.year, month);

    let crossCheck: CrossCheckRow[] = [];
    if (this.config.overallTab) {
      const overallGrid = await this.fetchTab(this.config.overallTab);
      const hasDailyData = (tnId: string) =>
        (marks.get(tnId) ?? []).some((d) => d.morning !== '' || d.afternoon !== '');
      const overall = readOverallMonth(overallGrid, this.config.year, month, hasDailyData);
      const computed = new Map(
        [...marks].map(([tnId, days]) => [tnId, countMonthPresence([days])]),
      );
      crossCheck = crossCheckMonth(computed, overall);
    }

    return { marks, notes, crossCheck, warnings };
  }

  setMark(): never {
    throw new ReadOnlySourceError('Anwesenheit ändern');
  }

  setNote(): never {
    throw new ReadOnlySourceError('Anmerkung speichern');
  }
}

/** Konfiguration aus den Vite-Umgebungsvariablen, falls vollständig gesetzt. */
export function configFromEnv(year: number): GoogleSheetsConfig | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const spreadsheetId = env.VITE_SHEETS_ID;
  const apiKey = env.VITE_SHEETS_API_KEY;
  if (!spreadsheetId || !apiKey) return null;
  return {
    spreadsheetId,
    apiKey,
    dailyTab: env.VITE_SHEETS_DAILY_TAB ?? String(year),
    overallTab: env.VITE_SHEETS_OVERALL_TAB ?? 'Overall',
    year,
  };
}

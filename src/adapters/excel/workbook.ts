/**
 * Hauptdatei-Zugriff (exceljs): Blätter über Inhalt erkennen, Spalten über
 * Kopfzeilen auflösen, Übersicht lesen und nur app-eigene Zellen schreiben.
 * Formatierung, fremde Spalten und weitere Blätter bleiben unangetastet.
 */
import ExcelJS from 'exceljs';
import {
  classifySheet,
  MASTER_COLUMNS,
  resolveSchema,
  UEBERSICHT_COLUMNS,
  type ResolvedSchema,
} from './schema';
import {
  courseTypeFromId,
  docStateToExcel,
  parseAttendanceDays,
  parseDocState,
  parseGermanNumber,
  parseJaNein,
  parseMonat,
  parseTicketart,
  parseZustand,
  statusToZustand,
  type RowIssue,
} from './values';
import type { MonthRecord, SubmittedDocument } from '../../domain/types';

export interface ExcelValidationReport {
  uebersichtSheet: string | null;
  masterSheet: string | null;
  schema: ResolvedSchema | null;
  rowCount: number;
  issues: RowIssue[];
  ok: boolean;
  errors: string[];
}

/** Stammdaten je TN (für das Abrechnungsformular). */
export interface MasterData {
  tnId: string;
  nachname: string;
  vorname: string;
  strasse: string;
  hausnr: string;
  plz: string;
  ort: string;
  fahrtroute: string;
  entfernungKm: number | null;
  kennzeichen: string;
  kontoinhaber: string;
  iban: string;
  bank: string;
  bic: string;
}

/** '3.4 km zu Fuß' → 3.4 · '32,6 km' → 32.6 · '?' → null */
export function parseDistanceKm(raw: unknown): number | null {
  const m = /(\d+(?:[.,]\d+)?)/.exec(String(raw ?? ''));
  return m ? parseGermanNumber(m[1]) : null;
}

export interface ExcelRow {
  record: MonthRecord;
  rowNumber: number; // 1-based exceljs row number, for write-back
  notRelevant: boolean;
  question: boolean;
  needsCalculation: boolean;
}

const DOC_FIELD_TO_KIND: Record<string, SubmittedDocument['kind']> = {
  bild: 'TICKET_PHOTO',
  rechnung: 'INVOICE',
  kontoauszug: 'PAYMENT_PROOF',
  praktikumsvertrag: 'PRAKTIKUM_CONTRACT',
};

function cellText(row: ExcelJS.Row, col0: number | undefined): unknown {
  if (col0 === undefined) return undefined;
  const cell = row.getCell(col0 + 1); // exceljs is 1-based
  const v = cell.value;
  if (v && typeof v === 'object' && 'result' in v) return (v as any).result; // formula
  if (v && typeof v === 'object' && 'richText' in v)
    return (v as any).richText.map((r: any) => r.text).join('');
  return v;
}

export class ExcelWorkbookSource {
  private constructor(
    public readonly workbook: ExcelJS.Workbook,
    public readonly report: ExcelValidationReport,
    private readonly uebersicht: ExcelJS.Worksheet | null,
    private readonly schema: ResolvedSchema | null,
    private readonly master: ExcelJS.Worksheet | null,
  ) {}

  static async load(buffer: ArrayBuffer): Promise<ExcelWorkbookSource> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    let uebersicht: ExcelJS.Worksheet | null = null;
    let masterName: string | null = null;
    let master: ExcelJS.Worksheet | null = null;

    for (const ws of workbook.worksheets) {
      const header = (ws.getRow(1).values as unknown[]).slice(1); // exceljs pads index 0
      const kind = classifySheet(header);
      if (kind === 'MASTER' && !masterName) {
        masterName = ws.name;
        master = ws;
      }
      if (kind === 'UEBERSICHT') {
        // Prefer the most recent year sheet: pick the one with the largest year in its name, else first found.
        if (!uebersicht) uebersicht = ws;
        else {
          const y = (s: string) => Number((/(\d{4})/.exec(s) ?? [])[1] ?? 0);
          if (y(ws.name) > y(uebersicht.name)) uebersicht = ws;
        }
      }
    }

    const errors: string[] = [];
    let schema: ResolvedSchema | null = null;
    let rowCount = 0;

    if (!uebersicht) {
      errors.push(
        'Keine Übersicht-Tabelle gefunden (erwartet Spalten: Monat, Jahr, Betrag). Wurde das Blatt umbenannt UND umgebaut?',
      );
    } else {
      const header = (uebersicht.getRow(1).values as unknown[]).slice(1);
      const samples: unknown[][] = [];
      uebersicht.eachRow((row, n) => {
        if (n > 1 && n <= 11) samples.push((row.values as unknown[]).slice(1));
        if (n > 1) rowCount += 1;
      });
      schema = resolveSchema(UEBERSICHT_COLUMNS, header, samples);
      if (!schema.ok) {
        errors.push(
          `Pflichtspalten nicht gefunden: ${schema.missingRequired.join(', ')}. ` +
            'Die App schreibt NICHT in eine Datei mit unbekannter Struktur.',
        );
      }
    }

    const report: ExcelValidationReport = {
      uebersichtSheet: uebersicht?.name ?? null,
      masterSheet: masterName,
      schema,
      rowCount,
      issues: [],
      ok: errors.length === 0,
      errors,
    };

    return new ExcelWorkbookSource(workbook, report, uebersicht, schema, master);
  }

  /** Übersicht-Zeilen eines Monats lesen. */
  readMonth(month: number, year: number): { rows: ExcelRow[]; issues: RowIssue[] } {
    const rows: ExcelRow[] = [];
    const issues: RowIssue[] = [];
    if (!this.uebersicht || !this.schema?.ok) return { rows, issues };
    const col = (key: string) => this.schema!.columns.get(key);

    this.uebersicht.eachRow((row, n) => {
      if (n === 1) return;
      const tnId = String(cellText(row, col('tnId')) ?? '').trim();
      if (!tnId) return;
      const rowMonth = parseMonat(cellText(row, col('monat')));
      const rowYear = parseGermanNumber(cellText(row, col('jahr')));
      if (rowMonth !== month || rowYear !== year) return;

      const push = (field: string, raw: unknown, message: string) =>
        issues.push({ tnId, field, raw: String(raw ?? ''), message });

      const zustand = parseZustand(cellText(row, col('zustand')));
      if (zustand.odd) push('Zustand', zustand.odd, 'Unbekannter Zustand — als „In Prüfung" gelesen, wird beim Schreiben NICHT überschrieben.');

      const ticket = parseTicketart(cellText(row, col('ticketart')));
      if (ticket.odd) push('Ticketart', ticket.odd, 'Unbekannte Ticketart.');

      const att = parseAttendanceDays(cellText(row, col('anwesenheitstage')));
      if (att.odd) push('Anwesenheitstage', att.odd, 'Ungewöhnlicher Wert — bitte prüfen.');

      const betrag = parseGermanNumber(cellText(row, col('betrag')));
      const arbeitstage = parseGermanNumber(cellText(row, col('arbeitstage'))) ?? 21;
      const km = parseJaNein(cellText(row, col('mehrAls3km')));
      // Sozial-Deutschlandticket: reduzierter Preis je Jahr.
      const sozial = parseJaNein(cellText(row, col('sozialDTicket'))) === true;
      const SOZIAL_PRICES: Record<number, number> = { 2025: 29, 2026: 34 };
      const ticketPrice = sozial ? (SOZIAL_PRICES[year] ?? 34) : 49;

      const documents: SubmittedDocument[] = [];
      for (const [field, kind] of Object.entries(DOC_FIELD_TO_KIND)) {
        const parsed = parseDocState(cellText(row, col(field)));
        if (parsed.odd) push(field, parsed.odd, 'Unbekannter Dokumentstatus.');
        if (parsed.state !== 'NOT_APPLICABLE') {
          documents.push({ kind, fileName: '', state: parsed.state });
        }
      }

      const signed = String(cellText(row, col('tnUnterschrift')) ?? '')
        .trim()
        .toLowerCase()
        .startsWith('verfügbar');

      const record: MonthRecord = {
        participantId: tnId,
        participantName: `${cellText(row, col('vorname')) ?? ''} ${cellText(row, col('nachname')) ?? ''}`.trim(),
        month: `${year}-${String(month).padStart(2, '0')}`,
        ticketType: ticket.type ?? 'ABO',
        ticketPriceEur: ticketPrice,
        // km stammen aus den Stammdaten; das ja/nein-Feld steuert die Zulässigkeit.
        distanceKm: km === false ? 0 : 999,
        hasPraktikum: documents.some((d) => d.kind === 'PRAKTIKUM_CONTRACT'),
        workdaysInMonth: arbeitstage,
        documents,
        attendance: [],
        attendanceDaysOverride: att.value ?? undefined,
        amountOverride: betrag ?? undefined,
        status: zustand.status ?? 'NOT_SUBMITTED',
        signature: { mode: 'PAPER', signedAt: signed ? 'laut Excel' : undefined },
        exceptions: [],
      };

      rows.push({
        record,
        rowNumber: n,
        notRelevant: zustand.notRelevant,
        question: zustand.question,
        needsCalculation: att.needsCalculation || betrag === null,
      });
    });

    this.report.issues = issues;
    return { rows, issues };
  }

  /** Nur app-eigene Zellen der Zeile aktualisieren. */
  writeRecord(rowNumber: number, record: MonthRecord): void {
    if (!this.uebersicht || !this.schema?.ok) {
      throw new Error('Schreiben verweigert: Struktur nicht validiert.');
    }
    const row = this.uebersicht.getRow(rowNumber);
    const set = (key: string, value: ExcelJS.CellValue) => {
      const c = this.schema!.columns.get(key);
      if (c !== undefined) row.getCell(c + 1).value = value;
    };

    set('zustand', statusToZustand(record.status));
    for (const [field, kind] of Object.entries(DOC_FIELD_TO_KIND)) {
      const doc = record.documents.find((d) => d.kind === kind);
      if (doc) set(field, docStateToExcel(doc.state));
    }
    if (record.attendanceDaysOverride !== undefined)
      set('anwesenheitstage', record.attendanceDaysOverride);
    if (record.amountOverride !== undefined) set('betrag', record.amountOverride);
    set('tnUnterschrift', record.signature.signedAt ? 'verfügbar' : 'Fehlt');
    set('lastChecked', new Date().toLocaleDateString('de-DE'));
    row.commit();
  }

  /** Stammdaten aller TN, Schlüssel TN_ID. */
  readMaster(): Map<string, MasterData> {
    const result = new Map<string, MasterData>();
    if (!this.master) return result;
    const header = (this.master.getRow(1).values as unknown[]).slice(1);
    const schema = resolveSchema(MASTER_COLUMNS, header);
    if (!schema.columns.has('tnId')) return result;
    const col = (key: string) => schema.columns.get(key);
    const str = (row: ExcelJS.Row, key: string) => {
      const v = cellText(row, col(key));
      const s = String(v ?? '').trim();
      return s === '?' || s === '-' ? '' : s;
    };
    this.master.eachRow((row, n) => {
      if (n === 1) return;
      const tnId = str(row, 'tnId').toUpperCase();
      if (!tnId) return;
      result.set(tnId, {
        tnId,
        nachname: str(row, 'nachname'),
        vorname: str(row, 'vorname'),
        strasse: str(row, 'strasse'),
        hausnr: str(row, 'hausnr'),
        plz: str(row, 'plz').replace(/\.0$/, ''),
        ort: str(row, 'ort'),
        fahrtroute: str(row, 'fahrtroute'),
        entfernungKm: parseDistanceKm(str(row, 'entfernungKm')),
        kennzeichen: str(row, 'kennzeichen'),
        kontoinhaber: str(row, 'kontoinhaber'),
        iban: str(row, 'iban'),
        bank: str(row, 'bank'),
        bic: str(row, 'bic'),
      });
    });
    return result;
  }

  async toBuffer(): Promise<ArrayBuffer> {
    return (await this.workbook.xlsx.writeBuffer()) as ArrayBuffer;
  }
}

export { courseTypeFromId };

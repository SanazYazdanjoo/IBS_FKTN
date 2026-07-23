/**
 * StorageAdapter auf Basis der Excel-Hauptdatei.
 * Schreibkette: Struktur validiert → Backup mit Zeitstempel → nur
 * app-eigene Zellen aktualisieren. Cloud-Anbindung ersetzt später nur
 * die Persistenz, nicht die Adapter-Schnittstelle.
 */
import type { DayMarks, MonthRecord, ProcessException, SessionUser } from '../../domain/types';
import { AccessDeniedError, STAFF_ROLES, type StorageAdapter } from '../types';
import { ExcelWorkbookSource, type ExcelRow, type ExcelValidationReport, type MasterData } from './workbook';

export interface ExcelPersistence {
  /** Persist the updated workbook bytes (file handle write, or download). */
  save(buffer: ArrayBuffer, suggestedName: string): Promise<void>;
  /** Persist a backup copy BEFORE overwriting. */
  saveBackup(buffer: ArrayBuffer, suggestedName: string): Promise<void>;
}

export class ExcelStorageAdapter implements StorageAdapter {
  private rowsByMonth = new Map<number, ExcelRow[]>();
  private exceptions = new Map<string, ProcessException[]>();
  private attendanceProvider: ((month: number) => Map<string, DayMarks[]>) | null = null;
  private attendanceCache = new Map<number, Map<string, DayMarks[]>>();
  private masterData = new Map<string, MasterData>();

  private constructor(
    private readonly source: ExcelWorkbookSource,
    private readonly persistence: ExcelPersistence,
    private readonly fileName: string,
    public readonly month: number,
    public readonly year: number,
  ) {}

  static async fromBuffer(
    buffer: ArrayBuffer,
    fileName: string,
    month: number,
    year: number,
    persistence: ExcelPersistence,
  ): Promise<{ adapter: ExcelStorageAdapter; report: ExcelValidationReport }> {
    const source = await ExcelWorkbookSource.load(buffer);
    const adapter = new ExcelStorageAdapter(source, persistence, fileName, month, year);
    if (source.report.ok) {
      adapter.masterData = source.readMaster();
      adapter.monthRows(month);
    }
    return { adapter, report: source.report };
  }

  get report(): ExcelValidationReport {
    return this.source.report;
  }

  private monthRows(month: number): ExcelRow[] {
    let rows = this.rowsByMonth.get(month);
    if (!rows) {
      rows = this.source.readMonth(month, this.year).rows;
      for (const r of rows) {
        const m = this.masterData.get(r.record.participantId.toUpperCase());
        if (m?.entfernungKm != null) r.record.distanceKm = m.entfernungKm;
      }
      this.rowsByMonth.set(month, rows);
    }
    return rows;
  }

  private marksFor(month: number): Map<string, DayMarks[]> {
    if (!this.attendanceProvider) return new Map();
    let marks = this.attendanceCache.get(month);
    if (!marks) {
      marks = this.attendanceProvider(month);
      this.attendanceCache.set(month, marks);
    }
    return marks;
  }

  private monthNumber(monthStr: string): number {
    const m = Number(monthStr.split('-')[1]);
    return Number.isFinite(m) && m >= 1 && m <= 12 ? m : this.month;
  }

  /** Tagesdaten aus der Anwesenheitsliste anbinden (Vorrang vor Summen). */
  attachAttendanceProvider(provider: (month: number) => Map<string, DayMarks[]>): void {
    this.attendanceProvider = provider;
    this.attendanceCache.clear();
  }

  private findRow(participantId: string, month: number): ExcelRow {
    const row = this.monthRows(month).find((r) => r.record.participantId === participantId);
    if (!row) throw new Error(`Kein Excel-Datensatz für ${participantId} in ${month}/${this.year}`);
    return row;
  }

  private assertRead(actor: SessionUser, participantId: string): void {
    if (STAFF_ROLES.includes(actor.role)) return;
    if (actor.role === 'TN' && actor.participantId === participantId) return;
    throw new AccessDeniedError(
      `Zugriff verweigert: ${actor.name} darf ${participantId} nicht sehen (NFR-01).`,
    );
  }

  async listMonthRecords(actor: SessionUser, monthStr: string): Promise<MonthRecord[]> {
    const month = this.monthNumber(monthStr);
    const relevant = this.monthRows(month).filter((r) => !r.notRelevant);
    const marks = this.marksFor(month);
    const visible = STAFF_ROLES.includes(actor.role)
      ? relevant
      : relevant.filter((r) => r.record.participantId === actor.participantId);
    return visible.map((r) => ({
      ...structuredClone(r.record),
      attendance: structuredClone(marks.get(r.record.participantId) ?? []),
      exceptions: structuredClone(this.exceptions.get(r.record.participantId) ?? []),
    }));
  }

  async getMonthRecord(
    actor: SessionUser,
    participantId: string,
    monthStr: string,
  ): Promise<MonthRecord> {
    this.assertRead(actor, participantId);
    const month = this.monthNumber(monthStr);
    const row = this.findRow(participantId, month);
    return {
      ...structuredClone(row.record),
      attendance: structuredClone(this.marksFor(month).get(participantId) ?? []),
      exceptions: structuredClone(this.exceptions.get(participantId) ?? []),
    };
  }

  async saveMonthRecord(actor: SessionUser, record: MonthRecord): Promise<void> {
    this.assertRead(actor, record.participantId);
    if (!this.source.report.ok) {
      throw new Error('Schreiben verweigert: Excel-Struktur nicht validiert.');
    }
    const row = this.findRow(record.participantId, this.monthNumber(record.month));

    // Backup vor jeder Änderung.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = this.fileName.replace(/\.xlsx$/i, '') + `_backup_${stamp}.xlsx`;
    await this.persistence.saveBackup(await this.source.toBuffer(), backupName);

    // Nur app-eigene Zellen schreiben, dann speichern.
    this.exceptions.set(record.participantId, structuredClone(record.exceptions));
    const { exceptions: _omit, ...persistable } = record;
    row.record = { ...structuredClone(persistable), exceptions: [] };
    this.source.writeRecord(row.rowNumber, record);
    await this.persistence.save(await this.source.toBuffer(), this.fileName);
  }

  getMasterData(participantId: string): MasterData | null {
    return this.masterData.get(participantId.toUpperCase()) ?? null;
  }

  async addException(
    actor: SessionUser,
    participantId: string,
    _month: string,
    exception: ProcessException,
  ): Promise<void> {
    if (!STAFF_ROLES.includes(actor.role)) {
      throw new AccessDeniedError('Nur Mitarbeitende können Ausnahmen vermerken.');
    }
    const list = this.exceptions.get(participantId) ?? [];
    list.push(structuredClone(exception));
    this.exceptions.set(participantId, list);
  }
}

/** Persistenz über die File System Access API, mit Download-Fallback. */
export function createBrowserPersistence(handle: FileSystemFileHandle | null): ExcelPersistence {
  const download = (buffer: ArrayBuffer, name: string) => {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    async save(buffer, name) {
      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(buffer);
        await writable.close();
      } else {
        download(buffer, name);
      }
    },
    async saveBackup(buffer, name) {
      // Backups immer als Download, getrennt vom Original.
      download(buffer, name);
    },
  };
}

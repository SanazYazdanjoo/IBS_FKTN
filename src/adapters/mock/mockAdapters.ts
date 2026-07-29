/** Demo-Adapter: im Speicher, mit denselben Zugriffsregeln wie produktiv. */
import type { DayMarks, MonthRecord, ProcessException, SessionUser } from '../../domain/types';
import { AccessDeniedError, STAFF_ROLES, type AuthAdapter, type StorageAdapter } from '../types';
import { demoUsers, seedRecords } from './seed';
import { monthCalendar } from '../../domain/holidays';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createMockAuth(initialUserId = 'u-sanaz'): AuthAdapter {
  let current = demoUsers.find((u) => u.id === initialUserId) ?? demoUsers[0];
  return {
    currentUser: () => current,
    switchUser: (userId: string) => {
      const next = demoUsers.find((u) => u.id === userId);
      if (next) current = next;
    },
    listDemoUsers: () => demoUsers,
  };
}

function assertCanRead(actor: SessionUser, participantId: string): void {
  if (STAFF_ROLES.includes(actor.role)) return;
  if (actor.role === 'TN' && actor.participantId === participantId) return;
  throw new AccessDeniedError(
    `Zugriff verweigert: ${actor.name} darf die Daten von ${participantId} nicht sehen (NFR-01).`,
  );
}

export interface MockStorageAdapter extends StorageAdapter {
  /** Liefert den Datensatz; legt bei Bedarf einen leeren an. */
  getOrCreateMonthRecord(
    actor: SessionUser,
    participantId: string,
    participantName: string,
    month: string,
  ): Promise<MonthRecord>;

  /** Externe Anwesenheitsquelle überlagern (null = wieder Demo-Daten). */
  setAttendanceOverlay(provider: AttendanceOverlay | null): void;
}

/** Liefert Tagesmarkierungen und Wochenanmerkungen je Monat ('YYYY-MM'). */
export type AttendanceOverlay = (month: string) => {
  marks: Map<string, DayMarks[]>;
  notes: Map<string, Record<string, string>>;
  participants?: Map<string, { lastName: string; firstName: string }>;
};

export function createMockStorage(): MockStorageAdapter {
  const records: MonthRecord[] = clone(seedRecords);

  let attendanceOverlay: AttendanceOverlay | null = null;

  /**
   * Monate, die es nur in der externen Quelle gibt, ergänzen.
   *
   * Die Demo-Saat kennt nur 2026. Ohne diesen Schritt blieben 2025 und 2027
   * leer, obwohl die Anwesenheitsliste sie enthält — und eine leere
   * Jahresübersicht wäre nicht von einem Jahr ohne Eintragungen zu
   * unterscheiden. Die ergänzten Datensätze tragen ausschließlich
   * Anwesenheit; Ticket, Dokumente und Status bleiben auf Standardwerten,
   * weil die Liste dazu nichts weiß.
   */
  function withOverlayOnly(existing: MonthRecord[], month: string): MonthRecord[] {
    if (!attendanceOverlay) return existing;
    const { marks, participants } = attendanceOverlay(month);
    if (marks.size === 0) return existing;

    const known = new Set(existing.map((r) => r.participantId.toUpperCase()));
    const added: MonthRecord[] = [];
    for (const [tnId, attendance] of marks) {
      if (known.has(tnId)) continue;
      const person = participants?.get(tnId);
      added.push({
        participantId: tnId,
        participantName: person ? `${person.firstName} ${person.lastName}`.trim() : tnId,
        month,
        ticketType: 'ABO',
        ticketPriceEur: 49,
        distanceKm: 0,
        hasPraktikum: false,
        workdaysInMonth: monthCalendar(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)),
        ).workdays,
        documents: [],
        attendance,
        status: 'NOT_SUBMITTED',
        signature: { mode: 'PAPER' },
        exceptions: [],
      });
    }
    return [...existing, ...added];
  }

  /** Legt externe Tagesmarkierungen über einen Datensatz. */
  function overlay(r: MonthRecord): MonthRecord {
    if (!attendanceOverlay) return r;
    const { marks, notes } = attendanceOverlay(r.month);
    const own = marks.get(r.participantId.toUpperCase());
    if (!own) return r;
    return {
      ...r,
      attendance: own,
      attendanceNotes: notes.get(r.participantId.toUpperCase()) ?? r.attendanceNotes,
    };
  }

  return {
    async getOrCreateMonthRecord(actor, participantId, participantName, month) {
      assertCanRead(actor, participantId);
      let record = records.find(
        (r) => r.participantId === participantId && r.month === month,
      );
      if (!record) {
        record = {
          participantId,
          participantName,
          month,
          ticketType: 'ABO',
          ticketPriceEur: 49,
          distanceKm: 7.4,
          hasPraktikum: false,
          workdaysInMonth: 22,
          documents: [],
          attendance: [],
          status: 'NOT_SUBMITTED',
          signature: { mode: 'PAPER' },
          exceptions: [],
        };
        records.push(clone(record));
      }
      return clone(record);
    },

    /**
     * Anwesenheit aus einer externen Quelle (z. B. Google Sheets) überlagern.
     * Die Sheets-Datei enthält nur Tagesmarkierungen — Stammdaten, Tickets,
     * Dokumente und Status bleiben aus dieser Quelle. Deshalb wird sie
     * übergelagert statt den Adapter zu ersetzen.
     */
    setAttendanceOverlay(provider: AttendanceOverlay | null) {
      attendanceOverlay = provider;
    },

    async listMonthRecords(actor, month) {
      const inMonth = withOverlayOnly(
        records.filter((r) => r.month === month).map((r) => overlay(r)),
        month,
      );
      if (STAFF_ROLES.includes(actor.role)) return clone(inMonth);
      // TN: the result set itself is scoped — isolation by construction.
      return clone(inMonth.filter((r) => r.participantId === actor.participantId));
    },

    async getMonthRecord(actor, participantId, month) {
      assertCanRead(actor, participantId);
      const record = records.find(
        (r) => r.participantId === participantId && r.month === month,
      );
      if (!record) throw new Error(`Kein Datensatz: ${participantId} / ${month}`);
      return clone(overlay(record));
    },

    async saveMonthRecord(actor, record) {
      // TNs may only write their own record; staff may write any.
      assertCanRead(actor, record.participantId);
      const index = records.findIndex(
        (r) => r.participantId === record.participantId && r.month === record.month,
      );
      if (index >= 0) records[index] = clone(record);
      else records.push(clone(record));
    },

    async addException(actor, participantId, month, exception: ProcessException) {
      if (!STAFF_ROLES.includes(actor.role)) {
        throw new AccessDeniedError('Nur Mitarbeitende können Ausnahmen vermerken.');
      }
      const record = records.find(
        (r) => r.participantId === participantId && r.month === month,
      );
      if (!record) throw new Error(`Kein Datensatz: ${participantId} / ${month}`);
      record.exceptions.push(clone(exception));
    },
  };
}

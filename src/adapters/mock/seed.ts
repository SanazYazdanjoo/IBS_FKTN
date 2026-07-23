/**
 * Demo-Daten, generiert aus den echten Dummy-Dateien:
 *  - Alle_TN_Daten_dummyData.xlsx (Stammdaten + 2026 Übersicht)
 *  - Anwesenheitsliste_2026.xlsx (Tagesmarkierungen Januar–Juni)
 * Struktur & Werte stammen aus den Dateien; nur Dateinamen der Nachweise
 * sind Platzhalter. Personenbezogene Details (IBAN, Adressen) werden
 * bewusst NICHT in den Seed übernommen.
 */
import type {
  AttendanceCode,
  DayMarks,
  MonthRecord,
  ProcessStatus,
  SessionUser,
  SubmittedDocument,
  TicketType,
} from '../../domain/types';
import { MONTH_LABELS, RAW_SEED } from './seedData';

/** Aktueller Demo-Monat (letzter vollständiger Monat der Anwesenheitsliste). */
export const MONTH = '2026-06';

/** Alle Monate mit Daten — entspricht den Tabs der Anwesenheitsliste 2026. */
export const MONTHS = MONTH_LABELS.map((label, i) => ({
  ym: `2026-${String(i + 1).padStart(2, '0')}`,
  label,
}));

export const monthLabel = (ym: string): string =>
  MONTHS.find((m) => m.ym === ym)?.label ?? ym;

export const demoUsers: SessionUser[] = [
  { id: 'u-sanaz', name: 'Sanaz (Admin)', role: 'ADMIN' },
  { id: 'u-safaa', name: 'Safaa Al Helal (TN)', role: 'TN', participantId: 'PK01' },
  { id: 'u-sueheyl', name: 'Süheyl Sönmezoglu (TN)', role: 'TN', participantId: 'PK19' },
  { id: 'u-dozent', name: 'Dozent:in', role: 'DOZENT' },
  { id: 'u-kristin', name: 'Kristin (Manager)', role: 'MANAGER' },
];

const toDayMarks = (att: [string, string, string][]): DayMarks[] =>
  att.map(([date, morning, afternoon]) => ({
    date,
    morning: morning as AttendanceCode,
    afternoon: afternoon as AttendanceCode,
  }));

export const seedRecords: MonthRecord[] = RAW_SEED.map((r) => ({
  participantId: r.id,
  participantName: r.nach ? `${r.vor} ${r.nach}` : r.vor,
  month: `2026-${String(r.m).padStart(2, '0')}`,
  ticketType: r.ticketType as TicketType,
  ticketPriceEur: r.price,
  distanceKm: r.dist,
  hasPraktikum: r.hasPraktikum,
  workdaysInMonth: r.workdays,
  documents: r.docs as SubmittedDocument[],
  attendance: toDayMarks(r.att),
  attendanceNotes: r.notes ?? undefined,
  status: r.status as ProcessStatus,
  signature: r.signedAt
    ? { mode: 'PAPER' as const, signedAt: r.signedAt }
    : { mode: 'PAPER' as const },
  exceptions: [],
}));

/** VMT-Einzelfahrpreise (gepflegte Beispielwerte, P15).
 *  PK10 Roman: Januar nur 6 Anwesenheitstage → Vergleichsrechnung. */
export const vmtSingleFaresEur: Record<string, number> = {
  PK10: 2.4,
};

/** Nachname/Vorname je TN — Spalten der Anwesenheitsliste & Übersicht. */
export const tnNames: Record<string, { nach: string; vor: string }> = Object.fromEntries(
  RAW_SEED.map((r) => [r.id, { nach: r.nach, vor: r.vor }]),
);

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
import { MONTH_LABELS, RAW_MASTERS, RAW_SEED } from './seedData';
import { toFareLookup, type VmtFareTable } from '../../domain/vmtFares';

/** Aktueller Demo-Monat (letzter vollständiger Monat der Anwesenheitsliste). */
export const MONTH = '2026-06';

/** Alle Monate mit Daten — entspricht den Tabs der Anwesenheitsliste 2026. */
export const MONTHS = MONTH_LABELS.map((label, i) => ({
  ym: `2026-${String(i + 1).padStart(2, '0')}`,
  label,
}));

export const monthLabel = (ym: string): string =>
  MONTHS.find((m) => m.ym === ym)?.label ?? ym;

/** Fiktive Namen — keine reale Person. */
export const demoUsers: SessionUser[] = [
  { id: 'u-mira', name: 'Mira Vogel (Admin)', role: 'ADMIN' },
  { id: 'u-lina', name: 'Lina Keller (TN)', role: 'TN', participantId: 'PK01' },
  { id: 'u-kaan', name: 'Kaan Fischer (TN)', role: 'TN', participantId: 'PK19' },
  { id: 'u-dozent', name: 'Dozent:in', role: 'DOZENT' },
  { id: 'u-petra', name: 'Petra Lang (Manager)', role: 'MANAGER' },
  { id: 'u-jonas', name: 'Jonas Brandt (Accounting)', role: 'ACCOUNTING' },
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

/**
 * VMT-Einzelfahrpreise — Ausgangsdaten für den Fahrpreis-Kontext (P15,
 * `src/app/vmt-fares-context.tsx`). Zur Laufzeit gepflegt (Vergleichsrechnung
 * → VMT-Einzelfahrpreise), dies hier ist nur der Anfangszustand.
 *  PK10 Roman: Januar nur 6 Anwesenheitstage → Vergleichsrechnung. */
export const vmtFaresSeed: VmtFareTable = {
  PK10: { participantId: 'PK10', priceEur: 2.4, updatedAt: '2026-01-15' },
};

/**
 * Preis-Snapshot zum Ladezeitpunkt — für Ansichten, die (noch) nicht auf den
 * Fahrpreis-Kontext migriert sind. Nicht live: Preisänderungen aus der
 * Vergleichsrechnung wirken sich hier nicht mehr aus (siehe docs/DECISIONS.md).
 */
export const vmtSingleFaresEur: Record<string, number> = toFareLookup(vmtFaresSeed);

/** Nachname/Vorname je TN — Spalten der Anwesenheitsliste & Übersicht. */
export const tnNames: Record<string, { nach: string; vor: string }> = Object.fromEntries(
  RAW_SEED.map((r) => [r.id, { nach: r.nach, vor: r.vor }]),
);

/** Stammdaten (Tab „Alle_TN_Daten") für Demo-Modus & Admin-Ansichten. */
export const seedMasters: Record<string, import('../excel/workbook').MasterData> =
  Object.fromEntries(
    RAW_MASTERS.map((m) => [
      m.tnId,
      {
        ...m,
        entfernungKm: m.entfernungKm ?? null,
      } as import('../excel/workbook').MasterData,
    ]),
  );

/**
 * Domain types — IBS Fahrtkostenerstattung
 * Single source of truth for the vocabulary of the process.
 * Every screen and adapter imports from here; nothing redefines these shapes.
 */

// ── Roles ─────────────────────────────────────────────────────────────────
export type Role = 'TN' | 'ADMIN' | 'DOZENT' | 'MANAGER' | 'ACCOUNTING';

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  /** For TN users: their own participant id. Access control keys off this. */
  participantId?: string;
}

// ── Tickets & proofs ──────────────────────────────────────────────────────
export type TicketType = 'ABO' | 'ONLINE' | 'PKW';

export type ProofKind =
  | 'TICKET_PHOTO'
  | 'PAYMENT_PROOF'
  | 'INVOICE'
  | 'LICENSE_PLATE'
  | 'GENERAL_INFO'
  | 'PRAKTIKUM_CONTRACT'
  | 'DISTANCE_PROOF';

export type DocumentState = 'MISSING' | 'UPLOADED' | 'ILLEGIBLE' | 'VERIFIED';

export interface SubmittedDocument {
  kind: ProofKind;
  fileName: string;
  state: DocumentState;
  /** Begründung in einfacher Sprache bei state === 'ILLEGIBLE'. */
  correctionReason?: string;
  uploadedAt?: string;
}

// ── Attendance (Anwesenheitsberechnung) ──────────────────────────────────
/**
 * Valid cell entries per the Anwesenheitsliste 2026 legend (authoritative):
 *  X    = anwesend
 *  (x)  = anwesend, zu spät gekommen / früher gegangen
 *  E    = entschuldigtes Fehlen MIT Nachweis
 *  K    = Kulanztag (vor 9 Uhr abgemeldet; 1 Tag krank/Kind krank, kein Nachweis nötig)
 *  A    = abgemeldet per Mail, ohne Nachweis / kein Kulanztag
 *  U    = nicht abgemeldet + kein Nachweis
 * Legend rule: E/K/X/(x) zählen als "anwesend" für die Abrechnung;
 * A/U gelten als Fehltag und werden bei der Erstattung rausgerechnet.
 * Empty string = no entry.
 */
export type AttendanceCode = 'x' | 'X' | '(x)' | 'E' | 'K' | 'A' | 'U' | '';

export interface DayMarks {
  date: string;
  morning: AttendanceCode;
  afternoon: AttendanceCode;
  /** AU (medical certificate) received for this date — FR-08. */
  auReceived?: boolean;
}

// ── Process pipeline ──────────────────────────────────────────────────────
export type ProcessStatus =
  | 'NOT_SUBMITTED'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'AWAITING_CORRECTION'
  | 'AWAITING_SIGNATURE'
  | 'READY_FOR_APPROVAL'
  | 'APPROVED'
  | 'SENT_TO_ACCOUNTING'
  | 'PAID';

export type SignatureMode = 'PAPER' | 'DIGITAL';

export interface SignatureRecord {
  mode: SignatureMode;
  signedAt?: string;
  /** Days waiting — surfaced in 1d/4a so the paper delay is chase-able (P7). */
  pendingSinceDays?: number;
}

// ── Exceptions (generic mechanism) ──────────────────────────────────────
export type ExceptionCategory = 'FRIST' | 'NACHWEIS' | 'BERECHNUNG' | 'SONSTIGES';

export interface ProcessException {
  id: string;
  category: ExceptionCategory;
  reason: string;
  createdBy: string;
  createdAt: string;
  visibility: 'TEAM';
  approvedByManager: boolean;
}

// ── Participant month record ──────────────────────────────────────────────
export interface MonthRecord {
  participantId: string;
  participantName: string;
  month: string;
  ticketType: TicketType;
  ticketPriceEur: number;
  distanceKm: number;
  hasPraktikum: boolean;
  workdaysInMonth: number;
  documents: SubmittedDocument[];
  attendance: DayMarks[];
  /**
   * When data comes from the Excel Übersicht, day-level marks don't exist —
   * only totals. These overrides carry them; domain/compute.ts prefers
   * day-level data when present, falls back to the override.
   */
  attendanceDaysOverride?: number;
  /** Amount as recorded in Excel (may differ from the engine → shown as a diff, never silently replaced). */
  amountOverride?: number;
  status: ProcessStatus;
  signature: SignatureRecord;
  exceptions: ProcessException[];
}

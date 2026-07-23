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
  /** Plain-language reason shown to the TN when state === 'ILLEGIBLE' (screen 3b). */
  correctionReason?: string;
  uploadedAt?: string;
}

// ── Attendance (Anwesenheitsberechnung) ──────────────────────────────────
/** Valid cell entries in the Anwesenheitsliste. Empty string = no entry. */
export type AttendanceCode = 'x' | 'X' | '(x)' | 'E' | 'K' | 'U' | '';

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

// ── Exceptions (generic ✎ mechanism) ──────────────────────────────────────
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
  status: ProcessStatus;
  signature: SignatureRecord;
  exceptions: ProcessException[];
}

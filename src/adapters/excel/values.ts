/**
 * Wertemapping Excel ↔ Domänenmodell. Tolerant beim Lesen, kanonisch beim
 * Schreiben; nicht interpretierbare Zellen werden als Hinweise gemeldet.
 */
import type { DocumentState, ProcessStatus, TicketType } from '../../domain/types';

export interface RowIssue {
  tnId: string;
  field: string;
  raw: string;
  message: string;
}

// ── numbers ───────────────────────────────────────────────────────────────
/** Zahl mit Punkt- oder Kommadezimale; null wenn keine Zahl. */
export function parseGermanNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw ?? '').trim().replace(/\s/g, '');
  if (s.length === 0) return null;
  const normalized = s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Anwesenheitszelle: Zahl, 'Muss_Berechnet_Werden' oder Summen wie '10 + 10'. */
export function parseAttendanceDays(raw: unknown): { value: number | null; needsCalculation: boolean; odd?: string } {
  const s = String(raw ?? '').trim();
  if (/muss[_\s]berechnet/i.test(s)) return { value: null, needsCalculation: true };
  const direct = parseGermanNumber(raw);
  if (direct !== null) return { value: direct, needsCalculation: false };
  // Summennotation '10 + 10': addieren und als Hinweis melden.
  const parts = s.match(/\d+(?:[.,]\d+)?/g);
  if (parts && parts.length > 1 && s.includes('+')) {
    const sum = parts.reduce((acc, p) => acc + (parseGermanNumber(p) ?? 0), 0);
    return { value: sum, needsCalculation: false, odd: s };
  }
  return { value: null, needsCalculation: false, odd: s.length > 0 ? s : undefined };
}

// ── document states ───────────────────────────────────────────────────────
export function parseDocState(raw: unknown): { state: DocumentState | 'NOT_APPLICABLE'; odd?: string } {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'verfügbar' || s === 'verfugbar') return { state: 'VERIFIED' };
  if (s === 'fehlt') return { state: 'MISSING' };
  if (s === '-' || s === 'kein praktikum' || s.length === 0) return { state: 'NOT_APPLICABLE' };
  return { state: 'MISSING', odd: String(raw) };
}

export function docStateToExcel(state: DocumentState | 'NOT_APPLICABLE'): string {
  if (state === 'NOT_APPLICABLE') return '-';
  return state === 'VERIFIED' || state === 'UPLOADED' ? 'verfügbar' : 'fehlt';
}

// ── Zustand ↔ ProcessStatus ───────────────────────────────────────────────
/** Zustand ↔ Pipeline-Status. Unbekannte Werte bleiben erhalten und werden gemeldet. */
const ZUSTAND_TO_STATUS: Record<string, ProcessStatus | 'NOT_RELEVANT' | 'QUESTION'> = {
  'nicht_relevant': 'NOT_RELEVANT',
  'fehlende_nachweisen': 'AWAITING_CORRECTION',
  'in_bearbeitung (sanaz)': 'IN_REVIEW',
  'in_bearbeitung': 'IN_REVIEW',
  'frage (von tine/kristin)': 'QUESTION',
  'buchhaltung': 'SENT_TO_ACCOUNTING',
  'fertig (bezahlt)': 'PAID',
};

export function parseZustand(raw: unknown): {
  status: ProcessStatus | null;
  notRelevant: boolean;
  question: boolean;
  odd?: string;
} {
  const s = String(raw ?? '').trim().toLowerCase();
  const mapped = ZUSTAND_TO_STATUS[s];
  if (mapped === 'NOT_RELEVANT') return { status: null, notRelevant: true, question: false };
  if (mapped === 'QUESTION') return { status: 'IN_REVIEW', notRelevant: false, question: true };
  if (mapped) return { status: mapped, notRelevant: false, question: false };
  if (s.length === 0) return { status: 'NOT_SUBMITTED', notRelevant: false, question: false };
  return { status: 'IN_REVIEW', notRelevant: false, question: false, odd: String(raw) };
}

export function statusToZustand(status: ProcessStatus): string {
  switch (status) {
    case 'PAID':
      return 'Fertig (bezahlt)';
    case 'SENT_TO_ACCOUNTING':
      return 'Buchhaltung';
    case 'AWAITING_CORRECTION':
      return 'Fehlende_Nachweisen';
    case 'NOT_SUBMITTED':
      return 'Fehlende_Nachweisen';
    default:
      return 'In_bearbeitung (Sanaz)';
  }
}

// ── Ticketart ─────────────────────────────────────────────────────────────
export function parseTicketart(raw: unknown): { type: TicketType | null; odd?: string } {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s.startsWith('abo')) return { type: 'ABO' };
  if (s === 'online') return { type: 'ONLINE' };
  if (s === 'pkw') return { type: 'PKW' };
  if (s.length === 0 || s.includes('unbekannt') || s === '?') return { type: null };
  return { type: null, odd: String(raw) };
}

// ── booleans like 'mehr als 3km?' ─────────────────────────────────────────
export function parseJaNein(raw: unknown): boolean | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'ja') return true;
  if (s === 'nein') return false;
  return null;
}

// ── course type from TN_ID ────────────────────────────────────────────────
export function courseTypeFromId(tnId: string): 'PK' | 'BL' | null {
  const m = /^(PK|BL)/i.exec(tnId.trim());
  return m ? (m[1].toUpperCase() as 'PK' | 'BL') : null;
}

// ── Monat parsing: '1. (Januar)' → 1 ─────────────────────────────────────
export function parseMonat(raw: unknown): number | null {
  const s = String(raw ?? '').trim();
  const m = /^(\d{1,2})/.exec(s);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) return n;
  }
  return null;
}

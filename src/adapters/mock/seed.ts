/**
 * Seed data — the wireframe cast, so every screen you build can be
 * checked pixel-for-number against the Claude-Design frames.
 * All persons and data are fictional.
 */
import type { DayMarks, MonthRecord, SessionUser } from '../../domain/types';

export const MONTH = '2026-07';
const WORKDAYS = 22;

const presentDay = (n: number): DayMarks => ({
  date: `2026-07-${String(n).padStart(2, '0')}`,
  morning: 'X',
  afternoon: '',
});
const sickDay = (n: number): DayMarks => ({
  date: `2026-07-${String(n).padStart(2, '0')}`,
  morning: 'K',
  afternoon: '',
  auReceived: true,
});
const unexcusedDay = (n: number): DayMarks => ({
  date: `2026-07-${String(n).padStart(2, '0')}`,
  morning: 'U',
  afternoon: '',
});
const emptyDay = (n: number): DayMarks => ({
  date: `2026-07-${String(n).padStart(2, '0')}`,
  morning: '',
  afternoon: '',
});

const days = (count: number, make: (n: number) => DayMarks, offset = 1): DayMarks[] =>
  Array.from({ length: count }, (_, i) => make(i + offset));

export const demoUsers: SessionUser[] = [
  { id: 'u-selin', name: 'Selin (Admin)', role: 'ADMIN' },
  { id: 'u-yusuf', name: 'Yusuf A. (TN)', role: 'TN', participantId: 'tn-yusuf' },
  { id: 'u-maria', name: 'Maria K. (TN)', role: 'TN', participantId: 'tn-maria' },
  { id: 'u-brandt', name: 'Dr. Brandt (Dozent)', role: 'DOZENT' },
  { id: 'u-kristin', name: 'Kristin (Manager)', role: 'MANAGER' },
];

export const seedRecords: MonthRecord[] = [
  {
    // Yusuf — standard case: 19 reimbursable, 2 AU, 1 unexcused → 42,32 €
    participantId: 'tn-yusuf',
    participantName: 'Yusuf A.',
    month: MONTH,
    ticketType: 'ABO',
    ticketPriceEur: 49,
    distanceKm: 7.4,
    hasPraktikum: true,
    workdaysInMonth: WORKDAYS,
    documents: [
      { kind: 'TICKET_PHOTO', fileName: 'foto_0712.jpg', state: 'VERIFIED', uploadedAt: '2026-07-12' },
      { kind: 'PAYMENT_PROOF', fileName: 'kontoauszug_juli.jpg', state: 'VERIFIED', uploadedAt: '2026-07-12' },
      { kind: 'PRAKTIKUM_CONTRACT', fileName: 'vertrag.pdf', state: 'VERIFIED', uploadedAt: '2026-05-04' },
    ],
    attendance: [...days(19, presentDay), sickDay(20), sickDay(21), unexcusedDay(22)],
    status: 'READY_FOR_APPROVAL',
    signature: { mode: 'PAPER', signedAt: '2026-07-17' },
    exceptions: [
      {
        id: 'ex-1',
        category: 'FRIST',
        reason: 'Upload erst am 16.07. — Krankenhausaufenthalt, Nachweis liegt vor. Anspruch bleibt bestehen.',
        createdBy: 'u-selin',
        createdAt: '2026-07-16',
        visibility: 'TEAM',
        approvedByManager: false,
      },
    ],
  },
  {
    // Maria — waiting on TN: Kontoauszug missing, full attendance
    participantId: 'tn-maria',
    participantName: 'Maria K.',
    month: MONTH,
    ticketType: 'ABO',
    ticketPriceEur: 49,
    distanceKm: 5.1,
    hasPraktikum: false,
    workdaysInMonth: WORKDAYS,
    documents: [{ kind: 'TICKET_PHOTO', fileName: 'abo.jpg', state: 'UPLOADED', uploadedAt: '2026-07-10' }],
    attendance: days(22, presentDay),
    status: 'AWAITING_CORRECTION',
    signature: { mode: 'PAPER' },
    exceptions: [],
  },
  {
    // Ahmad — 8 days < 2 weeks → VMT comparison, 17,60 € wins
    participantId: 'tn-ahmad',
    participantName: 'Ahmad S.',
    month: MONTH,
    ticketType: 'ONLINE',
    ticketPriceEur: 49,
    distanceKm: 6.0,
    hasPraktikum: false,
    workdaysInMonth: WORKDAYS,
    documents: [
      { kind: 'TICKET_PHOTO', fileName: 'ticket.png', state: 'VERIFIED' },
      { kind: 'PAYMENT_PROOF', fileName: 'auszug.jpg', state: 'VERIFIED' },
      { kind: 'INVOICE', fileName: 'rechnung.pdf', state: 'VERIFIED' },
    ],
    attendance: [...days(8, presentDay), ...days(14, emptyDay, 9)],
    status: 'IN_REVIEW',
    signature: { mode: 'PAPER' },
    exceptions: [],
  },
  {
    // Omar — 21/22, signature pending 6 days (Modus A visibility, P7) → 46,77 €
    participantId: 'tn-omar',
    participantName: 'Omar B.',
    month: MONTH,
    ticketType: 'ABO',
    ticketPriceEur: 49,
    distanceKm: 9.3,
    hasPraktikum: false,
    workdaysInMonth: WORKDAYS,
    documents: [
      { kind: 'TICKET_PHOTO', fileName: 'abo.jpg', state: 'VERIFIED' },
      { kind: 'PAYMENT_PROOF', fileName: 'auszug.jpg', state: 'VERIFIED' },
    ],
    attendance: [...days(21, presentDay), unexcusedDay(22)],
    status: 'AWAITING_SIGNATURE',
    signature: { mode: 'PAPER', pendingSinceDays: 6 },
    exceptions: [],
  },
  {
    // Deniz — 2,8 km: needs a < 3-km distance exception approved by Kristin
    participantId: 'tn-deniz',
    participantName: 'Deniz Ö.',
    month: MONTH,
    ticketType: 'ABO',
    ticketPriceEur: 49,
    distanceKm: 2.8,
    hasPraktikum: true,
    workdaysInMonth: WORKDAYS,
    documents: [],
    attendance: days(20, presentDay),
    status: 'NOT_SUBMITTED',
    signature: { mode: 'PAPER' },
    exceptions: [],
  },
];

/** VMT single-fare table — replaces Selin's manual lookup (P15). Maintained data, not code. */
export const vmtSingleFaresEur: Record<string, number> = {
  'tn-ahmad': 1.1,
};

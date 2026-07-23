/**
 * Anwesenheitsberechnung. Zwei getrennte Konzepte:
 * Anwesenheit (Liste) vs. erstattungsfähige Tage (Abrechnung).
 */
import type { AttendanceCode, DayMarks } from './types';
import type { RuleConfig } from './rules';

/** Legende der Anwesenheitsliste: E/K/X/(x) zählen als anwesend. */
const PRESENCE_CODES: readonly AttendanceCode[] = ['E', 'K', 'x', 'X', '(x)'];

/** Strikte Lesart der Instruction (nur x/E), wählbar für Alt-Monate. */
const REIMBURSABLE_CODES_STRICT: readonly AttendanceCode[] = ['E', 'x', 'X', '(x)'];

function dayHasAnyOf(day: DayMarks, codes: readonly AttendanceCode[]): boolean {
  return codes.includes(day.morning) || codes.includes(day.afternoon);
}

/**
 * Daily rule: if AT LEAST ONE accepted sign appears in morning (V) or
 * afternoon (N), the day counts exactly once. Never double credit.
 */
export function isPresenceDay(day: DayMarks): boolean {
  return dayHasAnyOf(day, PRESENCE_CODES);
}

export function isReimbursableDay(day: DayMarks, rules: RuleConfig): boolean {
  const codes = rules.sickDaysAreReimbursable
    ? PRESENCE_CODES
    : REIMBURSABLE_CODES_STRICT;
  return dayHasAnyOf(day, codes);
}

/**
 * Unexcused: 'U' explicitly, or a fully empty day with no justification.
 * (Instruction §III: "Empty = unexcused unless justified"; an AU on file
 * justifies the gap.)
 */
export function isUnexcusedDay(day: DayMarks): boolean {
  if (isPresenceDay(day)) return false;
  if (day.morning === 'U' || day.afternoon === 'U') return true;
  // 'A' (abgemeldet): Fehltag, aber nicht unentschuldigt.
  if (day.morning === 'A' || day.afternoon === 'A') return false;
  const fullyEmpty = day.morning === '' && day.afternoon === '';
  return fullyEmpty && !day.auReceived;
}

/** Weekly aggregation: Mon–Fri evaluated daily, summed. Max 5 for a standard week. */
export function countWeekPresence(week: DayMarks[]): number {
  return week.reduce((sum, day) => sum + (isPresenceDay(day) ? 1 : 0), 0);
}

/** Monthly total = sum of weekly totals (identical to summing all days). */
export function countMonthPresence(weeks: DayMarks[][]): number {
  return weeks.reduce((sum, week) => sum + countWeekPresence(week), 0);
}

export interface AttendanceSummary {
  presenceDays: number;
  reimbursableDays: number;
  unexcusedDays: number;
  auCoveredDays: number;
  /** Zellen ohne Eintrag (Lücken-Anzeige für Dozenten). */
  openGaps: number;
}

export function summarizeAttendance(
  days: DayMarks[],
  rules: RuleConfig,
): AttendanceSummary {
  let presenceDays = 0;
  let reimbursableDays = 0;
  let unexcusedDays = 0;
  let auCoveredDays = 0;
  let openGaps = 0;
  for (const day of days) {
    if (isPresenceDay(day)) presenceDays += 1;
    if (isReimbursableDay(day, rules)) reimbursableDays += 1;
    if (isUnexcusedDay(day)) unexcusedDays += 1;
    if (day.auReceived) auCoveredDays += 1;
    if (day.morning === '' && day.afternoon === '' && !day.auReceived) openGaps += 1;
  }
  return { presenceDays, reimbursableDays, unexcusedDays, auCoveredDays, openGaps };
}

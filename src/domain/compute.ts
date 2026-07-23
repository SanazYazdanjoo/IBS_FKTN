/**
 * Zentraler Berechnungspfad für alle Ansichten (NFR-03).
 * Tagesdaten haben Vorrang; Übersicht-Summen dienen als Fallback.
 * Abweichungen zwischen Excel-Betrag und Engine werden ausgewiesen.
 */
import { summarizeAttendance, type AttendanceSummary } from './attendance';
import { calculateReimbursement, type ReimbursementResult } from './reimbursement';
import type { RuleConfig } from './rules';
import type { MonthRecord } from './types';

export interface MonthView {
  attendance: AttendanceSummary;
  result: ReimbursementResult;
  /** Engine amount vs. Excel-recorded amount, when both exist and differ. */
  amountMismatch: { engine: number; excel: number } | null;
}

export function computeMonthView(
  record: MonthRecord,
  rules: RuleConfig,
  vmtSingleFareEur?: number,
): MonthView {
  const hasDayMarks = record.attendance.length > 0;
  const summarized = summarizeAttendance(record.attendance, rules);
  const attendance: AttendanceSummary = hasDayMarks
    ? summarized
    : {
        presenceDays: record.attendanceDaysOverride ?? 0,
        reimbursableDays: record.attendanceDaysOverride ?? 0,
        unexcusedDays: 0,
        auCoveredDays: 0,
        openGaps: 0,
      };

  const result = calculateReimbursement(
    {
      pkw:
        record.ticketType === 'PKW' && record.distanceKm > 0 && record.distanceKm < 900
          ? { distanceKm: record.distanceKm }
          : undefined,
      ticketPriceEur: record.ticketPriceEur,
      workdaysInMonth: record.workdaysInMonth,
      reimbursableDays: attendance.reimbursableDays,
      unexcusedDays: attendance.unexcusedDays,
      vmtSingleFareEur,
      eligibility: {
        distanceKm: record.distanceKm,
        hasApprovedDistanceException: record.exceptions.some((e) => e.approvedByManager),
      },
    },
    rules,
  );

  const amountMismatch =
    record.amountOverride !== undefined &&
    result.eligible &&
    Math.abs(record.amountOverride - result.amountEur) >= 0.01
      ? { engine: result.amountEur, excel: record.amountOverride }
      : null;

  return { attendance, result, amountMismatch };
}

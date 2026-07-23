/**
 * Approval rules — Kristin's queue (screen 4a).
 * Generic ✎ exceptions and known-rule flags are never hidden and never
 * bulk-approved ("✎-Ausnahmen nie im Stapel — immer einzeln").
 */
import type { MonthRecord } from './types';
import type { RuleConfig } from './rules';

export interface ApprovalFlags {
  hasGenericException: boolean;
  hasUnapprovedException: boolean;
  needsComparison: boolean;
  needsDistanceException: boolean;
  signaturePending: boolean;
}

export function approvalFlags(record: MonthRecord, rules: RuleConfig): ApprovalFlags {
  const hasGenericException = record.exceptions.length > 0;
  return {
    hasGenericException,
    hasUnapprovedException: record.exceptions.some((e) => !e.approvedByManager),
    needsComparison: false, // computed by caller from attendance summary
    needsDistanceException: record.distanceKm <= rules.minDistanceKm,
    signaturePending: record.signature.signedAt === undefined,
  };
}

/** Eligible for "alle auf einmal freigeben": no flags, no exceptions, signed. */
export function isBulkApprovable(record: MonthRecord, rules: RuleConfig): boolean {
  const flags = approvalFlags(record, rules);
  return (
    !flags.hasGenericException &&
    !flags.needsDistanceException &&
    !flags.signaturePending &&
    record.status === 'READY_FOR_APPROVAL'
  );
}

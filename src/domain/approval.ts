/**
 * Freigabe-Regeln. Vermerkte Ausnahmen und Regel-Flags werden nie im
 * Stapel freigegeben, sondern immer einzeln geprüft.
 */
import type { MonthRecord, RejectionRecord } from './types';
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
    needsComparison: false,
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

/**
 * Ablehnung durch die Freigabe ("Red Arrow"): geht direkt zurück an den
 * Admin zur Korrektur — kein manuelles Relais (z. B. KST 0098) dazwischen.
 * Der Grund ist Pflicht und wird an die Ablehnungs-Historie angehängt.
 */
export function rejectClaim(
  record: MonthRecord,
  rejectionReason: string,
  rejectedBy: string,
): MonthRecord {
  const reason = rejectionReason.trim();
  if (reason.length === 0) {
    throw new Error('Ablehnung erfordert eine Begründung (rejectionReason darf nicht leer sein).');
  }
  const rejection: RejectionRecord = {
    reason,
    rejectedBy,
    rejectedAt: new Date().toISOString(),
  };
  return {
    ...record,
    status: 'AWAITING_CORRECTION',
    rejectionHistory: [rejection, ...(record.rejectionHistory ?? [])],
  };
}

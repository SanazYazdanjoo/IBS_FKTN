/**
 * Single derivation for the TN flow (NFR-03, P6). Both the standard flow and
 * the "Schritt für Schritt" mode (P1) render from this one call — neither
 * recomputes requiredProofs()/checkCompleteness()/the reimbursement trace
 * itself, so the two presentations can never disagree with each other.
 */
import { computeMonthView, type MonthView } from '../../domain/compute';
import { checkCompleteness, requiredProofs, type CompletenessResult } from '../../domain/submission';
import type { MonthRecord, ProofKind } from '../../domain/types';
import type { RuleConfig } from '../../domain/rules';

export interface TnFlowState {
  attendance: MonthView['attendance'];
  result: MonthView['result'];
  completeness: CompletenessResult;
  required: ProofKind[];
}

function submissionContextOf(record: MonthRecord) {
  return {
    ticketType: record.ticketType,
    hasPraktikum: record.hasPraktikum,
    praktikumContractAlreadyOnFile: record.documents.some(
      (d) => d.kind === 'PRAKTIKUM_CONTRACT' && d.state === 'VERIFIED',
    ),
    aboCardAlreadyOnFile: false,
  };
}

export function deriveTnFlowState(
  record: MonthRecord,
  rules: RuleConfig,
  vmtSingleFareEur?: number,
): TnFlowState {
  const { attendance, result } = computeMonthView(record, rules, vmtSingleFareEur);
  const ctx = submissionContextOf(record);
  return {
    attendance,
    result,
    required: requiredProofs(ctx),
    completeness: checkCompleteness(ctx, record.documents),
  };
}

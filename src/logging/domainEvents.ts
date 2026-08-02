/**
 * Thin, pre-bucketed wrappers around Logger.emit for the domain/admin/data-
 * source event types. The domain layer itself stays untouched — these are
 * called from the feature/adapter layer that already holds both the domain
 * result and the participant id, per the doc's "have it return the event,
 * and let the calling layer emit it" guidance. Each helper hashes the
 * participant id with the same per-install salt used for the actor id, so
 * it is never the raw participantId that reaches a sink.
 */
import type { ExceptionCategory, ProcessStatus, SignatureMode } from '../domain/types.ts';
import { EventType, bucket, AMOUNT_BUCKETS_CENTS, DURATION_BUCKETS_MS } from './events.ts';
import { hashPseudonymousId } from './salt.ts';
import type { Logger } from './logger.ts';
import type { Env, SourceMode } from './schema.ts';

async function pidOf(participantId: string): Promise<string> {
  return hashPseudonymousId(participantId);
}

export async function logStatusTransition(
  logger: Logger | null,
  from: ProcessStatus,
  to: ProcessStatus,
  participantId: string,
): Promise<void> {
  if (!logger) return;
  logger.emit(EventType.STATUS_TRANSITION, undefined, { from, to, pid: await pidOf(participantId) });
}

export async function logCalculationRun(
  logger: Logger | null,
  ruleVersion: string,
  participantId: string,
): Promise<void> {
  if (!logger) return;
  logger.emit(EventType.CALCULATION_RUN, undefined, { rv: ruleVersion, pid: await pidOf(participantId) });
}

export async function logAmountMismatch(
  logger: Logger | null,
  engineAmountCents: number,
  excelAmountCents: number,
  participantId: string,
): Promise<void> {
  if (!logger) return;
  const magnitude = Math.abs(engineAmountCents - excelAmountCents);
  if (magnitude === 0) return;
  logger.emit(EventType.AMOUNT_MISMATCH, undefined, {
    mag: bucket(magnitude, AMOUNT_BUCKETS_CENTS),
    pid: await pidOf(participantId),
  });
}

export async function logExceptionApplied(
  logger: Logger | null,
  category: ExceptionCategory,
  participantId: string,
): Promise<void> {
  if (!logger) return;
  logger.emit(EventType.EXCEPTION_APPLIED, undefined, { cat: category, pid: await pidOf(participantId) });
}

export async function logSignatureModeUsed(
  logger: Logger | null,
  mode: SignatureMode,
  participantId: string,
): Promise<void> {
  if (!logger) return;
  logger.emit(EventType.SIGNATURE_MODE_USED, undefined, { mode, pid: await pidOf(participantId) });
}

export async function logApprove(logger: Logger | null, participantId: string): Promise<void> {
  if (!logger) return;
  logger.emit(EventType.APPROVE, undefined, { pid: await pidOf(participantId) });
}

export function logBulkApprove(logger: Logger | null, itemCount: number, failureCount: number): void {
  logger?.emit(EventType.BULK_APPROVE, undefined, { n: itemCount, fail: failureCount });
}

export async function logCorrectionRequested(
  logger: Logger | null,
  category: ExceptionCategory,
  participantId: string,
): Promise<void> {
  if (!logger) return;
  logger.emit(EventType.CORRECTION_REQUESTED, undefined, { cat: category, pid: await pidOf(participantId) });
}

export function logQueueOpened(logger: Logger | null, itemCount: number): void {
  logger?.emit(EventType.QUEUE_OPENED, undefined, { n: itemCount });
}

export async function logReviewDuration(
  logger: Logger | null,
  durationMs: number,
  participantId: string,
): Promise<void> {
  if (!logger) return;
  logger.emit(EventType.REVIEW_DURATION, undefined, {
    dur: bucket(durationMs, DURATION_BUCKETS_MS),
    pid: await pidOf(participantId),
  });
}

export function logAdapterSelected(logger: Logger | null, kind: Env, mode?: SourceMode): void {
  logger?.emit(EventType.ADAPTER_SELECTED, undefined, { kind, mode });
}

export function logWorkbookValidation(
  logger: Logger | null,
  ok: boolean,
  rowCount: number,
  unknownColumnCount: number,
): void {
  logger?.emit(EventType.WORKBOOK_VALIDATION, undefined, { ok, rows: rowCount, unknownCols: unknownColumnCount });
}

export function logCrossCheckDivergence(logger: Logger | null, divergenceCount: number): void {
  if (divergenceCount === 0) return;
  logger?.emit(EventType.CROSS_CHECK_DIVERGENCE, undefined, { n: divergenceCount });
}

export function logWriteOutcome(logger: Logger | null, ok: boolean, durationMs: number): void {
  logger?.emit(EventType.WRITE_OUTCOME, undefined, { ok, dur: bucket(durationMs, DURATION_BUCKETS_MS) });
}

export function logUploadStart(
  logger: Logger | null,
  kind: string,
  mime: string,
  sizeBytes: number,
): void {
  logger?.emit(EventType.UPLOAD_START, undefined, {
    kind,
    mime,
    sz: bucket(sizeBytes, [10_000, 100_000, 1_000_000, 5_000_000]),
  });
}

export function logUploadOutcome(
  logger: Logger | null,
  ok: boolean,
  durationMs: number,
  reason?: string,
): void {
  logger?.emit(EventType.UPLOAD_OUTCOME, undefined, {
    ok,
    dur: bucket(durationMs, DURATION_BUCKETS_MS),
    reason,
  });
}

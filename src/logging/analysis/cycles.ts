/**
 * Reconstructs submission cycles (SUBMITTED → … → PAID) and correction
 * loops from STATUS_TRANSITION events, correlated by the pseudonymous
 * participant id (a.pid) across *all* supplied logs — a cycle routinely
 * spans many sessions/days/actors (TN submits, Dozent/Admin reviews days
 * later, Manager approves after that), so this deliberately does not
 * assume one session equals one cycle.
 */
import { EventType } from '../events.ts';
import type { ProcessStatus } from '../../domain/types.ts';
import { toAbsoluteEvents, type DecodedLog } from './types.ts';

export interface StatusEvent {
  pid: string;
  from: ProcessStatus;
  to: ProcessStatus;
  abs: number;
}

export interface Cycle {
  pid: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  correctionLoops: number;
  reachedPaid: boolean;
  /** Total time spent in each stage before leaving it, summed across every visit (a correction loop can revisit a stage). */
  stageDurations: Partial<Record<ProcessStatus, number>>;
}

export function extractStatusEvents(logs: readonly DecodedLog[]): StatusEvent[] {
  const all: StatusEvent[] = [];
  for (const log of logs) {
    for (const e of toAbsoluteEvents(log)) {
      if (e.ty !== EventType.STATUS_TRANSITION || !e.a) continue;
      const pid = e.a.pid as string | undefined;
      const to = e.a.to as ProcessStatus | undefined;
      if (!pid || !to) continue;
      all.push({ pid, from: (e.a.from as ProcessStatus | undefined) ?? 'NOT_SUBMITTED', to, abs: e.abs });
    }
  }
  return all.sort((a, b) => a.abs - b.abs);
}

export function reconstructCycles(logs: readonly DecodedLog[]): Cycle[] {
  const byPid = new Map<string, StatusEvent[]>();
  for (const ev of extractStatusEvents(logs)) {
    const list = byPid.get(ev.pid) ?? [];
    list.push(ev);
    byPid.set(ev.pid, list);
  }

  const cycles: Cycle[] = [];
  for (const [pid, list] of byPid) {
    let cycleStart: StatusEvent | null = null;
    let correctionLoops = 0;
    let stageEnter = new Map<ProcessStatus, number>();
    let stageDurations: Partial<Record<ProcessStatus, number>> = {};

    const closeOpenCycle = (endedAt: number, reachedPaid: boolean) => {
      if (!cycleStart) return;
      cycles.push({
        pid,
        startedAt: cycleStart.abs,
        endedAt,
        durationMs: Math.max(0, endedAt - cycleStart.abs),
        correctionLoops,
        reachedPaid,
        stageDurations,
      });
      cycleStart = null;
      correctionLoops = 0;
      stageEnter = new Map();
      stageDurations = {};
    };

    for (const ev of list) {
      if (!cycleStart && ev.to === 'SUBMITTED') {
        cycleStart = ev;
        stageEnter.set('SUBMITTED', ev.abs);
        continue;
      }
      if (!cycleStart) continue;

      const enteredFromAt = stageEnter.get(ev.from);
      if (enteredFromAt !== undefined) {
        stageDurations[ev.from] = (stageDurations[ev.from] ?? 0) + Math.max(0, ev.abs - enteredFromAt);
      }
      stageEnter.set(ev.to, ev.abs);
      if (ev.to === 'AWAITING_CORRECTION') correctionLoops += 1;
      if (ev.to === 'PAID') closeOpenCycle(ev.abs, true);
    }
    if (cycleStart) closeOpenCycle(list[list.length - 1].abs, false);
  }
  return cycles;
}

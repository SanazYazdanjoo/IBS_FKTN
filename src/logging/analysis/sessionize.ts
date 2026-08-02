import { EventType } from '../events.ts';
import type { Role } from '../schema.ts';
import { toAbsoluteEvents, type DecodedLog } from './types.ts';

export interface SessionSummary {
  sid: string;
  role: Role;
  aid: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  eventCount: number;
  /** False for a session that ended without SESSION_END (crash, killed tab, laptop closed) — still summarised, just flagged. */
  hadExplicitEnd: boolean;
}

export function sessionize(logs: readonly DecodedLog[]): SessionSummary[] {
  return logs.map((log) => {
    const abs = toAbsoluteEvents(log);
    const startedAt = Date.parse(log.header.t0);
    const last = abs[abs.length - 1];
    const hadExplicitEnd = log.events.some((e) => e.ty === EventType.SESSION_END);
    return {
      sid: log.header.sid,
      role: log.header.role,
      aid: log.header.aid,
      startedAt,
      endedAt: last ? last.abs : startedAt,
      durationMs: last ? Math.max(0, last.abs - startedAt) : 0,
      eventCount: log.events.length,
      hadExplicitEnd,
    };
  });
}

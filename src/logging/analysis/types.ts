/** Shared shapes for the analysis layer. Pure, DOM-free — safe to import from the Node CLI. */
import type { Envelope, SessionHeader } from '../schema.ts';

/** One decoded session file: header + its events, already JSON-parsed. */
export interface DecodedLog {
  header: SessionHeader;
  events: Envelope[];
}

export interface AbsoluteEvent extends Envelope {
  /** Wall-clock ms since epoch — header.t0 plus the event's delta. */
  abs: number;
}

export function toAbsoluteEvents(log: DecodedLog): AbsoluteEvent[] {
  const t0 = Date.parse(log.header.t0);
  return log.events.map((e) => ({ ...e, abs: t0 + e.t }));
}

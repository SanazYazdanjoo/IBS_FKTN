/**
 * Envelope + session header shapes, schema version, and structural
 * validators. Pure and DOM-free — importable from Node CLI scripts, so
 * internal imports use an explicit .ts extension (see events.ts header).
 */
import type { EventTypeId, ScreenId } from './events.ts';

/** Bump on any breaking change to the envelope or header shape. Never on a mere event-type addition. */
export const SCHEMA_VERSION = 1;

export type Role = 'TN' | 'ADMIN' | 'DOZENT' | 'MANAGER' | 'ACCOUNTING';
export type Env = 'MOCK' | 'EXCEL';
export type SourceMode = 'FILE' | 'FOLDER';

export interface UaInfo {
  family: string;
  major: string;
  os: string;
  mobile: boolean;
}

export interface ViewportInfo {
  w: number;
  h: number;
  dpr: number;
}

/** Session-constant fields, written once at the top of each log file. */
export interface SessionHeader {
  v: number;
  sid: string;
  t0: string;
  tz: string;
  role: Role;
  aid: string;
  app: string;
  env: Env;
  sourceMode?: SourceMode;
  ua: UaInfo;
  vp: ViewportInfo;
  lang: string;
  net?: string;
}

/** Per-event envelope. `a` is omitted entirely when the payload has no fields. */
export interface Envelope {
  t: number;
  ty: EventTypeId;
  sq: number;
  sc: ScreenId;
  a?: Record<string, string | number | boolean>;
}

export function isValidUaInfo(v: unknown): v is UaInfo {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.family === 'string' &&
    typeof o.major === 'string' &&
    typeof o.os === 'string' &&
    typeof o.mobile === 'boolean'
  );
}

export function isValidViewportInfo(v: unknown): v is ViewportInfo {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.w === 'number' && typeof o.h === 'number' && typeof o.dpr === 'number';
}

const ROLES: readonly Role[] = ['TN', 'ADMIN', 'DOZENT', 'MANAGER', 'ACCOUNTING'];
const ENVS: readonly Env[] = ['MOCK', 'EXCEL'];

export function isValidSessionHeader(v: unknown): v is SessionHeader {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.v === 'number' &&
    typeof o.sid === 'string' &&
    typeof o.t0 === 'string' &&
    typeof o.tz === 'string' &&
    ROLES.includes(o.role as Role) &&
    typeof o.aid === 'string' &&
    typeof o.app === 'string' &&
    ENVS.includes(o.env as Env) &&
    isValidUaInfo(o.ua) &&
    isValidViewportInfo(o.vp) &&
    typeof o.lang === 'string'
  );
}

export function isValidEnvelope(v: unknown): v is Envelope {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.t !== 'number' || typeof o.ty !== 'number') return false;
  if (typeof o.sq !== 'number' || typeof o.sc !== 'number') return false;
  if (o.a !== undefined && (typeof o.a !== 'object' || o.a === null || Array.isArray(o.a))) return false;
  return true;
}

export interface SequenceCheck {
  ok: boolean;
  gaps: number[];
}

/** sq must be gapless and strictly increasing within one session. */
export function validateSequence(events: readonly Pick<Envelope, 'sq'>[]): SequenceCheck {
  const gaps: number[] = [];
  for (let i = 1; i < events.length; i += 1) {
    if (events[i].sq !== events[i - 1].sq + 1) gaps.push(i);
  }
  return { ok: gaps.length === 0, gaps };
}

/** t deltas must never decrease within one session (monotonic clock). */
export function validateMonotonicDeltas(events: readonly Pick<Envelope, 't'>[]): boolean {
  for (let i = 1; i < events.length; i += 1) {
    if (events[i].t < events[i - 1].t) return false;
  }
  return true;
}

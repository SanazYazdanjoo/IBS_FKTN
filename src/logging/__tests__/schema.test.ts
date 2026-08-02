import { describe, expect, it } from 'vitest';
import {
  isValidEnvelope,
  isValidSessionHeader,
  SCHEMA_VERSION,
  validateMonotonicDeltas,
  validateSequence,
  type SessionHeader,
} from '../schema.ts';

const validHeader: SessionHeader = {
  v: SCHEMA_VERSION,
  sid: 'abc-123',
  t0: new Date().toISOString(),
  tz: 'Europe/Berlin',
  role: 'TN',
  aid: 'deadbeefdeadbeef',
  app: '0.1.0',
  env: 'MOCK',
  ua: { family: 'Chrome', major: '120', os: 'Windows', mobile: false },
  vp: { w: 1920, h: 1080, dpr: 1 },
  lang: 'de-DE',
};

describe('schema version', () => {
  it('is present on every session header', () => {
    expect(isValidSessionHeader(validHeader)).toBe(true);
    expect(validHeader.v).toBe(SCHEMA_VERSION);
  });

  it('rejects a header missing required fields', () => {
    const { role: _role, ...withoutRole } = validHeader;
    expect(isValidSessionHeader(withoutRole)).toBe(false);
  });

  it('rejects an unknown role or env', () => {
    expect(isValidSessionHeader({ ...validHeader, role: 'HACKER' })).toBe(false);
    expect(isValidSessionHeader({ ...validHeader, env: 'CLOUD' })).toBe(false);
  });
});

describe('envelope validity', () => {
  it('accepts a minimal envelope with no payload', () => {
    expect(isValidEnvelope({ t: 0, ty: 2, sq: 0, sc: 1 })).toBe(true);
  });

  it('rejects an envelope with a non-object payload', () => {
    expect(isValidEnvelope({ t: 0, ty: 2, sq: 0, sc: 1, a: 'nope' })).toBe(false);
    expect(isValidEnvelope({ t: 0, ty: 2, sq: 0, sc: 1, a: ['nope'] })).toBe(false);
  });

  it('rejects missing numeric fields', () => {
    expect(isValidEnvelope({ ty: 2, sq: 0, sc: 1 })).toBe(false);
  });
});

describe('sequence and delta invariants', () => {
  it('reports gapless, strictly increasing sq as ok', () => {
    const check = validateSequence([{ sq: 0 }, { sq: 1 }, { sq: 2 }]);
    expect(check).toEqual({ ok: true, gaps: [] });
  });

  it('flags a gap in sq', () => {
    const check = validateSequence([{ sq: 0 }, { sq: 1 }, { sq: 3 }]);
    expect(check.ok).toBe(false);
    expect(check.gaps).toEqual([2]);
  });

  it('treats non-monotonic t deltas as invalid', () => {
    expect(validateMonotonicDeltas([{ t: 0 }, { t: 10 }, { t: 30 }])).toBe(true);
    expect(validateMonotonicDeltas([{ t: 0 }, { t: 50 }, { t: 30 }])).toBe(false);
  });
});

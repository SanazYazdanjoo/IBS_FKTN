import { describe, expect, it } from 'vitest';
import { EventType, Screen } from '../events.ts';
import { SCHEMA_VERSION, type Envelope, type Role, type SessionHeader } from '../schema.ts';
import type { DecodedLog } from '../analysis/types.ts';
import { sessionize } from '../analysis/sessionize.ts';
import { reconstructCycles } from '../analysis/cycles.ts';
import { computeFieldFunnels, computeFormFunnels } from '../analysis/funnels.ts';
import { computeTimeOnTask } from '../analysis/timeOnTask.ts';
import { computeErrorRates } from '../analysis/errorRates.ts';

const DAY = 24 * 60 * 60 * 1000;
const EPOCH = Date.parse('2026-01-01T00:00:00.000Z');

function makeHeader(sid: string, role: Role, dayOffset: number): SessionHeader {
  return {
    v: SCHEMA_VERSION,
    sid,
    t0: new Date(EPOCH + dayOffset * DAY).toISOString(),
    tz: 'Europe/Berlin',
    role,
    aid: `aid-${role}`,
    app: '0.1.0',
    env: 'MOCK',
    ua: { family: 'Chrome', major: '120', os: 'Windows', mobile: false },
    vp: { w: 1024, h: 768, dpr: 1 },
    lang: 'de-DE',
  };
}

/** Builds a session's event list without manual sq bookkeeping. */
class Builder {
  private sq = 0;
  events: Envelope[] = [];
  push(t: number, ty: number, sc: number, a?: Envelope['a']): this {
    this.events.push({ t, ty, sq: this.sq, sc, ...(a ? { a } : {}) });
    this.sq += 1;
    return this;
  }
}

// Session A (TN, day 0): submits.
const a = new Builder()
  .push(0, EventType.SESSION_START, Screen.TN_FLOW)
  .push(100, EventType.ROUTE_ENTER, Screen.TN_FLOW)
  .push(5000, EventType.STATUS_TRANSITION, Screen.TN_FLOW, { from: 'NOT_SUBMITTED', to: 'SUBMITTED', pid: 'p1' })
  .push(6000, EventType.FIELD_FOCUS, Screen.TN_FLOW, { f: 'ticketPrice' })
  .push(6200, EventType.FIELD_FIRST_CHANGE, Screen.TN_FLOW, { f: 'ticketPrice', ttfi: 0 })
  .push(9000, EventType.FIELD_BLUR, Screen.TN_FLOW, { f: 'ticketPrice', dw: 1 })
  .push(9100, EventType.FORM_SUBMIT_ATTEMPT, Screen.TN_FLOW, { form: 'tnFlow' })
  .push(9300, EventType.FORM_SUBMIT_SUCCESS, Screen.TN_FLOW, { form: 'tnFlow' })
  .push(15000, EventType.ROUTE_LEAVE, Screen.TN_FLOW, { dw: 1 })
  .push(15100, EventType.SESSION_END, Screen.TN_FLOW).events;

// Session B (Admin, day 2): reviews, requests a correction — tab closes without SESSION_END.
const b = new Builder()
  .push(0, EventType.SESSION_START, Screen.ADMIN_UEBERSICHT)
  .push(100, EventType.ROUTE_ENTER, Screen.ADMIN_UEBERSICHT)
  .push(2000, EventType.STATUS_TRANSITION, Screen.ADMIN_UEBERSICHT, { from: 'SUBMITTED', to: 'IN_REVIEW', pid: 'p1' })
  .push(5000, EventType.STATUS_TRANSITION, Screen.ADMIN_UEBERSICHT, {
    from: 'IN_REVIEW',
    to: 'AWAITING_CORRECTION',
    pid: 'p1',
  })
  .push(6000, EventType.ROUTE_LEAVE, Screen.ADMIN_UEBERSICHT, { dw: 2 }).events;

// Session C (TN + pipeline completes, day 4): resubmits, runs through to PAID.
const c = new Builder()
  .push(0, EventType.SESSION_START, Screen.TN_FLOW)
  .push(100, EventType.ROUTE_ENTER, Screen.TN_FLOW)
  .push(200, EventType.STATUS_TRANSITION, Screen.TN_FLOW, { from: 'AWAITING_CORRECTION', to: 'SUBMITTED', pid: 'p1' })
  .push(2000, EventType.STATUS_TRANSITION, Screen.TN_FLOW, { from: 'SUBMITTED', to: 'IN_REVIEW', pid: 'p1' })
  .push(3000, EventType.STATUS_TRANSITION, Screen.TN_FLOW, { from: 'IN_REVIEW', to: 'AWAITING_SIGNATURE', pid: 'p1' })
  .push(4000, EventType.STATUS_TRANSITION, Screen.TN_FLOW, { from: 'AWAITING_SIGNATURE', to: 'APPROVED', pid: 'p1' })
  .push(5000, EventType.STATUS_TRANSITION, Screen.TN_FLOW, {
    from: 'APPROVED',
    to: 'SENT_TO_ACCOUNTING',
    pid: 'p1',
  })
  .push(6000, EventType.STATUS_TRANSITION, Screen.TN_FLOW, { from: 'SENT_TO_ACCOUNTING', to: 'PAID', pid: 'p1' })
  .push(6100, EventType.SESSION_END, Screen.TN_FLOW).events;

const logs: DecodedLog[] = [
  { header: makeHeader('sess-a', 'TN', 0), events: a },
  { header: makeHeader('sess-b', 'ADMIN', 2), events: b },
  { header: makeHeader('sess-c', 'TN', 4), events: c },
];

describe('sessionize', () => {
  it('summarises each session, flagging the one that never sent SESSION_END', () => {
    const summaries = sessionize(logs);
    expect(summaries).toHaveLength(3);
    expect(summaries.find((s) => s.sid === 'sess-a')?.hadExplicitEnd).toBe(true);
    expect(summaries.find((s) => s.sid === 'sess-b')?.hadExplicitEnd).toBe(false);
    expect(summaries.find((s) => s.sid === 'sess-c')?.hadExplicitEnd).toBe(true);
  });
});

describe('reconstructCycles', () => {
  it('reconstructs one cycle for a participant across three sessions spanning four days, with one correction loop', () => {
    const cycles = reconstructCycles(logs);
    expect(cycles).toHaveLength(1);
    const cycle = cycles[0];
    expect(cycle.pid).toBe('p1');
    expect(cycle.correctionLoops).toBe(1);
    expect(cycle.reachedPaid).toBe(true);

    const submittedAbs = Date.parse(logs[0].header.t0) + 5000; // session A, SUBMITTED
    const paidAbs = Date.parse(logs[2].header.t0) + 6000; // session C, PAID
    expect(cycle.startedAt).toBe(submittedAbs);
    expect(cycle.endedAt).toBe(paidAbs);
    expect(cycle.durationMs).toBe(paidAbs - submittedAbs);
    expect(cycle.durationMs).toBeGreaterThan(4 * DAY); // genuinely crosses the session boundary
  });
});

describe('funnels', () => {
  it('counts field focus/fill and form submit outcomes', () => {
    const fields = computeFieldFunnels(logs);
    const ticketPrice = fields.find((f) => f.fieldId === 'ticketPrice');
    expect(ticketPrice).toMatchObject({ focusCount: 1, filledCount: 1, abandonedCount: 0 });

    const forms = computeFormFunnels(logs);
    const tnFlow = forms.find((f) => f.formId === 'tnFlow');
    expect(tnFlow).toMatchObject({ attempts: 1, successes: 1, failures: 0 });
  });
});

describe('time on task', () => {
  it('aggregates dwell buckets per screen from ROUTE_LEAVE events', () => {
    const summary = computeTimeOnTask(logs);
    const tnFlow = summary.find((s) => s.screen === Screen.TN_FLOW);
    const admin = summary.find((s) => s.screen === Screen.ADMIN_UEBERSICHT);
    expect(tnFlow?.visits).toBe(1);
    expect(tnFlow?.dwellBucketCounts[1]).toBe(1);
    expect(admin?.visits).toBe(1);
    expect(admin?.dwellBucketCounts[2]).toBe(1);
  });
});

describe('error rates', () => {
  it('counts ROUTE_ENTER visits per screen with zero errors in this fixture', () => {
    const rates = computeErrorRates(logs);
    const tnFlow = rates.find((r) => r.screen === Screen.TN_FLOW);
    expect(tnFlow?.visits).toBe(2); // sessions A and C both enter TN_FLOW
    expect(tnFlow?.validationFailures).toBe(0);
    expect(tnFlow?.exceptions).toBe(0);
  });
});

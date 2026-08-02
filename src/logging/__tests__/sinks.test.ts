import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemorySink } from '../sinks/MemorySink.ts';
import { IndexedDbSink, evictOldestUntilUnderBudget } from '../sinks/IndexedDbSink.ts';
import { SCHEMA_VERSION, type SessionHeader } from '../schema.ts';

function header(sid: string): SessionHeader {
  return {
    v: SCHEMA_VERSION,
    sid,
    t0: new Date().toISOString(),
    tz: 'Europe/Berlin',
    role: 'TN',
    aid: 'aid-1',
    app: '0.1.0',
    env: 'MOCK',
    ua: { family: 'Chrome', major: '120', os: 'Windows', mobile: false },
    vp: { w: 1024, h: 768, dpr: 1 },
    lang: 'de-DE',
  };
}

describe('MemorySink', () => {
  it('writes and reads back header + events as NDJSON', async () => {
    const sink = new MemorySink();
    await sink.init(header('s1'));
    await sink.append(['{"t":0,"ty":2,"sq":0,"sc":1}']);
    const text = await sink.readAllNdjson();
    const lines = text.split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).sid).toBe('s1');
  });

  it('clear() wipes everything', async () => {
    const sink = new MemorySink();
    await sink.init(header('s1'));
    await sink.append(['{"t":0,"ty":2,"sq":0,"sc":1}']);
    await sink.clear();
    expect(await sink.readAllNdjson()).toBe('');
  });
});

describe('IndexedDbSink', () => {
  beforeEach(async () => {
    await IndexedDbSink.clearAll();
  });

  it('writes and reads back a session round-trip', async () => {
    const sink = new IndexedDbSink();
    await sink.init(header('idb-1'));
    await sink.append(['{"t":0,"ty":2,"sq":0,"sc":1}', '{"t":5,"ty":3,"sq":1,"sc":1}']);

    const text = await sink.readAllNdjson();
    const lines = text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3); // header + 2 events
    expect(JSON.parse(lines[0]).sid).toBe('idb-1');
    expect(await sink.sizeBytes()).toBeGreaterThan(0);
  });

  it('clear() removes only its own session', async () => {
    const a = new IndexedDbSink();
    const b = new IndexedDbSink();
    await a.init(header('idb-a'));
    await b.init(header('idb-b'));
    await a.clear();
    expect(await a.readAllNdjson()).toBe('');
    expect(await b.readAllNdjson()).not.toBe('');
  });

  it('evicts the oldest session first once the total budget is exceeded', async () => {
    const oldest = new IndexedDbSink();
    await oldest.init(header('idb-old'));
    await oldest.append(['x'.repeat(40)]);

    await new Promise((r) => setTimeout(r, 5));

    const newest = new IndexedDbSink();
    await newest.init(header('idb-new'));
    await newest.append(['y'.repeat(40)]);

    // Budget fits the newest session alone but not both together, so eviction
    // must stop after removing exactly the oldest one.
    const newestSize = await newest.sizeBytes();
    await evictOldestUntilUnderBudget(newestSize + 20);

    expect(await oldest.readAllNdjson()).toBe('');
    expect(await newest.readAllNdjson()).not.toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import { Logger } from '../logger.ts';
import { EventType } from '../events.ts';
import { MemorySink } from '../sinks/MemorySink.ts';

const EVENT_COUNT = 10_000;
const EMIT_BUDGET_MS = 500; // must stay well clear of a frame budget even at 10x the expected volume
const FLUSH_BUDGET_MS = 500;

describe('performance', () => {
  it(`emits ${EVENT_COUNT} events in under ${EMIT_BUDGET_MS}ms (never blocks the UI thread)`, async () => {
    const sink = new MemorySink();
    const logger = new Logger({
      role: 'TN',
      actorId: 'perf-actor',
      env: 'MOCK',
      appVersion: 'test',
      sink,
      bufferCap: EVENT_COUNT + 10,
      flushThreshold: EVENT_COUNT + 10,
      flushIntervalMs: 999_999,
    });
    await (logger as unknown as { ready: Promise<void> }).ready;

    const start = performance.now();
    for (let i = 0; i < EVENT_COUNT; i += 1) {
      logger.emit(EventType.CLICK, 1 as never, { id: `el-${i % 50}` });
    }
    const emitDuration = performance.now() - start;

    expect(logger.getStats().bufferLength).toBe(EVENT_COUNT + 1); // + SESSION_START
    expect(emitDuration).toBeLessThan(EMIT_BUDGET_MS);

    const flushStart = performance.now();
    await logger.flush();
    const flushDuration = performance.now() - flushStart;
    expect(flushDuration).toBeLessThan(FLUSH_BUDGET_MS);

    const bytes = new TextEncoder().encode((await sink.readAllNdjson())).length;
    // eslint-disable-next-line no-console
    console.log(
      `[perf] ${EVENT_COUNT} events: emit ${emitDuration.toFixed(1)}ms, flush ${flushDuration.toFixed(1)}ms, ` +
        `${(bytes / EVENT_COUNT).toFixed(1)} bytes/event (uncompressed)`,
    );
  });
});

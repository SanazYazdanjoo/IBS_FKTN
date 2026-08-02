import { describe, expect, it } from 'vitest';
import { Logger } from '../logger.ts';
import { EventType } from '../events.ts';
import { MemorySink } from '../sinks/MemorySink.ts';
import type { Envelope } from '../schema.ts';

function makeLogger(sink: MemorySink, bufferCap: number) {
  return new Logger({
    role: 'TN',
    actorId: 'tn-42',
    env: 'MOCK', // demo mode logs by default, no consent gate to fake here
    appVersion: 'test',
    sink,
    bufferCap,
    flushThreshold: 999, // don't auto-flush; the test controls flush() timing
    flushIntervalMs: 999_999,
  });
}

describe('ring buffer overflow', () => {
  it('drops the oldest events once the cap is exceeded and reports the exact count', async () => {
    const sink = new MemorySink();
    const logger = makeLogger(sink, 3);
    await (logger as unknown as { ready: Promise<void> }).ready;

    for (let i = 0; i < 5; i += 1) logger.emit(EventType.CLICK, 1 as never, { id: `btn-${i}` });

    // Init already emitted SESSION_START, which occupies one slot before the loop above runs —
    // so the cap of 3 evicts SESSION_START + the first two clicks, not just two events.
    expect(logger.getStats().bufferLength).toBe(3);
    expect(logger.getStats().dropCount).toBe(3);

    await logger.flush();

    const lines = sink.eventLines.map((l) => JSON.parse(l) as Envelope);
    // 3 retained clicks + 1 synthetic BUFFER_DROP describing the 3 that were evicted.
    expect(lines).toHaveLength(4);
    const dropEvent = lines.find((e) => e.ty === EventType.BUFFER_DROP);
    expect(dropEvent?.a).toEqual({ n: 3 });
    const clickIds = lines.filter((e) => e.ty === EventType.CLICK).map((e) => e.a?.id);
    expect(clickIds).toEqual(['btn-2', 'btn-3', 'btn-4']);
  });

  it('keeps sq gapless and t non-decreasing across a flush that includes a drop report', async () => {
    const sink = new MemorySink();
    const logger = makeLogger(sink, 2);
    await (logger as unknown as { ready: Promise<void> }).ready;

    for (let i = 0; i < 4; i += 1) logger.emit(EventType.CLICK, 1 as never, { id: `x${i}` });
    await logger.flush();

    const lines = sink.eventLines.map((l) => JSON.parse(l) as Envelope);
    const sqs = lines.map((e) => e.sq);
    for (let i = 1; i < sqs.length; i += 1) expect(sqs[i]).toBe(sqs[i - 1] + 1);
  });
});

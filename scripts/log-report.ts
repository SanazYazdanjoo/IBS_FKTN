#!/usr/bin/env node --experimental-strip-types
/**
 * npm run log:report <file> [file2 ...]
 *
 * Decodes one or more log files and runs the pure analysis functions
 * (src/logging/analysis/) over the whole set — cycles and pipeline-stage
 * durations are computed across all supplied files together, since a real
 * submission cycle usually spans several sessions.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { SCREEN_DICT } from '../src/logging/events.ts';
import type { Envelope, SessionHeader } from '../src/logging/schema.ts';
import type { DecodedLog } from '../src/logging/analysis/types.ts';
import { sessionize } from '../src/logging/analysis/sessionize.ts';
import { reconstructCycles } from '../src/logging/analysis/cycles.ts';
import { computeFieldFunnels, computeFormFunnels } from '../src/logging/analysis/funnels.ts';
import { computeTimeOnTask } from '../src/logging/analysis/timeOnTask.ts';
import { computeErrorRates } from '../src/logging/analysis/errorRates.ts';

function readNdjson(path: string): string {
  const buf = readFileSync(path);
  const isGzip = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  return (isGzip ? gunzipSync(buf) : buf).toString('utf-8');
}

function parseLog(path: string): DecodedLog {
  const lines = readNdjson(path).split('\n').filter((l) => l.trim().length > 0);
  const [headerLine, ...rest] = lines;
  const header = JSON.parse(headerLine) as SessionHeader;
  const events = rest.map((l) => JSON.parse(l) as Envelope);
  return { header, events };
}

function main(): void {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: npm run log:report -- <file> [file2 ...]');
    process.exit(1);
  }
  const logs = files.map(parseLog);

  const sessions = sessionize(logs);
  const cycles = reconstructCycles(logs);
  const fieldFunnels = computeFieldFunnels(logs);
  const formFunnels = computeFormFunnels(logs);
  const timeOnTask = computeTimeOnTask(logs);
  const errorRates = computeErrorRates(logs);

  console.log(`\n=== Sessions (${sessions.length}) ===`);
  for (const s of sessions) {
    console.log(
      `${s.sid} · ${s.role} · ${(s.durationMs / 1000).toFixed(0)}s · ${s.eventCount} events` +
        (s.hadExplicitEnd ? '' : '  [no explicit SESSION_END]'),
    );
  }

  console.log(`\n=== Submission cycles (${cycles.length}) ===`);
  for (const c of cycles) {
    console.log(
      `${c.pid} · ${(c.durationMs / 3_600_000).toFixed(1)}h · corrections=${c.correctionLoops} · ` +
        (c.reachedPaid ? 'PAID' : 'in progress'),
    );
  }

  console.log('\n=== Field funnels ===');
  for (const f of fieldFunnels) {
    console.log(
      `${f.fieldId}: focus=${f.focusCount} filled=${f.filledCount} abandoned=${f.abandonedCount} validationFails=${f.validationFailCount}`,
    );
  }

  console.log('\n=== Form funnels ===');
  for (const f of formFunnels) {
    console.log(`${f.formId}: attempts=${f.attempts} success=${f.successes} failure=${f.failures}`);
  }

  console.log('\n=== Time on task ===');
  for (const t of timeOnTask) {
    console.log(`${SCREEN_DICT[t.screen]?.name ?? t.screen}: visits=${t.visits} dwellBuckets=${t.dwellBucketCounts.join(',')}`);
  }

  console.log('\n=== Error rates ===');
  for (const e of errorRates) {
    console.log(
      `${SCREEN_DICT[e.screen]?.name ?? e.screen}: visits=${e.visits} validationFails=${e.validationFailures} exceptions=${e.exceptions} boundaryTrips=${e.errorBoundaryTrips}`,
    );
  }

  const totalBytes = files.reduce((sum, f) => sum + readFileSync(f).length, 0);
  const totalEvents = logs.reduce((sum, l) => sum + l.events.length, 0);
  console.log(
    `\n=== Size ===\n${totalBytes} bytes on disk / ${totalEvents} events = ${(totalBytes / Math.max(1, totalEvents)).toFixed(1)} bytes/event`,
  );
}

main();

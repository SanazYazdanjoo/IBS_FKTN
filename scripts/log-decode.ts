#!/usr/bin/env node --experimental-strip-types
/**
 * npm run log:decode <file> [file2 ...]
 *
 * Reads one or more NDJSON event-log files (gzip or plain), decodes the
 * session header + each event through the events.ts dictionaries, and
 * prints a human-readable table. Run directly with Node's TypeScript type
 * stripping (`node --experimental-strip-types`) — no build step, no
 * ts-node — which is why every relative import here (and in everything it
 * imports) carries an explicit .ts extension.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { EVENT_TYPE_DICT, SCREEN_DICT } from '../src/logging/events.ts';
import type { Envelope, SessionHeader } from '../src/logging/schema.ts';

function readNdjson(path: string): string {
  const buf = readFileSync(path);
  const isGzip = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  return (isGzip ? gunzipSync(buf) : buf).toString('utf-8');
}

function parseLog(path: string): { header: SessionHeader; events: Envelope[] } {
  const lines = readNdjson(path).split('\n').filter((l) => l.trim().length > 0);
  const [headerLine, ...rest] = lines;
  const header = JSON.parse(headerLine) as SessionHeader;
  const events = rest.map((l) => JSON.parse(l) as Envelope);
  return { header, events };
}

function fmtEvent(e: Envelope): string {
  const dict = EVENT_TYPE_DICT[e.ty];
  const screen = SCREEN_DICT[e.sc]?.name ?? `sc${e.sc}`;
  const name = dict?.name ?? `ty${e.ty}`;
  const payload = e.a ? ` ${JSON.stringify(e.a)}` : '';
  return `[${String(e.t).padStart(8, ' ')}ms] sq=${e.sq} ${screen.padEnd(24)} ${name}${payload}`;
}

function main(): void {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: npm run log:decode -- <file> [file2 ...]');
    process.exit(1);
  }
  for (const file of files) {
    const { header, events } = parseLog(file);
    console.log(`\n=== ${file} ===`);
    console.log(
      `session ${header.sid} · role=${header.role} · env=${header.env} · started ${header.t0} · ${events.length} events`,
    );
    for (const e of events) console.log(fmtEvent(e));
  }
}

main();

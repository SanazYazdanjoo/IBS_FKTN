/**
 * Buffering, batching, sampling, redaction and backpressure. This is the
 * only place that talks to a LogSink. Every call here is fire-and-forget:
 * emit() never throws, never awaits anything the caller depends on, and a
 * sink failure is swallowed and counted, never surfaced to the UI.
 *
 * The domain layer must never import this — see src/domain/ conventions.
 * Everything here is instantiated and owned by src/logging/react.tsx.
 */
import { EventType, bucket, DURATION_BUCKETS_MS } from './events.ts';
import type { EventTypeId, ScreenId } from './events.ts';
import { SCHEMA_VERSION } from './schema.ts';
import type { Envelope, Env, Role, SessionHeader, SourceMode } from './schema.ts';
import { redactPayload } from './redact.ts';
import { hashPseudonymousId } from './salt.ts';
import { isLoggingEnabled } from './consent.ts';
import type { LogSink } from './sinks/types.ts';

export interface LoggerOptions {
  role: Role;
  actorId: string;
  env: Env;
  sourceMode?: SourceMode;
  sink: LogSink;
  appVersion: string;
  bufferCap?: number;
  flushIntervalMs?: number;
  flushThreshold?: number;
  samplingRates?: Partial<Record<EventTypeId, number>>;
  idleThresholdMs?: number;
  clockSkewThresholdMs?: number;
}

export interface LoggerStats {
  bufferLength: number;
  dropCount: number;
  sinkFailures: number;
  lastFlushAt: number | null;
  sizeBytesEstimate: number;
}

const DEFAULT_BUFFER_CAP = 2000;
const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_FLUSH_THRESHOLD = 100;
const DEFAULT_IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const DEFAULT_CLOCK_SKEW_THRESHOLD_MS = 2000;

function detectUa(): SessionHeader['ua'] {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const ua = nav?.userAgent ?? '';
  const mobile = /Mobi|Android/.test(ua);
  const osMatch = /Windows|Mac OS X|Linux|Android|iOS/.exec(ua);
  const browserMatch = /(Chrome|Firefox|Safari|Edg)\/([\d.]+)/.exec(ua);
  return {
    family: browserMatch?.[1] ?? 'unknown',
    major: browserMatch?.[2]?.split('.')[0] ?? '0',
    os: osMatch?.[0] ?? 'unknown',
    mobile,
  };
}

function detectViewport(): SessionHeader['vp'] {
  if (typeof window === 'undefined') return { w: 0, h: 0, dpr: 1 };
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  };
}

function detectNet(): string | undefined {
  const conn = (navigator as unknown as { connection?: { effectiveType?: string } })?.connection;
  return conn?.effectiveType;
}

export class Logger {
  private sink: LogSink;
  private opts: Required<Omit<LoggerOptions, 'sink' | 'samplingRates' | 'sourceMode'>> & {
    samplingRates: Partial<Record<EventTypeId, number>>;
    sourceMode?: SourceMode;
  };
  private enabled: boolean;
  private header: SessionHeader | null = null;
  private buffer: Envelope[] = [];
  private bytesFlushedTotal = 0;
  /** Small ring of the most recent events, for the dev panel only — never persisted, never sent to a sink twice. */
  private recentForDevPanel: Envelope[] = [];
  private sq = 0;
  private currentScreen: ScreenId = 0 as ScreenId;
  private dropCountSinceFlush = 0;
  private sinkFailures = 0;
  private lastFlushAt: number | null = null;
  private perfAnchor = 0;
  private dateAnchor = 0;
  private lastActivityAt = 0;
  private idleReported = false;
  private timers: ReturnType<typeof setInterval>[] = [];
  private ready: Promise<void> = Promise.resolve();

  constructor(options: LoggerOptions) {
    this.sink = options.sink;
    this.enabled = isLoggingEnabled(options.env);
    this.opts = {
      role: options.role,
      actorId: options.actorId,
      env: options.env,
      sourceMode: options.sourceMode,
      appVersion: options.appVersion,
      bufferCap: options.bufferCap ?? DEFAULT_BUFFER_CAP,
      flushIntervalMs: options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
      flushThreshold: options.flushThreshold ?? DEFAULT_FLUSH_THRESHOLD,
      samplingRates: options.samplingRates ?? {},
      idleThresholdMs: options.idleThresholdMs ?? DEFAULT_IDLE_THRESHOLD_MS,
      clockSkewThresholdMs: options.clockSkewThresholdMs ?? DEFAULT_CLOCK_SKEW_THRESHOLD_MS,
    };
    if (this.enabled) {
      this.ready = this.init();
    }
  }

  private async init(): Promise<void> {
    this.perfAnchor = performance.now();
    this.dateAnchor = Date.now();
    this.lastActivityAt = this.perfAnchor;
    const aid = await hashPseudonymousId(this.opts.actorId).catch(() => 'unknown');
    this.header = {
      v: SCHEMA_VERSION,
      sid: crypto.randomUUID(),
      t0: new Date(this.dateAnchor).toISOString(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      role: this.opts.role,
      aid,
      app: this.opts.appVersion,
      env: this.opts.env,
      sourceMode: this.opts.sourceMode,
      ua: detectUa(),
      vp: detectViewport(),
      lang: typeof navigator !== 'undefined' ? navigator.language : 'de',
      net: detectNet(),
    };
    await this.safeSinkCall(() => this.sink.init(this.header!));
    this.emit(EventType.SESSION_START, this.currentScreen);
    for (const [tyStr, rate] of Object.entries(this.opts.samplingRates)) {
      if (rate !== undefined && rate < 1) {
        this.emit(EventType.SAMPLING_DECISION, this.currentScreen, {
          ty: Number(tyStr),
          rate: Math.round(rate * 1000),
        });
      }
    }
  }

  /** Starts periodic flush/idle/clock-skew timers. Call once the logger is mounted; pair with dispose(). */
  start(): void {
    if (!this.enabled) return;
    this.timers.push(setInterval(() => void this.flush(), this.opts.flushIntervalMs));
    this.timers.push(setInterval(() => this.checkIdle(), 30_000));
    this.timers.push(setInterval(() => this.checkClockSkew(), 60_000));
  }

  dispose(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    if (this.enabled) {
      this.emit(EventType.SESSION_END, this.currentScreen);
      void this.flush();
    }
  }

  setScreen(screen: ScreenId): void {
    this.currentScreen = screen;
  }

  recordActivity(): void {
    this.lastActivityAt = performance.now();
    this.idleReported = false;
  }

  private checkIdle(): void {
    if (!this.enabled || this.idleReported) return;
    const gap = performance.now() - this.lastActivityAt;
    if (gap >= this.opts.idleThresholdMs) {
      this.idleReported = true;
      this.emit(EventType.IDLE_GAP, this.currentScreen, {
        g: bucket(gap, DURATION_BUCKETS_MS),
      });
    }
  }

  private checkClockSkew(): void {
    if (!this.enabled) return;
    const perfDelta = performance.now() - this.perfAnchor;
    const dateDelta = Date.now() - this.dateAnchor;
    const drift = Math.abs(perfDelta - dateDelta);
    if (drift >= this.opts.clockSkewThresholdMs) {
      this.emit(EventType.CLOCK_SKEW, this.currentScreen, { d: bucket(drift, DURATION_BUCKETS_MS) });
      // Re-anchor so we don't re-report the same drift forever (e.g. a laptop that slept once).
      this.perfAnchor = performance.now();
      this.dateAnchor = Date.now();
    }
  }

  /** Core entry point. Never throws; a bad payload is redacted down, not rejected. */
  emit(ty: EventTypeId, screen: ScreenId = this.currentScreen, payload?: Record<string, unknown>): void {
    if (!this.enabled) return;
    try {
      const rate = this.opts.samplingRates[ty];
      if (rate !== undefined && rate < 1 && Math.random() >= rate) return;

      const a = payload ? redactPayload(payload) : undefined;
      const envelope: Envelope = {
        t: Math.max(0, Math.round(performance.now() - this.perfAnchor)),
        ty,
        sq: this.sq,
        sc: screen,
        ...(a && Object.keys(a).length > 0 ? { a: a as Envelope['a'] } : {}),
      };
      this.sq += 1;
      this.pushToBuffer(envelope);
      this.recentForDevPanel.push(envelope);
      if (this.recentForDevPanel.length > 20) this.recentForDevPanel.shift();

      if (this.buffer.length >= this.opts.flushThreshold) void this.flush();
    } catch {
      // A logging bug must never break the calling flow.
    }
  }

  private pushToBuffer(envelope: Envelope): void {
    this.buffer.push(envelope);
    if (this.buffer.length > this.opts.bufferCap) {
      this.buffer.shift();
      this.dropCountSinceFlush += 1;
    }
  }

  async flush(): Promise<void> {
    if (!this.enabled || this.buffer.length === 0) return;
    await this.ready;
    const toFlush = this.buffer;
    this.buffer = [];
    if (this.dropCountSinceFlush > 0) {
      // Appended straight onto the batch already being flushed (bypassing pushToBuffer/the
      // cap) so reporting a drop can never itself cause — and undercount — one more.
      const n = this.dropCountSinceFlush;
      this.dropCountSinceFlush = 0;
      const a = redactPayload({ n });
      toFlush.push({
        t: Math.max(0, Math.round(performance.now() - this.perfAnchor)),
        ty: EventType.BUFFER_DROP,
        sq: this.sq,
        sc: this.currentScreen,
        ...(Object.keys(a).length > 0 ? { a: a as Envelope['a'] } : {}),
      });
      this.sq += 1;
    }
    const lines = toFlush.map((e) => JSON.stringify(e));
    const ok = await this.safeSinkCall(() => this.sink.append(lines));
    if (ok) {
      this.lastFlushAt = Date.now();
      this.bytesFlushedTotal += new TextEncoder().encode(lines.join('\n')).length;
    } else {
      // Put the batch back so a transient sink failure doesn't lose data — still bounded by bufferCap.
      this.buffer = [...toFlush, ...this.buffer];
    }
  }

  private async safeSinkCall(run: () => Promise<void>): Promise<boolean> {
    try {
      await run();
      return true;
    } catch {
      this.sinkFailures += 1;
      return false;
    }
  }

  getStats(): LoggerStats {
    return {
      bufferLength: this.buffer.length,
      dropCount: this.dropCountSinceFlush,
      sinkFailures: this.sinkFailures,
      lastFlushAt: this.lastFlushAt,
      sizeBytesEstimate: this.bytesFlushedTotal,
    };
  }

  /** Most recent events, newest last — dev panel only. */
  getRecent(): readonly Envelope[] {
    return this.recentForDevPanel;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getSink(): LogSink {
    return this.sink;
  }
}

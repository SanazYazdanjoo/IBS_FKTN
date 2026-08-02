/** LogSink port — everything the logger needs from a storage backend. */
import type { SessionHeader } from '../schema.ts';

export interface LogSink {
  readonly kind: string;
  init(header: SessionHeader): Promise<void>;
  /** Appends already-redacted, already-serialized NDJSON lines (no trailing newline per line). */
  append(lines: string[]): Promise<void>;
  /** Current stored size in bytes for this session (used for the total size budget). */
  sizeBytes(): Promise<number>;
  /** Full NDJSON text (header line + event lines) — for export and tests. Not all sinks support read-back. */
  readAllNdjson?(): Promise<string>;
  /** Wipes this session's data — used by "Log löschen" and consent revocation. */
  clear(): Promise<void>;
}

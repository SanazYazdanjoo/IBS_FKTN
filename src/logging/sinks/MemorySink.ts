/** In-memory sink — used in tests and as a safe fallback when no persistent sink is available. */
import type { SessionHeader } from '../schema.ts';
import type { LogSink } from './types.ts';

export class MemorySink implements LogSink {
  readonly kind = 'memory';
  private headerLine = '';
  private lines: string[] = [];

  async init(header: SessionHeader): Promise<void> {
    this.headerLine = JSON.stringify(header);
  }

  async append(lines: string[]): Promise<void> {
    this.lines.push(...lines);
  }

  async sizeBytes(): Promise<number> {
    return new TextEncoder().encode(this.readAllNdjsonSync()).length;
  }

  private readAllNdjsonSync(): string {
    return [this.headerLine, ...this.lines].filter(Boolean).join('\n');
  }

  async readAllNdjson(): Promise<string> {
    return this.readAllNdjsonSync();
  }

  async clear(): Promise<void> {
    this.headerLine = '';
    this.lines = [];
  }

  /** Test helper: parsed event lines, in append order. */
  get eventLines(): readonly string[] {
    return this.lines;
  }
}

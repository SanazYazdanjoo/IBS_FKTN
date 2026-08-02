/** Manual export — buffers like MemorySink, and can trigger a gzip file download on demand ("Log exportieren"). */
import type { SessionHeader } from '../schema.ts';
import { gzipText } from '../gzip.ts';
import type { LogSink } from './types.ts';

export class FileDownloadSink implements LogSink {
  readonly kind = 'file-download';
  private headerLine = '';
  private lines: string[] = [];

  async init(header: SessionHeader): Promise<void> {
    this.headerLine = JSON.stringify(header);
  }

  async append(lines: string[]): Promise<void> {
    this.lines.push(...lines);
  }

  private ndjson(): string {
    return [this.headerLine, ...this.lines].filter(Boolean).join('\n');
  }

  async sizeBytes(): Promise<number> {
    return new TextEncoder().encode(this.ndjson()).length;
  }

  async readAllNdjson(): Promise<string> {
    return this.ndjson();
  }

  async clear(): Promise<void> {
    this.headerLine = '';
    this.lines = [];
  }

  /** Gzips the current buffer and triggers a browser download. Fire-and-forget by design — never throws into the caller's flow. */
  async downloadNow(fileName: string): Promise<void> {
    try {
      const bytes = await gzipText(this.ndjson());
      const blob = new Blob([bytes as BlobPart], { type: 'application/gzip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Export failing must never break the app — the user can retry.
    }
  }
}

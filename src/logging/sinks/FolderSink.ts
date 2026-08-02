/**
 * Writes the gzipped log straight into a folder via the File System Access
 * API — the same createWritable()/getFileHandle() pattern already used by
 * src/adapters/excel/folderSource.ts (createFolderPersistence). Generic on
 * purpose: it takes whatever FileSystemDirectoryHandle it's given and does
 * not assume a daten/ layout. Wiring it to a specific project-folder path
 * (e.g. a new daten/logs/) is a product decision for ORDNERSTRUKTUR.md, not
 * something this sink should decide silently — left for the caller.
 */
import type { SessionHeader } from '../schema.ts';
import { gzipText } from '../gzip.ts';
import type { LogSink } from './types.ts';

export class FolderSink implements LogSink {
  readonly kind = 'folder';
  private headerLine = '';
  private lines: string[] = [];

  constructor(
    private readonly dir: FileSystemDirectoryHandle,
    private readonly fileName: string,
  ) {}

  async init(header: SessionHeader): Promise<void> {
    this.headerLine = JSON.stringify(header);
    await this.flushToFile();
  }

  async append(lines: string[]): Promise<void> {
    this.lines.push(...lines);
    await this.flushToFile();
  }

  private ndjson(): string {
    return [this.headerLine, ...this.lines].filter(Boolean).join('\n');
  }

  private async flushToFile(): Promise<void> {
    const bytes = await gzipText(this.ndjson());
    const handle = await this.dir.getFileHandle(this.fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(bytes as BufferSource);
    await writable.close();
  }

  async sizeBytes(): Promise<number> {
    try {
      const handle = await this.dir.getFileHandle(this.fileName);
      const file = await handle.getFile();
      return file.size;
    } catch {
      return 0;
    }
  }

  async readAllNdjson(): Promise<string> {
    return this.ndjson();
  }

  async clear(): Promise<void> {
    this.headerLine = '';
    this.lines = [];
    try {
      await this.dir.removeEntry(this.fileName);
    } catch {
      // File may not exist yet — nothing to remove.
    }
  }
}

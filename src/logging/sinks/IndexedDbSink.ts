/**
 * Default sink — survives a reload. One record per session in a single
 * IndexedDB object store, keyed by session id. Enforces a total size
 * budget across all sessions (oldest evicted first) and a retention
 * window (expired sessions pruned on open). Raw IndexedDB API only — no
 * dependency.
 */
import type { SessionHeader } from '../schema.ts';
import { RETENTION_DAYS } from '../consent.ts';
import type { LogSink } from './types.ts';

const DB_NAME = 'ibs-event-log';
const STORE = 'sessions';
const DB_VERSION = 1;
export const TOTAL_BUDGET_BYTES = 20_000_000; // 20 MB across all sessions

interface SessionRecord {
  sid: string;
  createdAt: number;
  header: SessionHeader | null;
  lines: string[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'sid' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const req = run(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function recordBytes(rec: SessionRecord): number {
  const text = [rec.header ? JSON.stringify(rec.header) : '', ...rec.lines].filter(Boolean).join('\n');
  return new TextEncoder().encode(text).length;
}

async function listSessions(db: IDBDatabase): Promise<SessionRecord[]> {
  return tx(db, 'readonly', (s) => s.getAll());
}

/** Deletes sessions older than the retention window. Called once per sink init. */
export async function pruneExpired(): Promise<void> {
  const db = await openDb();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const all = await listSessions(db);
  await Promise.all(
    all.filter((r) => r.createdAt < cutoff).map((r) => tx(db, 'readwrite', (s) => s.delete(r.sid))),
  );
  db.close();
}

/** Evicts the oldest sessions until total stored size is back under budget. */
export async function evictOldestUntilUnderBudget(budgetBytes = TOTAL_BUDGET_BYTES): Promise<void> {
  const db = await openDb();
  const all = await listSessions(db);
  let total = all.reduce((sum, r) => sum + recordBytes(r), 0);
  if (total <= budgetBytes) {
    db.close();
    return;
  }
  const oldestFirst = [...all].sort((a, b) => a.createdAt - b.createdAt);
  for (const rec of oldestFirst) {
    if (total <= budgetBytes) break;
    total -= recordBytes(rec);
    await tx(db, 'readwrite', (s) => s.delete(rec.sid));
  }
  db.close();
}

export class IndexedDbSink implements LogSink {
  readonly kind = 'indexeddb';
  private sid = '';

  async init(header: SessionHeader): Promise<void> {
    this.sid = header.sid;
    await pruneExpired();
    const db = await openDb();
    await tx(db, 'readwrite', (s) =>
      s.put({ sid: this.sid, createdAt: Date.now(), header, lines: [] } satisfies SessionRecord),
    );
    db.close();
    await evictOldestUntilUnderBudget();
  }

  async append(lines: string[]): Promise<void> {
    if (lines.length === 0) return;
    const db = await openDb();
    const rec = (await tx(db, 'readonly', (s) => s.get(this.sid))) as SessionRecord | undefined;
    if (rec) {
      rec.lines.push(...lines);
      await tx(db, 'readwrite', (s) => s.put(rec));
    }
    db.close();
    await evictOldestUntilUnderBudget();
  }

  async sizeBytes(): Promise<number> {
    const db = await openDb();
    const rec = (await tx(db, 'readonly', (s) => s.get(this.sid))) as SessionRecord | undefined;
    db.close();
    return rec ? recordBytes(rec) : 0;
  }

  async readAllNdjson(): Promise<string> {
    const db = await openDb();
    const rec = (await tx(db, 'readonly', (s) => s.get(this.sid))) as SessionRecord | undefined;
    db.close();
    if (!rec) return '';
    return [rec.header ? JSON.stringify(rec.header) : '', ...rec.lines].filter(Boolean).join('\n');
  }

  async clear(): Promise<void> {
    const db = await openDb();
    await tx(db, 'readwrite', (s) => s.delete(this.sid));
    db.close();
  }

  /** Deletes every session in the log, not just this one — used by the participant-facing "Log löschen" action. */
  static async clearAll(): Promise<void> {
    const db = await openDb();
    await tx(db, 'readwrite', (s) => s.clear());
    db.close();
  }
}

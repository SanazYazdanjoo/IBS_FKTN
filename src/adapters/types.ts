/**
 * Adapter boundary — the ONLY place the app touches persistence and identity.
 *
 * Prototype: MockAdapter (in-memory, seeded, access-controlled).
 * Production: IT implements these same interfaces against the IBS-owned
 * cloud (e.g. Nextcloud WebDAV/OCS + LDAP accounts). No external SaaS —
 * data never leaves the house (NFR-01). The UI cannot tell the difference;
 * that is the whole point.
 */
import type { MonthRecord, ProcessException, Role, SessionUser } from '../domain/types';

export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export interface AuthAdapter {
  /** Current session user (mock: whatever the role switcher selected). */
  currentUser(): SessionUser;
  /** Prototype-only: the role switcher. A real adapter does not expose this. */
  switchUser?(userId: string): void;
  listDemoUsers?(): SessionUser[];
}

export interface StorageAdapter {
  /**
   * Data isolation is enforced HERE, server-side in production — never in
   * the UI. A TN actor receives exactly their own records; requesting
   * anything else throws AccessDeniedError. "Privacy by design, not by CSS."
   */
  listMonthRecords(actor: SessionUser, month: string): Promise<MonthRecord[]>;
  getMonthRecord(
    actor: SessionUser,
    participantId: string,
    month: string,
  ): Promise<MonthRecord>;
  saveMonthRecord(actor: SessionUser, record: MonthRecord): Promise<void>;
  addException(
    actor: SessionUser,
    participantId: string,
    month: string,
    exception: ProcessException,
  ): Promise<void>;
}

/** Which roles may read another participant's data at all. */
export const STAFF_ROLES: readonly Role[] = ['ADMIN', 'DOZENT', 'MANAGER', 'ACCOUNTING'];

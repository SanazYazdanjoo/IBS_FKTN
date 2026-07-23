/**
 * Adapter-Schnittstellen für Persistenz und Identität. Die Cloud-Anbindung
 * implementiert dieselben Interfaces; die UI bleibt unverändert (NFR-01).
 */
import type { MonthRecord, ProcessException, Role, SessionUser } from '../domain/types';

export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export interface AuthAdapter {
  /** Aktueller Benutzer der Sitzung. */
  currentUser(): SessionUser;
  /** Nur Demo: Rollenwechsel. */
  switchUser?(userId: string): void;
  listDemoUsers?(): SessionUser[];
}

export interface StorageAdapter {
  /** Datenisolation wird im Adapter erzwungen: TN erhalten nur eigene Datensätze. */
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

/** Rollen mit Lesezugriff auf fremde Datensätze. */
export const STAFF_ROLES: readonly Role[] = ['ADMIN', 'DOZENT', 'MANAGER', 'ACCOUNTING'];

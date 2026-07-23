/**
 * Mock adapters — in-memory, seeded, and ACCESS-CONTROLLED.
 *
 * The isolation rule is enforced here even in the prototype, so the demo
 * can show that a TN actor literally never receives another TN's record —
 * not "hidden in the UI", but absent from the data the app holds.
 */
import type { MonthRecord, ProcessException, SessionUser } from '../../domain/types';
import { AccessDeniedError, STAFF_ROLES, type AuthAdapter, type StorageAdapter } from '../types';
import { demoUsers, seedRecords } from './seed';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createMockAuth(initialUserId = 'u-selin'): AuthAdapter {
  let current = demoUsers.find((u) => u.id === initialUserId) ?? demoUsers[0];
  return {
    currentUser: () => current,
    switchUser: (userId: string) => {
      const next = demoUsers.find((u) => u.id === userId);
      if (next) current = next;
    },
    listDemoUsers: () => demoUsers,
  };
}

function assertCanRead(actor: SessionUser, participantId: string): void {
  if (STAFF_ROLES.includes(actor.role)) return;
  if (actor.role === 'TN' && actor.participantId === participantId) return;
  throw new AccessDeniedError(
    `Zugriff verweigert: ${actor.name} darf die Daten von ${participantId} nicht sehen (NFR-01).`,
  );
}

export function createMockStorage(): StorageAdapter {
  const records: MonthRecord[] = clone(seedRecords);

  return {
    async listMonthRecords(actor, month) {
      const inMonth = records.filter((r) => r.month === month);
      if (STAFF_ROLES.includes(actor.role)) return clone(inMonth);
      // TN: the result set itself is scoped — isolation by construction.
      return clone(inMonth.filter((r) => r.participantId === actor.participantId));
    },

    async getMonthRecord(actor, participantId, month) {
      assertCanRead(actor, participantId);
      const record = records.find(
        (r) => r.participantId === participantId && r.month === month,
      );
      if (!record) throw new Error(`Kein Datensatz: ${participantId} / ${month}`);
      return clone(record);
    },

    async saveMonthRecord(actor, record) {
      // TNs may only write their own record; staff may write any.
      assertCanRead(actor, record.participantId);
      const index = records.findIndex(
        (r) => r.participantId === record.participantId && r.month === record.month,
      );
      if (index >= 0) records[index] = clone(record);
      else records.push(clone(record));
    },

    async addException(actor, participantId, month, exception: ProcessException) {
      if (!STAFF_ROLES.includes(actor.role)) {
        throw new AccessDeniedError('Nur Mitarbeitende können Ausnahmen vermerken.');
      }
      const record = records.find(
        (r) => r.participantId === participantId && r.month === month,
      );
      if (!record) throw new Error(`Kein Datensatz: ${participantId} / ${month}`);
      record.exceptions.push(clone(exception));
    },
  };
}

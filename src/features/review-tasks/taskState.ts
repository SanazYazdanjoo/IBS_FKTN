/**
 * Persisted per-role task-run state (localStorage) — mirrors the pattern in
 * src/app/auditLog.ts. Kept deliberately small: only what's needed to resume
 * after a reload and to compute a duration for the lifecycle log events.
 * The events themselves (start/complete/give-up/abandon) are the durable
 * record; this is just enough state to know where to resume.
 */
import type { Role } from '../../domain/types';

const STORAGE_PREFIX = 'ibs-review-task-v1-';

export interface PersistedTaskState {
  taskIndex: number;
  currentStartedAt: string;
  finished: boolean;
}

function keyFor(role: Role): string {
  return `${STORAGE_PREFIX}${role}`;
}

export function loadTaskState(role: Role): PersistedTaskState | null {
  try {
    const raw = localStorage.getItem(keyFor(role));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedTaskState>;
    if (
      typeof parsed.taskIndex !== 'number' ||
      typeof parsed.currentStartedAt !== 'string' ||
      typeof parsed.finished !== 'boolean'
    ) {
      return null;
    }
    return parsed as PersistedTaskState;
  } catch {
    return null;
  }
}

export function saveTaskState(role: Role, state: PersistedTaskState): void {
  try {
    localStorage.setItem(keyFor(role), JSON.stringify(state));
  } catch {
    // No persistence available — resumability degrades to "always fresh", not a crash.
  }
}

/**
 * Änderungsprotokoll (Audit-Log) — protokolliert jede Aktion, die Daten
 * verändert (Anwesenheit, Belege, Status, Ausnahmen, Formular-Speicherung,
 * Regel-Änderungen …), unabhängig vom Storage-Adapter (Demo oder Excel).
 *
 * Bewusst einfach gehalten für den Prototyp: ein In-Memory-Array, gespiegelt
 * in localStorage, damit das Protokoll einen Seiten-Reload übersteht. Es gibt
 * keinen Server — in einer echten Anbindung würde dies serverseitig geführt.
 */

export interface AuditEntry {
  id: string;
  /** ISO-Zeitstempel des Ereignisses. */
  at: string;
  /** Name/Rolle der handelnden Person, z. B. "Sanaz (Admin)". */
  actor: string;
  /** Menschenlesbare Beschreibung der Änderung. */
  message: string;
}

const STORAGE_KEY = 'ibs-audit-log-v1';
const MAX_ENTRIES = 500;

function loadFromStorage(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let entries: AuditEntry[] = loadFromStorage();
const listeners = new Set<() => void>();

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage kann in seltenen Fällen nicht verfügbar sein (privater Modus,
    // Speicherlimit) — das Protokoll bleibt dann nur für die laufende Sitzung erhalten.
  }
}

function notify(): void {
  for (const l of listeners) l();
}

/** Neue Änderung protokollieren. */
export function logChange(actor: string, message: string): void {
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actor,
    message,
  };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  persist();
  notify();
}

/** Aktuelle Liste, neueste zuerst. */
export function getAuditLog(): AuditEntry[] {
  return entries;
}

export function clearAuditLog(): void {
  entries = [];
  persist();
  notify();
}

export function subscribeAuditLog(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

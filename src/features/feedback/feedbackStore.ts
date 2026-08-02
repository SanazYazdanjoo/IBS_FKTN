/**
 * Structured feedback capture (review build only) — local-only storage,
 * mirroring the localStorage pattern already used by auditLog.ts and
 * taskState.ts. Two kinds of record:
 *  - FeedbackEntry: one per "this is about X" note, reachable from any screen.
 *  - EndOfSessionFeedback: one per reviewer, the closing questionnaire.
 *
 * Free text is the one place a reviewer might type a participant's name —
 * never scrubbed here (that would silently corrupt honest feedback). The
 * export functions instead mark the file clearly so it gets checked before
 * anyone shares it. Nothing in this module ever transmits anywhere.
 */
import type { Role } from '../../domain/types';

export type FeedbackSeverity = 'blockiert' | 'stoert' | 'idee';

export const SEVERITY_LABELS: Record<FeedbackSeverity, string> = {
  blockiert: 'blockiert mich',
  stoert: 'stört',
  idee: 'Idee',
};

export interface FeedbackEntry {
  id: string;
  createdAt: string;
  screen: string;
  role: Role;
  taskId?: string;
  appVersion: string;
  gitSha: string;
  severity: FeedbackSeverity;
  text: string;
  target?: string;
}

export interface EndOfSessionFeedback {
  id: string;
  createdAt: string;
  role: Role;
  appVersion: string;
  gitSha: string;
  answers: { question: string; answer: string }[];
}

const ENTRIES_KEY = 'ibs-feedback-entries-v1';
const SESSIONS_KEY = 'ibs-feedback-sessions-v1';

function loadArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveArray<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // No persistence available — the entry still renders in this session, just won't survive a reload.
  }
}

export function loadFeedbackEntries(): FeedbackEntry[] {
  return loadArray<FeedbackEntry>(ENTRIES_KEY);
}

export function addFeedbackEntry(entry: FeedbackEntry): void {
  saveArray(ENTRIES_KEY, [...loadFeedbackEntries(), entry]);
}

export function loadSessionFeedback(): EndOfSessionFeedback[] {
  return loadArray<EndOfSessionFeedback>(SESSIONS_KEY);
}

export function addSessionFeedback(fb: EndOfSessionFeedback): void {
  saveArray(SESSIONS_KEY, [...loadSessionFeedback(), fb]);
}

function download(fileName: string, mimeType: string, content: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const EXPORT_WARNING =
  'ACHTUNG: Freitext-Felder wurden NICHT automatisch geprüft und können ' +
  'personenbezogene Angaben enthalten (z. B. einen versehentlich genannten ' +
  'Namen). Bitte vor jeder Weitergabe manuell durchsehen.';

export function exportFeedbackJson(): void {
  const payload = {
    warning: EXPORT_WARNING,
    exportedAt: new Date().toISOString(),
    entries: loadFeedbackEntries(),
    sessionFeedback: loadSessionFeedback(),
  };
  download(
    `feedback_${new Date().toISOString().slice(0, 10)}.json`,
    'application/json',
    JSON.stringify(payload, null, 2),
  );
}

function mdEscape(text: string): string {
  return text.replace(/\r?\n/g, '  \n');
}

export function exportFeedbackMarkdown(): void {
  const entries = loadFeedbackEntries();
  const sessions = loadSessionFeedback();
  const lines: string[] = [];
  lines.push('# Feedback-Export');
  lines.push('');
  lines.push(`> ${EXPORT_WARNING}`);
  lines.push('');
  lines.push(`Exportiert: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Einzelne Rückmeldungen');
  lines.push('');
  if (entries.length === 0) {
    lines.push('_Keine Rückmeldungen erfasst._');
  }
  for (const e of entries) {
    lines.push(`### ${SEVERITY_LABELS[e.severity]} — ${e.screen}${e.target ? ` · ${e.target}` : ''}`);
    lines.push('');
    lines.push(`- Zeitpunkt: ${e.createdAt}`);
    lines.push(`- Rolle: ${e.role}${e.taskId ? ` · Aufgabe: ${e.taskId}` : ''}`);
    lines.push(`- Build: v${e.appVersion} · ${e.gitSha}`);
    lines.push('');
    lines.push(mdEscape(e.text));
    lines.push('');
  }
  lines.push('## Abschluss-Fragebogen je Reviewer');
  lines.push('');
  if (sessions.length === 0) {
    lines.push('_Kein Abschluss-Fragebogen ausgefüllt._');
  }
  for (const s of sessions) {
    lines.push(`### ${s.role} · ${s.createdAt}`);
    lines.push('');
    lines.push(`- Build: v${s.appVersion} · ${s.gitSha}`);
    lines.push('');
    for (const a of s.answers) {
      lines.push(`**${a.question}**`);
      lines.push('');
      lines.push(mdEscape(a.answer || '_(keine Antwort)_'));
      lines.push('');
    }
  }
  download(`feedback_${new Date().toISOString().slice(0, 10)}.md`, 'text/markdown', lines.join('\n'));
}

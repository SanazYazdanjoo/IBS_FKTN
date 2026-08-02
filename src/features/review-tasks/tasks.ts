/**
 * Guided review-task scripts (review build only). Data, not code: each
 * reviewer role gets an ordered list of small, observable tasks instead of
 * an open "what do you think?" — see docs/DECISIONS.md.
 */
import type { AppStorage } from '../../app/session';
import type { Role, SessionUser } from '../../domain/types';
import { REVIEW_TASK_MONTH } from '../../adapters/mock/reviewTaskFixture';

export interface TaskCheckContext {
  storage: AppStorage;
  user: SessionUser;
  month: string;
}

export interface TaskDef {
  id: string;
  role: Extract<Role, 'MANAGER' | 'DOZENT' | 'ACCOUNTING'>;
  titleDe: string;
  instructionDe: string;
  /** Advisory only — surfaced as a hint, never gates the "Fertig" button. */
  checkDone?: (ctx: TaskCheckContext) => Promise<boolean>;
}

export const REVIEW_TASKS: TaskDef[] = [
  {
    id: 'mgr-approve-queue',
    role: 'MANAGER',
    titleDe: 'Freigabe-Queue bearbeiten',
    instructionDe:
      'Öffnen Sie die Freigabe-Queue. Finden Sie den einen Fall mit einer Ausnahme und genehmigen Sie ' +
      'ihn einzeln. Geben Sie danach alle übrigen Fälle frei. Beantworten Sie zum Schluss: Reicht die ' +
      'Zusammenfassung je Fall aus, um mit gutem Gewissen zu unterschreiben?',
    checkDone: async ({ storage, user }) => {
      const records = await storage.listMonthRecords(user, REVIEW_TASK_MONTH);
      return !records.some((r) => r.status === 'READY_FOR_APPROVAL' || r.status === 'APPROVED');
    },
  },
  {
    id: 'dozent-attendance-au-correction',
    role: 'DOZENT',
    titleDe: 'Anwesenheit erfassen, AU markieren, Korrektur',
    instructionDe:
      'Tragen Sie die Anwesenheit für eine Woche ein. Markieren Sie für einen Tag „AU erhalten" ' +
      '(Arbeitsunfähigkeitsbescheinigung). Korrigieren Sie danach einen Tag in einer vergangenen Woche. ' +
      'Beantworten Sie zum Schluss: Ist das besser oder schlechter als die aktuelle Excel-Liste?',
  },
  {
    id: 'acct-formular-check',
    role: 'ACCOUNTING',
    titleDe: 'Abrechnungsformular prüfen',
    instructionDe:
      'Öffnen Sie über „Übersicht" ein/e TN und dort ein erzeugtes Abrechnungsformular. Prüfen Sie es ' +
      'Feld für Feld gegen die offizielle Vorlage. Vermerken Sie, was so nicht akzeptiert würde.',
  },
];

export function tasksForRole(role: Role): TaskDef[] {
  return REVIEW_TASKS.filter((t) => t.role === role);
}

/**
 * Prozessgruppen — gemeinsame Einteilung für die Monatstabelle und die
 * Pipeline. Beide zeigen dieselben Zahlen; stünden die Gruppen zweimal im
 * Code, könnten sie auseinanderlaufen und dieselbe Lage verschieden
 * darstellen.
 *
 * Zur Zuordnung von AWAITING_SIGNATURE: der Status hat in dieser
 * Sechser-Einteilung keine eigene Spalte. Er liegt bewusst bei „Korrektur
 * erforderlich" und nicht bei „Bereit für Freigabe" — beide bedeuten
 * „wartet auf den/die TN". Unter „Bereit für Freigabe" würde ein noch
 * nicht unterschriebener Vorgang als freigabereif erscheinen, obwohl er es
 * nicht ist; das ist die gefährlichere Verwechslung.
 */
import type { ProcessStatus } from './types';

export interface ProcessGroup {
  key: string;
  label: string;
  statuses: ProcessStatus[];
}

export const PROCESS_GROUPS: ProcessGroup[] = [
  { key: 'offen', label: 'Noch nichts eingereicht', statuses: ['NOT_SUBMITTED'] },
  { key: 'pruefung', label: 'In Prüfung', statuses: ['SUBMITTED', 'IN_REVIEW'] },
  {
    key: 'korrektur',
    label: 'Korrektur erforderlich',
    statuses: ['AWAITING_CORRECTION', 'AWAITING_SIGNATURE'],
  },
  { key: 'freigabe', label: 'Bereit für Freigabe', statuses: ['READY_FOR_APPROVAL'] },
  {
    key: 'buchhaltung',
    label: 'An Buchhaltung',
    statuses: ['APPROVED', 'SENT_TO_ACCOUNTING'],
  },
  { key: 'ausgezahlt', label: 'Ausgezahlt', statuses: ['PAID'] },
];

/** Zählt Datensätze je Gruppe. */
export function countByGroup(
  records: { status: ProcessStatus }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const group of PROCESS_GROUPS) {
    counts.set(group.key, records.filter((r) => group.statuses.includes(r.status)).length);
  }
  return counts;
}

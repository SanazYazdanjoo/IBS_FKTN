import { describe, expect, it } from 'vitest';
import { PROCESS_GROUPS, countByGroup } from '../processGroups';
import type { ProcessStatus } from '../types';

const ALL: ProcessStatus[] = [
  'NOT_SUBMITTED', 'SUBMITTED', 'IN_REVIEW', 'AWAITING_CORRECTION',
  'AWAITING_SIGNATURE', 'READY_FOR_APPROVAL', 'APPROVED',
  'SENT_TO_ACCOUNTING', 'PAID',
];

describe('Prozessgruppen', () => {
  it('ordnet jeden Status genau einer Gruppe zu', () => {
    for (const status of ALL) {
      const hits = PROCESS_GROUPS.filter((g) => g.statuses.includes(status));
      expect(hits, `${status} -> ${hits.map((h) => h.key)}`).toHaveLength(1);
    }
  });

  it('verliert keinen Datensatz beim Zählen', () => {
    const records = ALL.map((status) => ({ status }));
    const counts = countByGroup(records);
    const summed = [...counts.values()].reduce((a, b) => a + b, 0);
    expect(summed).toBe(records.length);
  });

  it('zählt „wartet auf TN" nicht als freigabereif', () => {
    // AWAITING_SIGNATURE darf nicht unter 'Bereit für Freigabe' landen —
    // sonst wirkt ein unsignierter Vorgang genehmigungsfertig.
    const counts = countByGroup([{ status: 'AWAITING_SIGNATURE' as ProcessStatus }]);
    expect(counts.get('freigabe')).toBe(0);
    expect(counts.get('korrektur')).toBe(1);
  });

  it('hat die sechs verlangten Spalten in dieser Reihenfolge', () => {
    expect(PROCESS_GROUPS.map((g) => g.label)).toEqual([
      'Noch nichts eingereicht', 'In Prüfung', 'Korrektur erforderlich',
      'Bereit für Freigabe', 'An Buchhaltung', 'Ausgezahlt',
    ]);
  });
});

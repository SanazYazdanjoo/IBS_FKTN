/**
 * Dashboard-Gesamtübersicht — Startansicht (FR-05 erweitert): zeigt auf
 * einen Blick, wie es insgesamt steht, bevor man in einen Monat eintaucht.
 * Lädt alle sechs Monate parallel (wie TnDetail) und aggregiert:
 *   - Gesamtzahl TN (aus den Stammdaten, PK/BL-Split)
 *   - Summe berechneter Erstattungsbeträge über alle Monate
 *   - Offene Ausnahmen, fehlende Belege — jeweils gesamt
 *   - Status-Verteilung über alle Monatsdatensätze
 *   - Monatstabelle zum Reinklicken (setzt den globalen Monat)
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { Card, Eyebrow, statusColorClass, statusLabel } from '../../app/ui';
import { computeMonthView } from '../../domain/compute';
import { PROCESS_GROUPS, countByGroup } from '../../domain/processGroups';

import { MONTHS, vmtSingleFaresEur } from '../../adapters/mock/seed';
import type { MonthRecord, ProcessStatus } from '../../domain/types';

const STATUS_ORDER: ProcessStatus[] = [
  'NOT_SUBMITTED',
  'SUBMITTED',
  'IN_REVIEW',
  'AWAITING_CORRECTION',
  'AWAITING_SIGNATURE',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'SENT_TO_ACCOUNTING',
  'PAID',
];

export default function DashboardOverview({
  onSelectMonth,
}: {
  onSelectMonth: (ym: string) => void;
}) {
  const { user, storage, storageVersion } = useSession();
  const { rules } = useRules();
  const [byMonth, setByMonth] = useState<MonthRecord[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all(MONTHS.map((m) => storage.listMonthRecords(user, m.ym).catch(() => [])))
      .then(setByMonth)
      .finally(() => setLoading(false));
  }, [user, storage, storageVersion]);


  const perMonth = useMemo(
    () =>
      MONTHS.map((m, i) => {
        const records = byMonth[i] ?? [];
        const rows = records.map((record) => ({
          record,
          ...computeMonthView(record, rules, vmtSingleFaresEur[record.participantId]),
        }));
        const totalEur = rows.reduce(
          (sum, r) => sum + (r.result.eligible ? r.result.amountEur : 0),
          0,
        );
        const exceptionsOpen = records.filter((r) => r.exceptions.length > 0).length;
        const missingDocs = records.filter((r) => r.documents.length === 0).length;
        return {
          ym: m.ym,
          label: m.label,
          records,
          totalEur,
          exceptionsOpen,
          missingDocs,
          groupCounts: countByGroup(records),
        };
      }),
    [byMonth, rules],
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<ProcessStatus, number>();
    for (const m of perMonth) {
      for (const r of m.records) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    }
    return counts;
  }, [perMonth]);

  if (loading) return <p className="text-ink-dim">Lädt Gesamtübersicht…</p>;

  return (
    <div className="space-y-4">
      {/* Status-Verteilung über alle Monate */}
      <Card>
        <Eyebrow>Status-Verteilung · alle Monate zusammen</Eyebrow>
        <div className="mt-3 flex flex-wrap gap-3">
          {STATUS_ORDER.filter((s) => (statusCounts.get(s) ?? 0) > 0).map((s) => (
            <div
              key={s}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            >
              <div className={statusColorClass(s) || 'font-semibold'}>{statusLabel(s)}</div>
              <div className="text-xl font-bold">{statusCounts.get(s) ?? 0}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Monatstabelle — anklickbar, springt in den Einzelmonat */}
      <Card className="overflow-x-auto">
        <Eyebrow>Nach Monat · Zeile anklicken für Details</Eyebrow>
        <table className="mt-2 min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-dim">
              <th className="pr-3 pb-1">Monat</th>
              <th className="pr-3 pb-1 text-right">TN</th>
              {PROCESS_GROUPS.map((g) => (
                <th key={g.key} className="pr-3 pb-1 text-right">
                  {g.label}
                </th>
              ))}
              <th className="pr-3 pb-1 text-right">Ausnahmen offen</th>
              <th className="pb-1 text-right">Fehlende Belege</th>
            </tr>
          </thead>
          <tbody>
            {perMonth.map((m) => (
              <tr
                key={m.ym}
                onClick={() => onSelectMonth(m.ym)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMonth(m.ym);
                  }
                }}
                className="cursor-pointer border-t border-line/60 transition hover:bg-primary/15 hover:ring-1 hover:ring-primary/30"
              >
                <td className="pr-3 py-1.5 font-semibold">{m.label}</td>
                <td className="pr-3 py-1.5 text-right">{m.records.length}</td>
                {PROCESS_GROUPS.map((g) => {
                  const n = m.groupCounts.get(g.key) ?? 0;
                  return (
                    <td
                      key={g.key}
                      className={`pr-3 py-1.5 text-right tabular-nums ${
                        n === 0 ? 'text-ink-dim' : ''
                      }`}
                    >
                      {n}
                    </td>
                  );
                })}
                <td className="pr-3 py-1.5 text-right">
                  {m.exceptionsOpen > 0 ? (
                    <span className="font-semibold text-orange-600">{m.exceptionsOpen}</span>
                  ) : (
                    <span className="text-ink-dim">0</span>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {m.missingDocs > 0 ? (
                    <span className="font-semibold text-red-600">{m.missingDocs}</span>
                  ) : (
                    <span className="text-ink-dim">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-dim">
          Klick auf eine Zeile wählt den Monat und wechselt zur Einzelmonatsansicht oben.
        </p>
      </Card>
    </div>
  );
}


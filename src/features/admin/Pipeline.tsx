/**
 * Pipeline-Ansicht: Spalten = Prozessschritte, Karten = TN (Vertretungssicht).
 * Folgt dem globalen Monat/Modus aus der Kontextbox: bei „Alle Monate" zeigt
 * sie Karten aus allen sechs Monaten gemischt (mit Monatsbadge), sonst nur
 * den gewählten Monat — wie zuvor.
 */
import MonthContextBox from '../../app/MonthContextBox';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../app/session';
import { Card, Eyebrow, TnName } from '../../app/ui';
import { MONTHS, monthLabel } from '../../adapters/mock/seed';
import type { MonthRecord, ProcessStatus } from '../../domain/types';

const COLUMNS: { statuses: ProcessStatus[]; label: string }[] = [
  { statuses: ['NOT_SUBMITTED', 'SUBMITTED'], label: 'Warten auf TN' },
  { statuses: ['IN_REVIEW', 'AWAITING_CORRECTION'], label: 'Prüfen' },
  { statuses: ['AWAITING_SIGNATURE'], label: 'Signatur TN' },
  { statuses: ['READY_FOR_APPROVAL', 'APPROVED'], label: 'Freigabe' },
  { statuses: ['SENT_TO_ACCOUNTING', 'PAID'], label: 'Buchhaltung' },
];

/** Ein Record plus dem Monat, aus dem er stammt (für die Gesamtübersicht). */
type TaggedRecord = MonthRecord & { __ym: string };

export default function AdminPipeline() {
  const { user, storage, storageVersion, month: MONTH, setMonth, showAllMonths } = useSession();
  const [records, setRecords] = useState<TaggedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (showAllMonths) {
      Promise.all(
        MONTHS.map((m) =>
          storage
            .listMonthRecords(user, m.ym)
            .then((rs) => rs.map((r) => ({ ...r, __ym: m.ym })))
            .catch(() => []),
        ),
      )
        .then((groups) => setRecords(groups.flat()))
        .finally(() => setLoading(false));
    } else {
      storage
        .listMonthRecords(user, MONTH)
        .then((rs) => setRecords(rs.map((r) => ({ ...r, __ym: MONTH }))))
        .catch(() => setRecords([]))
        .finally(() => setLoading(false));
    }
  }, [user, storage, storageVersion, MONTH, showAllMonths]);

  return (
    <div className="space-y-4">
      <MonthContextBox />
      <div className="flex items-center justify-between">
        <Eyebrow>
          {showAllMonths
            ? 'Alle Monate 2026 · Gesamtübersicht'
            : `${monthLabel(MONTH)} 2026`}{' '}
          · Karten wandern automatisch — Admin greift nur bei Rot ein
        </Eyebrow>
        <Link to="/admin" className="text-sm font-semibold text-primary underline">
          ← Kontrollturm
        </Link>
      </div>

      {loading ? (
        <p className="text-ink-dim">Lädt…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {COLUMNS.map((col) => {
            const cards = records.filter((r) => col.statuses.includes(r.status));
            return (
              <div key={col.label}>
                <p className="mb-2 text-sm font-semibold">
                  {col.label} <span className="text-ink-dim">({cards.length})</span>
                </p>
                <div className="space-y-2">
                  {cards.map((r) => (
                    <Link
                      key={`${r.participantId}-${r.__ym}`}
                      to={`/admin/tn/${r.participantId}`}
                      onClick={() => showAllMonths && setMonth(r.__ym)}
                    >
                      <Card className="!p-3 hover:border-primary">
                        <p className="flex items-center justify-between gap-2 text-sm">
                          <TnName id={r.participantId} name={r.participantName} />
                          {showAllMonths && (
                            <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-ink-dim">
                              {monthLabel(r.__ym)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink-dim">
                          {r.exceptions.length > 0 ? 'Ausnahme offen' : '—'}
                        </p>
                      </Card>
                    </Link>
                  ))}
                  {cards.length === 0 && (
                    <p className="text-xs text-ink-dim">keine Karten</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-ink-dim">Vertretbarkeit: kein Zettel nötig (P4/P5)</p>
    </div>
  );
}

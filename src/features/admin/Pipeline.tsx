/**
 * Pipeline variant (screen 1e) — columns = process steps, cards = TN.
 * Secondary view: optimized for the P4/P5 "cold substitution" use case
 * ("jede:r sieht kalt, wo alles steht — kein Zettel nötig").
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../app/session';
import { Card, Eyebrow } from '../../app/ui';
import { MONTH } from '../../adapters/mock/seed';
import type { MonthRecord, ProcessStatus } from '../../domain/types';

const COLUMNS: { statuses: ProcessStatus[]; label: string }[] = [
  { statuses: ['NOT_SUBMITTED', 'SUBMITTED'], label: 'Warten auf TN' },
  { statuses: ['IN_REVIEW', 'AWAITING_CORRECTION'], label: 'Prüfen' },
  { statuses: ['AWAITING_SIGNATURE'], label: 'Signatur TN' },
  { statuses: ['READY_FOR_APPROVAL', 'APPROVED'], label: 'Freigabe' },
  { statuses: ['SENT_TO_ACCOUNTING', 'PAID'], label: 'Buchhaltung' },
];

export default function AdminPipeline() {
  const { user, storage } = useSession();
  const [records, setRecords] = useState<MonthRecord[]>([]);

  useEffect(() => {
    storage.listMonthRecords(user, MONTH).then(setRecords);
  }, [user, storage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Eyebrow>Juli 2026 · Karten wandern automatisch — Selin greift nur bei Rot ein</Eyebrow>
        <Link to="/admin" className="text-sm font-semibold text-primary underline">
          ← Kontrollturm
        </Link>
      </div>
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
                  <Link key={r.participantId} to={`/admin/tn/${r.participantId}`}>
                    <Card className="!p-3 hover:border-primary">
                      <p className="text-sm font-semibold">{r.participantName}</p>
                      <p className="text-xs text-ink-dim">
                        {r.exceptions.length > 0 ? '✎ Ausnahme offen' : '—'}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink-dim">Vertretbarkeit: kein Zettel nötig (P4/P5)</p>
    </div>
  );
}

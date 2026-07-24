/**
 * Kontextbox „Ausgewählter Monat" — auf Dashboard und Pipeline oben eingeblendet.
 * Enthält:
 *   - Monatsauswahl (steuert den globalen Session-Monat, wirkt sofort überall)
 *   - Arbeitstage (aus den geladenen Datensätzen des Monats)
 *   - Feiertage Thüringen  → Platzhalter, Datenquelle folgt später
 *   - Hinweise             → Platzhalter, Redaktion folgt später
 *   - Aktionsschalter → Anwesenheitsliste (öffnet den gewählten Monat direkt)
 * Die Platzhalter sind bewusst sichtbar (mit „—"), damit die Fläche später
 * ohne Layoutsprung befüllt werden kann.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from './session';
import { Card } from './ui';
import { MONTHS } from '../adapters/mock/seed';
import type { MonthRecord } from '../domain/types';

export default function MonthContextBox() {
  const { user, storage, storageVersion, month, setMonth } = useSession();
  const [workdays, setWorkdays] = useState<number | null>(null);

  useEffect(() => {
    storage
      .listMonthRecords(user, month)
      .then((records: MonthRecord[]) => {
        // Alle TN teilen sich denselben Monatswert; erste belegte Zahl reicht.
        const wd = records.find((r) => r.workdaysInMonth > 0)?.workdaysInMonth ?? null;
        setWorkdays(wd);
      })
      .catch(() => setWorkdays(null));
  }, [user, storage, storageVersion, month]);

  const label = MONTHS.find((m) => m.ym === month)?.label ?? month;

  return (
    <Card>
      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-end">
        {/* Monatsauswahl */}
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-ink-dim">
            Monat wählen
          </span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-base font-bold"
          >
            {MONTHS.map((m) => (
              <option key={m.ym} value={m.ym}>
                {m.label} 2026
              </option>
            ))}
          </select>
        </label>

        {/* Kennzahlen zum Monat */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-dim">
              Arbeitstage
            </div>
            <div className="mt-0.5 text-2xl font-bold">
              {workdays ?? <span className="text-ink-dim">—</span>}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-ink-dim">
              Feiertage Thüringen
            </div>
            <div className="mt-0.5 text-2xl font-bold text-ink-dim">—</div>
            <div className="text-[10px] text-ink-dim">wird noch angebunden</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-ink-dim">
              Hinweise
            </div>
            <div className="mt-0.5 text-sm italic text-ink-dim">—</div>
            <div className="text-[10px] text-ink-dim">wird noch redaktionell gepflegt</div>
          </div>
        </div>

        {/* Aktion → Anwesenheitsliste (öffnet direkt den gewählten Monat) */}
        <Link
          to="/dozent"
          className="inline-flex items-center gap-1 self-end rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          Zur Anwesenheitsliste
          <span aria-hidden>→</span>
        </Link>
      </div>

      <p className="mt-3 text-xs uppercase tracking-wider text-ink-dim">
        Ausgewählter Monat: <span className="text-ink">{label} 2026</span>
      </p>
    </Card>
  );
}

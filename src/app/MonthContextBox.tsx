/**
 * Kontextbox „Ausgewählter Monat" — auf Dashboard und Pipeline oben eingeblendet.
 * Enthält:
 *   - Monatsauswahl inkl. „Alle Monate" (steuert den globalen Modus + Monat,
 *     wirkt sofort auf Dashboard & Pipeline)
 *   - Arbeitstage (aus den geladenen Datensätzen des Monats) — nur bei
 *     konkreter Monatsauswahl, da „alle Monate" keinen einzelnen Wert hat
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

const ALL = '__ALL__';

export default function MonthContextBox() {
  const { user, storage, storageVersion, month, setMonth, showAllMonths, setShowAllMonths } =
    useSession();
  const [workdays, setWorkdays] = useState<number | null>(null);

  useEffect(() => {
    if (showAllMonths) return;
    storage
      .listMonthRecords(user, month)
      .then((records: MonthRecord[]) => {
        // Alle TN teilen sich denselben Monatswert; erste belegte Zahl reicht.
        const wd = records.find((r) => r.workdaysInMonth > 0)?.workdaysInMonth ?? null;
        setWorkdays(wd);
      })
      .catch(() => setWorkdays(null));
  }, [user, storage, storageVersion, month, showAllMonths]);

  const label = MONTHS.find((m) => m.ym === month)?.label ?? month;

  const onSelect = (value: string) => {
    if (value === ALL) {
      setShowAllMonths(true);
    } else {
      setShowAllMonths(false);
      setMonth(value);
    }
  };

  return (
    <Card>
      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-end">
        {/* Monatsauswahl */}
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-ink-dim">
            Monat wählen
          </span>
          <select
            value={showAllMonths ? ALL : month}
            onChange={(e) => onSelect(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-base font-bold"
          >
            <option value={ALL}>Alle Monate 2026 · Übersicht</option>
            {MONTHS.map((m) => (
              <option key={m.ym} value={m.ym}>
                {m.label} 2026
              </option>
            ))}
          </select>
        </label>

        {/* Kennzahlen zum Monat — nur bei konkreter Auswahl sinnvoll */}
        {showAllMonths ? (
          <div className="flex items-center text-sm text-ink-dim">
            Gesamtübersicht aktiv — Statistiken über alle Monate unten. Für Arbeitstage,
            Feiertage und Hinweise einen einzelnen Monat wählen.
          </div>
        ) : (
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
        )}

        {/* Aktion → Anwesenheitsliste (öffnet den zuletzt gewählten Monat direkt) */}
        <Link
          to="/dozent"
          className="inline-flex items-center gap-1 self-end rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          Zur Anwesenheitsliste
          <span aria-hidden>→</span>
        </Link>
      </div>

      <p className="mt-3 text-xs uppercase tracking-wider text-ink-dim">
        {showAllMonths ? (
          'Ansicht: Alle Monate 2026'
        ) : (
          <>
            Ausgewählter Monat: <span className="text-ink">{label} 2026</span>
          </>
        )}
      </p>
    </Card>
  );
}

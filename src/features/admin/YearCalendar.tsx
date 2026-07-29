/**
 * Wireframe 3a — Kalenderblatt.
 *
 * Reine Referenz: zwölf Monatskalender für ein Jahr, Wochenenden und
 * Feiertage grau, Arbeitstage weiß. Unter jedem Monat die Zahl der
 * Arbeitstage und der Feiertage mit Anlass. Keine Codes, keine Eingabe.
 *
 * Jeder Monat ist anklickbar und springt an dieselbe Stelle wie die
 * Zellen der Jahresübersicht — in die Anwesenheitsliste des Monats.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../app/session';
import { Card, Eyebrow } from '../../app/ui';
import { monthCalendar, isWeekend, type Holiday } from '../../domain/holidays';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

/** Mo–So, passend zur Wochenstruktur der Anwesenheitsliste. */
const WEEKDAY_HEADS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'] as const;

interface Cell {
  day: number | null;
  date: string;
  weekend: boolean;
  holiday?: string;
}

function buildMonth(year: number, month: number, holidays: Holiday[]): Cell[] {
  const byDate = new Map(holidays.map((h) => [h.date, h.name]));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  // Sonntag ist 0; auf Montag-basierte Spalten umrechnen.
  const leading = (firstDow + 6) % 7;

  const cells: Cell[] = [];
  for (let i = 0; i < leading; i += 1) {
    cells.push({ day: null, date: '', weekend: false });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, date, weekend: isWeekend(date), holiday: byDate.get(date) });
  }
  return cells;
}

export default function YearCalendar() {
  const { month: currentYm, setMonth, attendanceYears } = useSession();
  const navigate = useNavigate();
  const currentYear = Number(currentYm.slice(0, 4));
  const [year, setYear] = useState(currentYear);

  // Jahre aus der geladenen Liste; nur solange keine geladen ist, wird um
  // das laufende Jahr herum geraten. Sonst bietet die Ansicht Jahre an,
  // fuer die es kein Blatt gibt — nicht unterscheidbar von leeren Jahren.
  const years = useMemo(() => {
    if (attendanceYears.length > 0) return attendanceYears;
    return [...new Set([currentYear - 1, currentYear, currentYear + 1, year])].sort(
      (a, b) => a - b,
    );
  }, [attendanceYears, currentYear, year]);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const cal = monthCalendar(year, i + 1);
        return { ...cal, cells: buildMonth(year, i + 1, cal.holidays) };
      }),
    [year],
  );

  useEffect(() => {
    if (years.length > 0 && !years.includes(year)) setYear(years[years.length - 1]);
  }, [years, year]);

  function open(month: number) {
    setMonth(`${year}-${String(month).padStart(2, '0')}`);
    navigate('/dozent');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Kalenderjahr</Eyebrow>
          <h1 className="text-2xl font-semibold text-[var(--text-display)]">
            Feiertage &amp; Arbeitstage
          </h1>
        </div>
        <div role="tablist" aria-label="Jahr" className="flex gap-1">
          {years.map((y) => (
            <button
              key={y}
              role="tab"
              aria-selected={y === year}
              onClick={() => setYear(y)}
              className={`rounded-t-md border-b-2 px-3 py-1 text-sm transition ${
                y === year
                  ? 'border-[var(--primary)] font-semibold text-[var(--text)]'
                  : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--text-dim)]">
        Quelle: gesetzliche Feiertage Thüringen · nur Referenz, keine Eingabe. Bewegliche
        Feiertage werden je Jahr aus dem Osterdatum berechnet. Vor dem Einsatz beim Träger
        gegen den amtlichen Kalender prüfen.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map((m, i) => (
          <Card key={m.month}>
            <button
              type="button"
              onClick={() => open(m.month)}
              className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              title={`${MONTH_NAMES[i]} ${year} in der Anwesenheitsliste öffnen`}
            >
              <h2 className="font-semibold text-[var(--text-display)] hover:underline">
                {MONTH_NAMES[i]}
              </h2>

              <table className="mt-2 w-full border-collapse text-center text-[11px]">
                <thead>
                  <tr className="text-[var(--text-dim)]">
                    {WEEKDAY_HEADS.map((w, wi) => (
                      <th key={wi} className="py-0.5 font-normal">
                        {w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.ceil(m.cells.length / 7) }, (_, r) => (
                    <tr key={r}>
                      {m.cells.slice(r * 7, r * 7 + 7).map((c, ci) => {
                        if (c.day === null) return <td key={ci} className="py-0.5" />;
                        const off = c.weekend || c.holiday !== undefined;
                        return (
                          <td
                            key={ci}
                            title={c.holiday}
                            className={`py-0.5 tabular-nums ${
                              off
                                ? 'bg-[var(--muted)] text-[var(--text-dim)]'
                                : 'text-[var(--text)]'
                            }`}
                          >
                            {c.day}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </button>

            <ul className="mt-2 space-y-0.5 text-xs text-[var(--text-dim)]">
              <li>
                <b className="text-[var(--text)]">{m.workdays}</b> Arbeitstage
              </li>
              <li>
                <b className="text-[var(--text)]">{m.holidays.length}</b>{' '}
                {m.holidays.length === 1 ? 'Feiertag' : 'Feiertage'}
                {m.holidays.length > 0 && ` (${m.holidays.map((h) => h.name).join(', ')})`}
              </li>
              {m.holidays.some((h) => isWeekend(h.date)) && (
                <li className="italic">
                  {m.holidays
                    .filter((h) => isWeekend(h.date))
                    .map((h) => h.name)
                    .join(', ')}{' '}
                  fällt auf ein Wochenende und senkt die Arbeitstage nicht.
                </li>
              )}
            </ul>
          </Card>
        ))}
      </div>

      <Card>
        <Eyebrow>Legende</Eyebrow>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-6 rounded border border-[var(--border)] bg-[var(--muted)]" />
            Feiertag / Wochenende
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-6 rounded border border-[var(--border)] bg-[var(--surface)]" />
            Arbeitstag
          </span>
        </div>
      </Card>
    </div>
  );
}

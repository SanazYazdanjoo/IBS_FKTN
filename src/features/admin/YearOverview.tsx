/**
 * Wireframe 1a — Jahresübersicht.
 *
 * Zeilen = Teilnehmer:innen, Spalten = Monate. Jede Zelle zeigt
 * „anwesend/Arbeitstage" und ist eingefärbt:
 *   weiß  — Monat vollständig erfasst (anwesend + Fehltage == Arbeitstage)
 *   gelb  — es fehlen noch Eintragungen
 *   grau  — für diesen Monat liegt gar nichts vor
 *
 * Klick auf eine Zelle setzt den globalen Monat und springt in die
 * Anwesenheitsliste — der Weg von „hier fehlt etwas" zu „hier trage ich
 * es ein" ist damit ein Klick statt einer Suche.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../app/session';
import { Card, Eyebrow, CourseChip } from '../../app/ui';
import { summarizeAttendance } from '../../domain/attendance';
import {
  monthCalendar,
  monthStatus,
  workdayExplanation,
  type MonthStatus,
} from '../../domain/holidays';
import { useRules } from '../../app/rules-context';
import { useRegisterParticipantNames } from '../../app/participant-names';
import type { MonthRecord } from '../../domain/types';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
] as const;

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

type Grid = Map<string, Map<number, MonthStatus>>;

function cellClasses(status: MonthStatus | undefined): string {
  if (!status || status.completeness === 'nicht_erfasst') {
    return 'bg-[var(--muted)] text-[var(--text-dim)]';
  }
  if (status.completeness === 'offen') {
    return 'bg-[var(--highlight-weak)] text-[var(--text)]';
  }
  return 'bg-[var(--surface)] text-[var(--text)]';
}

function cellTitle(status: MonthStatus | undefined, monthName: string): string {
  if (!status || status.completeness === 'nicht_erfasst') {
    return `${monthName}: noch nichts erfasst`;
  }
  if (status.completeness === 'offen') {
    return `${monthName}: ${status.openDays} von ${status.workdays} Arbeitstagen ohne Eintrag`;
  }
  return `${monthName}: vollständig erfasst — ${status.presentDays} anwesend, ${status.absentDays} Fehltage`;

}

interface YearViewProps {
  /** Ohne eigene Seitenueberschrift, wenn in die Anwesenheitsliste eingebettet. */
  embedded?: boolean;
  /**
   * Uebernimmt den Sprung in einen Monat. Fehlt der Callback, wird wie
   * bisher navigiert — die Route bleibt damit eigenstaendig nutzbar.
   */
  onOpenMonth?: (year: number, month: number) => void;
}

export default function YearOverview({ embedded = false, onOpenMonth }: YearViewProps = {}) {
  const { user, storage, storageVersion, month: currentYm, setMonth, attendanceYears } = useSession();
  const { rules } = useRules();
  const registerNames = useRegisterParticipantNames();
  const navigate = useNavigate();

  const currentYear = Number(currentYm.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [grid, setGrid] = useState<Grid>(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Jahre aus der geladenen Liste; nur solange keine geladen ist, wird um
  // das laufende Jahr herum geraten. Sonst bietet die Ansicht Jahre an,
  // fuer die es kein Blatt gibt — nicht unterscheidbar von leeren Jahren.
  const years = useMemo(() => {
    if (attendanceYears.length > 0) return attendanceYears;
    return [...new Set([currentYear - 1, currentYear, currentYear + 1, year])].sort(
      (a, b) => a - b,
    );
  }, [attendanceYears, currentYear, year]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        const results = await Promise.all(
          months.map(async (m) => {
            const ym = `${year}-${String(m).padStart(2, '0')}`;
            let records: MonthRecord[] = [];
            try {
              records = await storage.listMonthRecords(user, ym);
            } catch {
              records = []; // Monat ohne Daten ist kein Fehler
            }
            return [m, records] as const;
          }),
        );
        if (cancelled) return;

        const next: Grid = new Map();
        const nextNames = new Map<string, string>();
        for (const [m, records] of results) {
          const cal = monthCalendar(year, m);
          for (const record of records) {
            const summary = summarizeAttendance(record.attendance, rules);
            const absent = record.attendance.length - summary.presenceDays - summary.openGaps;
            const status = monthStatus(summary.presenceDays, Math.max(0, absent), cal);
            const row = next.get(record.participantId) ?? new Map<number, MonthStatus>();
            row.set(m, status);
            next.set(record.participantId, row);
            if (record.participantName) nextNames.set(record.participantId, record.participantName);
          }
        }
        setGrid(next);
        registerNames(nextNames);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [year, storage, user, storageVersion, rules]);

  const participants = useMemo(() => [...grid.keys()].sort(), [grid]);

  useEffect(() => {
    if (years.length > 0 && !years.includes(year)) setYear(years[years.length - 1]);
  }, [years, year]);

  useEffect(() => {
    if (years.length > 0 && !years.includes(year)) setYear(years[years.length - 1]);
  }, [years, year]);

  function openMonth(month: number) {
    if (onOpenMonth) {
      onOpenMonth(year, month);
      return;
    }
    setMonth(`${year}-${String(month).padStart(2, '0')}`);
    navigate('/dozent');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {!embedded && (
          <div>
            <Eyebrow>Anwesenheit</Eyebrow>
            <h1 className="text-2xl font-semibold text-[var(--text-display)]">Übersicht</h1>
          </div>
        )}
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

      <Card>
        <Eyebrow>Legende</Eyebrow>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-6 rounded border border-[var(--border)] bg-[var(--surface)]" />
            Monat vollständig erfasst
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-6 rounded border border-[var(--border)] bg-[var(--highlight-weak)]" />
            offene Halbtage im Monat
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-6 rounded border border-[var(--border)] bg-[var(--muted)]" />
            noch nichts erfasst
          </span>
        </div>
        <p className="mt-2 text-xs text-[var(--text-dim)]">
          Zahl = anwesende Tage / Arbeitstage. Die Codes (X, (x), E, K, A, U) stehen in der
          Anwesenheitsliste. Arbeitstage nach dem Feiertagskalender Thüringen.
        </p>
      </Card>

      <Card>
        <Eyebrow>{year} — Jahresübersicht</Eyebrow>

        {loading && <p className="mt-3 text-sm text-[var(--text-dim)]">Monate werden geladen …</p>}

        {error && (
          <p className="mt-3 text-sm text-[var(--danger)]">
            Die Jahresübersicht konnte nicht geladen werden: {error}
          </p>
        )}

        {!loading && !error && participants.length === 0 && (
          <p className="mt-3 text-sm text-[var(--text-dim)]">
            Für {year} liegen keine Anwesenheitsdaten vor. Wählen Sie ein anderes Jahr oder
            verbinden Sie eine Datenquelle unter „Datenquelle".
          </p>
        )}

        {!loading && !error && participants.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-2 text-left font-medium text-[var(--text-dim)]"
                  >
                    TN-ID
                  </th>
                  {MONTH_LABELS.map((label, i) => (
                    <th key={label} scope="col" className="px-1 py-2">
                      {/* Auch die Monatsueberschrift oeffnet den Monat — wer
                          einen ganzen Monat pruefen will, zielt eher auf die
                          Spalte als auf die Zelle einer einzelnen Person. */}
                      <button
                        type="button"
                        onClick={() => openMonth(i + 1)}
                        title={`${MONTH_NAMES[i]} ${year} öffnen · ${workdayExplanation(
                          year,
                          i + 1,
                        )}`}
                        className="w-full rounded px-1 text-center font-medium text-[var(--text-dim)] hover:bg-[var(--muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        <span className="block">{label}</span>
                        <span className="block text-[10px] font-normal">
                          {monthCalendar(year, i + 1).workdays} AT
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.map((tnId) => (
                  <tr key={tnId} className="border-t border-[var(--line)]">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-left font-normal"
                    >
                      <CourseChip id={tnId} />
                    </th>
                    {MONTH_LABELS.map((_, i) => {
                      const month = i + 1;
                      const status = grid.get(tnId)?.get(month);
                      return (
                        <td key={month} className="p-0.5">
                          <button
                            type="button"
                            onClick={() => openMonth(month)}
                            title={cellTitle(status, `${MONTH_NAMES[i]} ${year}`)}
                            className={`w-full rounded border border-[var(--border)] px-1 py-1.5 text-center tabular-nums transition hover:ring-2 hover:ring-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${cellClasses(status)}`}
                          >
                            {status && status.completeness !== 'nicht_erfasst'
                              ? `${status.presentDays}/${status.workdays}`
                              : '–'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-[var(--text-dim)]">
          Zelle anklicken öffnet den Monat in der Anwesenheitsliste.
        </p>
      </Card>
    </div>
  );
}

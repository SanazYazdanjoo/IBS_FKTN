/**
 * Wireframe 2b — der ganze Monat als eine Matrix.
 *
 * Alle Kalendertage als Spalten, je Tag zwei Unterspalten V | N, rechts
 * „Anwesend (Monat)". Anmerkungen passen bei 31 Tagesspalten nicht mehr
 * in die Zeile und wandern deshalb — wie im Wireframe vorgesehen — in ein
 * Panel, das sich per Klick auf die TN-Zeile öffnet.
 *
 * Anders als 2a zeigt diese Ansicht auch Wochenenden und Feiertage, damit
 * die Spalten dem Kalender entsprechen; sie sind gesperrt und grau.
 */
import { useMemo, useState } from 'react';
import { Card, CourseChip, Eyebrow, TnName } from '../../app/ui';
import { CodeCell } from './CodeCell';
import { isPresenceDay } from '../../domain/attendance';
import { monthCalendar, isWeekend } from '../../domain/holidays';
import type { AttendanceCode, DayMarks, MonthRecord } from '../../domain/types';

const WEEKDAY_LETTER = ['S', 'M', 'D', 'M', 'D', 'F', 'S'];

export interface MonthMatrixProps {
  records: MonthRecord[];
  year: number;
  month: number;
  saving: boolean;
  nameOf: (r: MonthRecord) => { nach: string; vor: string };
  onSetMark: (
    record: MonthRecord,
    dateIso: string,
    session: 'morning' | 'afternoon',
    code: AttendanceCode,
  ) => void;
  /** Wochenanmerkungen: Schlüssel ist der erste Tag der Woche. */
  onSaveNote: (record: MonthRecord, weekStartIso: string, text: string) => void;
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function MonthMatrix({
  records,
  year,
  month,
  saving,
  nameOf,
  onSetMark,
  onSaveNote,
}: MonthMatrixProps) {
  const [openNotesFor, setOpenNotesFor] = useState<string | null>(null);

  const cal = useMemo(() => monthCalendar(year, month), [year, month]);
  const holidayByDate = useMemo(
    () => new Map(cal.holidays.map((h) => [h.date, h.name])),
    [cal],
  );

  const days = useMemo(() => {
    const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: count }, (_, i) => {
      const date = iso(year, month, i + 1);
      const holiday = holidayByDate.get(date);
      return {
        date,
        dayNo: i + 1,
        weekday: WEEKDAY_LETTER[new Date(`${date}T00:00:00Z`).getUTCDay()],
        locked: isWeekend(date) || holiday !== undefined,
        reason: holiday ?? (isWeekend(date) ? 'Wochenende' : undefined),
      };
    });
  }, [year, month, holidayByDate]);

  if (records.length === 0) return null;

  const openRecord = records.find((r) => r.participantId === openNotesFor) ?? null;

  return (
    <Card className="overflow-x-auto">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow>Alle {days.length} Tage</Eyebrow>
        <span className="text-xs text-[var(--text-dim)]">
          jede Spalte doppelt: V | N · {cal.workdays} Arbeitstage
        </span>
      </div>

      <table className="mt-2 min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              rowSpan={3}
              className="sticky left-0 z-20 border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-left text-xs"
            >
              TN-ID
            </th>
            {days.map((d) => (
              <th
                key={d.date}
                colSpan={2}
                className={`border border-[var(--border)] px-1 text-center text-[11px] ${
                  d.locked ? 'bg-[var(--muted)] text-[var(--text-dim)]' : 'bg-[var(--muted)]'
                }`}
              >
                {d.weekday}
              </th>
            ))}
            <th
              rowSpan={3}
              className="border border-[var(--border)] bg-[var(--muted)] px-2 text-center text-[11px]"
            >
              Anwesend
              <br />
              (Monat)
            </th>
          </tr>
          <tr>
            {days.map((d) => (
              <th
                key={d.date}
                colSpan={2}
                title={d.reason}
                className={`border border-[var(--border)] px-1 text-center text-[11px] tabular-nums ${
                  d.locked ? 'bg-[var(--muted)] text-[var(--text-dim)]' : 'bg-[var(--muted)]'
                }`}
              >
                {d.dayNo}
              </th>
            ))}
          </tr>
          <tr className="text-[10px] text-[var(--text-dim)]">
            {days.flatMap((d) => [
              <th key={d.date + 'v'} className="border border-[var(--border)] px-1">V</th>,
              <th key={d.date + 'n'} className="border border-[var(--border)] px-1">N</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const { nach, vor } = nameOf(r);
            const byDate = new Map(r.attendance.map((d) => [d.date, d]));
            const total = r.attendance.filter(isPresenceDay).length;
            return (
              <tr key={r.participantId}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-left font-normal"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenNotesFor((cur) => (cur === r.participantId ? null : r.participantId))
                    }
                    className="flex items-center gap-2 text-left hover:underline"
                    title="Anmerkungen dieser Person anzeigen"
                  >
                    <CourseChip id={r.participantId} />
                    <TnName id={r.participantId} name={`${vor} ${nach}`} chip={false} />
                  </button>
                </th>

                {days.flatMap((d) => {
                  const day: DayMarks =
                    byDate.get(d.date) ?? { date: d.date, morning: '', afternoon: '' };
                  return (['morning', 'afternoon'] as const).map((session) => (
                    <td key={d.date + session} className="border border-[var(--border)] p-0">
                      <CodeCell
                        code={day[session]}
                        locked={d.locked}
                        lockedReason={d.reason}
                        disabled={saving}
                        label={`${vor} ${nach} · ${d.dayNo}.${month}. ${
                          session === 'morning' ? 'Vormittag' : 'Nachmittag'
                        }`}
                        onChange={(code) => onSetMark(r, d.date, session, code)}
                      />
                    </td>
                  ));
                })}

                <td className="border border-[var(--border)] px-2 text-center font-bold tabular-nums">
                  {total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {openRecord && (
        <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--muted)] p-3">
          <div className="flex items-baseline justify-between gap-2">
            <Eyebrow>Anmerkungen — {openRecord.participantName}</Eyebrow>
            <button
              type="button"
              onClick={() => setOpenNotesFor(null)}
              className="text-xs text-[var(--text-dim)] hover:underline"
            >
              schließen
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {Object.keys(openRecord.attendanceNotes ?? {}).length === 0 && (
              <p className="text-xs text-[var(--text-dim)]">
                Für diesen Monat sind keine Anmerkungen erfasst.
              </p>
            )}
            {Object.entries(openRecord.attendanceNotes ?? {}).map(([weekStart, text]) => (
              <label key={weekStart} className="block text-xs">
                <span className="text-[var(--text-dim)]">Woche ab {weekStart}</span>
                <textarea
                  defaultValue={text}
                  disabled={saving}
                  rows={2}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next !== text) onSaveNote(openRecord, weekStart, next);
                  }}
                  className="mt-0.5 w-full resize-none rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

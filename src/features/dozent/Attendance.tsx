/**
 * Anwesenheitserfassung — Layout 1:1 nach der Anwesenheitsliste 2026:
 * ein Tab je Monat; je Woche ein Block (Mo–Fr, V/N-Spalten), rechts
 * Anmerkungen und "Anwesend (Pro Woche)"; oben Legende + Monatssumme.
 * Im Excel-Modus schreibt jede Eingabe direkt in die Liste (mit Backup);
 * im Demo-Modus in die Beispieldaten.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../../app/session';
import { Card, Eyebrow, TnName, CourseChip } from '../../app/ui';
import { MONTHS, tnNames } from '../../adapters/mock/seed';
import { ExcelStorageAdapter } from '../../adapters/excel/excelStorage';
import { logChange } from '../../app/auditLog';
import { countWeekPresence, isPresenceDay } from '../../domain/attendance';
import { CodeCell } from './CodeCell';
import MonthMatrix from './MonthMatrix';
import YearOverview from '../admin/YearOverview';

type View = 'jahr' | 'monat';
/** Zwei Darstellungen desselben Monats — keine eigenen Ansichten. */
type MonthLayout = 'wochen' | 'matrix';

const VIEWS: readonly (readonly [View, string])[] = [
  ['jahr', 'Jahr'],
  ['monat', 'Monat'],
] as const;

const MONTH_LAYOUTS: readonly (readonly [MonthLayout, string])[] = [
  ['matrix', 'Ganzer Monat'],
  ['wochen', 'Wochenbänder'],
] as const;
import { monthCalendar, isWeekend } from '../../domain/holidays';
import type { AttendanceCode, DayMarks, MonthRecord } from '../../domain/types';

const WEEKDAY_LETTER = ['S', 'M', 'D', 'M', 'D', 'F', 'S'];

const LEGEND: [string, string][] = [
  ['X', 'anwesend'],
  ['(x)', 'anwesend, aber zu spät gekommen oder früher gegangen'],
  ['E', 'entschuldigtes Fehlen mit Nachweis'],
  ['K', 'Kulanztag (vor 9 Uhr abgemeldet per Mail); falls nur ein Tag krank oder Kind krank — kein Nachweis nötig'],
  ['A', 'abgemeldet per Mail (ohne Nachweis / kein Kulanztag — z. B. Termine sind keine Kulanztage)'],
  ['U', 'nicht abgemeldet + kein Nachweis'],
  ['U-Ausfall', 'noch zu implementieren'],
];

function mondayOf(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d.toISOString().slice(0, 10);
}

function dayHeader(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${WEEKDAY_LETTER[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

function splitName(record: MonthRecord): { nach: string; vor: string } {
  const known = tnNames[record.participantId];
  if (known) return known;
  const parts = record.participantName.split(' ');
  return { vor: parts[0] ?? '', nach: parts.slice(1).join(' ') };
}


export default function DozentAttendance() {
  const { user, storage, storageVersion, attendanceSource, dataSource, month: ym, setMonth: setYm } = useSession();
  const excelMode = attendanceSource !== null && dataSource.kind === 'EXCEL';
  const [records, setRecords] = useState<MonthRecord[]>([]);
  // Jahresübersicht ist der Einstieg: erst das Jahr, dann hineinzoomen.
  const [view, setView] = useState<View>('jahr');
  const [monthLayout, setMonthLayout] = useState<MonthLayout>('matrix');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    storage.listMonthRecords(user, ym).then(setRecords).catch((e) => setError(e.message));
  }, [user, storage, storageVersion, ym]);

  /** Nur TN, die in der Liste dieses Monats geführt werden (Tageszellen vorhanden). */
  const listed = useMemo(
    () =>
      records
        .filter((r) => r.attendance.length > 0)
        .sort((a, b) => a.participantId.localeCompare(b.participantId)),
    [records],
  );

  /** Wochenblöcke: Wochenanfang (Mo) → sortierte Datumsliste. */
  const weeks = useMemo(() => {
    const dates = new Set<string>();
    for (const r of listed) for (const d of r.attendance) dates.add(d.date);
    const byWeek = new Map<string, string[]>();
    for (const date of [...dates].sort()) {
      const start = mondayOf(date);
      byWeek.set(start, [...(byWeek.get(start) ?? []), date]);
    }
    return [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [listed]);

  const monthNo = Number(ym.slice(5));

  const setMark = async (
    record: MonthRecord,
    dateIso: string,
    session: 'morning' | 'afternoon',
    code: AttendanceCode,
  ) => {
    setError('');
    try {
      if (excelMode && attendanceSource) {
        setSaving(true);
        attendanceSource.workbook.setMark(monthNo, record.participantId, dateIso, session, code);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const buffer = await attendanceSource.workbook.toBuffer();
        await attendanceSource.persistence.saveBackup(
          buffer,
          attendanceSource.fileName.replace(/\.xlsx$/i, '') + `_backup_${stamp}.xlsx`,
        );
        await attendanceSource.persistence.save(buffer, attendanceSource.fileName);
        if (storage instanceof ExcelStorageAdapter) storage.invalidateAttendance(monthNo);
      } else {
        const attendance = record.attendance.map((d) =>
          d.date === dateIso ? { ...d, [session]: code } : d,
        );
        await storage.saveMonthRecord(user, { ...record, attendance });
      }
      logChange(
        user.name,
        `Anwesenheit geändert: ${record.participantId} · ${dateIso} (${
          session === 'morning' ? 'Vormittag' : 'Nachmittag'
        }) → „${code || 'leer'}"`,
      );
      setRecords((prev) =>
        prev.map((r) =>
          r.participantId === record.participantId
            ? {
                ...r,
                attendance: r.attendance.map((d) =>
                  d.date === dateIso ? { ...d, [session]: code } : d,
                ),
              }
            : r,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };


  /** Anmerkung einer Woche speichern — Excel-Modus schreibt in die echte Liste (mit Backup). */
  const saveNote = async (record: MonthRecord, weekStartIso: string, text: string) => {
    setError('');
    try {
      if (excelMode && attendanceSource) {
        setSaving(true);
        attendanceSource.workbook.setNote(monthNo, record.participantId, weekStartIso, text);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const buffer = await attendanceSource.workbook.toBuffer();
        await attendanceSource.persistence.saveBackup(
          buffer,
          attendanceSource.fileName.replace(/\.xlsx$/i, '') + `_backup_${stamp}.xlsx`,
        );
        await attendanceSource.persistence.save(buffer, attendanceSource.fileName);
        if (storage instanceof ExcelStorageAdapter) storage.invalidateAttendance(monthNo);
      } else {
        const attendanceNotes = { ...record.attendanceNotes, [weekStartIso]: text };
        if (!text) delete attendanceNotes[weekStartIso];
        await storage.saveMonthRecord(user, { ...record, attendanceNotes });
      }
      logChange(
        user.name,
        `Anmerkung ${text ? 'geändert' : 'entfernt'}: ${record.participantId} · Woche ab ${weekStartIso}${
          text ? ` — „${text}"` : ''
        }`,
      );
      setRecords((prev) =>
        prev.map((r) => {
          if (r.participantId !== record.participantId) return r;
          const attendanceNotes = { ...r.attendanceNotes, [weekStartIso]: text };
          if (!text) delete attendanceNotes[weekStartIso];
          return { ...r, attendanceNotes };
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isMonthView = view === 'monat';

  /**
   * Sprung aus einer Jahresansicht in einen Monat: Monat setzen UND die
   * Ansicht wechseln. Nur den Monat zu setzen liess den Nutzer in der
   * Jahresansicht zurueck, wo sich lediglich eine Zelle aenderte.
   */
  function openMonth(targetYear: number, targetMonth: number) {
    setYm(`${targetYear}-${String(targetMonth).padStart(2, '0')}`);
    setView('monat');
    setMonthLayout('matrix');
  }

  const monthTotal = (r: MonthRecord) => r.attendance.filter(isPresenceDay).length;
  const label = MONTHS.find((m) => m.ym === ym)?.label ?? ym;
  const yearNo = Number(ym.slice(0, 4));
  const cal = monthCalendar(yearNo, monthNo);
  const holidayByDate = new Map(cal.holidays.map((h) => [h.date, h.name]));

  /** Erfassungsstand je Woche — wie viele V/N-Felder (ohne Feiertage) schon
   *  ausgefüllt sind. Gibt in den Wochenbändern auf einen Blick Orientierung,
   *  welche Woche noch offen ist, ohne jede Zeile einzeln absuchen zu müssen. */
  const weekStats = useMemo(() => {
    const stats = new Map<string, { filled: number; total: number }>();
    for (const [weekStart, dates] of weeks) {
      let filled = 0;
      let total = 0;
      for (const r of listed) {
        for (const d of dates) {
          if (holidayByDate.has(d)) continue;
          total += 2;
          const day = r.attendance.find((x) => x.date === d);
          if (day?.morning) filled++;
          if (day?.afternoon) filled++;
        }
      }
      stats.set(weekStart, { filled, total });
    }
    return stats;
  }, [weeks, listed, holidayByDate]);

  /** Nachbarmonate für die Schritt-Navigation (◂ ▸) aus dem Wireframe. */
  const ymIndex = MONTHS.findIndex((m) => m.ym === ym);
  const prevYm = ymIndex > 0 ? MONTHS[ymIndex - 1] : null;
  const nextYm = ymIndex >= 0 && ymIndex < MONTHS.length - 1 ? MONTHS[ymIndex + 1] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide">
            {isMonthView ? label : (VIEWS.find(([k]) => k === view)?.[1] ?? '')}
          </h1>
        </div>
        {saving && <span className="text-sm text-ink-dim">Speichere in die Liste …</span>}
      </div>

      {/* Monatswechsel als Schritt-Navigation (Wireframe 2a) statt zwölf Tabs. */}
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Ansicht" className="flex gap-1">
          {VIEWS.map(([k, t]) => (
            <button
              key={k}
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={`rounded-full px-3 py-1 text-sm ${
                view === k
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-dim)] hover:bg-[var(--muted)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className={`flex items-center gap-2 ${isMonthView ? '' : 'hidden'}`}>
          <button
            type="button"
            disabled={!prevYm}
            onClick={() => prevYm && setYm(prevYm.ym)}
            className="rounded border border-[var(--border)] px-2 py-1 text-sm disabled:opacity-40"
          >
            ◂ {prevYm?.label ?? '—'}
          </button>
          <span className="text-sm font-semibold">{label}</span>
          <button
            type="button"
            disabled={!nextYm}
            onClick={() => nextYm && setYm(nextYm.ym)}
            className="rounded border border-[var(--border)] px-2 py-1 text-sm disabled:opacity-40"
          >
            {nextYm?.label ?? '—'} ▸
          </button>
          <span className="ml-2 text-xs text-[var(--text-dim)]">
            V = Vormittag · N = Nachmittag · ein Zeichen genügt = 1 Tag
          </span>
        </div>

        {/* Darstellung des Monats — Nebensache gegenueber der Ansichtswahl,
            deshalb rechts und schwaecher betont. */}
        <div
          role="radiogroup"
          aria-label="Darstellung"
          className={`ml-auto flex gap-1 ${isMonthView ? '' : 'hidden'}`}
        >
          {MONTH_LAYOUTS.map(([k, t]) => (
            <button
              key={k}
              role="radio"
              aria-checked={monthLayout === k}
              onClick={() => setMonthLayout(k)}
              className={`rounded-full border px-3 py-1 text-sm ${
                monthLayout === k
                  ? 'border-[var(--primary)] font-semibold text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-dim)] hover:bg-[var(--muted)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {/* Legende und Monatssumme beziehen sich auf einen einzelnen Monat und
          gehoeren nicht zu den Jahresansichten. */}
      <div
        className={`grid gap-4 lg:grid-cols-[1fr_auto] ${
          isMonthView ? '' : 'hidden'
        }`}
      >
        {/* Legende — Wortlaut der Liste. */}
        <Card>
          <p className="text-sm font-semibold">Folgende Auswahlmöglichkeit:</p>
          <ul className="mt-2 space-y-1 text-xs text-ink-dim">
            {LEGEND.map(([code, text]) => (
              <li key={code}>
                <b className="text-ink">{code}</b> = {text}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-semibold">Hinweise:</p>
          <p className="text-xs text-ink-dim">
            E / K / X / (x) können als „anwesend" abgerechnet werden.
            <br />A / U gelten als Fehltag und müssen bei der Erstattung rausgerechnet werden.
            <br />Felder mit <b className="text-ink">A</b> sind gelb hinterlegt — sie sollten vom
            Dozenten/der Dozentin nochmal geprüft werden, da sich der Eintrag oft noch ändert.
          </p>
        </Card>

        {/* Monatssumme — Tabelle oben rechts wie in der Liste. */}
        <Card>
          <table className="text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-dim">
                <th className="pr-3 pb-1">TN</th>
                <th className="pr-3 pb-1">Nachname</th>
                <th className="pr-3 pb-1">Vorname</th>
                <th className="pb-1 text-right">
                  Anwesend
                  <br />({label})
                </th>
              </tr>
            </thead>
            <tbody>
              {listed.map((r) => {
                const { nach, vor } = splitName(r);
                return (
                  <tr key={r.participantId} className="border-t border-ink/10">
                    <td className="pr-3 py-0.5 whitespace-nowrap">
                      <CourseChip id={r.participantId} />
                    </td>
                    <td className="pr-3 py-0.5">
                      <TnName id={r.participantId} name={nach} chip={false} />
                    </td>
                    <td className="pr-3 py-0.5">
                      <TnName id={r.participantId} name={vor} chip={false} />
                    </td>
                    <td className="py-0.5 text-right font-bold">{monthTotal(r)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {view === 'jahr' && <YearOverview embedded onOpenMonth={openMonth} />}

      {isMonthView && monthLayout === 'matrix' && (
        <MonthMatrix
          records={listed}
          year={yearNo}
          month={monthNo}
          saving={saving}
          nameOf={splitName}
          onSetMark={(r, d, sess, code) => void setMark(r, d, sess, code)}
          onSaveNote={(r, w, t) => void saveNote(r, w, t)}
        />
      )}

      {/* Wochenblöcke — exakt wie die Liste: Tageskopf, darunter V/N, dann TN-Zeilen. */}
      {isMonthView && monthLayout === 'wochen' && weeks.map(([weekStart, dates]) => {
        const stats = weekStats.get(weekStart);
        const complete = !stats || stats.filled === stats.total;
        return (
        <Card key={weekStart} className="overflow-x-auto">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 whitespace-nowrap">
            <Eyebrow>
              Woche {formatDateShort(dates[0])} – {formatDateShort(dates[dates.length - 1])}
            </Eyebrow>
            {stats && (
              <span
                className={`text-xs tabular-nums ${
                  complete ? 'text-[var(--text-dim)]' : 'font-semibold text-[var(--highlight)]'
                }`}
                title={complete ? 'Alle Felder dieser Woche sind erfasst' : 'Diese Woche ist noch nicht vollständig erfasst'}
              >
                {stats.filled}/{stats.total} Felder erfasst{complete ? '' : ' · noch offen'}
              </span>
            )}
          </div>
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="sticky top-0 z-10 text-left text-xs">
                <th className="border border-[var(--border)] bg-[var(--muted)] px-2 py-1">TN</th>
                <th className="border border-[var(--border)] bg-[var(--muted)] px-2 py-1">Nachname</th>
                <th className="border border-[var(--border)] bg-[var(--muted)] px-2 py-1">Vorname</th>
                {dates.map((d) => (
                  <th key={d} colSpan={2} className="border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-center whitespace-nowrap">
                    {dayHeader(d)}
                  </th>
                ))}
                <th className="border border-[var(--border)] bg-[var(--muted)] px-2 py-1">Anmerkungen</th>
                <th className="border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-center whitespace-nowrap">
                  Anwesend
                  <br />
                  (Pro Woche)
                </th>
              </tr>
              <tr className="text-center text-[11px] text-ink-dim">
                <th className="border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5" colSpan={3} />
                {dates.flatMap((d) => [
                  <th key={d + 'v'} className="border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5">V</th>,
                  <th key={d + 'n'} className="border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5">N</th>,
                ])}
                <th className="border border-[var(--border)] bg-[var(--muted)]" />
                <th className="border border-[var(--border)] bg-[var(--muted)]" />
              </tr>
            </thead>
            <tbody>
              {listed.map((r) => {
                const { nach, vor } = splitName(r);
                const weekDays: DayMarks[] = dates.map(
                  (d) =>
                    r.attendance.find((x) => x.date === d) ?? {
                      date: d,
                      morning: '' as AttendanceCode,
                      afternoon: '' as AttendanceCode,
                    },
                );
                const note = r.attendanceNotes?.[weekStart] ?? r.attendanceNotes?.[dates[0]] ?? '';
                return (
                  <tr key={r.participantId} className="even:bg-[var(--muted)]/40 hover:bg-[var(--highlight-weak)]/50">
                    <td className="border border-[var(--border)] px-2 py-1 whitespace-nowrap">
                      <CourseChip id={r.participantId} />
                    </td>
                    <td className="border border-[var(--border)] px-2 py-1">
                      <TnName id={r.participantId} name={nach} chip={false} />
                    </td>
                    <td className="border border-[var(--border)] px-2 py-1">
                      <TnName id={r.participantId} name={vor} chip={false} />
                    </td>
                    {weekDays.flatMap((day) => {
                      const holiday = holidayByDate.get(day.date);
                      const weekend = isWeekend(day.date);
                      // Feiertage sind gesperrt; Wochenenden bleiben klickbar, da
                      // dort gelegentlich Klausuren/Workshops stattfinden.
                      const locked = holiday !== undefined;
                      const cells = (['morning', 'afternoon'] as const).map((session) => (
                        <td key={day.date + session} className="border border-[var(--border)] p-0">
                          <CodeCell
                            code={day[session]}
                            locked={locked}
                            lockedReason={holiday ?? (weekend ? 'Wochenende' : undefined)}
                            weekend={weekend}
                            disabled={saving}
                            label={`${vor} ${nach} · ${dayHeader(day.date)} · ${
                              session === 'morning' ? 'Vormittag' : 'Nachmittag'
                            }${weekend ? ' · Wochenende' : ''}`}
                            onChange={(code) => void setMark(r, day.date, session, code)}
                          />
                        </td>
                      ));
                      return cells;
                    })}
                    <td className="border border-[var(--border)] border-l-2 border-l-[var(--line)] p-0 text-xs max-w-[16rem]">
                      <textarea
                        defaultValue={note}
                        disabled={saving}
                        onBlur={(e) => {
                          const text = e.target.value.trim();
                          if (text !== note) void saveNote(r, dates[0], text);
                        }}
                        rows={2}
                        placeholder="Anmerkung …"
                        title={`Anmerkung für ${vor} ${nach}, Woche ab ${weekStart} — Feld verlassen zum Speichern`}
                        className="w-full resize-none border-0 bg-transparent px-2 py-1 text-xs text-ink-dim placeholder:text-ink-dim/50 focus:bg-highlight-weak focus:text-ink focus:outline-none"
                      />
                    </td>
                    <td className="border border-[var(--border)] px-2 py-1 text-center font-bold tabular-nums">
                      {countWeekPresence(weekDays)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        );
      })}

      {listed.length === 0 && (
        <Card>
          <p className="text-sm text-ink-dim">
            Für {label} liegen keine Tagesmarkierungen vor.
          </p>
        </Card>
      )}
    </div>
  );
}

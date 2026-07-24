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
import { countWeekPresence, isPresenceDay } from '../../domain/attendance';
import type { AttendanceCode, DayMarks, MonthRecord } from '../../domain/types';

/** Reihenfolge beim Durchklicken einer Zelle. */
const CYCLE: AttendanceCode[] = ['X', '(x)', 'E', 'K', 'A', 'U', ''];
const WEEKDAY_LETTER = ['S', 'M', 'D', 'M', 'D', 'F', 'S'];

const LEGEND: [string, string][] = [
  ['X', 'anwesend'],
  ['(x)', 'anwesend, aber zu spät gekommen oder früher gegangen'],
  ['E', 'entschuldigtes Fehlen mit Nachweis'],
  ['K', 'Kulanztag (vor 9 Uhr abgemeldet per Mail); falls nur ein Tag krank oder Kind krank — kein Nachweis nötig'],
  ['A', 'abgemeldet per Mail (ohne Nachweis / kein Kulanztag — z. B. Termine sind keine Kulanztage)'],
  ['U', 'nicht abgemeldet + kein Nachweis'],
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

function splitName(record: MonthRecord): { nach: string; vor: string } {
  const known = tnNames[record.participantId];
  if (known) return known;
  const parts = record.participantName.split(' ');
  return { vor: parts[0] ?? '', nach: parts.slice(1).join(' ') };
}

function codeClass(code: AttendanceCode): string {
  switch (code) {
    case 'U':
      return 'bg-danger/15 text-danger font-bold';
    case 'A':
      return 'bg-ink/10 text-ink-dim font-semibold';
    case 'E':
    case 'K':
      return 'bg-highlight-weak text-ink font-semibold';
    case '(x)':
      return 'text-ink';
    case 'X':
    case 'x':
      return 'text-ink font-semibold';
    default:
      return 'text-ink-dim opacity-50';
  }
}

export default function DozentAttendance() {
  const { user, storage, storageVersion, attendanceSource, dataSource, month: ym, setMonth: setYm } = useSession();
  const excelMode = attendanceSource !== null && dataSource.kind === 'EXCEL';
  const [records, setRecords] = useState<MonthRecord[]>([]);
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

  const cycle = (record: MonthRecord, dateIso: string, session: 'morning' | 'afternoon') => {
    const day = record.attendance.find((d) => d.date === dateIso);
    const current = (day?.[session] ?? '') as AttendanceCode;
    const normalized = current === 'x' ? 'X' : current;
    const next = CYCLE[(CYCLE.indexOf(normalized) + 1) % CYCLE.length];
    void setMark(record, dateIso, session, next);
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

  const monthTotal = (r: MonthRecord) => r.attendance.filter(isPresenceDay).length;
  const label = MONTHS.find((m) => m.ym === ym)?.label ?? ym;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow>Anwesenheitsliste</Eyebrow>
          <h1 className="text-2xl font-bold uppercase tracking-wide">{label}</h1>
        </div>
        {saving && <span className="text-sm text-ink-dim">Speichere in die Liste …</span>}
      </div>

      {/* Monats-Tabs — entsprechen den Blättern der Excel-Datei. */}
      <div className="flex gap-1 flex-wrap" role="tablist" aria-label="Monat wählen">
        {MONTHS.map((m) => (
          <button
            key={m.ym}
            role="tab"
            aria-selected={m.ym === ym}
            onClick={() => setYm(m.ym)}
            className={`rounded-t-md border border-b-0 px-3 py-1.5 text-sm ${
              m.ym === ym
                ? 'bg-surface font-bold border-ink/30'
                : 'bg-ink/5 text-ink-dim border-transparent hover:bg-ink/10'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
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

      {/* Wochenblöcke — exakt wie die Liste: Tageskopf, darunter V/N, dann TN-Zeilen. */}
      {weeks.map(([weekStart, dates]) => (
        <Card key={weekStart} className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs">
                <th className="border border-ink/15 bg-ink/5 px-2 py-1">TN</th>
                <th className="border border-ink/15 bg-ink/5 px-2 py-1">Nachname</th>
                <th className="border border-ink/15 bg-ink/5 px-2 py-1">Vorname</th>
                {dates.map((d) => (
                  <th key={d} colSpan={2} className="border border-ink/15 bg-ink/5 px-2 py-1 text-center whitespace-nowrap">
                    {dayHeader(d)}
                  </th>
                ))}
                <th className="border border-ink/15 bg-ink/5 px-2 py-1">Anmerkungen</th>
                <th className="border border-ink/15 bg-ink/5 px-2 py-1 text-center whitespace-nowrap">
                  Anwesend
                  <br />
                  (Pro Woche)
                </th>
              </tr>
              <tr className="text-center text-[11px] text-ink-dim">
                <th className="border border-ink/15 px-2 py-0.5" colSpan={3} />
                {dates.flatMap((d) => [
                  <th key={d + 'v'} className="border border-ink/15 px-2 py-0.5">V</th>,
                  <th key={d + 'n'} className="border border-ink/15 px-2 py-0.5">N</th>,
                ])}
                <th className="border border-ink/15" />
                <th className="border border-ink/15" />
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
                  <tr key={r.participantId}>
                    <td className="border border-ink/15 px-2 py-1 whitespace-nowrap">
                      <CourseChip id={r.participantId} />
                    </td>
                    <td className="border border-ink/15 px-2 py-1">
                      <TnName id={r.participantId} name={nach} chip={false} />
                    </td>
                    <td className="border border-ink/15 px-2 py-1">
                      <TnName id={r.participantId} name={vor} chip={false} />
                    </td>
                    {weekDays.flatMap((day) =>
                      (['morning', 'afternoon'] as const).map((session) => (
                        <td key={day.date + session} className="border border-ink/15 p-0">
                          <button
                            onClick={() => cycle(r, day.date, session)}
                            disabled={saving}
                            title={`${vor} ${nach} · ${dayHeader(day.date)} · ${session === 'morning' ? 'Vormittag' : 'Nachmittag'} — klicken zum Ändern`}
                            className={`h-8 w-9 text-center text-xs ${codeClass(day[session])} hover:outline hover:outline-1 hover:outline-ink/40`}
                          >
                            {day[session] || '·'}
                          </button>
                        </td>
                      )),
                    )}
                    <td className="border border-ink/15 p-0 text-xs max-w-[16rem]">
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
                    <td className="border border-ink/15 px-2 py-1 text-center font-bold">
                      {countWeekPresence(weekDays)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ))}

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

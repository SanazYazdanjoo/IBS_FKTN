/**
 * Anwesenheitserfassung. Im Excel-Modus schreibt jede Eingabe direkt in
 * die Anwesenheitsliste (mit Backup); im Demo-Modus in die Beispieldaten.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../../app/session';
import { Card, Eyebrow } from '../../app/ui';
import { MONTH } from '../../adapters/mock/seed';
import type { AttendanceCode, MonthRecord } from '../../domain/types';

const CODES: AttendanceCode[] = ['X', '(x)', 'E', 'K', 'A', 'U'];
const DEMO_TODAY = '2026-07-22';

export default function DozentAttendance() {
  const { user, storage, storageVersion, attendanceSource, dataSource } = useSession();
  const [records, setRecords] = useState<MonthRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(DEMO_TODAY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    storage.listMonthRecords(user, MONTH).then(setRecords);
  }, [user, storage, storageVersion]);

  const excelMode = attendanceSource !== null && dataSource.kind === 'EXCEL';
  const month = dataSource.kind === 'EXCEL' ? dataSource.month : 7;

  const availableDates = useMemo(() => {
    if (!excelMode) return [DEMO_TODAY];
    const dates = new Set<string>();
    for (const r of records) for (const d of r.attendance) dates.add(d.date);
    return [...dates].sort();
  }, [records, excelMode]);

  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const setCode = async (
    record: MonthRecord,
    session: 'morning' | 'afternoon',
    code: AttendanceCode,
  ) => {
    setError('');
    try {
      if (excelMode && attendanceSource) {
        setSaving(true);
        attendanceSource.workbook.setMark(month, record.participantId, selectedDate, session, code);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const buffer = await attendanceSource.workbook.toBuffer();
        await attendanceSource.persistence.saveBackup(
          buffer,
          attendanceSource.fileName.replace(/\.xlsx$/i, '') + `_backup_${stamp}.xlsx`,
        );
        await attendanceSource.persistence.save(buffer, attendanceSource.fileName);
        // reflect locally
        setRecords((prev) =>
          prev.map((r) =>
            r.participantId === record.participantId
              ? {
                  ...r,
                  attendance: r.attendance.map((d) =>
                    d.date === selectedDate ? { ...d, [session]: code } : d,
                  ),
                }
              : r,
          ),
        );
      } else {
        const existing = record.attendance.find((d) => d.date === selectedDate);
        const attendance = existing
          ? record.attendance.map((d) => (d.date === selectedDate ? { ...d, [session]: code } : d))
          : [
              ...record.attendance,
              { date: selectedDate, morning: '', afternoon: '', [session]: code } as never,
            ];
        await storage.saveMonthRecord(user, { ...record, attendance });
        storage.listMonthRecords(user, MONTH).then(setRecords);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openGaps = records.filter((r) => {
    const d = r.attendance.find((x) => x.date === selectedDate);
    return !d || (d.morning === '' && d.afternoon === '');
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>
          Anwesenheit · {excelMode ? `${attendanceSource!.fileName} (live)` : 'Demo'}
          {saving && ' · speichert…'}
        </Eyebrow>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-line p-2 text-sm"
        >
          {availableDates.map((d) => (
            <option key={d} value={d}>
              {new Date(d).toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              })}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <Card className="border-danger">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      <Card className="divide-y divide-line">
        {records.map((record) => {
          const today = record.attendance.find((d) => d.date === selectedDate);
          return (
            <div key={record.participantId} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-semibold">
                {record.participantName}
                <span className="ml-1 text-xs text-ink-dim">{record.participantId}</span>
              </span>
              <div className="flex gap-4">
                <SessionPicker label="V" value={today?.morning ?? ''} onPick={(c) => setCode(record, 'morning', c)} />
                <SessionPicker label="N" value={today?.afternoon ?? ''} onPick={(c) => setCode(record, 'afternoon', c)} />
              </div>
            </div>
          );
        })}
      </Card>

      <p className="text-sm text-ink-dim">
        {openGaps > 0
          ? `${openGaps} Lücke${openGaps > 1 ? 'n' : ''} offen an diesem Tag`
          : 'Alle erfasst ✓'}
        {' · '}Codes: X anwesend · (x) verspätet · E entschuldigt (Nachweis) · K Kulanztag ·
        A abgemeldet · U unentschuldigt
      </p>
      <p className="text-xs text-ink-dim">
        Erstattung: E/K/X/(x) zählen als anwesend · A/U werden rausgerechnet (Legende der Liste)
      </p>
    </div>
  );
}

function SessionPicker({
  label,
  value,
  onPick,
}: {
  label: string;
  value: AttendanceCode;
  onPick: (c: AttendanceCode) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-semibold text-ink-dim">{label}</span>
      {CODES.map((code) => (
        <button
          key={code}
          onClick={() => onPick(code)}
          className={`h-7 min-w-7 rounded-full px-1 text-xs font-semibold ${
            value === code ? 'bg-primary text-white' : 'bg-muted text-ink-dim hover:bg-blush-weak'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

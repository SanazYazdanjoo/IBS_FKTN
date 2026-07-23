/**
 * Dozent attendance — screen 1f. Tap-entry per session (V/N), 2 taps per
 * person, valid codes as buttons ("nie mehr 'welcher Dienstag?'", P8).
 * For the prototype this edits ALL seeded TN records for today's date.
 */
import { useEffect, useState } from 'react';
import { useSession } from '../../app/session';
import { Card, Eyebrow } from '../../app/ui';
import { MONTH } from '../../adapters/mock/seed';
import type { AttendanceCode, MonthRecord } from '../../domain/types';

const CODES: AttendanceCode[] = ['x', 'E', 'K', 'U'];
const TODAY = '2026-07-22'; // fixed for a reproducible demo, matches wireframe "Di 22.07."

export default function DozentAttendance() {
  const { user, storage } = useSession();
  const [records, setRecords] = useState<MonthRecord[]>([]);

  useEffect(() => {
    storage.listMonthRecords(user, MONTH).then(setRecords);
  }, [user, storage]);

  const setCode = async (record: MonthRecord, session: 'morning' | 'afternoon', code: AttendanceCode) => {
    const existing = record.attendance.find((d) => d.date === TODAY);
    const attendance = existing
      ? record.attendance.map((d) => (d.date === TODAY ? { ...d, [session]: code } : d))
      : [...record.attendance, { date: TODAY, morning: '', afternoon: '', [session]: code } as any];
    const next = { ...record, attendance };
    await storage.saveMonthRecord(user, next);
    storage.listMonthRecords(user, MONTH).then(setRecords);
  };

  const openGaps = records.filter((r) => !r.attendance.find((d) => d.date === TODAY)).length;

  return (
    <div className="space-y-4">
      <Eyebrow>Heute · Di 22.07. · Dolmetschtraining</Eyebrow>
      <Card className="divide-y divide-line">
        {records.map((record) => {
          const today = record.attendance.find((d) => d.date === TODAY);
          return (
            <div key={record.participantId} className="flex items-center justify-between py-3">
              <span className="font-semibold">{record.participantName}</span>
              <div className="flex gap-4">
                <SessionPicker
                  label="V"
                  value={today?.morning ?? ''}
                  onPick={(c) => setCode(record, 'morning', c)}
                />
                <SessionPicker
                  label="N"
                  value={today?.afternoon ?? ''}
                  onPick={(c) => setCode(record, 'afternoon', c)}
                />
              </div>
            </div>
          );
        })}
      </Card>
      <p className="text-sm text-ink-dim">
        {openGaps > 0
          ? `${openGaps} Lücke${openGaps > 1 ? 'n' : ''} offen — Liste noch nicht einreichbar`
          : 'Alle erfasst — Liste einreichbar'}
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
          className={`h-7 w-7 rounded-full text-xs font-semibold ${
            value === code ? 'bg-primary text-white' : 'bg-muted text-ink-dim hover:bg-blush-weak'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

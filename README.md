/**
 * App shell — deliberately minimal. It proves the wiring
 * (auth → adapter → domain engine → screen), not the final design.
 * Build the real screens per the Claude-Design wireframes inside
 * src/features/<role>/, replacing these placeholders.
 */
import { useEffect, useMemo, useState } from 'react';
import { createMockAuth, createMockStorage } from '../adapters/mock/mockAdapters';
import { MONTH, vmtSingleFaresEur } from '../adapters/mock/seed';
import { summarizeAttendance } from '../domain/attendance';
import { calculateReimbursement } from '../domain/reimbursement';
import { defaultRules } from '../domain/rules';
import type { MonthRecord, SessionUser } from '../domain/types';

const auth = createMockAuth('u-selin');
const storage = createMockStorage();

export default function App() {
  const [user, setUser] = useState<SessionUser>(auth.currentUser());
  const [records, setRecords] = useState<MonthRecord[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setError('');
    storage
      .listMonthRecords(user, MONTH)
      .then(setRecords)
      .catch((e: Error) => setError(e.message));
  }, [user]);

  const rows = useMemo(
    () =>
      records.map((record) => {
        const attendance = summarizeAttendance(record.attendance, defaultRules);
        const result = calculateReimbursement(
          {
            ticketPriceEur: record.ticketPriceEur,
            workdaysInMonth: record.workdaysInMonth,
            reimbursableDays: attendance.reimbursableDays,
            unexcusedDays: attendance.unexcusedDays,
            vmtSingleFareEur: vmtSingleFaresEur[record.participantId],
            eligibility: {
              distanceKm: record.distanceKm,
              hasApprovedDistanceException: record.exceptions.some(
                (e) => e.approvedByManager,
              ),
            },
          },
          defaultRules,
        );
        return { record, attendance, result };
      }),
    [records],
  );

  return (
    <div className="mx-auto max-w-3xl p-6 font-body">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">
          IBS Fahrtkostenerstattung <span className="text-primary">· Prototyp-Scaffold</span>
        </h1>
        <p className="text-ink-dim text-sm">
          Rolle wechseln, um die Datenisolation live zu sehen — ein TN hält nie fremde
          Daten im Zustand (NFR-01).
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {auth.listDemoUsers?.().map((u) => (
          <button
            key={u.id}
            onClick={() => {
              auth.switchUser?.(u.id);
              setUser(auth.currentUser());
            }}
            className={`rounded-full border px-3 py-1 text-sm ${
              u.id === user.id
                ? 'border-primary bg-primary text-white'
                : 'border-line bg-surface text-ink'
            }`}
          >
            {u.name}
          </button>
        ))}
      </div>

      {error && <p className="text-danger">{error}</p>}

      <ul className="space-y-3">
        {rows.map(({ record, attendance, result }) => (
          <li key={record.participantId} className="rounded-lg border border-line p-4">
            <div className="flex items-baseline justify-between">
              <strong className="font-display">{record.participantName}</strong>
              <span className="text-lg font-semibold text-primary">
                {result.eligible ? result.phrases[0] : 'nicht erstattungsfähig'}
              </span>
            </div>
            <p className="text-ink-dim mt-1 text-sm">
              {attendance.reimbursableDays}/{record.workdaysInMonth} erstattungsfähige Tage ·{' '}
              {attendance.unexcusedDays} unentschuldigt · Status: {record.status}
              {result.comparisonTriggered && ' · Vergleichsrechnung ✓'}
              {record.exceptions.length > 0 && ' · ✎ Ausnahme'}
              {result.blockers.length > 0 && ` · ⚠ ${result.blockers[0]}`}
            </p>
            {result.trace.vmt && (
              <p className="mt-1 text-sm">
                A: {result.trace.proRata?.formula} = {result.trace.proRata?.amountEur} € · B:{' '}
                {result.trace.vmt.formula} = {result.trace.vmt.amountEur} € →{' '}
                {result.trace.chosenBecause}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Admin dashboard — "Kontrollturm" table variant (screen 1d, FR-05).
 * Primary variant per the formative-evaluation hypothesis (fast for
 * monthly closing). The pipeline variant (1e) lives at /admin/pipeline
 * for the P4/handover use case — swap which is default once your
 * evaluation settles the question (see Formative_Evaluation_Script).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { Card, Eyebrow, ExceptionFlag, KnownFlag, PrimaryButton, statusLabel } from '../../app/ui';
import { summarizeAttendance } from '../../domain/attendance';
import { calculateReimbursement, formatEuro } from '../../domain/reimbursement';
import { isBulkApprovable } from '../../domain/approval';
import { MONTH, vmtSingleFaresEur } from '../../adapters/mock/seed';
import type { MonthRecord } from '../../domain/types';

export default function AdminDashboard() {
  const { user, storage } = useSession();
  const { rules } = useRules();
  const [records, setRecords] = useState<MonthRecord[]>([]);

  useEffect(() => {
    storage.listMonthRecords(user, MONTH).then(setRecords);
  }, [user, storage]);

  const rows = useMemo(
    () =>
      records.map((record) => {
        const attendance = summarizeAttendance(record.attendance, rules);
        const result = calculateReimbursement(
          {
            ticketPriceEur: record.ticketPriceEur,
            workdaysInMonth: record.workdaysInMonth,
            reimbursableDays: attendance.reimbursableDays,
            unexcusedDays: attendance.unexcusedDays,
            vmtSingleFareEur: vmtSingleFaresEur[record.participantId],
            eligibility: {
              distanceKm: record.distanceKm,
              hasApprovedDistanceException: record.exceptions.some((e) => e.approvedByManager),
            },
          },
          rules,
        );
        return { record, attendance, result, bulkOk: isBulkApprovable(record, rules) };
      }),
    [records, rules],
  );

  const complete = rows.filter((r) => r.record.status === 'READY_FOR_APPROVAL').length;
  const waiting = rows.filter((r) =>
    ['NOT_SUBMITTED', 'SUBMITTED', 'AWAITING_CORRECTION'].includes(r.record.status),
  ).length;
  const problems = rows.filter((r) => r.record.exceptions.length > 0 || !r.result.eligible).length;
  const signaturesPending = rows.filter((r) => r.record.status === 'AWAITING_SIGNATURE').length;

  const sendToApproval = async () => {
    for (const { record, bulkOk } of rows) {
      if (bulkOk) {
        await storage.saveMonthRecord(user, { ...record, status: 'APPROVED' });
      }
    }
    storage.listMonthRecords(user, MONTH).then(setRecords);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Eyebrow>Juli schließen</Eyebrow>
            <p className="mt-1 text-sm text-ink-dim">
              {rows.length} TN · {complete} vollständig · {waiting} warten · {problems} Probleme ·{' '}
              {signaturesPending} Unterschriften ausstehend (Papier · Modus A, P7)
            </p>
          </div>
          <Link to="/admin/pipeline" className="text-sm font-semibold text-primary underline">
            Pipeline-Ansicht →
          </Link>
        </div>
        <p className="mt-1 text-xs text-ink-dim">
          Erinnerungen: automatisch am 10. + 14. ✓ (FR-01)
        </p>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-ink-dim">
              <th className="py-2 pr-3">Teilnehmer:in</th>
              <th className="py-2 pr-3">Belege</th>
              <th className="py-2 pr-3">Anwesenheit</th>
              <th className="py-2 pr-3">Betrag</th>
              <th className="py-2 pr-3">Flags</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ record, attendance, result }) => {
              const docsOk = record.documents.filter((d) => d.state === 'VERIFIED' || d.state === 'UPLOADED').length;
              const docsTotal = Math.max(record.documents.length, docsOk);
              return (
                <tr key={record.participantId} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3">
                    <Link
                      to={`/admin/tn/${record.participantId}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {record.participantName}
                    </Link>
                    {record.hasPraktikum && (
                      <span className="ml-1 text-xs text-ink-dim">Praktikum</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {docsTotal > 0 ? `${docsOk}/${docsTotal} ✓` : '— fehlt'}
                  </td>
                  <td className="py-2 pr-3">
                    {attendance.reimbursableDays}/{record.workdaysInMonth} ✓
                  </td>
                  <td className="py-2 pr-3">
                    {result.eligible ? formatEuro(result.amountEur) : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {record.exceptions.map((ex) => (
                        <ExceptionFlag key={ex.id} category={ex.category} />
                      ))}
                      {result.comparisonTriggered && <KnownFlag>Vergleichsrechnung</KnownFlag>}
                      {!result.eligible && <KnownFlag>&lt; 3-km-Ausnahme</KnownFlag>}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-ink-dim">{statusLabel(record.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <PrimaryButton onClick={sendToApproval}>
        {rows.filter((r) => r.bulkOk).length} ohne Flags &amp; ohne Ausnahmen: alle auf einmal
        freigeben
      </PrimaryButton>
      <p className="text-xs text-ink-dim">
        ✎-Ausnahmen nie im Stapel — immer einzeln · Zeile anklicken → TN-Detail mit Formel-Trace
        &amp; Belegen (FR-06)
      </p>
    </div>
  );
}

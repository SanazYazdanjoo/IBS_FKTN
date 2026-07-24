/** Admin-Dashboard (FR-05): Tabelle TN × Monat, Single Source of Truth. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { Card, Eyebrow, ExceptionFlag, KnownFlag, PrimaryButton, statusLabel, TnName, statusColorClass } from '../../app/ui';
import { computeMonthView } from '../../domain/compute';
import { formatEuro } from '../../domain/reimbursement';
import { isBulkApprovable } from '../../domain/approval';
import { courseTypeFromId } from '../../adapters/excel/values';
import { vmtSingleFaresEur } from '../../adapters/mock/seed';
import { GERMAN_MONTHS } from '../../adapters/excel/attendanceWorkbook';
import type { MonthRecord, ProcessStatus } from '../../domain/types';

const STATUS_FILTERS: ProcessStatus[] = [
  'NOT_SUBMITTED',
  'IN_REVIEW',
  'AWAITING_CORRECTION',
  'AWAITING_SIGNATURE',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'SENT_TO_ACCOUNTING',
  'PAID',
];

export default function AdminDashboard() {
  const { user, storage, storageVersion, dataSource, month: monthStr, setMonth: setGlobalMonth } = useSession();
  const { rules } = useRules();
  const [records, setRecords] = useState<MonthRecord[]>([]);
  const year = dataSource.kind === 'EXCEL' ? dataSource.year : 2026;
  const month = Number(monthStr.split('-')[1]);
  const [courseFilter, setCourseFilter] = useState<'ALLE' | 'PK' | 'BL'>('ALLE');
  const [statusFilter, setStatusFilter] = useState<ProcessStatus | 'ALLE'>('ALLE');


  useEffect(() => {
    storage.listMonthRecords(user, monthStr).then(setRecords).catch(() => setRecords([]));
  }, [user, storage, storageVersion, monthStr]);

  const rows = useMemo(
    () =>
      records
        .filter((r) => courseFilter === 'ALLE' || courseTypeFromId(r.participantId) === courseFilter)
        .filter((r) => statusFilter === 'ALLE' || r.status === statusFilter)
        .map((record) => {
          const view = computeMonthView(record, rules, vmtSingleFaresEur[record.participantId]);
          return { record, ...view, bulkOk: isBulkApprovable(record, rules) };
        }),
    [records, rules, courseFilter, statusFilter],
  );

  const pkCount = records.filter((r) => courseTypeFromId(r.participantId) === 'PK').length;
  const blCount = records.filter((r) => courseTypeFromId(r.participantId) === 'BL').length;

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
    storage.listMonthRecords(user, monthStr).then(setRecords);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Eyebrow>{GERMAN_MONTHS[month - 1]} {year} schließen</Eyebrow>
            <p className="mt-1 text-sm text-ink-dim">
              {rows.length} TN ({pkCount} PK / {blCount} BL) · {complete} vollständig ·{' '}
              {waiting} warten · {problems} Probleme · {signaturesPending} Unterschriften
              ausstehend
            </p>
          </div>
          <Link to="/admin/pipeline" className="text-sm font-semibold text-primary underline">
            Pipeline-Ansicht →
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            Monat
            <select
              value={month}
              onChange={(e) => setGlobalMonth(`${year}-${String(e.target.value).padStart(2, '0')}`)}
              className="rounded-lg border border-line p-1"
            >
              {GERMAN_MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            Kurs
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value as typeof courseFilter)}
              className="rounded-lg border border-line p-1"
            >
              <option value="ALLE">Alle</option>
              <option value="PK">PK · Präsenz</option>
              <option value="BL">BL · Blended</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-line p-1"
            >
              <option value="ALLE">Alle</option>
              {STATUS_FILTERS.map((st) => (
                <option key={st} value={st}>
                  {statusLabel(st)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-dim">
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
            {rows.map(({ record, attendance, result, amountMismatch }) => {
              const docsOk = record.documents.filter((d) => d.state === 'VERIFIED' || d.state === 'UPLOADED').length;
              const docsTotal = Math.max(record.documents.length, docsOk);
              return (
                <tr key={record.participantId} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3">
                    <Link
                      to={`/admin/tn/${record.participantId}`}
                      className="hover:underline"
                    >
                      <TnName id={record.participantId} name={record.participantName} />
                    </Link>
                    {record.hasPraktikum && (
                      <span className="ml-1 text-xs text-ink-dim">Praktikum</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {docsTotal > 0 ? (
                      `${docsOk}/${docsTotal} ✓`
                    ) : (
                      <span className="text-red-600 font-semibold">fehlt</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {attendance.reimbursableDays}/{record.workdaysInMonth} ✓
                  </td>
                  <td className="py-2 pr-3">
                    {result.eligible ? formatEuro(result.amountEur) : '—'}
                    {amountMismatch && (
                      <span
                        className="ml-1 cursor-help text-danger"
                        title={`Excel: ${formatEuro(amountMismatch.excel)} ≠ Engine: ${formatEuro(amountMismatch.engine)} — bitte prüfen`}
                      >
                        ≠
                      </span>
                    )}
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
                  <td className={`py-2 pr-3 ${statusColorClass(record.status) || "text-ink-dim"}`}>{statusLabel(record.status)}</td>
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
        Ausnahmen nie im Stapel — immer einzeln · Zeile anklicken → TN-Detail mit Formel-Trace
        &amp; Belegen (FR-06)
      </p>
    </div>
  );
}



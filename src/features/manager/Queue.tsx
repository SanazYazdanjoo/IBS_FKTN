/** Freigabe-Queue: Zusammenfassung je TN; Ausnahmen immer einzeln. */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { Card, ExceptionFlag, Eyebrow, KnownFlag, PrimaryButton, SecondaryButton } from '../../app/ui';
import { computeMonthView } from '../../domain/compute';
import { formatEuro } from '../../domain/reimbursement';
import { isBulkApprovable } from '../../domain/approval';
import { MONTH, vmtSingleFaresEur } from '../../adapters/mock/seed';
import type { MonthRecord } from '../../domain/types';

export default function ManagerQueue() {
  const { user, storage, storageVersion } = useSession();
  const { rules } = useRules();
  const [records, setRecords] = useState<MonthRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const reload = () => storage.listMonthRecords(user, MONTH).then(setRecords);
  useEffect(() => {
    reload();
  }, [user, storage, storageVersion]);

  const queue = useMemo(
    () =>
      records
        .filter((r) => ['READY_FOR_APPROVAL', 'APPROVED'].includes(r.status))
        .map((record) => {
          const view = computeMonthView(record, rules, vmtSingleFaresEur[record.participantId]);
          return { record, ...view, bulkOk: isBulkApprovable(record, rules) };
        }),
    [records, rules],
  );

  const current = queue.find((q) => q.record.participantId === selected) ?? queue[0];

  const approve = async (record: MonthRecord) => {
    await storage.saveMonthRecord(user, { ...record, status: 'SENT_TO_ACCOUNTING' });
    reload();
  };

  const approveException = async (record: MonthRecord) => {
    const exceptions = record.exceptions.map((e) => ({ ...e, approvedByManager: true }));
    await storage.saveMonthRecord(user, { ...record, exceptions, status: 'SENT_TO_ACCOUNTING' });
    reload();
  };

  const bulkApprovableCount = queue.filter((q) => q.bulkOk).length;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.4fr]">
      <div>
        <Card>
          <Eyebrow>Freigaben · Juli</Eyebrow>
          <p className="text-sm text-ink-dim">{queue.length} offen</p>
          <p className="mt-1 text-xs text-ink-dim">
            Vertretung: Thorsten ab {rules.deputyActivatesAfterDays} Tagen Abwesenheit aktiv (P16)
          </p>
        </Card>
        <div className="mt-3 space-y-2">
          {queue.map(({ record, result, bulkOk }) => (
            <button
              key={record.participantId}
              onClick={() => setSelected(record.participantId)}
              className={`block w-full rounded-xl border p-3 text-left ${
                current?.record.participantId === record.participantId
                  ? 'border-primary bg-blush-weak'
                  : 'border-line'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{record.participantName}</span>
                <span>{result.eligible ? formatEuro(result.amountEur) : '—'}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {record.exceptions.map((ex) => (
                  <ExceptionFlag key={ex.id} category={ex.category} />
                ))}
                {result.comparisonTriggered && <KnownFlag>Vergleichsrechnung</KnownFlag>}
                {!bulkOk && record.exceptions.length === 0 && result.comparisonTriggered === false && (
                  <span className="text-xs text-ink-dim">jetzt offen</span>
                )}
              </div>
            </button>
          ))}
        </div>
        <PrimaryButton
          className="mt-3 w-full"
          onClick={async () => {
            for (const q of queue) if (q.bulkOk) await approve(q.record);
          }}
        >
          {bulkApprovableCount} ohne Flags &amp; ohne Ausnahmen: alle auf einmal freigeben
        </PrimaryButton>
        <p className="mt-1 text-xs text-ink-dim">Ausnahmen nie im Stapel — immer einzeln</p>
      </div>

      <div>
        {current && (
          <Card>
            <Eyebrow>
              {current.record.participantName} · Juli 2026
            </Eyebrow>
            <p className="font-display text-xl font-bold">
              {formatEuro(current.result.amountEur)}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                Belege: {current.record.documents.filter((d) => d.state === 'VERIFIED').length}/
                {current.record.documents.length} ✓ geprüft
              </li>
              <li>
                Anwesenheit: {current.attendance.reimbursableDays}/{current.record.workdaysInMonth}{' '}
                · {current.attendance.auCoveredDays} AU ✓ · {current.attendance.unexcusedDays} unentsch.
              </li>
              <li className="text-ink-dim">
                Formel: {current.result.trace.proRata?.formula} ={' '}
                {formatEuro(current.result.trace.proRata!.amountEur)}
                {current.result.trace.vmt &&
                  ` · Vergleich: ${formatEuro(current.result.trace.vmt.amountEur)}`}
              </li>
              <li>
                Unterschrift:{' '}
                {current.record.signature.signedAt
                  ? `✓ (${current.record.signature.mode === 'PAPER' ? 'Papier' : 'Digital'}, ${new Date(current.record.signature.signedAt).toLocaleDateString('de-DE')})`
                  : 'ausstehend'}
              </li>
            </ul>

            {current.record.exceptions.map((ex) => (
              <div key={ex.id} className="mt-3 rounded-xl bg-highlight-weak p-3 text-sm">
                <ExceptionFlag category={ex.category} /> „{ex.reason}" — Ihre Genehmigung
                erforderlich
                {!ex.approvedByManager && (
                  <div className="mt-2">
                    <PrimaryButton onClick={() => approveException(current.record)}>
                      Genehmigen &amp; freigeben
                    </PrimaryButton>
                  </div>
                )}
              </div>
            ))}

            <div className="mt-4 flex gap-2">
              {current.record.exceptions.length === 0 && (
                <PrimaryButton onClick={() => approve(current.record)}>Freigeben ✓</PrimaryButton>
              )}
              <SecondaryButton>Ablehnen mit Kommentar…</SecondaryButton>
            </div>
            <p className="mt-2 text-xs text-ink-dim">
              → geht digital an Buchhaltung, kein Scan, kein Sekretariat (P11)
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

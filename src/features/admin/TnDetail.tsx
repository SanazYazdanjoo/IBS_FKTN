/** TN-Detail: Belege, Anwesenheit, Formel-Trace, Ausnahmen. */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import {
  Card,
  CheckItem,
  ExceptionFlag,
  Eyebrow,
  KnownFlag,
  PrimaryButton,
  SecondaryButton,
  statusLabel,
} from '../../app/ui';
import { computeMonthView } from '../../domain/compute';
import { formatEuro } from '../../domain/reimbursement';
import { MONTH, vmtSingleFaresEur } from '../../adapters/mock/seed';
import type { ExceptionCategory, MonthRecord, ProofKind } from '../../domain/types';

const PROOF_LABELS: Record<ProofKind, string> = {
  TICKET_PHOTO: 'Ticket',
  PAYMENT_PROOF: 'Kontoauszug',
  INVOICE: 'Rechnung',
  LICENSE_PLATE: 'Kennzeichen',
  GENERAL_INFO: 'Allgemeine Info',
  PRAKTIKUM_CONTRACT: 'Praktikumsvertrag',
  DISTANCE_PROOF: 'Entfernungsnachweis',
};

export default function TnDetail() {
  const { participantId } = useParams<{ participantId: string }>();
  const { user, storage } = useSession();
  const { rules } = useRules();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [showExceptionForm, setShowExceptionForm] = useState(false);

  useEffect(() => {
    if (!participantId) return;
    storage.getMonthRecord(user, participantId, MONTH).then(setRecord);
  }, [participantId, user, storage]);

  if (!record) return <p className="text-ink-dim">Lädt…</p>;

  const { attendance, result, amountMismatch } = computeMonthView(
    record,
    rules,
    vmtSingleFaresEur[record.participantId],
  );

  const persist = async (next: MonthRecord) => {
    await storage.saveMonthRecord(user, next);
    setRecord(next);
  };

  const flagIllegible = async (kind: ProofKind) => {
    const docs = record.documents.map((d) =>
      d.kind === kind
        ? {
            ...d,
            state: 'ILLEGIBLE' as const,
            correctionReason: 'Das Foto ist zu dunkel — der Betrag ist nicht lesbar.',
          }
        : d,
    );
    await persist({ ...record, documents: docs, status: 'AWAITING_CORRECTION' });
  };

  const verify = async (kind: ProofKind) => {
    const docs = record.documents.map((d) => (d.kind === kind ? { ...d, state: 'VERIFIED' as const } : d));
    await persist({ ...record, documents: docs });
  };

  return (
    <div className="space-y-4">
      <Link to="/admin" className="text-sm font-semibold text-primary underline">
        ← Dashboard
      </Link>

      <Card>
        <div className="flex items-baseline justify-between">
          <div>
            <Eyebrow>
              {record.participantName} · Juli 2026
              {record.hasPraktikum && ' · Praktikum ✓'}
            </Eyebrow>
            <p className="font-display text-xl font-bold">
              {record.ticketType === 'ABO' ? 'Deutschlandticket' : record.ticketType}{' '}
              {formatEuro(record.ticketPriceEur)}
            </p>
          </div>
          <span className="text-sm text-ink-dim">
            Status: {statusLabel(record.status)}
            {record.signature.signedAt &&
              ` · Unterschrift ✓ (${record.signature.mode === 'PAPER' ? 'Papier' : 'Digital'})`}
          </span>
        </div>
      </Card>

      <Card>
        <Eyebrow>
          Belege {record.documents.filter((d) => d.state !== 'MISSING').length}/
          {record.documents.length}
        </Eyebrow>
        <ul className="mt-2 space-y-2">
          {record.documents.map((doc) => (
            <li key={doc.kind} className="flex items-center justify-between rounded-xl border border-line p-2">
              <span>
                <CheckItem ok={doc.state === 'VERIFIED' || doc.state === 'UPLOADED'}>
                  {PROOF_LABELS[doc.kind]}
                  {doc.state === 'ILLEGIBLE' && (
                    <span className="ml-1 text-danger">— unleserlich, wartet auf Korrektur</span>
                  )}
                </CheckItem>
              </span>
              {doc.state === 'UPLOADED' && (
                <div className="flex gap-1">
                  <SecondaryButton onClick={() => verify(doc.kind)}>lesbar ✓</SecondaryButton>
                  <SecondaryButton onClick={() => flagIllegible(doc.kind)}>
                    unleserlich
                  </SecondaryButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <Eyebrow>Anwesenheit · aus Dozentenliste</Eyebrow>
        <div className="mt-2 flex gap-4 text-sm">
          <span>
            <strong>{attendance.presenceDays}</strong> anwesend (x, E, K)
          </span>
          <span>
            <strong>{attendance.auCoveredDays}</strong> entschuldigt (AU ✓)
          </span>
          <span>
            <strong>{attendance.unexcusedDays}</strong> unentschuldigt
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-dim">
          Regeln angewendet: Vormittag oder Nachmittag zählt als 1 Tag · (x) zählt · Wochen →
          Monat aggregiert
        </p>
        <p className="mt-2 rounded-lg bg-muted p-2 text-xs">
          ✓ Regel (Legende der Anwesenheitsliste): E/K/X/(x) zählen als anwesend für die
          Abrechnung · A/U gelten als Fehltag und werden rausgerechnet. K = Kulanztag.
          <span className="font-semibold">
            {' '}Aktiver Modus: {rules.sickDaysAreReimbursable ? 'Legende (Standard)' : 'historisch strikt (x/E)'}
          </span>
        </p>
      </Card>

      <Card>
        <Eyebrow>Formel-Trace · automatisch</Eyebrow>
        {result.trace.vmt ? (
          <div className="mt-2 space-y-2 text-sm">
            <p>
              <strong>A · Anteiliges Abo</strong> — {result.trace.proRata?.formula} ={' '}
              {formatEuro(result.trace.proRata!.amountEur)}
            </p>
            <p>
              <strong>B · VMT-Einzelfahrten</strong> {result.method === 'VMT_SINGLE_FARES' && '✓ günstiger'} —{' '}
              {result.trace.vmt.formula} = {formatEuro(result.trace.vmt.amountEur)}
            </p>
            <p className="text-ink-dim">{result.trace.chosenBecause}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm">
            {result.trace.proRata?.formula} = {formatEuro(result.trace.proRata!.amountEur)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {!result.comparisonTriggered && <KnownFlag>Vergleich: nicht nötig</KnownFlag>}
          <KnownFlag>3-km-Regel: {result.eligible ? '✓' : '✗'}</KnownFlag>
        </div>
        <p className="mt-3 rounded-lg bg-muted p-2 text-sm font-semibold">
          {result.phrases[0]}
        </p>
        {amountMismatch && (
          <p className="mt-2 rounded-lg bg-blush-weak p-2 text-sm text-danger">
            ≠ In der Excel steht {formatEuro(amountMismatch.excel)}, die Engine berechnet{' '}
            {formatEuro(amountMismatch.engine)} — bitte klären, bevor bestätigt wird.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <PrimaryButton onClick={() => persist({ ...record, status: 'READY_FOR_APPROVAL' })}>
            Bestätigen → an Kristin
          </PrimaryButton>
          <Link
            to={`/admin/tn/${record.participantId}/formular`}
            className="rounded-full border border-line bg-surface px-5 py-2 font-semibold text-ink transition hover:border-primary hover:text-primary"
          >
            Formular ansehen →
          </Link>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <Eyebrow>Ausnahme vermerken · sichtbar für Team, nie versteckt</Eyebrow>
          <SecondaryButton onClick={() => setShowExceptionForm((v) => !v)}>
            {showExceptionForm ? 'Abbrechen' : 'Ausnahme vermerken'}
          </SecondaryButton>
        </div>
        {record.exceptions.map((ex) => (
          <div key={ex.id} className="mt-2 flex items-center gap-2">
            <ExceptionFlag category={ex.category} />
            <span className="text-sm">
              „{ex.reason}" · vermerkt von {ex.createdBy} ·{' '}
              {ex.approvedByManager ? 'genehmigt' : 'Genehmigung ausstehend'}
            </span>
          </div>
        ))}
        {showExceptionForm && (
          <ExceptionForm
            onSubmit={async (category, reason) => {
              await storage.addException(user, record.participantId, MONTH, {
                id: `ex-${Date.now()}`,
                category,
                reason,
                createdBy: user.id,
                createdAt: new Date().toISOString(),
                visibility: 'TEAM',
                approvedByManager: false,
              });
              const refreshed = await storage.getMonthRecord(user, record.participantId, MONTH);
              setRecord(refreshed);
              setShowExceptionForm(false);
            }}
          />
        )}
        <p className="mt-2 text-xs text-ink-dim">
          erscheint als Flag im Dashboard, blockiert die Stapel-Freigabe
        </p>
      </Card>
    </div>
  );
}

function ExceptionForm({
  onSubmit,
}: {
  onSubmit: (category: ExceptionCategory, reason: string) => void;
}) {
  const [category, setCategory] = useState<ExceptionCategory>('FRIST');
  const [reason, setReason] = useState('');

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-line p-3">
      <label className="block text-sm font-semibold">Kategorie</label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as ExceptionCategory)}
        className="w-full rounded-lg border border-line p-2 text-sm"
      >
        <option value="FRIST">Frist</option>
        <option value="NACHWEIS">Nachweis</option>
        <option value="BERECHNUNG">Berechnung</option>
        <option value="SONSTIGES">Sonstiges</option>
      </select>
      <label className="block text-sm font-semibold">Begründung (Pflicht)</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-line p-2 text-sm"
        placeholder="z. B. Upload erst am 16.07. — Krankenhausaufenthalt, Nachweis liegt vor."
      />
      <p className="text-xs text-ink-dim">Sichtbarkeit · Genehmigung: Team · Kristin (Pflicht)</p>
      <PrimaryButton
        disabled={reason.trim().length === 0}
        onClick={() => onSubmit(category, reason.trim())}
      >
        Ausnahme vermerken
      </PrimaryButton>
    </div>
  );
}

/** TN-Detail: Belege, Anwesenheit, Formel-Trace, Ausnahmen. */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { Card,
  CheckItem,
  ExceptionFlag,
  Eyebrow,
  KnownFlag,
  PrimaryButton,
  SecondaryButton,
  statusLabel, TnName, statusColorClass } from '../../app/ui';
import { computeMonthView } from '../../domain/compute';
import { formatEuro } from '../../domain/reimbursement';
import { MONTHS, monthLabel, vmtSingleFaresEur } from '../../adapters/mock/seed';
import { getMaster } from '../../adapters/masters';
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
  const { user, storage, month: MONTH } = useSession();
  const { rules } = useRules();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [allMonths, setAllMonths] = useState<(MonthRecord | null)[]>([]);
  const [showExceptionForm, setShowExceptionForm] = useState(false);

  useEffect(() => {
    if (!participantId) return;
    storage.getMonthRecord(user, participantId, MONTH).then(setRecord);
    Promise.all(
      MONTHS.map((m) =>
        storage.getMonthRecord(user, participantId, m.ym).catch(() => null),
      ),
    ).then(setAllMonths);
  }, [participantId, user, storage, MONTH]);

  if (!record) return <p className="text-ink-dim">Lädt…</p>;

  const master = getMaster(storage, record.participantId);

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
              <TnName id={record.participantId} name={record.participantName} /> · {monthLabel(MONTH)} 2026
              {record.hasPraktikum && ' · Praktikum ✓'}
            </Eyebrow>
            <p className="font-display text-xl font-bold">
              {record.ticketType === 'ABO' ? 'Deutschlandticket' : record.ticketType}{' '}
              {formatEuro(record.ticketPriceEur)}
            </p>
          </div>
          <span className="text-sm text-ink-dim">
            Status: <span className={statusColorClass(record.status)}>{statusLabel(record.status)}</span>
            {record.signature.signedAt &&
              ` · Unterschrift ✓ (${record.signature.mode === 'PAPER' ? 'Papier' : 'Digital'})`}
          </span>
        </div>
      </Card>

      {/* Stammdaten — vollständige Informationen aus „Alle_TN_Daten". */}
      {master && (
        <Card>
          <Eyebrow>Stammdaten</Eyebrow>
          <div className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <MasterField label="Adresse" value={[[master.strasse, master.hausnr].filter(Boolean).join(' '), [master.plz, master.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')} />
            <MasterField label="Fahrtroute" value={master.fahrtroute} />
            <MasterField label="Entfernung" value={master.entfernungKm != null ? `${String(master.entfernungKm).replace('.', ',')} km` : ''} />
            <MasterField label="VMT-Zone" value={master.vmtZone} />
            <MasterField label="Verkehrsmittel" value={[master.verkehrsmittel, master.kennzeichen && `(${master.kennzeichen})`].filter(Boolean).join(' ')} />
            <MasterField label="Ticket" value={[master.ticket, master.ticketart].filter(Boolean).join(' · ')} />
            <MasterField label="Abo-Nr." value={master.aboNummer} mono />
            <MasterField label="Kontoinhaber" value={master.kontoinhaber} />
            <MasterField label="IBAN" value={master.iban} mono />
            <MasterField label="Bank" value={[master.bank, master.bic].filter(Boolean).join(' · ')} />
            <MasterField label="E-Mail" value={master.email} />
            <MasterField label="Bemerkungen" value={master.bemerkungen} />
          </div>
        </Card>
      )}

      {/* Monatsübersicht — alle Monate mit Nachweisen und Beträgen. */}
      <Card className="overflow-x-auto">
        <Eyebrow>Alle Monate 2026</Eyebrow>
        <table className="mt-2 min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-dim">
              <th className="pr-3 pb-1">Monat</th>
              <th className="pr-3 pb-1">Status</th>
              <th className="pr-3 pb-1 text-right">Anwesend</th>
              <th className="pr-3 pb-1 text-right">Betrag</th>
              <th className="pr-3 pb-1">Ticket</th>
              <th className="pr-3 pb-1">Rechnung</th>
              <th className="pr-3 pb-1">Kontoauszug</th>
              <th className="pr-3 pb-1">Vertrag</th>
              <th className="pb-1">Unterschrift</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m, i) => {
              const rec = allMonths[i];
              if (!rec) {
                return (
                  <tr key={m.ym} className="border-t border-line/60 text-ink-dim">
                    <td className="pr-3 py-1.5">{m.label}</td>
                    <td colSpan={8} className="py-1.5 text-xs">nicht geführt</td>
                  </tr>
                );
              }
              const view = computeMonthView(rec, rules, vmtSingleFaresEur[rec.participantId]);
              const doc = (kind: ProofKind) => {
                const d = rec.documents.find((x) => x.kind === kind);
                if (!d) return <span className="text-red-600 font-semibold" title="fehlt">fehlt</span>;
                if (d.state === 'VERIFIED') return <span className="text-green-600 font-semibold">✓</span>;
                if (d.state === 'ILLEGIBLE') return <span className="text-red-600 font-semibold" title="unleserlich">✗</span>;
                if (d.state === 'MISSING') return <span className="text-red-600 font-semibold" title="fehlt">fehlt</span>;
                return <span>{d.state === 'UPLOADED' ? '…' : '—'}</span>;
              };
              const isCurrent = m.ym === MONTH;
              return (
                <tr key={m.ym} className={`border-t border-line/60 ${isCurrent ? 'bg-highlight-weak/50 font-semibold' : ''}`}>
                  <td className="pr-3 py-1.5">{m.label}{isCurrent && ' ●'}</td>
                  <td className={`pr-3 py-1.5 ${statusColorClass(rec.status)}`}>{statusLabel(rec.status)}</td>
                  <td className="pr-3 py-1.5 text-right">
                    {view.attendance.presenceDays}/{rec.workdaysInMonth}
                  </td>
                  <td className="pr-3 py-1.5 text-right">
                    {view.result.eligible ? formatEuro(view.result.amountEur) : '—'}
                  </td>
                  <td className="pr-3 py-1.5">{doc(rec.ticketType === 'PKW' ? 'LICENSE_PLATE' : 'TICKET_PHOTO')}</td>
                  <td className="pr-3 py-1.5">{doc('INVOICE')}</td>
                  <td className="pr-3 py-1.5">{doc(rec.ticketType === 'PKW' ? 'GENERAL_INFO' : 'PAYMENT_PROOF')}</td>
                  <td className="pr-3 py-1.5">{rec.hasPraktikum ? doc('PRAKTIKUM_CONTRACT') : <span className="text-ink-dim">—</span>}</td>
                  <td className="py-1.5">
                    {rec.signature.signedAt ? `✓ ${rec.signature.signedAt}` : 'offen'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-dim">
          Beträge aus der Berechnungs-Engine (Tagesdaten der Anwesenheitsliste); ● = aktueller Monat.
        </p>
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


function MasterField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <p>
      <span className="text-xs text-ink-dim">{label}: </span>
      <span className={mono ? 'font-mono text-xs' : ''}>{value || '—'}</span>
    </p>
  );
}

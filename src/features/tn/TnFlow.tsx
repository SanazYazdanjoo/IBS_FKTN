/** TN-Ansicht: Home, Ticketart, Upload-Checkliste, Signatur-Aufgabe. */
import { useEffect, useState } from 'react';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { Card, Eyebrow, PrimaryButton, SecondaryButton, StatusPipeline } from '../../app/ui';
import { computeMonthView } from '../../domain/compute';
import { checkCompleteness, requiredProofs } from '../../domain/submission';
import { formatEuro } from '../../domain/reimbursement';
import { monthLabel, vmtSingleFaresEur } from '../../adapters/mock/seed';
import type { MonthRecord, ProofKind, TicketType } from '../../domain/types';

const PROOF_LABELS: Record<ProofKind, string> = {
  TICKET_PHOTO: 'Ticket-Foto / Screenshot',
  PAYMENT_PROOF: 'Kontoauszug (geschwärzt)',
  INVOICE: 'Rechnung',
  LICENSE_PLATE: 'Kennzeichen-Nummer',
  GENERAL_INFO: 'Allgemeine Info (Name, Zeitraum)',
  PRAKTIKUM_CONTRACT: 'Praktikumsvertrag',
  DISTANCE_PROOF: 'Entfernungsnachweis',
};

const TICKET_OPTIONS: { type: TicketType; label: string; hint: string }[] = [
  { type: 'ABO', label: 'Deutschlandticket (Abo)', hint: 'Ticket-Screenshot + Kontoauszug' },
  { type: 'ONLINE', label: 'Online-Einzelticket', hint: 'Rechnung/Beleg' },
  { type: 'PKW', label: 'PKW', hint: 'km-Angabe, ≥ 3 km' },
];

type Step = 'home' | 'ticketType' | 'upload';

function daysUntil15th(): number {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), 15);
  const diff = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
  return diff;
}

export default function TnFlow() {
  const { user, storage, month: MONTH } = useSession();
  const { rules } = useRules();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [step, setStep] = useState<Step>('home');

  useEffect(() => {
    if (!user.participantId) return;
    const load = storage.getOrCreateMonthRecord
      ? storage.getOrCreateMonthRecord(user, user.participantId, user.name, MONTH)
      : storage.getMonthRecord(user, user.participantId, MONTH);
    load.then(setRecord).catch(() => setRecord(null));
  }, [user, storage, MONTH]);

  if (!user.participantId) {
    return <Card>Diese Ansicht ist für TN-Nutzer:innen. Bitte oben eine TN-Rolle wählen.</Card>;
  }
  if (!record) return <p className="text-ink-dim">Lädt…</p>;

  const persist = async (next: MonthRecord) => {
    await storage.saveMonthRecord(user, next);
    setRecord(next);
  };

  const { attendance, result } = computeMonthView(
    record,
    rules,
    vmtSingleFaresEur[record.participantId],
  );
  const completeness = checkCompleteness(
    {
      ticketType: record.ticketType,
      hasPraktikum: record.hasPraktikum,
      praktikumContractAlreadyOnFile: record.documents.some(
        (d) => d.kind === 'PRAKTIKUM_CONTRACT' && d.state === 'VERIFIED',
      ),
      aboCardAlreadyOnFile: false,
    },
    record.documents,
  );

  if (step === 'ticketType') {
    return (
      <TicketTypeStep
        record={record}
        onSelect={async (type) => {
          await persist({ ...record, ticketType: type });
          setStep('upload');
        }}
        onBack={() => setStep('home')}
      />
    );
  }

  if (step === 'upload') {
    return (
      <UploadStep
        record={record}
        completeness={completeness}
        onUpload={async (kind, fileName) => {
          const docs = record.documents.filter((d) => d.kind !== kind);
          docs.push({ kind, fileName, state: 'UPLOADED', uploadedAt: new Date().toISOString() });
          await persist({ ...record, documents: docs });
        }}
        onSubmit={async () => {
          await persist({ ...record, status: 'IN_REVIEW' });
          setStep('home');
        }}
        onBack={() => setStep('home')}
      />
    );
  }

  // Home
  const daysLeft = daysUntil15th();
  const hasSubmittedProof = record.documents.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <Eyebrow>{monthLabel(MONTH)} 2026 · Home</Eyebrow>
        {record.status === 'NOT_SUBMITTED' && daysLeft > 0 && (
          <p className="mt-1 font-display text-lg text-primary">
            Noch {daysLeft} Tage bis zum 15.!
          </p>
        )}
        <div className="mt-2">
          {result.eligible && hasSubmittedProof ? (
            <>
              <p className="font-display text-2xl font-bold">
                {formatEuro(result.amountEur)} unterwegs zu dir
              </p>
              <div className="mt-2">
                <StatusPipeline status={record.status} />
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-primary">
                  So wurde gerechnet
                </summary>
                <p className="mt-1 text-ink-dim">
                  {result.trace.proRata
                    ? `${result.trace.proRata.formula} = ${formatEuro(result.trace.proRata.amountEur)}`
                    : result.trace.pkw
                    ? `${result.trace.pkw.formula} = ${formatEuro(result.trace.pkw.amountEur)}`
                    : `Endbetrag: ${formatEuro(result.amountEur)}`}
                  {result.trace.vmt && (
                    <> · Vergleich VMT: {formatEuro(result.trace.vmt.amountEur)}</>
                  )}
                </p>
                {attendance.unexcusedDays > 0 && (
                  <p className="mt-1 text-ink-dim">
                    Abzug: {attendance.unexcusedDays} unentschuldigter Tag
                    {attendance.unexcusedDays > 1 ? 'e' : ''}
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-dim">keine Blackbox mehr (P3)</p>
              </details>
            </>
          ) : (
            <p className="text-ink-dim">Dein Juli: noch nichts eingereicht</p>
          )}
        </div>
      </Card>

      <Card>
        <Eyebrow>Aufgaben</Eyebrow>
        <ul className="mt-2 space-y-2">
          {!hasSubmittedProof && (
            <li className="flex items-center justify-between">
              <span>
                Nachweise hochladen <span className="text-ink-dim">· ca. 2 Minuten</span>
              </span>
              <PrimaryButton onClick={() => setStep('ticketType')}>Los geht's →</PrimaryButton>
            </li>
          )}
          {record.status === 'AWAITING_SIGNATURE' && (
            <li>
              <SignatureTask record={record} onSigned={persist} rules={rules} />
            </li>
          )}
          {record.status === 'SENT_TO_ACCOUNTING' && (
            <li className="text-ink-dim">Warten auf Auszahlung… du bekommst eine Nachricht.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function TicketTypeStep({
  record,
  onSelect,
  onBack,
}: {
  record: MonthRecord;
  onSelect: (t: TicketType) => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <Eyebrow>Schritt 1/2 · Ticketart</Eyebrow>
      <h2 className="mt-1 font-display text-xl font-bold">Womit fährst du?</h2>
      <div className="mt-3 space-y-2">
        {TICKET_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => onSelect(opt.type)}
            className={`block w-full rounded-xl border p-3 text-left transition ${
              record.ticketType === opt.type
                ? 'border-primary bg-blush-weak'
                : 'border-line hover:border-primary'
            }`}
          >
            <span className="font-semibold">{opt.label}</span>
            <span className="block text-sm text-ink-dim">{opt.hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-dim">
        Auswahl wird gemerkt — nächsten Monat vorausgefüllt
      </p>
      <SecondaryButton onClick={onBack} className="mt-4">
        ← Zurück
      </SecondaryButton>
    </Card>
  );
}

function UploadStep({
  record,
  completeness,
  onUpload,
  onSubmit,
  onBack,
}: {
  record: MonthRecord;
  completeness: ReturnType<typeof checkCompleteness>;
  onUpload: (kind: ProofKind, fileName: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const required = requiredProofs({
    ticketType: record.ticketType,
    hasPraktikum: record.hasPraktikum,
    praktikumContractAlreadyOnFile: false,
    aboCardAlreadyOnFile: false,
  });

  return (
    <Card>
      <Eyebrow>Schritt 2/2 · Nachweise</Eyebrow>
      <ul className="mt-3 space-y-2">
        {required.map((kind) => {
          const doc = record.documents.find((d) => d.kind === kind);
          const uploaded = doc && doc.state !== 'MISSING';
          return (
            <li
              key={kind}
              className="flex items-center justify-between rounded-xl border border-line p-3"
            >
              <span className="flex items-center gap-2">
                <span className={uploaded ? 'text-success' : 'text-ink-dim'}>
                  {uploaded ? '✓' : '○'}
                </span>
                <span>
                  {PROOF_LABELS[kind]}
                  {doc?.fileName && (
                    <span className="block text-xs text-ink-dim">{doc.fileName}</span>
                  )}
                </span>
              </span>
              {!uploaded && (
                <SecondaryButton
                  onClick={() => onUpload(kind, `${kind.toLowerCase()}_${Date.now()}.jpg`)}
                >
                  Datei wählen
                </SecondaryButton>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-dim">
        Wird sicher in der IBS-Cloud gespeichert — kein Versand per E-Mail nötig. (NFR-01)
      </p>
      <div className="mt-4 flex items-center gap-2">
        <PrimaryButton onClick={onSubmit} disabled={!completeness.complete}>
          {completeness.complete
            ? 'Absenden — vollständig ✓'
            : `Absenden — ${required.length - completeness.missing.length}/${required.length} vollständig`}
        </PrimaryButton>
        <SecondaryButton onClick={onBack}>← Zurück</SecondaryButton>
      </div>
    </Card>
  );
}

function SignatureTask({
  record,
  onSigned,
  rules,
}: {
  record: MonthRecord;
  onSigned: (r: MonthRecord) => void;
  rules: ReturnType<typeof useRules>['rules'];
}) {
  if (rules.signatureMode === 'PAPER') {
    return (
      <div className="rounded-xl border border-line p-3">
        <p className="font-semibold">Formular unterschreiben</p>
        <p className="text-sm text-ink-dim">
          im Institut oder per Post (Modus A · FR-09/P7)
        </p>
        <SecondaryButton
          className="mt-2"
          onClick={() =>
            onSigned({
              ...record,
              status: 'READY_FOR_APPROVAL',
              signature: { mode: 'PAPER', signedAt: new Date().toISOString() },
            })
          }
        >
          So geht's →
        </SecondaryButton>
        <p className="mt-1 text-xs text-ink-dim">
          Bei Modus B (digitale Bestätigung): 30 Sekunden in der App.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="font-semibold">Digital bestätigen</p>
      <p className="text-sm text-ink-dim">30 Sekunden — kein Weg ins Institut (P7)</p>
      <PrimaryButton
        className="mt-2"
        onClick={() =>
          onSigned({
            ...record,
            status: 'READY_FOR_APPROVAL',
            signature: { mode: 'DIGITAL', signedAt: new Date().toISOString() },
          })
        }
      >
        Jetzt bestätigen
      </PrimaryButton>
    </div>
  );
}

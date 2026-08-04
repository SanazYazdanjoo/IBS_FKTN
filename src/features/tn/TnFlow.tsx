/** TN-Ansicht: Home, Ticketart, Upload-Checkliste, Signatur-Aufgabe. */
import { useEffect, useState } from 'react';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { Card, Eyebrow, PrimaryButton, SecondaryButton, StatusPipeline } from '../../app/ui';
import { formatEuro } from '../../domain/reimbursement';
import { monthLabel, vmtSingleFaresEur } from '../../adapters/mock/seed';
import type { MonthRecord, ProofKind, TicketType } from '../../domain/types';
import type { RuleConfig } from '../../domain/rules';
import { useLogger } from '../../logging/react.tsx';
import { EventType } from '../../logging/events.ts';
import { logStatusTransition, logUploadOutcome, logUploadStart } from '../../logging/domainEvents.ts';
import { useT } from '../../i18n/LocaleContext';
import { deriveTnFlowState, type TnFlowState } from './tnFlowState';
import PhotoCapture from './PhotoCapture';
import TnFlowStepMode from './TnFlowStepMode';

type Step = 'home' | 'ticketType' | 'upload';
type FlowMode = 'standard' | 'step';

const FLOW_MODE_KEY = 'tn-flow-mode';

function readStoredMode(): FlowMode {
  try {
    return localStorage.getItem(FLOW_MODE_KEY) === 'step' ? 'step' : 'standard';
  } catch {
    return 'standard';
  }
}

function daysUntil15th(): number {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), 15);
  const diff = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
  return diff;
}

export default function TnFlow() {
  const { user, storage, month: MONTH } = useSession();
  const { rules } = useRules();
  const t = useT();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [step, setStep] = useState<Step>('home');
  const [mode, setMode] = useState<FlowMode>(readStoredMode);

  useEffect(() => {
    if (!user.participantId) return;
    const load = storage.getOrCreateMonthRecord
      ? storage.getOrCreateMonthRecord(user, user.participantId, user.name, MONTH)
      : storage.getMonthRecord(user, user.participantId, MONTH);
    load.then(setRecord).catch(() => setRecord(null));
  }, [user, storage, MONTH]);

  if (!user.participantId) {
    return <Card>{t.common.roleGate}</Card>;
  }
  if (!record) return <p className="text-ink-dim">{t.common.loading}</p>;

  const persist = async (next: MonthRecord) => {
    await storage.saveMonthRecord(user, next);
    setRecord(next);
  };

  const setModePersisted = (next: FlowMode) => {
    setMode(next);
    try {
      localStorage.setItem(FLOW_MODE_KEY, next);
    } catch {
      // Sitzung bleibt gültig, auch wenn localStorage fehlt.
    }
  };

  const flowState = deriveTnFlowState(record, rules, vmtSingleFaresEur[record.participantId]);

  if (mode === 'step') {
    return (
      <TnFlowStepMode
        record={record}
        flowState={flowState}
        rules={rules}
        onSwitchToStandard={() => setModePersisted('standard')}
        onPersist={persist}
      />
    );
  }

  return (
    <div className="space-y-3">
      <ModeSwitcher mode={mode} onChange={setModePersisted} />
      <StandardFlow
        record={record}
        flowState={flowState}
        rules={rules}
        step={step}
        setStep={setStep}
        persist={persist}
      />
    </div>
  );
}

function ModeSwitcher({ mode, onChange }: { mode: FlowMode; onChange: (m: FlowMode) => void }) {
  const t = useT();
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <span className="text-xs uppercase tracking-label text-ink-dim">{t.modeSwitch.label}</span>
      <select
        value={mode}
        onChange={(e) => onChange(e.target.value as FlowMode)}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold"
        aria-label={t.modeSwitch.label}
      >
        <option value="standard">{t.modeSwitch.standard}</option>
        <option value="step">{t.modeSwitch.stepByStep}</option>
      </select>
    </div>
  );
}

function StandardFlow({
  record,
  flowState,
  rules,
  step,
  setStep,
  persist,
}: {
  record: MonthRecord;
  flowState: TnFlowState;
  rules: RuleConfig;
  step: Step;
  setStep: (s: Step) => void;
  persist: (next: MonthRecord) => Promise<void>;
}) {
  const t = useT();
  const logger = useLogger();

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
        completeness={flowState.completeness}
        required={flowState.required}
        onUpload={async (kind, fileName) => {
          const start = performance.now();
          logUploadStart(logger, kind, 'image/jpeg', 0);
          try {
            const docs = record.documents.filter((d) => d.kind !== kind);
            docs.push({ kind, fileName, state: 'UPLOADED', uploadedAt: new Date().toISOString() });
            await persist({ ...record, documents: docs });
            logUploadOutcome(logger, true, performance.now() - start);
          } catch {
            logUploadOutcome(logger, false, performance.now() - start, 'WRITE_FAILED');
          }
        }}
        onSubmit={async () => {
          logger?.emit(EventType.FORM_SUBMIT_ATTEMPT, undefined, { form: 'tnFlowSubmit' });
          try {
            const fromStatus = record.status;
            await persist({ ...record, status: 'IN_REVIEW' });
            void logStatusTransition(logger, fromStatus, 'IN_REVIEW', record.participantId);
            logger?.emit(EventType.FORM_SUBMIT_SUCCESS, undefined, { form: 'tnFlowSubmit' });
            setStep('home');
          } catch (err) {
            logger?.emit(EventType.FORM_SUBMIT_FAILURE, undefined, { form: 'tnFlowSubmit' });
            throw err;
          }
        }}
        onBack={() => setStep('home')}
      />
    );
  }

  // Home
  const daysLeft = daysUntil15th();
  const hasSubmittedProof = record.documents.length > 0;
  const { result, attendance } = flowState;

  return (
    <div className="space-y-4">
      <Card>
        <Eyebrow>{t.home.eyebrow(monthLabel(record.month))}</Eyebrow>
        {record.status === 'NOT_SUBMITTED' && daysLeft > 0 && (
          <p className="mt-1 font-display text-lg text-primary">{t.home.daysLeft(daysLeft)}</p>
        )}
        <div className="mt-2">
          {result.eligible && hasSubmittedProof ? (
            <>
              <p className="font-display text-2xl font-bold">
                {t.home.amountHeadline(formatEuro(result.amountEur))}
              </p>
              <div className="mt-2">
                <StatusPipeline status={record.status} />
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-primary">
                  {t.home.traceSummary}
                </summary>
                <p className="mt-1 text-ink-dim">
                  {result.trace.proRata
                    ? `${result.trace.proRata.formula} = ${formatEuro(result.trace.proRata.amountEur)}`
                    : result.trace.pkw
                    ? `${result.trace.pkw.formula} = ${formatEuro(result.trace.pkw.amountEur)}`
                    : `${formatEuro(result.amountEur)}`}
                  {result.trace.vmt && (
                    <> · {t.home.traceVmtGloss(formatEuro(result.trace.vmt.amountEur))}</>
                  )}
                </p>
                {attendance.unexcusedDays > 0 && (
                  <p className="mt-1 text-ink-dim">{t.home.unexcusedDeduction(attendance.unexcusedDays)}</p>
                )}
                <p className="mt-1 text-xs text-ink-dim">keine Blackbox mehr (P3)</p>
              </details>
            </>
          ) : (
            <p className="text-ink-dim">{t.home.notSubmittedYet(monthLabel(record.month))}</p>
          )}
        </div>
      </Card>

      <Card>
        <Eyebrow>{t.tasks.eyebrow}</Eyebrow>
        <ul className="mt-2 space-y-2">
          {!hasSubmittedProof && (
            <li className="flex items-center justify-between">
              <span>
                {t.tasks.uploadTask} <span className="text-ink-dim">{t.tasks.uploadTaskHint}</span>
              </span>
              <PrimaryButton onClick={() => setStep('ticketType')} logId="tn-start-upload">
                {t.tasks.startUpload}
              </PrimaryButton>
            </li>
          )}
          {record.status === 'AWAITING_SIGNATURE' && (
            <li>
              <SignatureTask record={record} onSigned={persist} rules={rules} />
            </li>
          )}
          {record.status === 'SENT_TO_ACCOUNTING' && (
            <li className="text-ink-dim">{t.tasks.waitingForPayout}</li>
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
  const t = useT();
  const ticketTypes: TicketType[] = ['ABO', 'ONLINE', 'PKW'];
  return (
    <Card>
      <Eyebrow>{t.ticketType.eyebrow}</Eyebrow>
      <h2 className="mt-1 font-display text-xl font-bold">{t.ticketType.heading}</h2>
      <div className="mt-3 space-y-2">
        {ticketTypes.map((type) => {
          const opt = t.ticketType.options[type];
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`block w-full rounded-xl border p-3 text-left transition ${
                record.ticketType === type
                  ? 'border-primary bg-blush-weak'
                  : 'border-line hover:border-primary'
              }`}
            >
              <span className="font-semibold">{opt.label}</span>
              <span className="block text-sm text-ink-dim">{opt.hint}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink-dim">{t.ticketType.rememberedHint}</p>
      <SecondaryButton onClick={onBack} className="mt-4">
        {t.common.back}
      </SecondaryButton>
    </Card>
  );
}

function UploadStep({
  record,
  completeness,
  required,
  onUpload,
  onSubmit,
  onBack,
}: {
  record: MonthRecord;
  completeness: TnFlowState['completeness'];
  required: ProofKind[];
  onUpload: (kind: ProofKind, fileName: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const t = useT();

  return (
    <Card>
      <Eyebrow>{t.upload.eyebrow}</Eyebrow>
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
                  {t.upload.proofLabels[kind]}
                  {doc?.fileName && (
                    <span className="block text-xs text-ink-dim">{doc.fileName}</span>
                  )}
                </span>
              </span>
              {!uploaded && (
                <PhotoCapture onCapture={(fileName) => onUpload(kind, fileName)} logId={`tn-upload-${kind}`} />
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-dim">{t.upload.privacyHint}</p>
      <div className="mt-4 flex items-center gap-2">
        <PrimaryButton onClick={onSubmit} disabled={!completeness.complete} logId="tn-submit">
          {completeness.complete
            ? t.upload.submitComplete
            : t.upload.submitPartial(required.length - completeness.missing.length, required.length)}
        </PrimaryButton>
        <SecondaryButton onClick={onBack}>{t.common.back}</SecondaryButton>
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
  rules: RuleConfig;
}) {
  const t = useT();
  if (rules.signatureMode === 'PAPER') {
    return (
      <div className="rounded-xl border border-line p-3">
        <p className="font-semibold">{t.signature.paperTitle}</p>
        <p className="text-sm text-ink-dim">{t.signature.paperHint}</p>
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
          {t.signature.paperAction}
        </SecondaryButton>
        <p className="mt-1 text-xs text-ink-dim">{t.signature.paperDigitalNote}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="font-semibold">{t.signature.digitalTitle}</p>
      <p className="text-sm text-ink-dim">{t.signature.digitalHint}</p>
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
        {t.signature.digitalAction}
      </PrimaryButton>
    </div>
  );
}

export { SignatureTask, daysUntil15th };

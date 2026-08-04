/**
 * "Schritt für Schritt" — one decision per screen, plain-language German,
 * large touch targets, no side-by-side columns (P1: the TN with the lowest
 * digital literacy and weakest German must be able to submit unaided).
 *
 * Renders exclusively from the `flowState` its parent (TnFlow.tsx) derived
 * via deriveTnFlowState() — the same requiredProofs()/checkCompleteness()/
 * reimbursement trace the standard mode uses. This file makes no domain
 * calls of its own; it is a presentation over the same data (P6, NFR-03).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Card, PrimaryButton, SecondaryButton } from '../../app/ui';
import { formatEuro } from '../../domain/reimbursement';
import type { MonthRecord, ProofKind } from '../../domain/types';
import type { RuleConfig } from '../../domain/rules';
import { useLogger } from '../../logging/react.tsx';
import { EventType } from '../../logging/events.ts';
import { logStatusTransition, logUploadOutcome, logUploadStart } from '../../logging/domainEvents.ts';
import { useT } from '../../i18n/LocaleContext';
import type { TnFlowState } from './tnFlowState';
import PhotoCapture from './PhotoCapture';
import { SignatureTask } from './TnFlow';

type StepScreen = 'welcome' | 'ticketType' | 'proof' | 'review' | 'done' | 'signature' | 'waiting';

function initialScreen(record: MonthRecord): StepScreen {
  if (record.status === 'AWAITING_SIGNATURE') return 'signature';
  if (record.status !== 'NOT_SUBMITTED') return 'waiting';
  return 'welcome';
}

export default function TnFlowStepMode({
  record,
  flowState,
  rules,
  onSwitchToStandard,
  onPersist,
}: {
  record: MonthRecord;
  flowState: TnFlowState;
  rules: RuleConfig;
  onSwitchToStandard: () => void;
  onPersist: (next: MonthRecord) => Promise<void>;
}) {
  const t = useT();
  const logger = useLogger();
  const [screen, setScreen] = useState<StepScreen>(() => initialScreen(record));
  const [proofIndex, setProofIndex] = useState(0);

  // required stays a stable, ticketType-driven order for the whole flow —
  // unlike completeness.missing, it doesn't shrink as proofs get captured,
  // so an index into it never goes stale mid-flow.
  const requiredList = flowState.required;
  const isSatisfied = (kind: ProofKind): boolean => {
    const doc = record.documents.find((d) => d.kind === kind);
    return !!doc && doc.state !== 'MISSING' && doc.state !== 'ILLEGIBLE';
  };
  const firstUnsatisfiedFrom = (from: number): number => {
    for (let i = from; i < requiredList.length; i += 1) {
      if (!isSatisfied(requiredList[i])) return i;
    }
    return requiredList.length;
  };

  // Keeps `proof` pointed at an actually-unsatisfied item: a ticket-type
  // change can reshuffle requiredList underneath the current index (a proof
  // shared between two ticket types may already be on file), and capturing
  // the last proof needs to hand off to `review`. Both are corrections to
  // apply after a commit, not during render, hence useEffect rather than
  // computing it inline.
  useEffect(() => {
    if (screen !== 'proof') return;
    const next = firstUnsatisfiedFrom(proofIndex);
    if (next >= requiredList.length) {
      setScreen('review');
    } else if (next !== proofIndex) {
      setProofIndex(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, proofIndex, requiredList, record.documents]);

  const chrome = (children: ReactNode) => (
    <div className="mx-auto max-w-md space-y-3">
      <div className="text-right">
        <button
          type="button"
          onClick={onSwitchToStandard}
          className="text-xs text-ink-dim underline decoration-dotted hover:text-ink"
        >
          {t.modeSwitch.standard}
        </button>
      </div>
      {children}
    </div>
  );

  if (screen === 'signature') {
    return chrome(
      <Card className="p-6 text-center">
        <SignatureTask record={record} onSigned={onPersist} rules={rules} />
      </Card>,
    );
  }

  if (screen === 'waiting') {
    return chrome(
      <Card className="p-6 text-center">
        <p className="text-lg">{t.tasks.waitingForPayout}</p>
      </Card>,
    );
  }

  if (screen === 'welcome') {
    return chrome(
      <Card className="space-y-4 p-6 text-center">
        <h1 className="font-display text-2xl font-bold">{t.stepMode.welcomeHeading}</h1>
        <p className="text-ink-dim">{t.stepMode.welcomeBody}</p>
        <PrimaryButton
          className="w-full py-4 text-lg"
          logId="tn-step-start"
          onClick={() => setScreen('ticketType')}
        >
          {t.stepMode.startAction}
        </PrimaryButton>
      </Card>,
    );
  }

  if (screen === 'ticketType') {
    const ticketTypes = Object.keys(t.ticketType.options) as (keyof typeof t.ticketType.options)[];
    return chrome(
      <Card className="space-y-4 p-6">
        <h1 className="text-center font-display text-xl font-bold">{t.stepMode.ticketQuestion}</h1>
        <div className="space-y-3">
          {ticketTypes.map((type) => {
            const opt = t.ticketType.options[type];
            return (
              <button
                key={type}
                onClick={async () => {
                  await onPersist({ ...record, ticketType: type });
                  setProofIndex(0);
                  setScreen('proof');
                }}
                className={`block w-full rounded-xl border-2 p-4 text-left text-lg transition ${
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
        <SecondaryButton className="w-full" onClick={() => setScreen('welcome')}>
          {t.stepMode.back}
        </SecondaryButton>
      </Card>,
    );
  }

  if (screen === 'proof') {
    const kind = requiredList[proofIndex];
    // Between commits (see the useEffect above) this can briefly be out of
    // range or already satisfied — render nothing for that one frame rather
    // than a wrong/blank proof screen.
    if (!kind || isSatisfied(kind)) return null;
    return chrome(
      <Card className="space-y-4 p-6 text-center">
        <p className="text-sm text-ink-dim">{t.stepMode.stepCounter(proofIndex + 1, requiredList.length)}</p>
        <h1 className="font-display text-xl font-bold">{t.upload.proofLabels[kind]}</h1>
        <p className="text-ink-dim">{t.upload.proofGlosses[kind]}</p>
        <PhotoCapture
          large
          logId={`tn-step-upload-${kind}`}
          onCapture={async (fileName) => {
            const start = performance.now();
            logUploadStart(logger, kind, 'image/jpeg', 0);
            try {
              const docs = record.documents.filter((d) => d.kind !== kind);
              docs.push({ kind, fileName, state: 'UPLOADED', uploadedAt: new Date().toISOString() });
              await onPersist({ ...record, documents: docs });
              logUploadOutcome(logger, true, performance.now() - start);
            } catch {
              logUploadOutcome(logger, false, performance.now() - start, 'WRITE_FAILED');
            }
            // No manual index bump here: onPersist's record update makes the
            // effect above see requiredList[proofIndex] as satisfied and
            // advance on its own. Bumping the index here too raced the
            // effect's own correction and could skip the next proof.
          }}
        />
        <p className="text-xs text-ink-dim">{t.stepMode.proofScreenHint}</p>
        <SecondaryButton
          className="w-full"
          onClick={() => {
            if (proofIndex === 0) setScreen('ticketType');
            else setProofIndex(proofIndex - 1);
          }}
        >
          {t.stepMode.back}
        </SecondaryButton>
      </Card>,
    );
  }

  if (screen === 'review') {
    const { result } = flowState;
    return chrome(
      <Card className="space-y-4 p-6 text-center">
        <h1 className="font-display text-xl font-bold">{t.stepMode.reviewHeading}</h1>
        <p className="text-ink-dim">{t.stepMode.reviewBody}</p>
        <ul className="space-y-2 text-left">
          {requiredList.map((kind) => (
            <li key={kind} className="flex items-center gap-2 rounded-xl border border-line p-3">
              <span className={isSatisfied(kind) ? 'text-success' : 'text-ink-dim'}>
                {isSatisfied(kind) ? '✓' : '○'}
              </span>
              <span>{t.upload.proofLabels[kind]}</span>
            </li>
          ))}
        </ul>
        {result.eligible && (
          <p className="font-display text-lg font-bold">{t.home.amountHeadline(formatEuro(result.amountEur))}</p>
        )}
        {result.trace.vmt && (
          <p className="text-sm text-ink-dim">{t.home.traceVmtGloss(formatEuro(result.trace.vmt.amountEur))}</p>
        )}
        <PrimaryButton
          className="w-full py-4 text-lg"
          disabled={!flowState.completeness.complete}
          logId="tn-step-submit"
          onClick={async () => {
            logger?.emit(EventType.FORM_SUBMIT_ATTEMPT, undefined, { form: 'tnFlowStepSubmit' });
            try {
              const fromStatus = record.status;
              await onPersist({ ...record, status: 'IN_REVIEW' });
              void logStatusTransition(logger, fromStatus, 'IN_REVIEW', record.participantId);
              logger?.emit(EventType.FORM_SUBMIT_SUCCESS, undefined, { form: 'tnFlowStepSubmit' });
              setScreen('done');
            } catch (err) {
              logger?.emit(EventType.FORM_SUBMIT_FAILURE, undefined, { form: 'tnFlowStepSubmit' });
              throw err;
            }
          }}
        >
          {t.stepMode.submitAction}
        </PrimaryButton>
        {!flowState.completeness.complete && (
          <SecondaryButton
            className="w-full"
            onClick={() => {
              setProofIndex(firstUnsatisfiedFrom(0));
              setScreen('proof');
            }}
          >
            {t.stepMode.back}
          </SecondaryButton>
        )}
      </Card>,
    );
  }

  // 'done'
  return chrome(
    <Card className="space-y-4 p-6 text-center">
      <h1 className="font-display text-2xl font-bold">{t.stepMode.doneHeading}</h1>
      <p className="text-ink-dim">{t.stepMode.doneBody}</p>
    </Card>,
  );
}

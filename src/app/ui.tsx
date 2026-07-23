/** Gemeinsame UI-Bausteine (rein präsentational). */
import type { ReactNode } from 'react';
import type { ExceptionCategory, ProcessStatus } from '../domain/types';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">{children}</p>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full bg-primary px-5 py-2 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border border-line bg-surface px-5 py-2 font-semibold text-ink transition hover:border-primary hover:text-primary ${className}`}
    >
      {children}
    </button>
  );
}

const STATUS_LABELS: Record<ProcessStatus, string> = {
  NOT_SUBMITTED: 'Noch nichts eingereicht',
  SUBMITTED: 'Eingereicht',
  IN_REVIEW: 'In Prüfung',
  AWAITING_CORRECTION: 'Korrektur erforderlich',
  AWAITING_SIGNATURE: 'Unterschrift ausstehend',
  READY_FOR_APPROVAL: 'Bereit für Freigabe',
  APPROVED: 'Freigegeben',
  SENT_TO_ACCOUNTING: 'An Buchhaltung',
  PAID: 'Ausgezahlt',
};

const PIPELINE_STEPS: ProcessStatus[] = [
  'SUBMITTED',
  'IN_REVIEW',
  'AWAITING_SIGNATURE',
  'APPROVED',
  'SENT_TO_ACCOUNTING',
  'PAID',
];

export function statusLabel(status: ProcessStatus): string {
  return STATUS_LABELS[status];
}

/** Status-Tracker des TN-Prozesses. */
export function StatusPipeline({ status }: { status: ProcessStatus }) {
  const activeIndex =
    status === 'NOT_SUBMITTED' || status === 'AWAITING_CORRECTION'
      ? 0
      : PIPELINE_STEPS.indexOf(status);

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {PIPELINE_STEPS.map((step, i) => (
        <span key={step} className="flex items-center gap-1">
          <span
            className={
              i <= activeIndex && status !== 'NOT_SUBMITTED'
                ? 'rounded-full bg-primary px-2 py-1 font-semibold text-white'
                : 'rounded-full bg-muted px-2 py-1 text-ink-dim'
            }
          >
            {statusLabel(step)}
          </span>
          {i < PIPELINE_STEPS.length - 1 && <span className="text-ink-dim">→</span>}
        </span>
      ))}
    </div>
  );
}

const EXCEPTION_LABELS: Record<ExceptionCategory, string> = {
  FRIST: 'Frist',
  NACHWEIS: 'Nachweis',
  BERECHNUNG: 'Berechnung',
  SONSTIGES: 'Sonstiges',
};

export function exceptionLabel(category: ExceptionCategory): string {
  return EXCEPTION_LABELS[category];
}

/** Badge für vermerkte Ausnahmen — visuell getrennt von Regel-Flags. */
export function ExceptionFlag({ category }: { category: ExceptionCategory }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-highlight bg-highlight-weak px-2 py-1 text-xs font-semibold text-ink">
      Ausnahme: {exceptionLabel(category)}
    </span>
  );
}

/** Flag für bekannte Regeln (3-km, Vergleichsrechnung). */
export function KnownFlag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blush-weak px-2 py-1 text-xs font-semibold text-ink">
      {children}
    </span>
  );
}

export function CheckItem({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={ok ? 'text-success' : 'text-ink-dim'}>{ok ? '✓' : '○'}</span>
      <span>{children}</span>
    </li>
  );
}

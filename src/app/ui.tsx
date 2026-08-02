import { useParticipantName } from './participant-names';
import { Link } from 'react-router-dom';
/** Gemeinsame UI-Bausteine (rein präsentational). */
import type { InputHTMLAttributes, ReactNode } from 'react';
import type { ExceptionCategory, ProcessStatus, Role } from '../domain/types';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-surface p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-label text-ink-dim">{children}</p>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
  logId,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  /** Stable id for the event log's global click listener (data-log-id) — never the button's text. */
  logId?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-log-id={logId}
      className={`rounded-full bg-primary px-5 py-2 font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = '',
  logId,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  logId?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-log-id={logId}
      className={`rounded-full border border-line bg-surface px-5 py-2 font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Ablehnen-Button — Rot ist knapp und nur für Fehler/Blocker reserviert. */
export function DangerButton({
  children,
  onClick,
  disabled,
  className = '',
  logId,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  logId?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-log-id={logId}
      className={`rounded-full border-2 border-danger px-5 py-2 font-semibold text-danger transition hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Gedämpfter Button-Zustand für „wartet auf etwas außerhalb der eigenen Spur". */
export function WaitingBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex cursor-not-allowed items-center rounded-full bg-muted px-5 py-2 font-semibold text-ink-dim">
      {children}
    </span>
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

/**
 * Farbschema für Status-Labels (fest, überall gleich):
 *  - "Ausgezahlt"             → grün
 *  - "An Buchhaltung"         → blau
 *  - "Korrektur erforderlich" → orange
 *  - "fehlt" (Dokumente)      → rot (siehe docStateColorClass)
 * Andere Zustände bleiben in der Standard-Textfarbe.
 */
export function statusColorClass(status: ProcessStatus): string {
  switch (status) {
    case 'PAID':
      return 'text-win-ink font-semibold';
    case 'SENT_TO_ACCOUNTING':
      return 'text-note-ink font-semibold';
    case 'AWAITING_CORRECTION':
      return 'text-gate-ink font-semibold';
    default:
      return '';
  }
}

/** Farbschema für Dokument-Zustände; „fehlt" (MISSING) wird als Problem dargestellt. */
export function docStateColorClass(state: 'MISSING' | 'UPLOADED' | 'VERIFIED' | 'ILLEGIBLE'): string {
  switch (state) {
    case 'MISSING':
      return 'text-problem-ink font-semibold';
    case 'ILLEGIBLE':
      return 'text-problem-ink font-semibold';
    case 'VERIFIED':
      return 'text-win-ink font-semibold';
    default:
      return '';
  }
}

// ── Role palette ─────────────────────────────────────────────────────────
// One role, one colour — never reuse a lane tone for anything else. All
// three participant variants share the TN tone; told apart by name/status.

const ROLE_META: Record<Role, { label: string; bg: string; text: string }> = {
  TN: { label: 'Teilnehmer:in (TN)', bg: 'bg-role-tn', text: 'text-role-tn' },
  DOZENT: { label: 'Dozent', bg: 'bg-role-dozent', text: 'text-role-dozent' },
  ADMIN: { label: 'Admin', bg: 'bg-role-admin', text: 'text-role-admin' },
  MANAGER: { label: 'Approver', bg: 'bg-role-approver', text: 'text-role-approver' },
  ACCOUNTING: { label: 'Accounting / Finance', bg: 'bg-role-finance', text: 'text-role-finance' },
};

/** Rollen-Chip in voller Sättigung, weißer Text — wie im Design-System §05. */
export function RoleChip({ role, className = '' }: { role: Role; className?: string }) {
  const meta = ROLE_META[role];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-label text-white ${meta.bg} ${className}`}
    >
      {meta.label}
    </span>
  );
}

/** Nur die Rollenfarbe als Label-Text — für Aktivitätsboxen (§05: Farbe nur als Label, nie als Box-Füllung). */
export function RoleLabel({ role, className = '' }: { role: Role; className?: string }) {
  const meta = ROLE_META[role];
  return (
    <span className={`text-xs font-bold uppercase tracking-label ${meta.text} ${className}`}>
      {meta.label}
    </span>
  );
}

/** Aktivitätsbox aus dem Prozessdiagramm: weiße Fläche, handgezeichneter Stroke, farbiges Rollen-Label. */
export function ActivityBox({
  role,
  children,
  className = '',
}: {
  role: Role;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border-2 border-stroke bg-white px-4 py-3 ${className}`}>
      <RoleLabel role={role} />
      <p className="mt-1 font-display text-step-title text-ink">{children}</p>
    </div>
  );
}

// ── Note states ──────────────────────────────────────────────────────────
// Four pale note tones annotate the diagrams; state is carried by fill and
// left rule, never by the text alone.

export type NoteKind = 'note' | 'problem' | 'gate' | 'win';

const NOTE_META: Record<NoteKind, { label: string; bg: string; ink: string; border: string }> = {
  note: { label: 'Note', bg: 'bg-note-bg', ink: 'text-note-ink', border: 'border-note-ink' },
  problem: {
    label: 'Problem',
    bg: 'bg-problem-bg',
    ink: 'text-problem-ink',
    border: 'border-problem-ink',
  },
  gate: { label: 'Gate', bg: 'bg-gate-bg', ink: 'text-gate-ink', border: 'border-gate-ink' },
  win: { label: 'Win', bg: 'bg-win-bg', ink: 'text-win-ink', border: 'border-win-ink' },
};

/** Notiz-Callout für Diagramme/Dokumentation: Note (Kontext) / Problem (AS-IS-Bruch) / Gate (wartet extern) / Win (TO-BE-Loesung). */
export function Callout({
  kind,
  children,
  className = '',
}: {
  kind: NoteKind;
  children: ReactNode;
  className?: string;
}) {
  const meta = NOTE_META[kind];
  return (
    <div className={`rounded-note border-l-4 p-3 ${meta.border} ${meta.bg} ${className}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-label ${meta.ink}`}>
        {meta.label}
      </p>
      <p className="mt-1 text-sm text-ink">{children}</p>
    </div>
  );
}

// ── Status tags ──────────────────────────────────────────────────────────

export type StatusTagKind = 'approved' | 'blocked' | 'needsFix' | 'inReview';

const STATUS_TAG_META: Record<StatusTagKind, { label: string; className: string }> = {
  approved: { label: 'Approved', className: 'bg-win-bg text-win-ink' },
  blocked: { label: 'Blocked', className: 'bg-problem-bg text-problem-ink' },
  needsFix: { label: 'Needs a fix', className: 'bg-gate-bg text-gate-ink' },
  inReview: { label: 'In review', className: 'bg-note-bg text-note-ink' },
};

export function StatusTag({ kind, children }: { kind: StatusTagKind; children?: ReactNode }) {
  const meta = STATUS_TAG_META[kind];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      {children ?? meta.label}
    </span>
  );
}

// ── Form field ───────────────────────────────────────────────────────────

/** Formularfeld mit Hinweis/Pflichtfeld-Text — Design-System §05. */
export function FormField({
  label,
  hint,
  required = false,
  className = '',
  ...inputProps
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        {...inputProps}
        className="mt-1 block w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {hint && (
        <span className={`mt-1 block text-xs ${required ? 'font-semibold text-danger' : 'text-ink-dim'}`}>
          {hint}
        </span>
      )}
    </label>
  );
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

// ── Kurs-Identität (PK/BL) ────────────────────────────────────────────────
// Farben laut Design-Entscheidung: BL #0e4c84 (Dunkelblau), PK #45818e (Teal).
// Identität, nie Status (WCAG 1.4.1: Chip mit Text-Präfix, nie Farbe allein).

export function courseTypeOf(id: string): 'PK' | 'BL' | null {
  if (/^PK/i.test(id)) return 'PK';
  if (/^BL/i.test(id)) return 'BL';
  return null;
}

/**
 * Kurs-Chip in Kursfarbe (BL/PK) mit der vollständigen TN-ID als Beschriftung
 * (z. B. „PK01", „BL07"). Stilistik unverändert; wo bisher der Kurstyp stand,
 * steht jetzt die ID, damit sie direkt neben dem Namen mitläuft.
 */
export function CourseChip({
  id,
  link = true,
}: {
  id: string;
  /** Auf false setzen, wenn der Chip bereits in einem Link oder Button steht. */
  link?: boolean;
}) {
  const type = courseTypeOf(id);
  const fullName = useParticipantName(id);
  if (!type) return null;

  const courseLabel = type === 'BL' ? 'Blended Course' : 'Präsenzkurs';
  // Der Name ist beim Ueberfahren die nuetzlichere Information; der Kurs
  // steht ohnehin farbig im Chip.
  const title = fullName ? `${fullName} · ${courseLabel}` : courseLabel;

  const chip = (
    <span
      className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white ${
        type === 'BL' ? 'bg-course-bl' : 'bg-course-pk'
      }`}
      title={title}
    >
      {id.toUpperCase()}
    </span>
  );

  if (!link) return chip;
  return (
    <Link
      to={`/admin/tn/${id.toUpperCase()}`}
      title={title}
      className="rounded hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      {chip}
    </Link>
  );
}

/**
 * TN-Name in Kursfarbe + Kurs-Chip. Zentraler Baustein für alle Ansichten,
 * damit die Farbcodierung überall identisch ist (Wireframe-Vorgabe).
 */
export function TnName({
  id,
  name,
  chip = true,
  link = true,
  className = '',
}: {
  id: string;
  name: string;
  chip?: boolean;
  /** Auf false setzen, wenn bereits auf der TN-Seite (Link auf sich selbst). */
  link?: boolean;
  className?: string;
}) {
  const type = courseTypeOf(id);
  const color =
    type === 'BL' ? 'text-course-bl' : type === 'PK' ? 'text-course-pk' : 'text-ink';
  return (
    <span className={`font-semibold ${color} ${className}`.trim()}>
      {name}
      {chip && <CourseChip id={id} link={link} />}
    </span>
  );
}

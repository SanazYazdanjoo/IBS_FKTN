import { useParticipantName } from './participant-names';
import { Link } from 'react-router-dom';
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
      return 'text-green-600 font-semibold';
    case 'SENT_TO_ACCOUNTING':
      return 'text-blue-600 font-semibold';
    case 'AWAITING_CORRECTION':
      return 'text-orange-600 font-semibold';
    default:
      return '';
  }
}

/** Farbschema für Dokument-Zustände; „fehlt" (MISSING) wird rot dargestellt. */
export function docStateColorClass(state: 'MISSING' | 'UPLOADED' | 'VERIFIED' | 'ILLEGIBLE'): string {
  switch (state) {
    case 'MISSING':
      return 'text-red-600 font-semibold';
    case 'ILLEGIBLE':
      return 'text-red-600 font-semibold';
    case 'VERIFIED':
      return 'text-green-600 font-semibold';
    default:
      return '';
  }
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

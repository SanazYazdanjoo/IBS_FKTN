/**
 * Gemeinsame Bausteine der Monatsansichten 2a und 2b.
 *
 * Zellfarben nach Abschnitt 6 der Spezifikation:
 *   grau  — Feiertag (gesperrt) ODER Wochenende ohne Eintrag (klickbar)
 *   gelb  — leer, noch einzutragen; ebenso A — muss nochmal geprüft werden
 *   rot   — Fehltag U (nicht abgemeldet, kein Nachweis)
 *   weiß  — anwesend (X, (x), E, K)
 *
 * Wochenenden sind kein Arbeitstag und deshalb standardmäßig grau/leer,
 * aber anders als Feiertage klickbar — Klausuren oder Workshops finden
 * gelegentlich an einem Samstag/Sonntag statt und müssen erfassbar sein.
 *
 * Eingabe nach Abschnitt 4: kleiner Pfeil oben rechts weist auf die
 * Auswahlliste hin, Klick öffnet sie, Enter bestätigt. Statt der früheren
 * Klick-Rotation durch alle Codes — bei sieben Zuständen braucht man dort
 * bis zu sechs Klicks für eine Korrektur, und Fehlklicks überschreiben
 * stillschweigend einen richtigen Wert.
 */
import { useEffect, useRef, useState } from 'react';
import type { AttendanceCode } from '../../domain/types';

export const CODES: AttendanceCode[] = ['X', '(x)', 'E', 'K', 'A', 'U'];

export const CODE_MEANING: Record<string, string> = {
  X: 'Anwesend',
  '(x)': 'Anwesend, verspätet oder früher gegangen',
  E: 'Entschuldigt, mit Nachweis',
  K: 'Kulanztag (Abmeldung vor 9 Uhr per Mail)',
  A: 'Abgemeldet, ohne Nachweis',
  U: 'Nicht abgemeldet',
};

const COUNTS_AS: Record<string, string> = {
  X: 'Anwesend',
  '(x)': 'Anwesend',
  E: 'Anwesend',
  K: 'Anwesend',
  A: 'Fehltag',
  U: 'Fehltag',
};

/** Zellfüllung nach Abschnitt 6. */
export function cellFill(code: AttendanceCode, locked: boolean, weekend = false): string {
  if (locked) return 'bg-[var(--muted)] text-[var(--text-dim)]';
  if (code === '') {
    return weekend
      ? 'bg-[var(--muted)] text-[var(--text-dim)]'
      : 'bg-[var(--highlight-weak)] text-black';
  }
  // A = abgemeldet ohne Nachweis: kein klarer Fehltag, muss vom Dozenten
  // nochmal geprüft und ggf. korrigiert werden — daher gelb wie ein offenes Feld.
  if (code === 'A') return 'bg-[var(--highlight)] text-black font-semibold';
  if (code === 'U') return 'bg-[var(--danger)]/15 text-[var(--danger)] font-semibold';
  return 'bg-[var(--surface)] text-[var(--text)] font-medium';
}

interface CodeCellProps {
  code: AttendanceCode;
  /** Feiertag — kein Arbeitstag, keine Eingabe möglich. */
  locked?: boolean;
  lockedReason?: string;
  /** Samstag/Sonntag ohne Eintrag: grau wie gesperrt, aber klickbar (z. B. Klausur/Workshop). */
  weekend?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (code: AttendanceCode) => void;
}

export function CodeCell({
  code,
  locked = false,
  lockedReason,
  weekend = false,
  disabled = false,
  label,
  onChange,
}: CodeCellProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const options: AttendanceCode[] = ['', ...CODES];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) setActive(Math.max(0, options.indexOf(code === 'x' ? 'X' : code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (locked) {
    return (
      <div
        title={lockedReason ?? 'Kein Arbeitstag'}
        aria-label={`${label}: ${lockedReason ?? 'kein Arbeitstag'}`}
        className={`flex h-8 w-9 items-center justify-center text-xs ${cellFill('', true)}`}
      >
        —
      </div>
    );
  }

  function choose(next: AttendanceCode) {
    setOpen(false);
    if (next !== code) onChange(next);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(options[active]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} — aktuell ${code || (weekend ? 'kein Eintrag (Wochenende)' : 'leer')}`}
        title={`${label} — ${
          code ? CODE_MEANING[code] ?? code : weekend ? 'Wochenende, bei Bedarf eintragen' : 'noch nicht erfasst'
        }`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={`relative h-8 w-9 text-center text-xs transition hover:ring-1 hover:ring-[var(--text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 ${cellFill(code, false, weekend)}`}
      >
        {code || (weekend ? '–' : '?')}
        <span
          aria-hidden
          className="pointer-events-none absolute right-0.5 top-0 text-[8px] leading-none text-[var(--text-dim)]"
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Code wählen"
          className="absolute left-0 top-full z-30 mt-0.5 min-w-[15rem] rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
        >
          {options.map((opt, i) => (
            <li key={opt || 'leer'}>
              <button
                type="button"
                role="option"
                aria-selected={opt === code}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(opt)}
                className={`flex w-full items-baseline gap-2 px-2 py-1 text-left text-xs ${
                  i === active ? 'bg-[var(--muted)]' : ''
                }`}
              >
                <b className="w-8 shrink-0 font-semibold">{opt || '–'}</b>
                <span className="text-[var(--text-dim)]">
                  {opt ? CODE_MEANING[opt] : 'Eintrag entfernen'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Legende aller Codes — steht am Fuß jeder Wochentabelle (Abschnitt 4). */
export function CodeLegend() {
  return (
    <table className="mt-2 text-[11px] text-[var(--text-dim)]">
      <caption className="sr-only">Bedeutung der Codes</caption>
      <tbody>
        {CODES.map((c) => (
          <tr key={c}>
            <td className="pr-2 font-semibold text-[var(--text)]">{c}</td>
            <td className="pr-3">{CODE_MEANING[c]}</td>
            <td className={COUNTS_AS[c] === 'Fehltag' ? 'text-[var(--danger)]' : ''}>
              {COUNTS_AS[c]}
            </td>
          </tr>
        ))}
        <tr>
          <td className="pr-2 font-semibold text-[var(--text)]">leer</td>
          <td className="pr-3">Noch nicht erfasst</td>
          <td>Offen</td>
        </tr>
      </tbody>
    </table>
  );
}
